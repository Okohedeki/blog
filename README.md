# blog

My personal site — half résumé, half blog. Static HTML/CSS, zero build step, zero
dependencies (fonts load from Google Fonts).

- **`index.html`** — home: hero, *Selected work*, *Recently shipped* feed, *Experience*, toolkit, writing.
- **`resume.html`** — full, print-ready résumé page (Cmd-P → Save as PDF). `Edeki-Okoh-Resume.docx` is the download.
- **`blog/index.html`** — the writing index (mine to fill).
- **`blog/posts/`** — one HTML file per post (`YYYY-MM-DD-slug.html`) + `_template.html`.
- **`styles.css`** — the whole design (dark editorial: Fraunces + Hanken Grotesk + JetBrains Mono).
- **`scripts/update-activity.mjs`** — regenerates the *Recently shipped* feed from commits (see below).

## Run it locally

It's plain files — just open `index.html` in a browser, or:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Add a post

1. Copy `blog/posts/_template.html` to `blog/posts/YYYY-MM-DD-your-slug.html`.
2. Fill in the title, date, and body.
3. In `blog/index.html`, replace the `.empty-state` block with a `<ul class="posts">` and
   add one `<li>` per post (newest first) — the exact markup is in a comment there.

## Résumé

The "Résumé" links point to `resume.html` (a styled, print-ready page) and offer
`Edeki-Okoh-Resume.docx` as a download. To update: edit `resume.html`, replace the
`.docx`, and adjust the *Experience* summary in `index.html`. Prefer a real PDF? Drop one
in and repoint the links.

## Recently shipped feed (auto)

The *Recently shipped* list on the home page is generated from recent commits across the
public project repos (airlock, VaultOP, markov-engine, MathRL). It leads with features and
milestones — `fix`/`chore`/`docs`/`test` commits are filtered out (tune the `DROP` regexes
in the script to taste).

```bash
node scripts/update-activity.mjs   # rewrites the <!-- ACTIVITY --> block in index.html
```

`.github/workflows/activity.yml` runs this every Monday (and on demand via *Run workflow*),
commits any change, and redeploys. Add or reorder projects in the `REPOS` array.

## Update the projects section

The *Selected work* cards in `index.html` track repos with commits in the last ~3 weeks.
To regenerate that list later:

```bash
for d in $(find ~/Documents -maxdepth 2 -name .git -type d); do
  repo=$(dirname "$d")
  echo "$(git -C "$repo" log -1 --format=%cI 2>/dev/null)|$repo"
done | sort -r
```

Anything dated within the last three weeks belongs in the section; edit the cards by hand.

## Deploy

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.
After the first push, enable it once: **repo → Settings → Pages → Build and deployment →
Source: GitHub Actions**. Site then serves at `https://okohedeki.github.io/blog/`.
