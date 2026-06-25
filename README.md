# blog

My personal site — a minimal résumé + project page. Static HTML/CSS, zero build step, zero
dependencies (fonts load from Google Fonts). Writing lives on Substack, not here.

- **`index.html`** — home: hero, *Projects* (each stated as *why* it exists), *Experience*, toolkit.
- **`resume.html`** — full, print-ready résumé page (Cmd-P → Save as PDF). `Edeki-Okoh-Resume.docx` is the download.
- **`learnings/index.html`** — staged curriculum page (currently: GPU / CUDA kernel development).
- **`styles.css`** — the whole design (dark editorial: Fraunces + Hanken Grotesk + JetBrains Mono).

## Run it locally

It's plain files — just open `index.html` in a browser, or:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Projects

The project cards in `index.html` are written by hand — each leads with *why* the project
exists rather than a feature list. Public repos link out; private ones are shown without a
link. Edit the `<article class="project">` blocks directly to add, drop, or reorder.

## Résumé

The "Résumé" links point to `resume.html` (a styled, print-ready page) and offer
`Edeki-Okoh-Resume.docx` as a download. To update: edit `resume.html`, replace the
`.docx`, and adjust the *Experience* summary in `index.html`. Prefer a real PDF? Drop one
in and repoint the links.

## Deploy

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.
After the first push, enable it once: **repo → Settings → Pages → Build and deployment →
Source: GitHub Actions**. Site then serves at `https://okohedeki.github.io/blog/`.
