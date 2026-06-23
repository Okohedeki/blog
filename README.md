# blog

My personal site and blog. Static HTML/CSS, zero build step, zero dependencies.

- **`index.html`** — home: intro + the *Currently building* projects section + latest posts.
- **`blog/index.html`** — full post list.
- **`blog/posts/`** — one HTML file per post (`YYYY-MM-DD-slug.html`).
- **`styles.css`** — the whole design. Light/dark via `prefers-color-scheme`.

## Run it locally

It's plain files — just open `index.html` in a browser, or:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Add a post

1. Copy `blog/posts/_template.html` to `blog/posts/YYYY-MM-DD-your-slug.html`.
2. Fill in the title, date, and body.
3. Add a `<li>` at the top of the list in **`blog/index.html`** (and on the home page `index.html` if you want it featured).

## Update the projects section

The *Currently building* cards in `index.html` track repos with commits in the last
~3 weeks. To regenerate that list later:

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
