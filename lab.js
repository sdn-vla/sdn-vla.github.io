// A toy version of SDN's two-stage selection that runs the paper's equations in the browser.
// Each candidate action chunk is drawn as a 2-D point (where it lands in action space) and a 1-D
// trajectory (how it moves). The paper applies the same scores to real chunks of shape horizon x DoF.
const SDNMath = {
  // Mean distance from x to its k nearest neighbours in set (skipping index `self`).
  knn(x, set, k, self = -1) {
    const d = set.filter((_, j) => j !== self).map((y) => Math.hypot(x[0] - y[0], x[1] - y[1])).sort((a, b) => a - b);
    const kk = Math.min(k, d.length);
    return d.slice(0, kk).reduce((s, v) => s + v, 0) / kk;
  },
  // Stage 1 score: R = d_B - d_G, or -d_G when the target is not detected and B is empty.
  ground(G, B, k) {
    return G.map((x, i) => {
      const dG = SDNMath.knn(x, G, k, i);
      const dB = B.length ? SDNMath.knn(x, B, k) : null;
      return { dG, dB, R: dB === null ? -dG : dB - dG };
    });
  },
  // Stage 2 score: RMS of the third-order finite difference (discrete jerk) over the chunk.
  jerkRMS(a) {
    let s = 0;
    for (let t = 0; t + 3 < a.length; t++) s += (a[t + 3] - 3 * a[t + 2] + 3 * a[t + 1] - a[t]) ** 2;
    return Math.sqrt(s / (a.length - 3));
  },
  // Algorithm 1: top-M by R then argmin jerk; without a negative set, argmin d_G directly.
  select(scores, jerks, M, hasNeg) {
    const order = scores.map((_, i) => i).sort((i, j) => scores[j].R - scores[i].R);
    if (!hasNeg) return { order, top: [order[0]], pick: order[0] };
    const top = order.slice(0, M);
    const pick = top.reduce((b, i) => (jerks[i] < jerks[b] ? i : b), top[0]);
    return { order, top, pick };
  },
};
if (typeof module !== "undefined") module.exports = SDNMath;

