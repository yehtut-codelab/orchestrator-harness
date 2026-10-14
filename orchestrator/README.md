# Jira-driven spec-to-code orchestrator

The harness accepts one Jira issue key. It reads issue descriptions,
acceptance criteria, status, and dependency links from Jira MCP; retrieves
supporting documents from a read-only specification repository; and runs
Codex and verification commands in a separate coding repository.

It does not use a second ticket manifest or copy ticket specs into the coding
repository. Jira is the ticket source of truth. A prerequisite is eligible
only when Jira reports a configured completed status and an issue-key commit
is reachable from the coding branch.

## Setup

1. Install Python 3.10 or later and uv. Dependencies are declared in
   `pyproject.toml` and are resolved by each `uv run` command.
2. Copy `config.example.yaml` to the gitignored `config.yaml`.
3. Set the MCP command to `uv`, its args to the existing Jira MCP server
   launch command, add repository paths, and configure the issue-fetch MCP
   tool name and argument mapping. Keep credentials in environment variables.
4. Run `uv run python run.py --discover-tools` and use the advertised tool
   names and input schemas to finish the mapping.
5. Run `uv run python run.py JIRA-132 --plan` to inspect Jira and branch
   evidence before allowing Codex to edit code.
6. Run `uv run python run.py JIRA-132` to implement an eligible ticket.

The configured issue tool must return explicit dependency data, even when the
dependency list is empty. If it omits links, configure
`jira.tools.get_dependencies`; the planner blocks when neither source is
available so an unknown dependency list cannot be mistaken for no dependencies.

The original coding checkout must be clean. Codex runs in a separate worktree
and branch; successful changes, status, and attempt logs stay available for
review. Failed attempt edits are discarded only inside that worktree. The spec
repository is read-only. An optional Jira status tool can move a successful
implementation to the configured review status; the harness never marks a
ticket Done.
