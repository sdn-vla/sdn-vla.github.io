// Result charts and tables. Every number is copied from the paper's tables; the last value of each
// SIMPLER row is the average as printed there, deltas are computed from the printed values.
(() => {
  const TASKS = [
    ["Close Drawer", "Google Robot"], ["Move Near", "Google Robot"], ["Open Drawer", "Google Robot"],
    ["Pick Coke Can", "Google Robot"], ["Apple Drawer", "Google Robot"], ["Carrot Plate", "WidowX"],
    ["Eggplant Basket", "WidowX"], ["Spoon Towel", "WidowX"], ["Stack Cube", "WidowX"],
  ];
  const SIM = {
    pi0: {
      label: "π0", base: "π0",
      rows: {
        "π0": [75.7, 67.3, 38.0, 84.0, 17.0, 58.0, 86.0, 80.7, 68.7, 63.9],
        CFG: [77.0, 51.0, 45.0, 71.0, 26.0, 49.0, 69.0, 75.0, 39.0, 55.8],
        WNG: [77.0, 60.0, 29.0, 84.0, 19.0, 63.0, 83.0, 80.0, 45.0, 60.0],
        BYOVLA: [66.0, 42.0, 0.0, 92.0, 0.0, 46.0, 20.0, 56.0, 38.0, 40.0],
        ACG: [70.0, 57.0, 40.0, 82.0, 17.0, 65.0, 87.0, 82.0, 53.0, 61.4],
        PCD: [75.0, 72.3, 56.3, 88.0, 27.3, 59.7, 87.0, 84.0, 77.0, 69.6],
        SDN: [87.0, 78.0, 50.0, 89.0, 26.0, 63.0, 92.0, 90.0, 78.0, 72.6],
      },
    },
    gr00t: {
      label: "GR00T N1.6", base: "GR00T N1.6",
      rows: {
        "GR00T N1.6": [40.0, 76.0, 4.0, 90.0, 18.0, 60.0, 94.0, 58.7, 4.7, 49.5],
        CFG: [42.0, 80.0, 8.0, 92.0, 10.0, 40.0, 82.0, 46.0, 4.0, 44.9],
        WNG: [40.0, 78.0, 6.0, 94.0, 20.0, 68.0, 78.0, 64.0, 8.0, 50.7],
        BYOVLA: [42.0, 76.0, 10.0, 98.0, 12.0, 52.0, 78.0, 60.0, 0.0, 47.6],
        ACG: [40.7, 79.3, 7.3, 95.3, 20.0, 60.0, 93.0, 61.0, 4.0, 51.2],
        PCD: [42.0, 80.0, 4.0, 92.0, 12.0, 62.0, 74.0, 60.0, 6.0, 48.0],
        SDN: [44.0, 90.0, 14.0, 94.0, 20.0, 60.0, 94.0, 68.0, 6.0, 54.5],
      },
    },
  };
  // Real world: ALOHA, GR00T N1.5. Success (%) on Cube2Drawer, Banana2Pot, average.
  const REAL = [
    ["GR00T N1.5", [30.0, 30.0, 30.0]],
    ["CFG", [40.0, 33.33, 36.67]],
    ["ACG", [36.67, 46.67, 41.67]],
    ["PCD", [40.0, 43.33, 41.67]],
    ["SDN, Stage 1 only", [50.0, 36.67, 43.33], "part"],
    ["SDN, Stage 2 only", [50.0, 43.33, 46.67], "part"],
    ["SDN (full)", [53.33, 43.33, 48.33], "ours"],
  ];
  // Motion quality: JerkRMS and ATV (x10^2) on Cube2Drawer, Banana2Pot; lower is better.
  // Values and relative changes as printed in the paper (its rounding, e.g. +114%), not recomputed.
  const MOTION = [
    ["GR00T N1.5", ["12.45", "4.87", "7.07", "4.80"], []],
    ["CFG", ["12.79", "4.90", "7.18", "4.82"], ["+2.7%", "+0.6%", "+1.5%", "+0.4%"]],
    ["ACG", ["18.1", "6.00", "15.17", "6.00"], ["+45.4%", "+23.2%", "+114%", "+25.0%"]],
    ["PCD", ["12.47", "4.88", "7.08", "4.80"], ["+0.1%", "+0.2%", "+0.1%", "+0.0%"]],
    ["SDN", ["11.80", "4.80", "6.54", "4.70"], ["−5.2%", "−1.4%", "−7.5%", "−2.1%"]],
  ];
  // SDN vs PCD with two ways of building the negative set (bbox zero-masking, LaMa inpainting).
  const NEGSET = {
    pi0: {
      base: [75.7, 67.3, 38, 84, 17, 58, 86, 80.7, 68.7, 63.9],
      sdnBox: [87, 78, 50, 89, 26, 63, 92, 90, 78, 72.6], pcdBox: [78, 64, 52, 92, 20, 66, 72, 92, 74, 67.6],
      sdnInp: [82, 80, 46, 92, 20, 54, 96, 88, 84, 71.3], pcdInp: [75, 72.3, 56.3, 88, 27.3, 59.7, 87, 84, 77, 69.6],
    },
    gr00t: {
      base: [40, 76, 4, 90, 18, 60, 94, 58.7, 4.7, 49.5],
      sdnBox: [44, 90, 14, 94, 20, 60, 94, 68, 6, 54.4], pcdBox: [42, 78, 6, 94, 14, 60, 84, 62, 6, 49.6],
      sdnInp: [48, 90, 12, 96, 20, 62, 94, 64, 6, 54.7], pcdInp: [42, 80, 4, 92, 12, 62, 74, 60, 6, 48.0],
    },
  };

  const $ = (id) => document.getElementById(id);
  const f1 = (v) => v.toFixed(1);
  const sgn = (d) => (d > 0.05 ? "up" : d < -0.05 ? "dn" : "flat");
  const fmtD = (d) => (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(1);
  const pct = (v) => `${Math.max(0, Math.min(100, v))}%`;

  function tabs(el, items, cur, cls, onPick) {
    el.innerHTML = items.map(([k, l]) => `<button class="${cls}${k === cur ? " on" : ""}" data-k="${k}">${l}</button>`).join("");
    el.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => onPick(b.dataset.k)));
  }
  const grow = (root) => requestAnimationFrame(() => root.querySelectorAll("[data-w]").forEach((b) => (b.style.width = b.dataset.w)));

  // SIMPLER: per-task bars, SDN against one chosen method.
  let bb = "pi0", cmp = null;
  function drawSim() {
    const S = SIM[bb];
    const names = Object.keys(S.rows).filter((n) => n !== "SDN");
    if (!names.includes(cmp)) cmp = S.base;
    tabs($("sim-tabs"), Object.entries(SIM).map(([k, v]) => [k, v.label]), bb, "tab", (k) => { bb = k; drawSim(); });
    tabs($("sim-cmp"), names.map((n) => [n, n === S.base ? `${n} (vanilla)` : n]), cmp, "", (k) => { cmp = k; drawSim(); });
    $("sim-key").textContent = cmp === S.base ? `${cmp} (vanilla)` : cmp;
    const a = S.rows[cmp], o = S.rows.SDN;
    const row = (lab, sub, i, extra = "") => {
      const d = o[i] - a[i];
      return `<div class="brow ${extra}"><div class="lab">${lab}${sub ? `<small>${sub}</small>` : ""}</div>
        <div class="track"><div class="b base" data-w="${pct(a[i])}"><span>${f1(a[i])}</span></div>
        <div class="b ours" data-w="${pct(o[i])}"><span>${f1(o[i])}</span></div></div>
        <div class="delta ${sgn(d)}">${fmtD(d)}</div></div>`;
    };
    $("sim-bars").innerHTML = TASKS.map(([t, r], i) => row(t, r, i)).join("") + row("Average", "9 tasks", 9, "avg");
    grow($("sim-bars"));

    const all = Object.entries(S.rows);
    const best = TASKS.map((_, i) => Math.max(...all.map(([, v]) => v[i])));
    best.push(Math.max(...all.map(([, v]) => v[9])));
    $("sim-table").innerHTML = `<table><thead><tr><th>Method</th>${TASKS.map(([t]) => `<th>${t}</th>`).join("")}<th>Avg.</th></tr></thead><tbody>${
      all.map(([n, v]) => `<tr class="${n === "SDN" ? "ours" : ""}"><td>${n}</td>${v.map((x, i) => {
        const d = n === "SDN" ? x - S.rows[S.base][i] : null;
        return `<td class="${x === best[i] ? "best" : ""}">${f1(x)}${d === null ? "" : `<sub class="${sgn(d)}">${fmtD(d)}</sub>`}</td>`;
      }).join("")}</tr>`).join("")}</tbody></table>`;
  }

  // Real world: one bar per method for the chosen task.
  let rt = 2;
  function drawReal() {
    tabs($("rw-tabs"), [[0, "Cube2Drawer"], [1, "Banana2Pot"], [2, "Average"]], rt, "tab", (k) => { rt = +k; drawReal(); });
    $("rw-bars").innerHTML = REAL.map(([n, v, c = ""]) =>
      `<div class="tn ${c}"><span>${n}</span><div class="bar"><i data-w="${pct(v[rt])}"></i></div><span class="v">${v[rt].toFixed(2)}</span></div>`).join("");
    grow($("rw-bars"));
  }
  function drawMotion() {
    const best = MOTION[0][1].map((_, i) => Math.min(...MOTION.map(([, v]) => +v[i])));
    $("rw-motion").innerHTML = `<table class="mini"><thead><tr><th rowspan="2">Method</th><th colspan="2">Cube2Drawer</th><th colspan="2">Banana2Pot</th></tr>
      <tr><th>Jerk</th><th>ATV</th><th>Jerk</th><th>ATV</th></tr></thead><tbody>${
      MOTION.map(([n, v, rel]) => `<tr class="${n === "SDN" ? "ours" : ""}"><td>${n}</td>${v.map((x, i) => {
        const r = rel[i], cls = !r ? "" : r.startsWith("−") ? "up" : parseFloat(r) > 0 ? "dn" : "flat";
        return `<td class="${+x === best[i] ? "best" : ""}">${x}${r ? `<sub class="${cls}">${r}</sub>` : ""}</td>`;
      }).join("")}</tr>`).join("")}</tbody></table>`;
  }

  // Negative-set construction: SDN vs PCD.
  let nb = "pi0";
  function drawNeg() {
    tabs($("neg-tabs"), [["pi0", "π0"], ["gr00t", "GR00T N1.6"]], nb, "tab", (k) => { nb = k; drawNeg(); });
    const D = NEGSET[nb];
    const cols = [["base", "Base"], ["sdnBox", "SDN"], ["pcdBox", "PCD"], ["sdnInp", "SDN"], ["pcdInp", "PCD"]];
    const names = [...TASKS.map(([t]) => t), "Average"];
    const cell = (k, i) => {
      const pair = k === "sdnBox" ? "pcdBox" : k === "pcdBox" ? "sdnBox" : k === "sdnInp" ? "pcdInp" : k === "pcdInp" ? "sdnInp" : null;
      const win = pair && D[k][i] > D[pair][i];
      return `<td class="${win ? "best" : ""}">${f1(D[k][i])}</td>`;
    };
    $("neg-table").innerHTML = `<table class="mini"><thead><tr><th></th><th></th><th colspan="2">BBox zero-masking</th><th colspan="2">Inpainting (LaMa)</th></tr>
      <tr><th>Task</th>${cols.map(([, l]) => `<th>${l}</th>`).join("")}</tr></thead><tbody>${
      names.map((t, i) => `<tr class="${i === 9 ? "avg" : ""}"><td>${t}</td>${cols.map(([k]) => cell(k, i)).join("")}</tr>`).join("")}</tbody></table>`;
  }

  drawSim(); drawReal(); drawMotion(); drawNeg();
})();
