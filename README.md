# blog

My personal site — a minimal project and work-log page. Static HTML/CSS, zero build step,
zero dependencies, and system fonts only. Writing lives on Substack, not here.

- **`index.html`** — home: introduction, projects, and the dated agent showcase.
- **`learnings/index.html`** — staged curriculum page (currently: GPU / CUDA kernel development).
- **`worklog/`** — manually published daily agent-work graph snapshots and the shared renderer.
- **`home.css`** — the minimal homepage and agent-showcase design.

## Run it locally

It's plain files — just open `index.html` in a browser, or:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Projects

The project cards in `index.html` are written by hand. Edit the
`<article class="project-card">` blocks directly to add, drop, or reorder them.

## Agent work log

The homepage presents agent work newest-first, one dated entry at a time. Each public entry
has a matching JSON snapshot and JavaScript data file under `worklog/`. The snapshots include
only retained summaries and usage selected for public display; private reasoning and raw
prompts remain excluded.

## Deploy

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.
After the first push, enable it once: **repo → Settings → Pages → Build and deployment →
Source: GitHub Actions**. Site then serves at `https://okohedeki.github.io/blog/`.
