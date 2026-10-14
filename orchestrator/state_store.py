"""Durable run status and per-attempt logs, stored under the harness."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class StateStore:
    def __init__(self, harness_root: Path, relative_dir: str):
        base = harness_root.resolve()
        self.root = (base / relative_dir).resolve()
        if self.root != base and base not in self.root.parents:
            raise ValueError("state.directory must remain inside the harness directory")

    def create_run(self, issue_key: str, objective: str) -> tuple[str, Path, dict[str, Any]]:
        run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + issue_key.replace("/", "_") + "-" + uuid.uuid4().hex[:6]
        run_dir = self.root / run_id
        run_dir.mkdir(parents=True, exist_ok=False)
        (run_dir / "logs").mkdir()
        state = {
            "run_id": run_id,
            "issue_key": issue_key,
            "objective": objective,
            "state": "PLANNING",
            "started_at": now_utc(),
            "finished_at": None,
            "plan": [],
            "attempts": [],
        }
        self.save(run_dir, state)
        return run_id, run_dir, state

    def save(self, run_dir: Path, state: dict[str, Any]) -> None:
        target = run_dir / "status.json"
        temporary = run_dir / "status.tmp"
        temporary.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        os.replace(temporary, target)

    def log_attempt(self, run_dir: Path, issue_key: str, attempt: int, content: str) -> Path:
        path = run_dir / "logs" / f"{issue_key}-attempt-{attempt}.log"
        path.write_text(content, encoding="utf-8")
        return path
