#!/usr/bin/env node
// Regenerate the "Recent activity" feed on the home page from recent commits
// across the public project repos. Zero dependencies — Node 20+ (global fetch).
//
//   node scripts/update-activity.mjs
//
// Injects rendered <li> items between the ACTIVITY:START / ACTIVITY:END markers
// in index.html. Run by .github/workflows/activity.yml on a schedule.

import { readFile, writeFile } from "node:fs/promises";

const OWNER = "Okohedeki";
const REPOS = [
  { repo: "airlock",       name: "airlock" },
  { repo: "VaultOP",       name: "VaultOP" },
  { repo: "markov-engine", name: "markov-engine" },
  { repo: "MathRL",        name: "MathRL" },
];

const PER_REPO = 3;       // most-recent meaningful commits to keep per repo
const TOTAL = 12;         // max items in the feed
const MAXLEN = 116;       // snippet length cap

// We lead with accomplishments — features, perf wins, milestones — not maintenance.
// `fix` is dropped too: bug-note subjects read poorly out of context. Tune to taste.
const DROP = /^(chore|docs|test|tests|ci|build|style|refactor|fix|wip)(\(|:|\s)/i;
const DROP_PLAIN = /^(merge\b|vendor\b|revert\b|bump\b|remove\b|untrack\b|initial commit|fix\b)/i;

function clean(subject) {
  let s = subject.split("\n")[0].trim();
  // strip conventional-commit prefix: "feat(scope): " -> ""
  s = s.replace(/^[a-z]+(\([^)]*\))?:\s*/i, "");
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (s.length > MAXLEN) {
    s = s.slice(0, MAXLEN).replace(/\s+\S*$/, "") + "…";
  }
  return s;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function commitsFor({ repo, name }) {
  const url = `https://api.github.com/repos/${OWNER}/${repo}/commits?per_page=40`;
  const headers = { "Accept": "application/vnd.github+json", "User-Agent": "okohedeki-site" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${repo}: HTTP ${res.status}`);
  const raw = await res.json();
  const kept = [];
  for (const c of raw) {
    const subject = (c.commit?.message || "").split("\n")[0].trim();
    if (!subject || DROP.test(subject) || DROP_PLAIN.test(subject)) continue;
    kept.push({
      repo, name,
      date: c.commit?.committer?.date || c.commit?.author?.date,
      text: clean(subject),
    });
    if (kept.length >= PER_REPO) break;
  }
  return kept;
}

function render(items) {
  return items.map((it) => `        <li class="feed-item">
          <time datetime="${it.date.slice(0,10)}">${fmtDate(it.date)}</time>
          <a class="repo-chip" href="https://github.com/${OWNER}/${it.repo}">${esc(it.name)}</a>
          <span class="feed-text">${esc(it.text)}</span>
        </li>`).join("\n");
}

async function main() {
  const results = await Promise.allSettled(REPOS.map(commitsFor));
  let items = [];
  for (const r of results) {
    if (r.status === "fulfilled") items.push(...r.value);
    else console.warn("skip:", r.reason?.message || r.reason);
  }
  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  items = items.slice(0, TOTAL);
  if (!items.length) { console.error("No items resolved; leaving page unchanged."); process.exit(0); }

  const file = new URL("../index.html", import.meta.url);
  const html = await readFile(file, "utf8");
  const START = "<!-- ACTIVITY:START -->", END = "<!-- ACTIVITY:END -->";
  const a = html.indexOf(START), b = html.indexOf(END);
  if (a === -1 || b === -1) { console.error("markers not found in index.html"); process.exit(1); }

  const block = `${START}\n${render(items)}\n        ${END}`;
  const next = html.slice(0, a) + block + html.slice(b + END.length);
  if (next === html) { console.log("No changes."); return; }
  await writeFile(file, next);
  console.log(`Updated feed with ${items.length} items.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
