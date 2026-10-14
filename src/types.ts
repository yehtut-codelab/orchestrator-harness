export type RunStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled'
export type ApprovalStatus = 'pending' | 'approved' | 'changes-requested'

export interface Requirement {
  id: string
  title: string
  description: string
  project: string
  createdAt: string
  status: 'queued' | 'in-progress' | 'complete' | 'needs-review'
  runId?: string
}

export interface WorkflowStep {
  id: string
  label: string
  detail: string
  status: 'complete' | 'active' | 'pending' | 'blocked'
  duration?: string
}

export interface Run {
  id: string
  requirementId: string
  title: string
  project: string
  branch: string
  status: RunStatus
  currentStep: string
  createdAt: string
  updatedAt: string
  requester: string
  requesterInitials: string
  summary: string
  steps: WorkflowStep[]
}

export interface Approval {
  id: string
  runId: string
  title: string
  description: string
  scope: string
  requestedAt: string
  requester: string
  initials: string
  status: ApprovalStatus
}

export interface Artifact {
  id: string
  runId: string
  path: string
  kind: 'added' | 'modified' | 'deleted'
  additions: number
  deletions: number
  preview: string
}

export interface TestResult {
  id: string
  runId: string
  name: string
  command: string
  status: 'passed' | 'failed' | 'skipped'
  duration: string
  detail: string
}

export interface ActivityEvent {
  id: string
  runId: string
  type: 'system' | 'agent' | 'approval' | 'artifact' | 'test'
  message: string
  time: string
}

export interface RunBundle {
  run: Run
  approvals: Approval[]
  artifacts: Artifact[]
  tests: TestResult[]
  activity: ActivityEvent[]
}
