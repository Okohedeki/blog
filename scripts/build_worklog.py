#!/usr/bin/env python3
"""Build compact, privacy-safe daily worklog files from local Codex audits."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


INTERNAL_TITLE_PREFIXES = (
    "the following is the codex agent history whose request action you are assessing",
)

PROJECT_RULES = (
    ("autotrainer", "AutoTrainer", ("autotrainer", "auto trainer", "qlora", "grpo")),
    ("printing-press", "Printing Press", ("printing press", "printingpress", "har file", "uber eats cli")),
    ("scribble-studio", "Scribble Studio", ("scribble-studio", "scribble studio")),
    ("markov", "Markov", ("markov-engine", "markov engine")),
    ("airlock", "Airlock", ("airlock",)),
    ("blog", "Blog", ("my blog", "personal site", "github pages", "agent showcase", "display it day by day", "date by date", "json data", "token usage")),
    ("rl-lab", "RL Lab", ("graph game", "rl was loading", "manually adjusting the values")),
    ("agent-systems", "Agent systems", ("reasoning chains", "subagents", "token usage")),
    ("codex", "Codex", ("codex webbrowser", "codex web browser", "close the web broser", "close the web browser")),
)

ACTION_RULES = (
    ("Architecture review", ("architecture", "fresh look at the repo")),
    ("Training diagnostics", ("reward and trainer", "trainer is still at 0", "training bug")),
    ("Training control", ("stop the training", "gpu utilization")),
    ("Runtime iteration", ("launch this and run it", "iterating on this")),
    ("Algorithm review", ("deeper dive into the algorithms", "deeper dive into the algothrims", "lora and gpro", "lora and grpo")),
    ("Continued build", ("where we left off", "finish where we left off")),
    ("Planning", ("plan this out", "let's plan", "lets plan")),
    ("Fixes", ("fix those issues", "fix the issue", "fix this")),
    ("Site diagnostics", ("site can't be reached", "site cant be reached")),
    ("Technical explainer", ("does voice work", "gpu inference works")),
    ("Sample generation", ("generate some samples", "generate samples")),
    ("Tooling", ("global skill", "create a skill")),
    ("Browser control", ("close the web broser", "close the web browser")),
    ("Agent showcase", ("display it day by day", "json data", "token usage", "agent showcase")),
    ("Profile update", ("adjust my blog", "update my blog")),
    ("Repository discovery", ("find my github repo", "find the repo")),
    ("Agent workflow", ("reasoning chains", "approve the reasoning")),
    ("Product research", ("used a trick", "verticals around it", "other areas")),
)

MARKDOWN_LINK = re.compile(r"\[([^\]]+)\]\([^\)]+\)")
CODE_BLOCK = re.compile(r"```.*?```", re.DOTALL)
LOCAL_PATH = re.compile(r"(?i)(?:[a-z]:[\\/]|/Users/|/home/)[^\s\]\)>,;]+")
URL = re.compile(r"https?://\S+")
EMAIL = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
SECRET = re.compile(
    r"(?i)\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|"
    r"sk-[A-Za-z0-9_-]{16,}|xox[baprs]-[A-Za-z0-9-]{12,}|AIza[A-Za-z0-9_-]{20,})\b"
)
WHITESPACE = re.compile(r"\s+")


def parse_args() -> argparse.Namespace:
    codex_root = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    repo_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--audit-root",
        type=Path,
        default=codex_root / "audit-exports",
        help="Local export-agent-audit archive",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=repo_root / "worklog",
        help="Public worklog directory",
    )
    return parser.parse_args()


def load_audits(root: Path) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []
    for path in sorted(root.rglob("*.json")):
        try:
            document = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
            print(f"warning: skipped {path}: {error}")
            continue
        if document.get("conversation", {}).get("id"):
            documents.append(document)
    return documents


def normalize(value: Any) -> str:
    return WHITESPACE.sub(" ", str(value or "")).strip()


def public_summary(value: Any, limit: int = 260) -> str | None:
    text = normalize(CODE_BLOCK.sub(" ", str(value or "")))
    if not text:
        return None
    text = MARKDOWN_LINK.sub(r"\1", text)
    text = LOCAL_PATH.sub("[local path]", text)
    text = URL.sub("[link]", text)
    text = EMAIL.sub("[email]", text)
    text = SECRET.sub("[credential]", text)
    text = text.replace("`", "")
    boilerplate = (
        "Read-only audit complete; no files changed.",
        "Read-only review complete; no files changed.",
        "No files were edited.",
        "No files were changed.",
    )
    for prefix in boilerplate:
        if text.lower().startswith(prefix.lower()):
            text = text[len(prefix) :].lstrip(" -:;\n")
    text = normalize(text)
    if not text:
        return None
    if len(text) <= limit:
        return text
    shortened = text[: limit + 1].rsplit(" ", 1)[0].rstrip(" ,;:-")
    return shortened + "…"


def title_key(title: str, conversation_id: str) -> str:
    clean = normalize(title).casefold()
    return clean or f"untitled:{conversation_id}"


def task_id(day: str, key: str) -> str:
    digest = hashlib.sha1(key.encode("utf-8"), usedforsecurity=False).hexdigest()[:12]
    return f"task:{day}:{digest}"


def entry_day(item: dict[str, Any]) -> str | None:
    timestamp = str(item.get("timestamp_local") or item.get("started_at_local") or "")
    return timestamp[:10] if len(timestamp) >= 10 else None


def text_haystack(document: dict[str, Any], day: str | None = None) -> str:
    parts: list[Any] = []
    for key in ("requests", "decision_summaries"):
        parts.extend(
            item.get("text", "")
            for item in document.get(key, [])
            if day is None or entry_day(item) == day
        )
    parts.extend(
        item.get("task_label", "")
        for item in document.get("agents", [])
        if day is None or entry_day(item) == day
    )
    if not parts:
        parts.append(document.get("conversation", {}).get("title", ""))
    return normalize(" ".join(str(part or "") for part in parts)).casefold()


def project_for(documents: Iterable[dict[str, Any]], day: str) -> tuple[str, str]:
    docs = list(documents)
    haystack = " ".join(text_haystack(document, day) for document in docs)
    request_text = " ".join(
        normalize(item.get("text")).casefold()
        for document in docs
        for item in document.get("requests", [])
        if entry_day(item) == day
    )
    matches = []
    for project_id, label, needles in PROJECT_RULES:
        score = sum(request_text.count(needle) * 4 + haystack.count(needle) for needle in needles)
        if score:
            matches.append((score, project_id, label))
    if matches:
        _, project_id, label = max(matches, key=lambda item: item[0])
        return project_id, label
    return "other", "Other"


def action_for(title: str) -> str:
    haystack = normalize(title).casefold()
    for label, needles in ACTION_RULES:
        if any(needle in haystack for needle in needles):
            return label
    return "Work session"


def local_time(value: Any) -> str | None:
    text = str(value or "")
    if not text:
        return None
    try:
        return datetime.fromisoformat(text).strftime("%H:%M")
    except ValueError:
        return None


def number(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return int(value)
    return None


def usage_object(document: dict[str, Any], *path: str) -> dict[str, Any]:
    value: Any = document.get("usage", {})
    for part in path:
        if not isinstance(value, dict):
            return {}
        value = value.get(part)
    return value if isinstance(value, dict) else {}


def daily_usage(usage: dict[str, Any], day: str) -> dict[str, Any] | None:
    entries = usage.get("by_local_day")
    if isinstance(entries, list):
        for entry in entries:
            if isinstance(entry, dict) and entry.get("day") == day:
                return entry
    return None


def document_usage(document: dict[str, Any], day: str, *path: str) -> dict[str, Any] | None:
    usage = usage_object(document, *path)
    entry = daily_usage(usage, day)
    if entry is not None:
        return entry
    if document.get("conversation", {}).get("archive_date") == day and "by_local_day" not in usage:
        return usage
    return None


def aggregate_usage(documents: Iterable[dict[str, Any]], day: str) -> dict[str, Any]:
    docs = list(documents)
    main_entries = [document_usage(doc, day, "main") for doc in docs]
    sub_entries = [document_usage(doc, day, "subagents", "aggregate") for doc in docs]
    combined_entries = [document_usage(doc, day, "combined") for doc in docs]

    def retained_total(entries: list[dict[str, Any] | None]) -> int:
        return sum(number(entry.get("total_tokens")) or 0 for entry in entries if entry)

    covered = sum(entry is not None for entry in combined_entries)
    complete = all(entry is None or entry.get("exact_as_observed") is True for entry in combined_entries)
    return {
        "mainThreadTokens": retained_total(main_entries),
        "subagentTokens": retained_total(sub_entries),
        "combinedTokens": retained_total(combined_entries),
        "coveredSessions": covered,
        "totalSessions": len(docs),
        "complete": complete,
    }


def model_label(agent: dict[str, Any]) -> str | None:
    models = [normalize(model) for model in agent.get("models_used", []) if normalize(model)]
    return ", ".join(dict.fromkeys(models)) or None


def main_agent(document: dict[str, Any]) -> dict[str, Any]:
    for agent in document.get("agents", []):
        if agent.get("kind") == "main":
            return agent
    return {}


def session_description(document: dict[str, Any], day: str) -> str:
    decisions = [
        decision
        for decision in document.get("decision_summaries", [])
        if entry_day(decision) == day
    ]
    for decision in reversed(decisions):
        summary = public_summary(decision.get("text"))
        if summary:
            return summary
    main = main_agent(document)
    summary = public_summary(main.get("result_summary"))
    if summary:
        return summary
    return "No public summary retained."


def public_agent(agent: dict[str, Any], session_id: str, day: str) -> dict[str, Any] | None:
    usage = daily_usage(agent.get("usage", {}), day)
    started_today = entry_day(agent) == day
    if usage is None and not started_today:
        return None
    label = normalize(agent.get("task_label")).replace("_", " ").strip().title()
    nickname = normalize(agent.get("nickname")) or None
    return {
        "id": str(agent.get("id")),
        "parentId": str(agent.get("parent_id") or session_id),
        "label": label or nickname or "Subagent",
        "nickname": nickname,
        "description": public_summary(agent.get("result_summary")) or "No public summary retained.",
        "time": local_time(agent.get("started_at_local")) if started_today else None,
        "status": normalize(agent.get("status")) or "unknown",
        "tokens": number(usage.get("total_tokens")) if usage else 0,
        "model": model_label(agent),
    }


def session_time(document: dict[str, Any], day: str) -> str | None:
    candidates = []
    conversation_start = document.get("conversation", {}).get("started_at_local")
    if str(conversation_start or "")[:10] == day:
        candidates.append(str(conversation_start))
    for key in ("requests", "decision_summaries", "agents"):
        for item in document.get(key, []):
            timestamp = str(item.get("timestamp_local") or item.get("started_at_local") or "")
            if timestamp[:10] == day:
                candidates.append(timestamp)
    return local_time(min(candidates)) if candidates else None


def public_session(document: dict[str, Any], day: str) -> dict[str, Any]:
    conversation = document.get("conversation", {})
    session_id = str(conversation.get("id"))
    main = main_agent(document)
    agents = []
    for agent in document.get("agents", []):
        if agent.get("kind") != "subagent":
            continue
        public = public_agent(agent, session_id, day)
        if public is not None:
            agents.append(public)
    usage = document_usage(document, day, "combined")
    return {
        "id": session_id,
        "time": session_time(document, day),
        "description": session_description(document, day),
        "status": normalize(main.get("status")) or "unknown",
        "tokens": number(usage.get("total_tokens")) if usage else 0,
        "model": model_label(main),
        "agents": agents,
    }


def build_day(day: str, documents: list[dict[str, Any]]) -> dict[str, Any]:
    by_title: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for document in documents:
        conversation = document.get("conversation", {})
        by_title[title_key(conversation.get("title", ""), conversation.get("id", ""))].append(document)

    groups: dict[str, dict[str, Any]] = {}
    for key, task_documents in by_title.items():
        task_documents.sort(key=lambda doc: doc.get("conversation", {}).get("started_at_local", ""))
        project_id, project_label = project_for(task_documents, day)
        group = groups.setdefault(project_id, {"id": project_id, "label": project_label, "tasks": []})
        activity_text = " ".join(text_haystack(document, day) for document in task_documents)
        sessions = [public_session(document, day) for document in task_documents]
        description = next(
            (session["description"] for session in reversed(sessions) if session["description"] != "No public summary retained."),
            f"{len(sessions)} retained session{'s' if len(sessions) != 1 else ''}.",
        )
        group["tasks"].append(
            {
                "id": task_id(day, key),
                "label": action_for(activity_text),
                "description": description,
                "usage": aggregate_usage(task_documents, day),
                "sessions": sessions,
            }
        )

    ordered_groups = sorted(groups.values(), key=lambda group: group["label"].casefold())
    for group in ordered_groups:
        group["tasks"].sort(
            key=lambda task: task["sessions"][0].get("time") or "",
            reverse=True,
        )

    timezone = next(
        (
            document.get("conversation", {}).get("local_timezone")
            for document in documents
            if document.get("conversation", {}).get("local_timezone")
        ),
        "America/Phoenix",
    )
    return {
        "schemaVersion": "1.0.0",
        "day": day,
        "timezone": timezone,
        "usage": aggregate_usage(documents, day),
        "groups": ordered_groups,
        "privacy": {
            "hiddenChainOfThoughtIncluded": False,
            "rawPromptsIncluded": False,
            "fullAgentOutputsIncluded": False,
            "filesystemPathsRedacted": True,
        },
    }


def should_publish(document: dict[str, Any]) -> bool:
    conversation = document.get("conversation", {})
    title = normalize(conversation.get("title")).casefold()
    if any(title.startswith(prefix) for prefix in INTERNAL_TITLE_PREFIXES):
        return False
    models = [normalize(model).casefold() for model in main_agent(document).get("models_used", [])]
    if any("auto-review" in model for model in models):
        return False
    return bool(conversation.get("archive_date"))


def document_days(document: dict[str, Any]) -> list[str]:
    days = {
        str(entry.get("day"))
        for entry in usage_object(document, "combined").get("by_local_day", [])
        if isinstance(entry, dict) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(entry.get("day", "")))
    }
    for key in ("requests", "decision_summaries", "agents"):
        for item in document.get(key, []):
            day = entry_day(item)
            if day:
                days.add(day)
    if not days:
        fallback = str(document.get("conversation", {}).get("archive_date") or "")
        if fallback:
            days.add(fallback)
    return sorted(days)


def compact_write(path: Path, value: Any) -> int:
    payload = json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload, encoding="utf-8", newline="\n")
    return len(payload.encode("utf-8"))


def main() -> int:
    args = parse_args()
    documents = [document for document in load_audits(args.audit_root) if should_publish(document)]
    if not documents:
        raise SystemExit(f"no publishable audits found under {args.audit_root}")

    by_day: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for document in documents:
        for day in document_days(document):
            by_day[day].append(document)

    day_entries = []
    for day in sorted(by_day, reverse=True):
        day_document = build_day(day, by_day[day])
        relative_path = f"days/{day}.json"
        size = compact_write(args.output_root / relative_path, day_document)
        task_count = sum(len(group["tasks"]) for group in day_document["groups"])
        session_count = day_document["usage"]["totalSessions"]
        agent_count = sum(
            len(session["agents"])
            for group in day_document["groups"]
            for task in group["tasks"]
            for session in task["sessions"]
        )
        day_entries.append(
            {
                "day": day,
                "path": relative_path,
                "groups": len(day_document["groups"]),
                "tasks": task_count,
                "sessions": session_count,
                "agents": agent_count,
                "tokens": day_document["usage"]["combinedTokens"],
                "complete": day_document["usage"]["complete"],
                "bytes": size,
                "labels": [group["label"] for group in day_document["groups"]],
            }
        )

    updated_values = [
        document.get("conversation", {}).get("updated_at")
        for document in documents
        if document.get("conversation", {}).get("updated_at")
    ]
    index = {
        "schemaVersion": "1.0.0",
        "generatedAt": max(updated_values) if updated_values else None,
        "days": day_entries,
        "privacy": {
            "source": "privacy-safe local audit projection",
            "rawPromptsIncluded": False,
            "hiddenChainOfThoughtIncluded": False,
        },
    }
    compact_write(args.output_root / "index.json", index)
    total_bytes = sum(entry["bytes"] for entry in day_entries)
    print(
        f"wrote {len(day_entries)} days, {sum(entry['tasks'] for entry in day_entries)} task groups, "
        f"and {sum(entry['sessions'] for entry in day_entries)} sessions ({total_bytes} bytes)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
