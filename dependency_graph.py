"""Resolve Jira dependency links into a deterministic prerequisite plan."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any


class DependencyError(ValueError):
    pass


@dataclass(frozen=True)
class PlannedIssue:
    key: str
    summary: str
    status: str
    description: str
    acceptance_criteria: str
    dependencies: tuple[str, ...]
    dependencies_known: bool


IssueFetcher = Callable[[str], Awaitable[PlannedIssue]]


async def resolve_graph(target_key: str, fetch_issue: IssueFetcher) -> dict[str, PlannedIssue]:
    """Fetch target and all transitive Jira prerequisites."""
    issues: dict[str, PlannedIssue] = {}
    pending = [target_key]
    while pending:
        key = pending.pop()
        if key in issues:
            continue
        issue = await fetch_issue(key)
        if issue.key.upper() != key.upper():
            raise DependencyError(f"Jira returned {issue.key} when {key} was requested")
        if not issue.dependencies_known:
            raise DependencyError(
                f"Jira did not return dependency links for {key}; configure the get_dependencies MCP tool."
            )
        issues[key] = issue
        for dependency in reversed(issue.dependencies):
            if dependency not in issues:
                pending.append(dependency)
    topological_order(issues, target_key)
    return issues


def topological_order(issues: dict[str, PlannedIssue], target_key: str) -> list[PlannedIssue]:
    """Return prerequisites before the target, preserving Jira link order."""
    result: list[PlannedIssue] = []
    temporary: set[str] = set()
    permanent: set[str] = set()

    def visit(key: str) -> None:
        if key in permanent:
            return
        if key in temporary:
            raise DependencyError(f"Circular Jira dependency detected at {key}")
        issue = issues.get(key)
        if issue is None:
            raise DependencyError(f"Dependency graph is missing Jira issue {key}")
        temporary.add(key)
        for dependency in issue.dependencies:
            visit(dependency)
        temporary.remove(key)
        permanent.add(key)
        result.append(issue)

    visit(target_key)
    return result


def normalize_issue(raw: Any, requested_key: str, link_config: dict[str, list[str]]) -> PlannedIssue:
    """Normalize common Jira issue and issue-link response shapes."""
    if isinstance(raw, list):
        if len(raw) != 1:
            raise DependencyError(f"Expected one Jira issue for {requested_key}, got {len(raw)}")
        raw = raw[0]
    if not isinstance(raw, dict):
        raise DependencyError(f"Jira issue {requested_key} response was not an object")

    issue = raw.get("issue", raw)
    if not isinstance(issue, dict):
        raise DependencyError(f"Jira issue {requested_key} response had no issue object")
    fields = issue.get("fields", {})
    if not isinstance(fields, dict):
        fields = {}
    key = str(issue.get("key") or issue.get("issueKey") or requested_key)
    summary = str(fields.get("summary") or issue.get("summary") or key)
    status_value = fields.get("status") or issue.get("status") or "Unknown"
    status = status_value.get("name", "Unknown") if isinstance(status_value, dict) else str(status_value)
    description = text_content(fields.get("description") or issue.get("description") or "")
    acceptance = text_content(
        fields.get("acceptanceCriteria")
        or fields.get("acceptance_criteria")
        or issue.get("acceptanceCriteria")
        or issue.get("acceptance_criteria")
        or extract_acceptance_criteria(description)
    )
    dependency_data_present = any(
        name in issue or name in fields or name in raw
        for name in ("dependencies", "depends_on", "issuelinks", "issueLinks")
    )
    dependency_source = {**raw, **issue}
    dependencies = issue_dependencies(dependency_source, fields, key, link_config)
    return PlannedIssue(key, summary, status, description, acceptance, tuple(dependencies), dependency_data_present)


def issue_dependencies(issue: dict[str, Any], fields: dict[str, Any], current_key: str, config: dict[str, list[str]]) -> list[str]:
    explicit = issue.get("dependencies") or fields.get("dependencies") or issue.get("depends_on") or []
    dependencies: list[str] = []
    for item in explicit if isinstance(explicit, list) else []:
        key = item.get("key") if isinstance(item, dict) else item
        if isinstance(key, str) and key and key != current_key and key not in dependencies:
            dependencies.append(key)

    inward_names = {name.casefold() for name in config.get("inward", [])}
    outward_names = {name.casefold() for name in config.get("outward", [])}
    links = fields.get("issuelinks") or fields.get("issueLinks") or issue.get("issuelinks") or []
    for link in links if isinstance(links, list) else []:
        if not isinstance(link, dict):
            continue
        link_type = link.get("type") or {}
        inward_name = str(link_type.get("inward", "")).casefold()
        outward_name = str(link_type.get("outward", "")).casefold()
        inward_issue = link.get("inwardIssue") or {}
        outward_issue = link.get("outwardIssue") or {}
        inward_key = inward_issue.get("key") if isinstance(inward_issue, dict) else None
        outward_key = outward_issue.get("key") if isinstance(outward_issue, dict) else None
        dependency = None
        if inward_key == current_key and inward_name in inward_names:
            dependency = outward_key
        elif outward_key == current_key and outward_name in outward_names:
            dependency = inward_key
        if isinstance(dependency, str) and dependency != current_key and dependency not in dependencies:
            dependencies.append(dependency)
    return dependencies


def text_content(value: Any) -> str:
    """Flatten strings or nested Atlassian document content."""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return " ".join(text for part in value if (text := text_content(part)))
    if isinstance(value, dict):
        if isinstance(value.get("text"), str):
            return value["text"]
        return " ".join(text for part in value.values() if (text := text_content(part)))
    return ""


def extract_acceptance_criteria(description: str) -> str:
    lines = description.splitlines()
    start = None
    for index, line in enumerate(lines):
        if "acceptance criteria" in line.casefold():
            start = index + 1
            break
    if start is None:
        return ""
    selected: list[str] = []
    for line in lines[start:]:
        if line.lstrip().startswith("#") and selected:
            break
        selected.append(line)
    return "\n".join(selected).strip()
