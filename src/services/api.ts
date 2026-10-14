import type { ActivityEvent, Approval, Artifact, Requirement, Run, RunBundle, TestResult } from '../types'

/**
 * UI contract for the backend. MockWorkbenchApi is the default while there is
 * no API in this repository. Set VITE_API_BASE_URL to use the HTTP adapter.
 * See API_CONTRACT.md for routes and the fields this UI expects.
 */
export interface WorkbenchApi {
  listRequirements(): Promise<Requirement[]>
  listRuns(): Promise<Run[]>
  getRunBundle(runId: string): Promise<RunBundle>
  listApprovals(): Promise<Approval[]>
  listArtifacts(): Promise<Artifact[]>
  listTests(): Promise<TestResult[]>
  listActivity(): Promise<ActivityEvent[]>
  createRun(input: { title: string; description: string; project: string }): Promise<Run>
  respondToApproval(approvalId: string, decision: 'approve' | 'request-changes', note?: string): Promise<void>
  cancelRun(runId: string): Promise<void>
}

const now = new Date()
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()

const seedRequirements: Requirement[] = [
  { id: 'REQ-248', title: 'Add magic link authentication', description: 'Let returning customers sign in without a password. Include email delivery, expiry handling, and a clear confirmation state.', project: 'commerce-api', createdAt: ago(28), status: 'needs-review', runId: 'RUN-8F31' },
  { id: 'REQ-247', title: 'Improve checkout error recovery', description: 'Preserve entered details when payment fails and explain how to retry.', project: 'commerce-web', createdAt: ago(122), status: 'in-progress', runId: 'RUN-8F2A' },
  { id: 'REQ-246', title: 'Add CSV export to audit log', description: 'Allow admins to download filtered audit history as a CSV.', project: 'console-app', createdAt: ago(380), status: 'complete', runId: 'RUN-8F10' },
  { id: 'REQ-245', title: 'Document webhook retry policy', description: 'Clarify backoff, retry windows, and how to inspect delivery attempts.', project: 'docs-site', createdAt: ago(1_440), status: 'queued' },
]

const seedRuns: Run[] = [
  { id: 'RUN-8F31', requirementId: 'REQ-248', title: 'Add magic link authentication', project: 'commerce-api', branch: 'agent/magic-link-auth', status: 'waiting', currentStep: 'Review changes', createdAt: ago(26), updatedAt: ago(3), requester: 'Nina Park', requesterInitials: 'NP', summary: 'Passwordless sign-in flow is ready for review. Email verification and expiry handling are covered.', steps: [
    { id: 's1', label: 'Understand requirement', detail: 'Mapped the current sign-in flow and email provider.', status: 'complete', duration: '1m 12s' },
    { id: 's2', label: 'Plan implementation', detail: 'Outlined token model, mail delivery, and expiry checks.', status: 'complete', duration: '2m 08s' },
    { id: 's3', label: 'Implement changes', detail: 'Added one-time tokens and confirmation screens.', status: 'complete', duration: '8m 42s' },
    { id: 's4', label: 'Run checks', detail: 'Unit and integration checks passed.', status: 'complete', duration: '3m 16s' },
    { id: 's5', label: 'Review changes', detail: 'Awaiting your approval to merge the proposed changes.', status: 'active' },
  ] },
  { id: 'RUN-8F2A', requirementId: 'REQ-247', title: 'Improve checkout error recovery', project: 'commerce-web', branch: 'agent/checkout-recovery', status: 'running', currentStep: 'Implement changes', createdAt: ago(121), updatedAt: ago(2), requester: 'Marco Silva', requesterInitials: 'MS', summary: 'Mapping payment error states and retry behaviour before updating checkout recovery.', steps: [
    { id: 's1', label: 'Understand requirement', detail: 'Found existing payment state handling.', status: 'complete', duration: '0m 54s' },
    { id: 's2', label: 'Plan implementation', detail: 'Designing resilient form state for retries.', status: 'complete', duration: '1m 37s' },
    { id: 's3', label: 'Implement changes', detail: 'Updating checkout recovery states.', status: 'active' },
    { id: 's4', label: 'Run checks', detail: 'Waiting for implementation.', status: 'pending' },
    { id: 's5', label: 'Review changes', detail: 'Waiting for checks.', status: 'pending' },
  ] },
  { id: 'RUN-8F10', requirementId: 'REQ-246', title: 'Add CSV export to audit log', project: 'console-app', branch: 'agent/audit-csv-export', status: 'completed', currentStep: 'Complete', createdAt: ago(376), updatedAt: ago(344), requester: 'Avery Chen', requesterInitials: 'AC', summary: 'Added an accessible CSV export for filtered audit log results.', steps: [
    { id: 's1', label: 'Understand requirement', detail: 'Confirmed filter and export expectations.', status: 'complete', duration: '0m 42s' },
    { id: 's2', label: 'Plan implementation', detail: 'Kept export formatting in the existing service.', status: 'complete', duration: '1m 10s' },
    { id: 's3', label: 'Implement changes', detail: 'Added export action and download handling.', status: 'complete', duration: '5m 18s' },
    { id: 's4', label: 'Run checks', detail: 'Unit checks passed.', status: 'complete', duration: '2m 49s' },
    { id: 's5', label: 'Review changes', detail: 'Approved and merged.', status: 'complete', duration: '4m 05s' },
  ] },
  { id: 'RUN-8EE9', requirementId: 'REQ-243', title: 'Reduce duplicate webhook deliveries', project: 'events-service', branch: 'agent/webhook-idempotency', status: 'failed', currentStep: 'Run checks', createdAt: ago(1_045), updatedAt: ago(990), requester: 'Nina Park', requesterInitials: 'NP', summary: 'Implementation is complete, but one integration check could not connect to the local queue.', steps: [
    { id: 's1', label: 'Understand requirement', detail: 'Mapped delivery and acknowledgement behaviour.', status: 'complete', duration: '0m 50s' },
    { id: 's2', label: 'Plan implementation', detail: 'Added idempotency keys for delivery attempts.', status: 'complete', duration: '1m 21s' },
    { id: 's3', label: 'Implement changes', detail: 'Added deduplication at the enqueue boundary.', status: 'complete', duration: '7m 13s' },
    { id: 's4', label: 'Run checks', detail: 'Integration check could not connect to the local queue.', status: 'blocked' },
    { id: 's5', label: 'Review changes', detail: 'Waiting for passing checks.', status: 'pending' },
  ] },
]

