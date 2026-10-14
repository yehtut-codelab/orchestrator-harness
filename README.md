# Northstar Workbench

A mock-first React and TypeScript operator console for submitting requirements, tracking backend runs, reviewing generated artifacts and test evidence, and responding to approval requests. Agent orchestration and repository execution stay in the backend.

## Run locally

Install the dependencies listed in `package.json`, then run:

```sh
npm run dev
```

The default API is in-memory mock data. To use a compatible backend, set `VITE_API_BASE_URL` to its base URL before starting Vite. The required routes and resource shapes are documented in [API_CONTRACT.md](./API_CONTRACT.md).

The app uses React, TypeScript, and Vite. It has no component library or data-grid dependency.

## Jira-driven orchestrator

The revised harness scaffold is in [orchestrator](./orchestrator/README.md).
It is designed to fetch tickets and dependencies from Jira MCP, read support
documents from a separate specification repository, and execute Codex against
a separate coding repository. Jira is intended to remain the ticket source of
truth; the harness no longer keeps ticket copies or a manual ticket manifest.

The Jira MCP connection and the two repository paths have not been configured,
so the orchestrator is not runnable yet. The current React workbench remains a
mock-first UI with no backend integration.
