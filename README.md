# Edeki Okoh — personal site

My personal site: four selected projects, a short introduction, and contact links.
Static HTML/CSS, no build step, no tracking, and system fonts only. A small
JavaScript player lets visitors switch between the mix and two supplied voice
tracks at the same playback position. Native audio and project links remain
available without JavaScript.

- **`index.html`** — introduction, four projects, background, and contact.
- **`folio.css`** — current layout, typography, and listening controls; imports the shared base in `portfolio.css`.
- **`listen.js`** — audio loading, mix/solo selection, transport, and failure recovery.
- **`assets/README.md`** — synthetic audio provenance and screenshot context.
- **`resonance-studio.html`** — current recording editor, preservation behavior, and limitations.
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

The featured Resonance example and three supporting projects in `index.html`
are written by hand. Edit the `feature` and `project` articles to update them.
Keep status labels consistent
with the source projects. Local prototypes link to public project notes;
the site does not distribute their source code or unsigned builds.

## Design and verification

The direction draws on Paco Coursey's compact personal site and Rauno Freiberg's
presentation of actual work: a short introduction, one usable demonstration,
and direct paths into the projects. Avoid decorative entrance animations,
generic hero imagery, unverified claims, and fabricated product interfaces.

For UI changes, inspect relevant live references first. Verify the rendered
homepage and both project pages at 1440, 768, 390, and 320 pixels. Exercise
keyboard navigation, reduced motion, audio switching at the same position,
seeking, pause/replay, failed audio loading and retry, and the no-JavaScript
fallback. Keep the historical archive links working.

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