const seedApprovals: Approval[] = [
  { id: 'APR-109', runId: 'RUN-8F31', title: 'Merge authentication changes', description: 'Allow the backend to merge the verified magic link flow into the default branch.', scope: 'commerce-api · 4 files changed', requestedAt: ago(3), requester: 'Nina Park', initials: 'NP', status: 'pending' },
  { id: 'APR-108', runId: 'RUN-8EE9', title: 'Retry queue integration check', description: 'The local queue was unavailable. Approve a rerun after the queue service is restored.', scope: 'events-service · rerun checks', requestedAt: ago(27), requester: 'Nina Park', initials: 'NP', status: 'pending' },
  { id: 'APR-104', runId: 'RUN-8F10', title: 'Merge CSV export', description: 'Approved the audit log CSV export.', scope: 'console-app · merged', requestedAt: ago(344), requester: 'Avery Chen', initials: 'AC', status: 'approved' },
]

const seedArtifacts: Artifact[] = [
  { id: 'ART-1', runId: 'RUN-8F31', path: 'src/auth/magic-link.service.ts', kind: 'added', additions: 86, deletions: 0, preview: `export async function createMagicLink(email: string) {\n  const token = await tokenStore.create({\n    email: normalizeEmail(email),\n    expiresAt: addMinutes(new Date(), 15),\n  })\n\n  await mailer.send({\n    to: email,\n    template: 'magic-link',\n    data: { url: buildSignInUrl(token.id) },\n  })\n}` },
  { id: 'ART-2', runId: 'RUN-8F31', path: 'src/auth/auth.routes.ts', kind: 'modified', additions: 24, deletions: 3, preview: `router.post('/magic-link', validateEmail, async (req, res) => {\n  await magicLinkService.create(req.body.email)\n  res.status(202).json({ message: 'Check your inbox for a sign-in link.' })\n})\n\nrouter.get('/magic-link/verify', async (req, res) => {\n  const session = await magicLinkService.verify(req.query.token)\n  res.json({ session })\n})` },
  { id: 'ART-3', runId: 'RUN-8F31', path: 'src/auth/__tests__/magic-link.test.ts', kind: 'added', additions: 64, deletions: 0, preview: `it('rejects a token after its expiry', async () => {\n  const token = await tokenStore.create({\n    email: 'nina@example.com',\n    expiresAt: new Date(Date.now() - 1_000),\n  })\n\n  await expect(service.verify(token.id))\n    .rejects.toThrow('Link has expired')\n})` },
  { id: 'ART-4', runId: 'RUN-8F10', path: 'src/audit/export.ts', kind: 'added', additions: 43, deletions: 0, preview: `export function toCsv(rows: AuditEvent[]) {\n  const header = ['Timestamp', 'Actor', 'Action']\n  const body = rows.map(event => [\n    event.createdAt, event.actorName, event.action,\n  ])\n\n  return [header, ...body]\n    .map(row => row.map(escapeCsv).join(','))\n    .join('\\n')\n}` },
]

