"""Jira MCP adapter using the official Python MCP client."""

from __future__ import annotations

import json
import os
import re
from dataclasses import replace
from typing import Any

from dependency_graph import PlannedIssue, normalize_issue, text_content


class JiraMcpError(RuntimeError):
    pass


class JiraMcpClient:
    def __init__(self, config: dict[str, Any]):
        self.config = config
        self.client: Any | None = None
        self._context: Any | None = None

    async def __aenter__(self) -> "JiraMcpClient":
        from mcp import Client, StdioServerParameters

        jira = self.config.get("jira", {})
        transport = jira.get("transport", "stdio")
        if transport == "stdio":
            command = jira.get("command")
            if not command:
                raise JiraMcpError("Set jira.command to the uv executable in config.yaml.")
            inherited_names = {
                "PATH", "SYSTEMROOT", "WINDIR", "USERPROFILE", "APPDATA",
                "LOCALAPPDATA", "HOME", "TEMP", "TMP", "VIRTUAL_ENV", "UV_CACHE_DIR",
            }
            child_env = {key: value for key, value in os.environ.items() if key.upper() in inherited_names}
            child_env.update({str(k): str(v) for k, v in jira.get("env", {}).items()})
            parameters = StdioServerParameters(
                command=str(command),
                args=[str(value) for value in jira.get("args", [])],
                env=child_env,
            )
            endpoint: Any = parameters
        elif transport == "streamable-http":
            url = jira.get("url")
            if not url:
                raise JiraMcpError("Set jira.url for the streamable-http transport.")
            endpoint = str(url)
        else:
            raise JiraMcpError(f"Unsupported jira.transport: {transport}")

        self._context = Client(endpoint)
        self.client = await self._context.__aenter__()
        return self

    async def __aexit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        if self._context is not None:
            await self._context.__aexit__(exc_type, exc, traceback)
        self.client = None

    async def list_tools(self) -> list[dict[str, str]]:
        client = self._require_client()
        response = await client.list_tools()
        return [
            {
                "name": tool.name,
                "description": tool.description or "",
                "input_schema": getattr(tool, "input_schema", {}),
            }
            for tool in response.tools
        ]

    async def get_issue(self, issue_key: str) -> PlannedIssue:
        jira = self.config.get("jira", {})
        tool = jira.get("tools", {}).get("get_issue", {})
        tool_name = tool.get("name", "") if isinstance(tool, dict) else ""
        if not tool_name:
            raise JiraMcpError("Set jira.tools.get_issue.name after running --discover-tools.")
        args = resolve_arguments(tool.get("arguments", {}), {"issue_key": issue_key})
        result = await self._call(tool_name, args)
        raw = unpack_result(result)
        links = jira.get("dependency_links", {})
        issue = normalize_issue(raw, issue_key, links)
        acceptance_path = jira.get("acceptance_criteria_field", "")
        if acceptance_path:
            criteria = lookup_path(raw, str(acceptance_path))
            if criteria:
                issue = replace(issue, acceptance_criteria=text_content(criteria))
        dependency_tool = jira.get("tools", {}).get("get_dependencies", {})
        dependency_name = dependency_tool.get("name", "") if isinstance(dependency_tool, dict) else ""
        if dependency_name:
            dependency_args = resolve_arguments(
                dependency_tool.get("arguments", {}), {"issue_key": issue_key}
            )
            dependency_result = await self._call(dependency_name, dependency_args)
            extra = dependency_keys(unpack_result(dependency_result))
            merged = tuple(dict.fromkeys([*issue.dependencies, *extra]))
            issue = replace(issue, dependencies=merged, dependencies_known=True)
        return issue

    async def update_status(self, issue_key: str, status: str) -> None:
        jira = self.config.get("jira", {})
        tool = jira.get("tools", {}).get("update_status", {})
        tool_name = tool.get("name", "") if isinstance(tool, dict) else ""
        if not tool_name:
            return
        args = resolve_arguments(tool.get("arguments", {}), {"issue_key": issue_key, "status": status})
        await self._call(tool_name, args)

    async def _call(self, name: str, arguments: dict[str, Any]) -> Any:
        client = self._require_client()
        try:
            result = await client.call_tool(name, arguments)
        except Exception as exc:
            raise JiraMcpError(f"Jira MCP tool {name} failed: {exc}") from exc
        if getattr(result, "is_error", False):
            raise JiraMcpError(f"Jira MCP tool {name} returned an error: {unpack_result(result)}")
        return result

    def _require_client(self) -> Any:
        if self.client is None:
            raise JiraMcpError("Jira MCP client is not connected.")
        return self.client


def resolve_arguments(value: Any, variables: dict[str, str]) -> Any:
    if isinstance(value, dict):
        return {key: resolve_arguments(item, variables) for key, item in value.items()}
    if isinstance(value, list):
        return [resolve_arguments(item, variables) for item in value]
    if isinstance(value, str):
        return re.sub(r"\$\{([a-z_]+)\}", lambda match: variables.get(match.group(1), match.group(0)), value)
    return value


def unpack_result(result: Any) -> Any:
    structured = getattr(result, "structured_content", None)
    if structured is not None:
        return structured
    content = getattr(result, "content", None) or []
    text_blocks = [block.text for block in content if getattr(block, "type", None) == "text" and hasattr(block, "text")]
    text = "\n".join(text_blocks).strip()
    if not text:
        return {}
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


def lookup_path(value: Any, dotted_path: str) -> Any:
    current = value
    for part in dotted_path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def dependency_keys(value: Any) -> list[str]:
    if isinstance(value, dict):
        for name in ("dependencies", "depends_on", "blockedBy", "blocked_by", "issues"):
            if name in value:
                return dependency_keys(value[name])
        key = value.get("key") or value.get("issueKey")
        if key:
            return [str(key)]
        raise JiraMcpError("Dependency MCP tool returned an unrecognized object shape.")
    if isinstance(value, list):
        found: list[str] = []
        for item in value:
            for key in dependency_keys(item):
                if key not in found:
                    found.append(key)
        return found
    if isinstance(value, str):
        keys = re.findall(r"(?<![A-Za-z0-9])[A-Z][A-Z0-9_]+-\d+(?![A-Za-z0-9])", value, re.IGNORECASE)
        if keys:
            return list(dict.fromkeys(keys))
        if value.strip().casefold() in {"", "none", "no dependencies", "[]"}:
            return []
    raise JiraMcpError("Dependency MCP tool did not return Jira issue keys or an explicit empty list.")
