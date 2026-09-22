# Edeki Okoh — personal site

My personal site: a moving musical-score biography, four projects, and contact links.
Static HTML/CSS, no build step, no tracking, and system fonts only. A small
JavaScript player lets visitors switch between the mix and two supplied voice
tracks at the same playback position. Native audio and project links remain
available without JavaScript.

- **`index.html`** — introduction, four projects, background, and contact.
- **`score.css`** — engraved score, word-note typography, and the paper-and-ink theme.
- **`score.js`** — biography playhead, word motion, pause, and reduced-motion behavior.
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

The user requested a musical sheet whose notes are their biography. Words replace
noteheads on three staves; a silent playhead follows the phrases while words lift
gently. The projects form four movements: Sound, Agents, Work, and Memory.
Pause motion is always available. Reduced-motion preferences start the score
paused, opening the text biography pauses it, and offscreen motion stops.

References researched before implementation:

- [LilyPond engraving examples](https://lilypond.org/examples.html) — score layout and notation.
- [Tom Phillips on graphic scores](https://www.tomphillips.co.uk/texts/journalism-reviews/9584-playing-pictures-the-wonder-of-graphic-scores) — expressive, unconventional notation.
- [Oscilla](https://oscilla.cc/) — time-based motion within a readable score.

The notation is original HTML/CSS. No reference artwork, music, or external font
is copied into the site. The biography animation produces no sound.

For UI changes, inspect relevant live references first. Verify the rendered
homepage and both project pages at 1440, 768, 390, and 320 pixels. Exercise
keyboard navigation, reduced motion, audio switching at the same position,
seeking, pause/replay, failed audio loading and retry, and the no-JavaScript
fallback. Check word-note collisions, score pause/resume, text-reading pause,
and offscreen animation suspension. Keep the historical archive links working.

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
