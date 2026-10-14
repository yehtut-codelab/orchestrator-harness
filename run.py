#!/usr/bin/env python3
"""Jira -> specification context -> isolated code implementation workflow."""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path
from typing import Any

from codex_runner import build_prompt, run_codex
from config import ConfigError, load_config, require_paths
from dependency_graph import DependencyError, PlannedIssue, resolve_graph, topological_order
from jira_client import JiraMcpClient, JiraMcpError
from spec_context import collect_context, format_context
from state_store import StateStore, now_utc
from verifier import (
    VerificationError,
    check_program,
    dependency_evidence,
    git,
    matching_commit,
    run_verification,
    verify_clean_git_root,
)


HARNESS_ROOT = Path(__file__).resolve().parent


def issue_row(issue: PlannedIssue) -> dict[str, Any]:
    return {
        "key": issue.key,
        "summary": issue.summary,
        "status": issue.status,
        "dependencies": list(issue.dependencies),
    }


async def discover_tools(config: dict[str, Any]) -> int:
    async with JiraMcpClient(config) as jira:
        tools = await jira.list_tools()
    print(json.dumps(tools, indent=2, ensure_ascii=False))
    return 0


async def fetch_plan(config: dict[str, Any], target_key: str) -> tuple[list[PlannedIssue], dict[str, tuple[bool, str]], Path, Path, str]:
    spec_root, code_root = require_paths(config)
    head = verify_clean_git_root(code_root)
    async with JiraMcpClient(config) as jira:
        issues = await resolve_graph(target_key, jira.get_issue)

    ordered = topological_order(issues, target_key)
    jira_config = config.get("jira", {})
    complete_statuses = {str(value).casefold() for value in jira_config.get("status", {}).get("complete", [])}
    evidence: dict[str, tuple[bool, str]] = {}
    for issue in ordered:
        if issue.key == target_key:
            continue
        evidence[issue.key] = dependency_evidence(code_root, issue.key, issue.status, complete_statuses)
    return ordered, evidence, spec_root, code_root, head


def display_plan(ordered: list[PlannedIssue], evidence: dict[str, tuple[bool, str]], code_root: Path) -> None:
    print("Jira dependency plan (prerequisites first):")
    for issue in ordered:
        if issue.dependencies:
            dep_text = ", ".join(issue.dependencies)
        else:
            dep_text = "none"
        if issue.key in evidence:
            ready, detail = evidence[issue.key]
            state = "READY" if ready else "BLOCKED"
            print(f"{state:7} {issue.key} [{issue.status}] {issue.summary} — {detail}")
        else:
            target_commit = matching_commit(code_root, issue.key)
            code_state = f"commit {target_commit[:12]} present" if target_commit else "no issue-key commit in branch"
            print(f"TARGET  {issue.key} [{issue.status}] {issue.summary} — depends on: {dep_text}; {code_state}")


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-") or "ticket"


def prepare_worktree(code_root: Path, run_dir: Path, head: str, branch: str) -> Path:
    checkout = run_dir / "checkout"
    git(code_root, "worktree", "add", "-b", branch, str(checkout), head)
    return checkout


def reset_attempt(checkout: Path, checkpoint: str) -> None:
    # This path is a fresh worktree created by this run, never the user's checkout.
    git(checkout, "reset", "--hard", checkpoint)
    git(checkout, "clean", "-fdx")


