# Edeki Okoh — personal site

My personal site: four selected projects, a short introduction, and contact links.
Static HTML/CSS, no build step, no tracking, and system fonts only. The homepage
and project notes work without JavaScript.

- **`index.html`** — introduction, four projects, background, and contact.
- **`portfolio.css`** — responsive typography and layout for the portfolio.
- **`resonance-studio.html`** — prototype notes and an actual sample screenshot.
- **`windows-ai-workstation.html`** — developer-preview scope and limitations.
- **`worklog.html`** — the historical, interactive agent-work archive.
- **`worklog/`** — compact daily agent-work projections, their date index, and the shared renderer.
- **`scripts/build_worklog.py`** — converts the local audit archive into public daily data.
- **`home.css`** — styles retained for the interactive archive.

## Run it locally

It's plain files — just open `index.html` in a browser, or:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Projects

The four project rows in `index.html` are written by hand. Edit the
`<article class="project">` blocks to update them. Keep status labels consistent
with the source projects. Local prototypes link to public project notes;
the site does not distribute their source code or unsigned builds.

## Agent work log

The archive presents agent work newest-first and lazy-loads one compact JSON file per day.
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