const seedTests: TestResult[] = [
  { id: 'T-1', runId: 'RUN-8F31', name: 'Authentication service unit tests', command: 'pnpm test auth', status: 'passed', duration: '1m 22s', detail: '32 tests passed' },
  { id: 'T-2', runId: 'RUN-8F31', name: 'API integration suite', command: 'pnpm test:integration auth', status: 'passed', duration: '1m 54s', detail: '14 tests passed' },
  { id: 'T-3', runId: 'RUN-8F31', name: 'TypeScript check', command: 'pnpm typecheck', status: 'passed', duration: '0m 18s', detail: 'No type errors' },
  { id: 'T-4', runId: 'RUN-8F10', name: 'Audit export tests', command: 'pnpm test audit', status: 'passed', duration: '0m 48s', detail: '18 tests passed' },
  { id: 'T-5', runId: 'RUN-8EE9', name: 'Queue integration test', command: 'pnpm test:integration webhook', status: 'failed', duration: '0m 03s', detail: 'Connection refused at localhost:6379' },
]

const seedActivity: ActivityEvent[] = [
  { id: 'EV-1', runId: 'RUN-8F31', type: 'system', message: 'Run started from requirement REQ-248.', time: ago(26) },
  { id: 'EV-2', runId: 'RUN-8F31', type: 'agent', message: 'Reviewed the sign-in flow and mapped the authentication entry points.', time: ago(24) },
  { id: 'EV-3', runId: 'RUN-8F31', type: 'artifact', message: 'Created magic-link service and verification route.', time: ago(13) },
  { id: 'EV-4', runId: 'RUN-8F31', type: 'test', message: 'All 46 authentication checks passed.', time: ago(5) },
  { id: 'EV-5', runId: 'RUN-8F31', type: 'approval', message: 'Requested merge approval.', time: ago(3) },
  { id: 'EV-6', runId: 'RUN-8F2A', type: 'system', message: 'Run started from requirement REQ-247.', time: ago(121) },
  { id: 'EV-7', runId: 'RUN-8F2A', type: 'agent', message: 'Found payment state resets after a failed attempt.', time: ago(93) },
  { id: 'EV-8', runId: 'RUN-8F2A', type: 'agent', message: 'Planning recovery states and form persistence.', time: ago(48) },
]

const wait = (ms = 160) => new Promise<void>(resolve => window.setTimeout(resolve, ms))

export class MockWorkbenchApi implements WorkbenchApi {
  private requirements = structuredClone(seedRequirements)
  private runs = structuredClone(seedRuns)
  private approvals = structuredClone(seedApprovals)
  private artifacts = structuredClone(seedArtifacts)
  private tests = structuredClone(seedTests)
  private activity = structuredClone(seedActivity)

  async listRequirements() { await wait(); return structuredClone(this.requirements) }
  async listRuns() { await wait(); return structuredClone(this.runs) }
  async listApprovals() { await wait(); return structuredClone(this.approvals) }
  async listArtifacts() { await wait(); return structuredClone(this.artifacts) }
  async listTests() { await wait(); return structuredClone(this.tests) }
  async listActivity() { await wait(); return structuredClone([...this.activity].sort((a, b) => b.time.localeCompare(a.time))) }

  async getRunBundle(runId: string) {
    await wait()
    const run = this.runs.find(item => item.id === runId)
    if (!run) throw new Error('Run not found')
    return structuredClone({ run, approvals: this.approvals.filter(item => item.runId === runId), artifacts: this.artifacts.filter(item => item.runId === runId), tests: this.tests.filter(item => item.runId === runId), activity: this.activity.filter(item => item.runId === runId).sort((a, b) => b.time.localeCompare(a.time)) })
  }

