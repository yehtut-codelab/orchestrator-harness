"""Configuration loading with explicit environment-variable expansion."""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

import yaml


class ConfigError(ValueError):
    pass


def load_config(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise ConfigError(f"Config not found: {path}. Copy config.example.yaml to config.yaml first.")
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError) as exc:
        raise ConfigError(f"Could not read config {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ConfigError("Config must contain a YAML object at its root.")
    return expand_env(data)


def expand_env(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: expand_env(item) for key, item in value.items()}
    if isinstance(value, list):
        return [expand_env(item) for item in value]
    if not isinstance(value, str):
        return value

    def replace(match: re.Match[str]) -> str:
        variable = match.group(1)
        resolved = os.environ.get(variable)
        if resolved is None:
            raise ConfigError(f"Environment variable {variable} is required by config.")
        return resolved

    return re.sub(r"\$\{ENV:([A-Za-z_][A-Za-z0-9_]*)\}", replace, value)


def require_paths(config: dict[str, Any]) -> tuple[Path, Path]:
    repositories = config.get("repositories", {})
    spec_value = repositories.get("specifications", "")
    code_value = repositories.get("coding", "")
    if not spec_value or not code_value:
        raise ConfigError("Set repositories.specifications and repositories.coding in config.yaml.")
    spec_root = Path(spec_value).expanduser().resolve()
    code_root = Path(code_value).expanduser().resolve()
    if not spec_root.is_dir():
        raise ConfigError(f"Specification repository path does not exist: {spec_root}")
    if not code_root.is_dir():
        raise ConfigError(f"Coding repository path does not exist: {code_root}")
    return spec_root, code_root