def commit_ticket(checkout: Path, checkpoint: str, issue: PlannedIssue) -> str:
    git(checkout, "add", "--all")
    staged = git(checkout, "diff", "--cached", "--quiet", check=False).returncode != 0
    current = git(checkout, "rev-parse", "HEAD").stdout.strip()
    if staged:
        git(
            checkout,
            "-c", "user.name=Jira spec-to-code orchestrator",
            "-c", "user.email=orchestrator@localhost",
            "commit", "-m", f"{issue.key}: {issue.summary}",
        )
        current = git(checkout, "rev-parse", "HEAD").stdout.strip()
    if current == checkpoint:
        raise VerificationError("Codex made no changes and created no commit for this Jira ticket.")
    if matching_commit(checkout, issue.key) is None:
        git(
            checkout,
            "-c", "user.name=Jira spec-to-code orchestrator",
            "-c", "user.email=orchestrator@localhost",
            "commit", "--allow-empty", "-m", f"{issue.key}: verified implementation checkpoint",
        )
        current = git(checkout, "rev-parse", "HEAD").stdout.strip()
    return current


async def execute(config: dict[str, Any], issue: PlannedIssue, prerequisites: list[PlannedIssue],
                  evidence: dict[str, tuple[bool, str]], spec_root: Path, code_root: Path,
                  source_head: str) -> int:
    execution = config.get("execution", {})
    commands = execution.get("verification_commands", [])
    if not isinstance(commands, list) or not commands:
        raise ConfigError("Configure at least one execution.verification_commands command.")
    codex_command = execution.get("codex_command", [])
    if not isinstance(codex_command, list) or not codex_command:
        raise ConfigError("Configure execution.codex_command as an argument array.")
    for command in [*commands, codex_command]:
        check_program(command, "Configured command")

    context = format_context(collect_context(spec_root, issue, config))
    store = StateStore(HARNESS_ROOT, str(config.get("state", {}).get("directory", "runs")))
    run_id, run_dir, state = store.create_run(issue.key, f"Complete Jira ticket {issue.key}")
    branch_prefix = str(execution.get("branch_prefix", "agent/jira"))
    branch = f"{branch_prefix}/{safe_name(issue.key)}-{run_id.rsplit('-', 1)[-1]}"
    checkout = prepare_worktree(code_root, run_dir, source_head, branch)
    checkpoint = git(checkout, "rev-parse", "HEAD").stdout.strip()

    state.update({
        "state": "RUNNING",
        "branch": branch,
        "worktree": str(checkout),
        "source_commit": source_head,
        "plan": [issue_row(item) for item in [*prerequisites, issue]],
        "dependency_evidence": {key: {"ready": ready, "detail": detail} for key, (ready, detail) in evidence.items()},
    })
    store.save(run_dir, state)
    timeout = int(execution.get("command_timeout_seconds", 3600))
    max_attempts = max(1, int(execution.get("max_attempts_per_ticket", 3)))
    failure_context: str | None = None
    final_commit: str | None = None

    for attempt in range(1, max_attempts + 1):
        print(f"[RUN] {issue.key}, attempt {attempt}/{max_attempts}")
        prompt = build_prompt(issue, prerequisites, context)
        if failure_context:
            prompt += "\n\nPrevious attempt diagnostics to fix:\n" + failure_context[-12000:]
        codex_exit, codex_output = run_codex(codex_command, prompt, checkout, timeout)
        transcript = [f"Ticket {issue.key} attempt {attempt}\n", f"\n=== CODEX EXIT {codex_exit} ===\n", codex_output]
        if codex_exit:
            passed, verify_output = False, f"Codex exited with code {codex_exit}.\n{codex_output[-12000:]}"
        else:
            passed, verify_output = run_verification(commands, checkout, timeout)
        transcript.extend(["\n=== VERIFICATION ===\n", verify_output])

        if passed:
            try:
                final_commit = commit_ticket(checkout, checkpoint, issue)
                transcript.append(f"\nPASS; commit {final_commit}\n")
                store.log_attempt(run_dir, issue.key, attempt, "".join(transcript))
                state["state"] = "IMPLEMENTED"
                state["finished_at"] = now_utc()
                state["final_commit"] = final_commit
                state["attempts"].append({"number": attempt, "state": "PASS"})
                store.save(run_dir, state)
                break
            except VerificationError as exc:
                passed = False
                verify_output += f"\n{exc}\n"
                transcript.append(f"\n{exc}\n")

        failure_context = verify_output
        state["attempts"].append({"number": attempt, "state": "FAILED", "reason": failure_context})
        store.log_attempt(run_dir, issue.key, attempt, "".join(transcript))
        store.save(run_dir, state)
        reset_attempt(checkout, checkpoint)
        if attempt < max_attempts:
            print(f"[RETRY] {issue.key}: implementation or verification did not pass.")

    if final_commit is None:
        state["state"] = "FAILED"
        state["finished_at"] = now_utc()
        store.save(run_dir, state)
        print(f"[FAILED] {issue.key}; inspect {run_dir}")
        return 1

    update_config = config.get("jira", {}).get("tools", {}).get("update_status", {})
    status_label = config.get("jira", {}).get("status", {}).get("implementation_complete", "In Review")
    if update_config.get("name"):
        try:
            async with JiraMcpClient(config) as jira:
                await jira.update_status(issue.key, status_label)
            state["jira_status_updated_to"] = status_label
            store.save(run_dir, state)
        except JiraMcpError as exc:
            state["state"] = "STATUS_UPDATE_FAILED"
            state["jira_status_error"] = str(exc)
            store.save(run_dir, state)
            print(f"[IMPLEMENTED, JIRA UPDATE FAILED] {exc}")
            return 1
    else:
        state["jira_status_note"] = "No update_status MCP tool configured; Jira was not changed."
        store.save(run_dir, state)

    print(f"[IMPLEMENTED] {issue.key}; review branch {branch}")
    print(f"Worktree and logs: {run_dir}")
    return 0


