# Workbench API contract

There is no backend source code, OpenAPI document, or API route in this workspace yet. The frontend currently uses realistic in-memory mock data. `src/services/api.ts` contains the matching `HttpWorkbenchApi` adapter; setting `VITE_API_BASE_URL` switches the UI to HTTP.

The backend remains the source of truth for run state, permissions, repository access, workflow execution, and approval decisions. The UI only submits commands and displays backend-reported status and evidence. All timestamps are ISO 8601 strings. List endpoints return JSON arrays; object endpoints return the typed resource described below. IDs are stable strings.

## Routes the current UI needs

| Method and route | Purpose | Response / body |
| --- | --- | --- |
| `GET /requirements` | Populate the requirements queue. | `Requirement[]` |
| `GET /runs` | Populate recent runs and overview counts. | `Run[]` |
| `POST /runs` | Submit a requirement and start a backend workflow. | Body: `{ title, description, project }`; response: created `Run`. |
| `GET /runs/{runId}` | Reload durable status and workflow progress. | `Run` |
| `POST /runs/{runId}/cancel` | Request cancellation of an active run. | `204 No Content` |
| `GET /approvals` | Populate the approval queue and decision history. | `Approval[]` |
| `GET /runs/{runId}/approvals` | Show approval requests on a run. | `Approval[]` |
| `POST /approvals/{approvalId}/decision` | Record an approval or request changes. | Body: `{ decision: "approve" \| "request-changes", note?: string }`; `204 No Content`. The backend must authorize the actor and write the audit record. |
| `GET /artifacts` | Browse generated files across runs. | `Artifact[]`, with stable artifact references and concise previews. |
| `GET /runs/{runId}/artifacts` | Show generated files for one run. | `Artifact[]` |
| `GET /tests` | Browse reported check results. | `TestResult[]` |
| `GET /runs/{runId}/tests` | Show check evidence for one run. | `TestResult[]` |
| `GET /activity?limit=10` | Populate the recent activity feed. | `ActivityEvent[]`, newest first. |
| `GET /runs/{runId}/events` | Load saved activity for a run. | `ActivityEvent[]`, newest first. |

`GET /runs/{runId}/events` is a normal JSON read in this first UI. The UI refreshes state on page load and through the refresh control. A live stream is optional; if desired, add `GET /runs/{runId}/events/stream` as SSE (or document a WebSocket equivalent). Stream events should update the displayed view, while reconnects still reload the durable run and event history.

## Resource shapes

The TypeScript definitions in `src/types.ts` are the source for the mock and HTTP response shapes. A run has a stable `id`, `requirementId`, `status`, `currentStep`, `createdAt`, `updatedAt`, safe `summary`, and ordered `steps`. Each step has `id`, `label`, a concise user-safe `detail`, `status`, and optional `duration`.

Requirements, approvals, artifacts, tests, and activity events also use the interfaces in `src/types.ts`. Artifact lists should return stable IDs and paths plus a bounded preview, not file blobs. Test results should include a stable ID, command label, status, duration, and concise detail. Event messages should be safe for the operator UI and must not contain private model reasoning or secrets.

## Integration gaps

- None of these routes can be verified or reused yet because this workspace contains no backend or API specification. All rows above are required by the current screens and HTTP adapter.
- The application has no identity provider or backend authorization configuration. The backend must provide its chosen authentication mechanism and enforce authorization for reads, run creation, cancellation, and approvals. The UI must then attach the corresponding session or token without storing secrets in source code.
- The adapter shows explicit session-expired and permission-denied messages for `401` and `403`. Connect the sign-in flow when the backend's identity setup is known.
- Live progress streaming is not required for the mock-first build. Manual refresh and durable reads are supported; add an event stream only if live updates are needed.