  async createRun(input: { title: string; description: string; project: string }) {
    await wait(280)
    const stamp = new Date().toISOString()
    const id = `RUN-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const requirement: Requirement = { id: `REQ-${Math.floor(249 + Math.random() * 700)}`, title: input.title, description: input.description, project: input.project, createdAt: stamp, status: 'in-progress', runId: id }
    const run: Run = { id, requirementId: requirement.id, title: input.title, project: input.project, branch: `agent/${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28)}`, status: 'running', currentStep: 'Understand requirement', createdAt: stamp, updatedAt: stamp, requester: 'You', requesterInitials: 'YO', summary: 'Run created and queued. The backend will report workflow progress as it happens.', steps: [{ id: 's1', label: 'Understand requirement', detail: 'Requirement received by the backend.', status: 'active' }, { id: 's2', label: 'Plan implementation', detail: 'Waiting for the previous step.', status: 'pending' }, { id: 's3', label: 'Implement changes', detail: 'Waiting for the previous step.', status: 'pending' }, { id: 's4', label: 'Run checks', detail: 'Waiting for the previous step.', status: 'pending' }, { id: 's5', label: 'Review changes', detail: 'Waiting for the previous step.', status: 'pending' }] }
    this.requirements = [requirement, ...this.requirements]
    this.runs = [run, ...this.runs]
    this.activity = [{ id: `EV-${id}`, runId: id, type: 'system', message: `Run started from requirement ${requirement.id}.`, time: stamp }, ...this.activity]
    return structuredClone(run)
  }

  async respondToApproval(approvalId: string, decision: 'approve' | 'request-changes', note?: string) {
    await wait(220)
    const approval = this.approvals.find(item => item.id === approvalId)
    if (!approval) throw new Error('Approval not found')
    approval.status = decision === 'approve' ? 'approved' : 'changes-requested'
    const run = this.runs.find(item => item.id === approval.runId)
    if (run) {
      run.updatedAt = new Date().toISOString()
      if (decision === 'approve') { run.status = 'completed'; run.currentStep = 'Complete'; run.steps = run.steps.map(step => ({ ...step, status: 'complete' as const })) }
      if (decision === 'request-changes') { run.status = 'running'; run.currentStep = 'Implement changes'; run.steps = run.steps.map((step, index) => ({ ...step, status: index < 2 ? 'complete' as const : index === 2 ? 'active' as const : 'pending' as const })) }
      const requirement = this.requirements.find(item => item.runId === run.id)
      if (requirement) requirement.status = decision === 'approve' ? 'complete' : 'in-progress'
    }
    this.activity.unshift({ id: `EV-${Date.now()}`, runId: approval.runId, type: 'approval', message: decision === 'approve' ? `Approved: ${approval.title}` : `Changes requested: ${note || approval.title}`, time: new Date().toISOString() })
  }

  async cancelRun(runId: string) {
    await wait(180)
    const run = this.runs.find(item => item.id === runId)
    if (!run) throw new Error('Run not found')
    run.status = 'cancelled'
    run.currentStep = 'Cancelled'
    run.updatedAt = new Date().toISOString()
    const requirement = this.requirements.find(item => item.runId === run.id)
    if (requirement) requirement.status = 'queued'
    this.activity.unshift({ id: `EV-${Date.now()}`, runId, type: 'system', message: 'Run cancelled by the requester.', time: run.updatedAt })
  }
}

/** HTTP adapter for the documented backend contract. No execution logic lives here. */
export class HttpWorkbenchApi implements WorkbenchApi {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
    if (response.status === 401) throw new Error('Your session has expired. Sign in again to continue.')
    if (response.status === 403) throw new Error('Your account does not have permission to do this.')
    if (!response.ok) throw new Error(`Workbench API returned ${response.status}`)
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  listRequirements() { return this.request<Requirement[]>('/requirements') }
  listRuns() { return this.request<Run[]>('/runs') }
  async getRunBundle(runId: string) {
    const id = encodeURIComponent(runId)
    const [run, approvals, artifacts, tests, activity] = await Promise.all([
      this.request<Run>(`/runs/${id}`),
      this.request<Approval[]>(`/runs/${id}/approvals`),
      this.request<Artifact[]>(`/runs/${id}/artifacts`),
      this.request<TestResult[]>(`/runs/${id}/tests`),
      this.request<ActivityEvent[]>(`/runs/${id}/events`),
    ])
    return { run, approvals, artifacts, tests, activity }
  }
  listApprovals() { return this.request<Approval[]>('/approvals') }
  listArtifacts() { return this.request<Artifact[]>('/artifacts') }
  listTests() { return this.request<TestResult[]>('/tests') }
  listActivity() { return this.request<ActivityEvent[]>('/activity?limit=10') }
  createRun(input: { title: string; description: string; project: string }) { return this.request<Run>('/runs', { method: 'POST', body: JSON.stringify(input) }) }
  respondToApproval(id: string, decision: 'approve' | 'request-changes', note?: string) { return this.request<void>(`/approvals/${encodeURIComponent(id)}/decision`, { method: 'POST', body: JSON.stringify({ decision, note }) }) }
  cancelRun(id: string) { return this.request<void>(`/runs/${encodeURIComponent(id)}/cancel`, { method: 'POST' }) }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
export const api: WorkbenchApi = apiBaseUrl ? new HttpWorkbenchApi(apiBaseUrl) : new MockWorkbenchApi()
export const usesMockApi = !apiBaseUrl
