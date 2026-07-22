# blog

My personal site — a minimal project and work-log page. Static HTML/CSS, zero build step,
zero dependencies, and system fonts only. Writing lives on Substack, not here.

- **`index.html`** — home: introduction, projects, and the dated agent showcase.
- **`worklog/`** — compact daily agent-work projections, their date index, and the shared renderer.
- **`scripts/build_worklog.py`** — converts the local audit archive into public daily data.
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

The homepage presents agent work newest-first and lazy-loads one compact JSON file per day.
The full local audit archive is not copied into the repository. Public files include only
sanitized summaries, task and subagent topology, status, model, timestamps, and retained token
counts. Raw prompts, full outputs, local paths, credentials, and private reasoning are excluded.

Refresh the public projection with:

```powershell
py -3.11 scripts/build_worklog.py
```

The script writes `worklog/index.json` and `worklog/days/YYYY-MM-DD.json`. Keeping each day
immutable after it closes avoids repeatedly rewriting one large data file in Git history.

## Deploy

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.
After the first push, enable it once: **repo → Settings → Pages → Build and deployment →
Source: GitHub Actions**. Site then serves at `https://okohedeki.github.io/blog/`.
