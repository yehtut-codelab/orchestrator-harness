"""Repository evidence and configured verification gates."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any


class VerificationError(RuntimeError):
    pass


def git(root: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["git", *args], cwd=root, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    if check and result.returncode:
        raise VerificationError(f"git {' '.join(args)} failed: {(result.stdout + result.stderr).strip()}")
    return result


def verify_clean_git_root(code_root: Path) -> str:
    top = git(code_root, "rev-parse", "--show-toplevel").stdout.strip()
    if Path(top).resolve() != code_root.resolve():
        raise VerificationError(f"Coding repository path must be its Git root: {top}")
    status = git(code_root, "status", "--porcelain", "--untracked-files=all").stdout
    if status.strip():
        raise VerificationError("Coding checkout must be clean before planning or running.")
    return git(code_root, "rev-parse", "HEAD").stdout.strip()


def matching_commit(code_root: Path, issue_key: str, revision: str = "HEAD") -> str | None:
    history = git(code_root, "log", "--format=%H%x00%s", revision).stdout.splitlines()
    pattern = re.compile(rf"(?<![A-Za-z0-9]){re.escape(issue_key)}(?![A-Za-z0-9])", re.IGNORECASE)
    for line in history:
        commit, separator, subject = line.partition("\x00")
        if separator and pattern.search(subject):
            return commit
    return None


def dependency_evidence(code_root: Path, issue_key: str, status: str, complete_statuses: set[str]) -> tuple[bool, str]:
    if status.casefold() not in complete_statuses:
        return False, f"Jira status is {status!r}, not a configured completed status"
    commit = matching_commit(code_root, issue_key)
    if commit is None:
        return False, "no issue-key commit is reachable from the coding branch"
    return True, f"Jira status {status!r}; commit {commit[:12]} is reachable from the coding branch"


def check_program(command: list[str], label: str) -> None:
    if not command:
        raise VerificationError(f"{label} command is empty")
    executable = command[0]
    if (Path(executable).is_absolute() or "/" in executable or "\\" in executable) and not Path(executable).is_file():
        raise VerificationError(f"{label} executable does not exist: {executable}")
    if not (Path(executable).is_absolute() or "/" in executable or "\\" in executable) and shutil.which(executable) is None:
        raise VerificationError(f"{label} executable is not on PATH: {executable}")


def run_command(command: list[str], cwd: Path, timeout: int) -> tuple[int, str]:
    executable = shutil.which(command[0]) or command[0]
    argv = [executable, *command[1:]]
    if os.name == "nt" and Path(executable).suffix.casefold() in {".cmd", ".bat"}:
        argv = [os.environ.get("COMSPEC", "cmd.exe"), "/d", "/s", "/c", subprocess.list2cmdline(argv)]
    try:
        result = subprocess.run(
            argv, cwd=cwd, capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=timeout,
        )
        return result.returncode, result.stdout + result.stderr
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout or ""
        stderr = exc.stderr or ""
        if isinstance(stdout, bytes):
            stdout = stdout.decode("utf-8", errors="replace")
        if isinstance(stderr, bytes):
            stderr = stderr.decode("utf-8", errors="replace")
        return 124, f"{stdout}{stderr}\nCOMMAND TIMED OUT after {timeout} seconds\n"
    except OSError as exc:
        return 127, f"Could not start command: {exc}\n"


def run_verification(commands: list[list[str]], cwd: Path, timeout: int) -> tuple[bool, str]:
    if not commands:
        return False, "No verification commands are configured."
    output: list[str] = []
    failed = False
    for command in commands:
        output.append(f"\n$ {' '.join(command)}\n")
        code, detail = run_command(command, cwd, timeout)
        output.append(detail)
        if code:
            failed = True
            output.append(f"\nExit code: {code}\n")
    return not failed, "".join(output)
