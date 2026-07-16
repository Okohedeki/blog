# blog

My personal site — a minimal project and work-log page. Static HTML/CSS, zero build step,
zero dependencies, and system fonts only. Writing lives on Substack, not here.

- **`index.html`** — home: introduction, projects, and the latest agent-work day.
- **`learnings/index.html`** — staged curriculum page (currently: GPU / CUDA kernel development).
- **`worklog/`** — manually published daily agent-work graph snapshots and the shared renderer.
- **`styles.css`** — the paper-toned, narrow-column blog design.

## Run it locally

It's plain files — just open `index.html` in a browser, or:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Projects

The project cards in `index.html` are written by hand — each leads with *why* the project
exists rather than a feature list. Public repos link out; private ones are shown without a
link. Edit the `<article class="project">` blocks directly to add, drop, or reorder.

## Agent work log

The homepage includes one manually selected day of work with coding agents. The committed
snapshot under `worklog/` contains only the graph data chosen for public display. Replace it
by hand when publishing a different day; there is intentionally no automatic upload path.

## Deploy

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.
After the first push, enable it once: **repo → Settings → Pages → Build and deployment →
Source: GitHub Actions**. Site then serves at `https://okohedeki.github.io/blog/`.
