# Edeki Okoh — personal site

A single page: my name, a short summary, and links to GitHub, LinkedIn, and email.
Static HTML/CSS, no JavaScript, no build step, no tracking. Fonts are Instrument
Serif and Instrument Sans from Google Fonts. One fixed light palette.

- **`index.html`** — the page.
- **`site.css`** — its styles.
- **`assets/favicon.svg`** — the browser icon.
- **`worklog.html`**, **`worklog/`**, **`home.css`**, **`scripts/build_worklog.py`** — the old agent-work archive (not linked from the page).

## Run it locally

It's plain files — just open `index.html` in a browser, or:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

To change the summary or links, edit the `.summary` paragraph and the `.links` list in `index.html`.

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
