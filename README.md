# SDN project page

Static project page for *Test-Time Improvement of VLA Policies via Selected Diffusion Noise for Spurious-Robust Action Smoothing*. Plain HTML/CSS/JS, no build step; the design follows the PGPG page (ducido.github.io/pgpg.github.io).

| File | What it holds |
|---|---|
| `index.html` | All text, figures, BibTeX |
| `results.js` | Numbers of the result tables (copied from the paper's `table/*.tex`) and the charts drawn from them |
| `lab.js` | The interactive two-stage selection demo (toy data, the paper's equations) |
| `page.js` | Reading progress, side contents, reveal on scroll, KaTeX, BibTeX copy |
| `assets/` | Figures rendered from the Overleaf `images/` folder (PDF to JPG, max 2000 px wide) |
| `tools/check_lab.js` | Self-check for the demo math: `node tools/check_lab.js` |

## Preview locally

```bash
python3 -m http.server 8000 --directory /mnt/vast-kisski/projects/kisski-spath/VLA_Imit/SDN/sdn.github.io
# then open http://localhost:8000
```

## Publish on GitHub Pages

1. Create an empty public repo on GitHub, e.g. `sdn.github.io`, under your account.
2. Push this folder:
   ```bash
   git -C /mnt/vast-kisski/projects/kisski-spath/VLA_Imit/SDN/sdn.github.io remote add origin https://github.com/ducido/sdn.github.io.git
   git -C /mnt/vast-kisski/projects/kisski-spath/VLA_Imit/SDN/sdn.github.io push -u origin main
   ```
3. Repo Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
4. The page appears at `https://ducido.github.io/sdn.github.io/` after a minute or two.

## Before making it public

Search `TODO` in `index.html`:
- author list, affiliations and venue (the paper is still anonymous);
- Paper/arXiv link and the Code link (`github.com/ducido/SDN` is private; drop the `off` class when it is public);
- final BibTeX entry.
