"""Read-only retrieval of relevant documents from the specification repository."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any


def collect_context(spec_root: Path, issue: Any, config: dict[str, Any]) -> list[tuple[str, str]]:
    settings = config.get("spec_context", {})
    patterns = settings.get("include", ["**/*.md", "AGENTS.md"])
    max_files = max(1, int(settings.get("max_files", 12)))
    max_chars = max(1000, int(settings.get("max_chars", 60000)))
    candidates: set[Path] = set()
    root = spec_root.resolve()
    for pattern in patterns:
        for path in root.glob(pattern):
            if not path.is_file():
                continue
            resolved = path.resolve()
            try:
                resolved.relative_to(root)
            except ValueError:
                continue
            candidates.add(resolved)

    terms = set(re.findall(r"[a-z0-9]{3,}", " ".join(
        [issue.key, issue.summary, issue.description, issue.acceptance_criteria]
    ).casefold()))
    scored: list[tuple[int, str, Path]] = []
    for path in candidates:
        relative = path.relative_to(root).as_posix()
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        haystack = (relative + " " + content).casefold()
        score = sum(1 for term in terms if term in haystack)
        if path.name.casefold() == "agents.md":
            score += 10000
        scored.append((score, relative, path))

    scored.sort(key=lambda item: (-item[0], item[1]))
    selected: list[tuple[str, str]] = []
    total = 0
    for _, relative, path in scored[:max_files]:
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        remaining = max_chars - total
        if remaining <= 0:
            break
        if len(content) > remaining:
            content = content[:remaining] + "\n[document truncated by configured context limit]"
        selected.append((relative, content))
        total += len(content)
    return selected


def format_context(documents: list[tuple[str, str]]) -> str:
    if not documents:
        return "No matching specification documents were found. Follow the repository and Jira requirements and report this gap."
    blocks = []
    for path, content in documents:
        blocks.append(f"--- SPECIFICATION: {path} ---\n{content}")
    return "\n\n".join(blocks)