if (typeof document !== "undefined") (() => {
  const cv = document.getElementById("lab-canvas");
  if (!cv) return;
  const $ = (id) => document.getElementById(id);
  const C = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const N = 12, L = 32, H = 8;               // candidates, extended chunk length, executed horizon
  const EXPERT = [0.3, 0.64], SPUR = [0.68, 0.34];
  let seed = 3, k = 6, M = 3, hasNeg = true, stage = 0, focus = null, auto = true, data;

  function rng(s) {
    return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function sample() {
    const r = rng(seed * 7919);
    const g = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    const near = (c, s) => [c[0] + s * g(), c[1] + s * g()];
    // Positive set: most samples are task-aligned, a few follow the spurious mode (e.g. a ghost grasp).
    const G = Array.from({ length: N }, (_, i) => {
      const spur = i < 3 + Math.floor(r() * 2);
      const p = near(spur ? SPUR : EXPERT, 0.09);
      // jitter differs a lot between samples, so Stage 2 has something to choose
      const goal = spur ? 0.45 : 1.0, jit = 0.003 + 0.05 * r() ** 1.5, ph = r() * 6;
      const traj = Array.from({ length: L }, (_, t) => goal * (1 - Math.cos((Math.PI * t) / (L - 1))) / 2
        + 0.5 * jit * Math.sin(1.9 * t + ph) + jit * g());
      return { p, traj, spur };
    });
    // Negative set: the same policy with the target masked out, so it follows the spurious cues.
    const B = Array.from({ length: N }, (_, j) => near(j < 10 ? SPUR : [0.5 + 0.3 * r(), 0.2 + 0.6 * r()], 0.09));
    return { G, B };
  }
  function compute() {
    const Bset = hasNeg ? data.B : [];
    const scores = SDNMath.ground(data.G.map((c) => c.p), Bset, k);
    const jerks = data.G.map((c) => SDNMath.jerkRMS(c.traj));
    return { scores, jerks, ...SDNMath.select(scores, jerks, M, hasNeg) };
  }

  // drawing
  const ctx = cv.getContext("2d");
  let W = 0, Ht = 0, sc = null;
  function resize() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; Ht = r.height; cv.width = W * dpr; cv.height = Ht * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
  }
  const box = () => ({ x0: 28, y0: W < 520 ? 72 : 48, x1: W - 28, y1: Ht * 0.6 });  // clear the stage pill on phones
  const tbox = () => ({ x0: 46, y0: Ht * 0.6 + 34, x1: W - 28, y1: Ht - 26 });
  const toXY = (p) => { const b = box(); return [b.x0 + p[0] * (b.x1 - b.x0), b.y0 + (1 - p[1]) * (b.y1 - b.y0)]; };

  function draw() {
    if (!W) return;
    sc = compute();
    const pos = C("--pos"), neg = C("--neg"), pick = C("--pick"), faint = C("--faint"), ink = C("--ink"), rule = C("--rule");
    ctx.clearRect(0, 0, W, Ht);
    const bx = box(), R = W < 520 ? 5 : 7;
    ctx.font = "italic 13px 'STIX Two Text', serif"; ctx.fillStyle = faint;
    ctx.textAlign = "left"; ctx.fillText("↖ task-aligned actions", bx.x0, bx.y0 - 4);
    ctx.textAlign = "right"; ctx.fillText("spurious actions, e.g. ghost grasps ↘", bx.x1, bx.y1 + 4);

    const f = focus ?? sc.pick, fp = data.G[f].p;
    // Stage 1: k-NN neighbourhoods of the focused candidate
    if (stage >= 1) {
      const nn = (set, self) => set.map((y, j) => [Math.hypot(fp[0] - y[0], fp[1] - y[1]), j]).filter(([, j]) => j !== self)
        .sort((a, b) => a[0] - b[0]).slice(0, k);
      const link = (set, idx, col) => { ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]);
        idx.forEach(([, j]) => { const a = toXY(fp), b = toXY(set[j]); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); });
        ctx.setLineDash([]); ctx.globalAlpha = 1; };
      link(data.G.map((c) => c.p), nn(data.G.map((c) => c.p), f), pos);
      if (hasNeg) link(data.B, nn(data.B, -1), neg);
    }
    // negative set
    if (hasNeg) data.B.forEach((p) => { const [x, y] = toXY(p); ctx.strokeStyle = neg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke(); });
    // positive set
    data.G.forEach((c, i) => {
      const [x, y] = toXY(c.p), top = sc.top.includes(i), isPick = i === sc.pick;
      const dim = stage >= 1 && !top;
      ctx.globalAlpha = dim ? 0.35 : 1;
      ctx.fillStyle = stage >= 2 && isPick ? pick : pos;
      ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
      if (R > 5) { ctx.fillStyle = "#fff"; ctx.font = "600 9px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.fillText(i + 1, x, y + 3); }
      ctx.globalAlpha = 1;
      if (stage >= 1 && top) { ctx.strokeStyle = stage >= 2 && isPick ? pick : ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R + 4, 0, 7); ctx.stroke(); }
      if (i === f && stage >= 1) { ctx.strokeStyle = C("--coral"); ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(x, y, R + 8, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    });

    // trajectories (Stage 2)
    const t = tbox();
    ctx.strokeStyle = rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(t.x0, t.y0 - 22); ctx.lineTo(t.x1, t.y0 - 22); ctx.stroke();
    const hx = t.x0 + (H / (L - 1)) * (t.x1 - t.x0);
    ctx.fillStyle = C("--pick-tint"); ctx.fillRect(t.x0, t.y0, hx - t.x0, t.y1 - t.y0);
    ctx.fillStyle = faint; ctx.font = "500 11px Inter, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("executed", t.x0 + 4, t.y0 + 12); ctx.fillText("extended chunk, scored by JerkRMS", hx + 6, t.y0 + 12);
    ctx.save(); ctx.translate(16, (t.y0 + t.y1) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("action (1-D)", 0, 0); ctx.restore();
    ctx.textAlign = "right"; ctx.fillText("time →", t.x1, t.y1 + 18);
    const lo = -0.15, hi = 1.15;
    const pt = (v, s) => [t.x0 + (s / (L - 1)) * (t.x1 - t.x0), t.y1 - ((v - lo) / (hi - lo)) * (t.y1 - t.y0)];
    const shown = stage === 0 ? data.G.map((_, i) => i) : sc.top;
    data.G.forEach((c, i) => {
      if (!shown.includes(i)) return;
      const isPick = stage >= 2 && i === sc.pick;
      ctx.strokeStyle = isPick ? pick : stage === 0 ? pos : ink; ctx.globalAlpha = isPick ? 1 : stage === 0 ? 0.25 : 0.5;
      ctx.lineWidth = isPick ? 2.6 : 1.3; ctx.beginPath();
      c.traj.forEach((v, s) => (s ? ctx.lineTo(...pt(v, s)) : ctx.moveTo(...pt(v, s)))); ctx.stroke(); ctx.globalAlpha = 1;
      if (stage >= 1) { const e = pt(c.traj[L - 1], L - 1); ctx.fillStyle = isPick ? pick : ink; ctx.font = "600 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "right"; ctx.fillText(`#${i + 1}`, e[0] - 4 - 26 * shown.indexOf(i), e[1] - 8); }
    });

    panel();
  }

  const EQS = [
    ["\\begin{aligned}\\mathcal{G}&\\sim\\pi_\\theta(\\cdot\\mid\\mathbf{o},\\ell)\\\\\\mathcal{B}&\\sim\\pi_\\theta(\\cdot\\mid\\mathbf{o}_{\\text{neg}},\\ell)\\end{aligned}", "Sample"],
    ["\\begin{aligned}R^{(i)}_{\\text{ground}}&=d_{\\mathcal{B}}^{(i)}-d_{\\mathcal{G}}^{(i)}\\\\\\mathcal{G}_M&=\\text{TopM}(\\mathcal{G})\\end{aligned}", "Stage 1 · Grounding filter"],
    ["\\begin{aligned}\\mathbf{A}^*&=\\arg\\min_{\\mathbf{A}_i\\in\\mathcal{G}_M}S(\\mathbf{A}_i)\\\\S&=\\operatorname{RMS}_t\\lVert a_{t+3}-3a_{t+2}+3a_{t+1}-a_t\\rVert\\end{aligned}", "Stage 2 · Kinematic refinement"],
  ];
  const EQ_NONEG = ["\\begin{aligned}R^{(i)}_{\\text{ground}}&=-d_{\\mathcal{G}}^{(i)}\\\\\\mathbf{A}^*&=\\arg\\min_i d_{\\mathcal{G}}^{(i)}\\end{aligned}", "No target detected"];

  function panel() {
    const [tex, label] = !hasNeg && stage >= 1 ? EQ_NONEG : EQS[stage];
    $("lab-phase").textContent = label; $("lab-phase").className = `vphase s${stage}`;
    SDN.tex($("lab-eq"), tex, true);
    document.querySelectorAll("#lab-steps li").forEach((li, i) => { li.classList.toggle("on", i === stage); li.classList.toggle("done", i < stage); });
    const rows = sc.order.map((i, r) => {
      const s = sc.scores[i], cls = stage >= 2 && i === sc.pick ? "pick" : stage >= 1 && sc.top.includes(i) ? "top" : stage >= 1 ? "out" : "";
      return `<tr class="${cls}"><td>#${i + 1}</td><td>${stage >= 1 ? s.R.toFixed(3) : "–"}</td><td>${stage >= 2 && sc.top.includes(i) ? sc.jerks[i].toFixed(4) : "–"}</td><td>${data.G[i].spur ? "spurious" : "aligned"}</td></tr>`;
    }).join("");
    $("lab-rank").innerHTML = `<table class="rank"><thead><tr><th>Cand.</th><th>R<sub>ground</sub></th><th>JerkRMS</th><th>Mode</th></tr></thead><tbody>${rows}</tbody></table>`;
    const p = sc.pick, best = sc.order[0];
    $("lab-verdict").innerHTML = stage < 2 && hasNeg ? `<span class="muted">${stage === 0 ? "Blue: N = 12 chunks from the clean observation. Red: N = 12 from the observation with the target masked out." : `Top-${M} by grounding score kept (ringed). Dashed lines: the k = ${k} nearest neighbours of the focused candidate.`}</span>`
      : !hasNeg ? `Target not detected: SDN takes the densest candidate of 𝒢, <b>#${p + 1}</b> (${data.G[p].spur ? "spurious" : "task-aligned"}), with no Stage 2.`
      : `SDN executes <b>#${p + 1}</b> (${data.G[p].spur ? "spurious" : "task-aligned"}), the smoothest of the top-${M}.${p !== best ? ` The best-grounded alone would have been #${best + 1}.` : ""}`;
  }

  // controls
  function set(fn) { fn(); auto = false; draw(); }
  $("lab-next").addEventListener("click", () => set(() => (stage = (stage + 1) % 3)));
  document.querySelectorAll("#lab-steps li").forEach((li, i) => li.addEventListener("click", () => set(() => (stage = i))));
  $("lab-resample").addEventListener("click", () => set(() => { seed++; focus = null; data = sample(); }));
  $("lab-k").addEventListener("input", (e) => set(() => { k = +e.target.value; $("lab-k-v").textContent = k; }));
  $("lab-m").addEventListener("input", (e) => set(() => { M = +e.target.value; $("lab-m-v").textContent = M; }));
  $("lab-neg").addEventListener("click", (e) => set(() => { hasNeg = !hasNeg; e.currentTarget.classList.toggle("on", hasNeg); e.currentTarget.setAttribute("aria-pressed", hasNeg); }));
  cv.addEventListener("click", (e) => {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let bi = null, bd = 18;
    data.G.forEach((c, i) => { const [px, py] = toXY(c.p), d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; bi = i; } });
    if (bi !== null) set(() => { focus = bi; if (stage === 0) stage = 1; });
  });

  data = sample();
  new ResizeObserver(resize).observe(cv);
  // walk through the three stages once when the demo scrolls into view
  new IntersectionObserver((es, io) => {
    if (!es[0].isIntersecting) return; io.disconnect();
    const tick = () => { if (!auto || stage === 2) return; stage++; draw(); setTimeout(tick, 2600); };
    setTimeout(tick, 2200);
  }, { threshold: 0.5 }).observe(cv);
})();