async def async_main(args: argparse.Namespace) -> int:
    config = load_config(args.config.resolve())
    if args.discover_tools:
        return await discover_tools(config)

    if not args.issue_key:
        raise ConfigError("Supply a Jira issue key, for example python run.py CUST-132.")
    ordered, evidence, spec_root, code_root, source_head = await fetch_plan(config, args.issue_key)
    display_plan(ordered, evidence, code_root)
    target = ordered[-1]
    if target.key.upper() != args.issue_key.upper():
        raise DependencyError(f"Resolved target {target.key} does not match {args.issue_key}.")
    unmet = [key for key, (ready, _) in evidence.items() if not ready]
    if unmet:
        print("Execution blocked until Jira status and coding-branch evidence pass for every prerequisite.")
        return 1
    completed_statuses = {
        str(value).casefold()
        for value in config.get("jira", {}).get("status", {}).get("complete", [])
    }
    if target.status.casefold() in completed_statuses:
        target_commit = matching_commit(code_root, target.key)
        if target_commit:
            print(f"Ticket {target.key} is already complete in Jira and commit {target_commit[:12]} is in the coding branch.")
            return 0
        print(f"Ticket {target.key} is marked complete in Jira, but no issue-key commit is present in the coding branch.")
        return 1
    if args.plan:
        print(f"Plan is eligible from coding commit {source_head}; no code or Jira changes were made.")
        return 0
    prerequisites = [item for item in ordered if item.key != target.key]
    return await execute(config, target, prerequisites, evidence, spec_root, code_root, source_head)


def main() -> int:
    parser = argparse.ArgumentParser(description="Resolve a Jira issue and implement it from repository specifications.")
    parser.add_argument("issue_key", nargs="?", help="Jira issue key, for example CUST-132")
    parser.add_argument("--config", type=Path, default=HARNESS_ROOT / "config.yaml")
    parser.add_argument("--plan", action="store_true", help="Resolve Jira and repository evidence without starting Codex")
    parser.add_argument("--discover-tools", action="store_true", help="List the tools exposed by the configured Jira MCP server")
    args = parser.parse_args()
    try:
        return asyncio.run(async_main(args))
    except (ConfigError, DependencyError, JiraMcpError, VerificationError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("\nInterrupted; inspect the last saved run state.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
