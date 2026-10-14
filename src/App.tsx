import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api, usesMockApi } from './services/api'
import type { ActivityEvent, Approval, Artifact, Requirement, Run, RunBundle, TestResult } from './types'

type Page = 'overview' | 'requirements' | 'runs' | 'approvals' | 'artifacts' | 'tests'
type RunTab = 'Overview' | 'Workflow' | 'Artifacts' | 'Tests' | 'Activity'
type ConnectionState = 'demo' | 'connecting' | 'connected' | 'disconnected'
type IconName = 'grid' | 'inbox' | 'play' | 'check' | 'file' | 'flask' | 'search' | 'plus' | 'arrow' | 'chevron' | 'clock' | 'check-circle' | 'alert' | 'loader' | 'terminal' | 'git' | 'dots' | 'close' | 'bell' | 'refresh' | 'spark' | 'send' | 'calendar' | 'filter' | 'link' | 'external' | 'download' | 'copy' | 'activity' | 'menu' | 'back' | 'shield' | 'folder' | 'hash'

const paths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></>,
  inbox: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 13h5l2 3h4l2-3h5"/></>,
  play: <><path d="m9 6 9 6-9 6z"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  file: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z"/><path d="M13 3v7h7M8 14h8M8 18h6"/></>,
  flask: <><path d="M9 3h6M10 3v7l-5.5 8.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 10V3"/><path d="M8 16h8"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
  chevron: <><path d="m9 18 6-6-6-6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  'check-circle': <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  alert: <><path d="m10.3 4.3-8 13.5A1.5 1.5 0 0 0 3.6 20h16.8a1.5 1.5 0 0 0 1.3-2.2l-8-13.5a2 2 0 0 0-3.4 0z"/><path d="M12 9v4m0 3h.01"/></>,
  loader: <><path d="M20 12a8 8 0 0 1-8 8"/><path d="M4 12a8 8 0 0 1 8-8"/></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3m6 0h4"/></>,
  git: <><circle cx="7" cy="6" r="2"/><circle cx="17" cy="18" r="2"/><circle cx="17" cy="6" r="2"/><path d="M7 8v8a2 2 0 0 0 2 2h6m2-10v8M9 8h6"/></>,
  dots: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2"/></>,
  spark: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z"/></>,
  send: <><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>,
  filter: <><path d="M4 7h16M7 12h10m-7 5h4"/></>,
  link: <><path d="M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7"/></>,
  external: <><path d="M14 3h7v7m0-7-9 9"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/></>,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  back: <><path d="M19 12H5m7 7-7-7 7-7"/></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/></>,
  folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
  hash: <><path d="M4 9h16M4 15h16M10 3 8 21m8-18-2 18"/></>,
}

function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const navItems: { id: Page; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'requirements', label: 'Requirements', icon: 'inbox' },
  { id: 'runs', label: 'Runs', icon: 'play' },
  { id: 'approvals', label: 'Approvals', icon: 'check' },
  { id: 'artifacts', label: 'Artifacts', icon: 'file' },
  { id: 'tests', label: 'Test results', icon: 'flask' },
]

const relativeTime = (date: string) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1_440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1_440)}d ago`
}

const absoluteDate = (date: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))

function StatusPill({ status }: { status: Run['status'] | Requirement['status'] | TestResult['status'] | Approval['status'] }) {
  const config: Record<string, { label: string; icon: IconName }> = {
    running: { label: 'Running', icon: 'loader' }, waiting: { label: 'Needs review', icon: 'clock' }, completed: { label: 'Completed', icon: 'check-circle' }, failed: { label: 'Failed', icon: 'alert' }, cancelled: { label: 'Cancelled', icon: 'close' },
    queued: { label: 'Queued', icon: 'clock' }, 'in-progress': { label: 'In progress', icon: 'loader' }, complete: { label: 'Complete', icon: 'check-circle' }, 'needs-review': { label: 'Needs review', icon: 'clock' },
    pending: { label: 'Pending', icon: 'clock' }, approved: { label: 'Approved', icon: 'check-circle' }, 'changes-requested': { label: 'Changes requested', icon: 'alert' }, passed: { label: 'Passed', icon: 'check-circle' }, skipped: { label: 'Skipped', icon: 'clock' },
  }
  const item = config[status]
  return <span className={`status-pill status-${status}`}><Icon name={item.icon} size={13} />{item.label}</span>
}

function Avatar({ name, initials, tone = '' }: { name: string; initials: string; tone?: string }) {
  return <span className={`avatar ${tone}`} title={name} aria-label={name}>{initials}</span>
}

function EmptyState({ icon, title, detail }: { icon: IconName; title: string; detail: string }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={23} /></span><h3>{title}</h3><p>{detail}</p></div>
}

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [tests, setTests] = useState<TestResult[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [bundle, setBundle] = useState<RunBundle | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [runTab, setRunTab] = useState<RunTab>('Overview')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>(usesMockApi ? 'demo' : 'connecting')
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [changeRequest, setChangeRequest] = useState<Approval | null>(null)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  const loadData = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true)
    try {
      const [reqs, runItems, approvalItems, artifactItems, testItems, activityItems] = await Promise.all([api.listRequirements(), api.listRuns(), api.listApprovals(), api.listArtifacts(), api.listTests(), api.listActivity()])
      setRequirements(reqs); setRuns(runItems); setApprovals(approvalItems); setArtifacts(artifactItems); setTests(testItems); setActivity(activityItems); setError('')
      setConnectionState(usesMockApi ? 'demo' : 'connected')
    } catch (e) { setConnectionState(usesMockApi ? 'demo' : 'disconnected'); setError(e instanceof Error ? e.message : 'Unable to connect to the workbench API.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { void loadData() }, [loadData])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(timer) }, [toast])
  useEffect(() => {
    if (!selectedRunId) { setBundle(null); return }
    let cancelled = false
    setBundle(null)
    void api.getRunBundle(selectedRunId).then(value => { if (!cancelled) { setBundle(value); setError('') } }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this run.') })
    return () => { cancelled = true }
  }, [selectedRunId, runs, approvals])

  const currentNav = navItems.find(item => item.id === page)
  const pendingApprovals = approvals.filter(item => item.status === 'pending')
  const filteredRuns = useMemo(() => runs.filter(item => `${item.id} ${item.title} ${item.project} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [runs, query])

  const openRun = (id: string) => { setBundle(null); setSelectedRunId(id); setRunTab('Overview'); setQuery('') }

  const refresh = async () => { await loadData(true); if (selectedRunId) { try { setBundle(await api.getRunBundle(selectedRunId)) } catch { /* loadData shows the error */ } } }

  const createRun = async (input: { title: string; description: string; project: string }) => {
    try {
      const run = await api.createRun(input)
      setShowCreate(false)
      await loadData(true)
      setSelectedRunId(run.id)
      setPage('runs')
      setToast('Requirement submitted. The backend has started a new run.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not submit this requirement.') }
  }

  const decideApproval = async (approval: Approval, decision: 'approve' | 'request-changes') => {
    if (decision === 'request-changes') { setChangeRequest(approval); return }
    try {
      await api.respondToApproval(approval.id, decision)
      await loadData(true)
      if (selectedRunId) setBundle(await api.getRunBundle(selectedRunId))
      setToast('Approval recorded.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not record the decision.') }
  }

  const submitChangeRequest = async (note: string) => {
    if (!changeRequest) return
    const approval = changeRequest
    try {
      await api.respondToApproval(approval.id, 'request-changes', note)
      setChangeRequest(null)
      await loadData(true)
      if (selectedRunId) setBundle(await api.getRunBundle(selectedRunId))
      setToast('Changes requested. The backend will update the run.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not record the decision.') }
  }

  const cancelRun = async (run: Run) => {
    if (!window.confirm(`Cancel ${run.id}?`)) return
    try { await api.cancelRun(run.id); await refresh(); setToast(`${run.id} cancelled.`) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not cancel this run.') }
  }

  if (selectedRunId) {
    const selected = bundle?.run ?? runs.find(run => run.id === selectedRunId)
    return <div className="app-shell"><Sidebar page="runs" setPage={p => { setSelectedRunId(null); setPage(p) }} approvals={pendingApprovals.length} mobileNav={mobileNav} closeMobile={() => setMobileNav(false)} />
      <main className="main-area"><Topbar connectionState={connectionState} approvalCount={pendingApprovals.length} onApprovals={() => { setSelectedRunId(null); setPage('approvals'); setQuery('') }} onSearch={value => { setSelectedRunId(null); setPage('runs'); setQuery(value) }} query={query} onRefresh={refresh} refreshing={refreshing} onMenu={() => setMobileNav(true)} />
        <div className="content-wrap run-detail-wrap"><button className="back-link" onClick={() => setSelectedRunId(null)}><Icon name="back" size={16} />Back to runs</button>
          {error && <ErrorBanner message={error} retry={refresh} onClose={() => setError('')} />}
          {!selected ? <EmptyState icon="play" title="Run not found" detail="It may have been removed or you may not have access." /> : <RunDetail run={selected} bundle={bundle} tab={runTab} setTab={setRunTab} cancel={() => void cancelRun(selected)} decideApproval={decideApproval} />}
        </div>
      </main>{changeRequest && <ChangeRequestModal approval={changeRequest} close={() => setChangeRequest(null)} submit={submitChangeRequest} />}{toast && <Toast>{toast}</Toast>}</div>
  }

  return <div className="app-shell">
    <Sidebar page={page} setPage={p => { setPage(p); setMobileNav(false); setQuery('') }} approvals={pendingApprovals.length} mobileNav={mobileNav} closeMobile={() => setMobileNav(false)} />
    <main className="main-area"><Topbar connectionState={connectionState} approvalCount={pendingApprovals.length} onApprovals={() => { setPage('approvals'); setQuery('') }} query={query} onSearch={value => { setQuery(value); if (value.trim() && page === 'overview') setPage('runs') }} onRefresh={refresh} refreshing={refreshing} onMenu={() => setMobileNav(true)} />
      <div className="content-wrap">
        <div className="crumb"><span>Workspace</span><Icon name="chevron" size={12} /><span>{currentNav?.label ?? 'Overview'}</span></div>
        {error && <ErrorBanner message={error} retry={refresh} onClose={() => setError('')} />}
        {loading ? <div className="loading-state"><span className="spinner" /><span>Loading your workspace…</span></div> : <>
          {page === 'overview' && <OverviewPage runs={runs} requirements={requirements} approvals={pendingApprovals} activity={activity} connectionState={connectionState} openRun={openRun} go={setPage} viewProject={project => { setQuery(project); setPage('runs') }} create={() => setShowCreate(true)} />}
          {page === 'requirements' && <RequirementsPage requirements={requirements} query={query} setQuery={setQuery} openRun={openRun} create={() => setShowCreate(true)} />}
          {page === 'runs' && <RunsPage runs={filteredRuns} query={query} setQuery={setQuery} openRun={openRun} />}
          {page === 'approvals' && <ApprovalsPage approvals={approvals} query={query} openRun={openRun} decide={decideApproval} />}
          {page === 'artifacts' && <ArtifactsPage artifacts={artifacts} runs={runs} query={query} openRun={openRun} />}
          {page === 'tests' && <TestsPage tests={tests} runs={runs} query={query} openRun={openRun} />}
        </>}
        <footer className="page-footer"><span><span className={`connection-dot ${connectionState}`} />{connectionState === 'demo' ? 'DEMO DATA' : connectionState === 'connected' ? 'BACKEND CONNECTED' : connectionState === 'connecting' ? 'CONNECTING' : 'BACKEND UNAVAILABLE'}</span><span>Northstar engineering workspace <span className="footer-divider">·</span> <a href="/API_CONTRACT.md" target="_blank" rel="noreferrer">API contract</a></span></footer>
      </div>
    </main>
    {showCreate && <CreateRequirementModal close={() => setShowCreate(false)} submit={createRun} />}
    {changeRequest && <ChangeRequestModal approval={changeRequest} close={() => setChangeRequest(null)} submit={submitChangeRequest} />}
    {toast && <Toast>{toast}</Toast>}
  </div>
}

function Sidebar({ page, setPage, approvals, mobileNav, closeMobile }: { page: Page; setPage: (page: Page) => void; approvals: number; mobileNav: boolean; closeMobile: () => void }) {
  return <><div className={`sidebar-scrim ${mobileNav ? 'visible' : ''}`} onClick={closeMobile} /><aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
    <div className="brand"><span className="brand-mark"><span>N</span></span><span className="brand-word">Northstar<span>Platform</span></span><button className="mobile-close icon-button" onClick={closeMobile} aria-label="Close navigation"><Icon name="close" /></button></div>
    <div className="workspace-switcher"><span className="workspace-avatar">N</span><span className="workspace-info"><small>ORGANIZATION</small><strong>Northstar</strong><span>Engineering workspace</span></span></div>
    <div className="nav-label">WORKSPACE</div>
    <nav className="primary-nav" aria-label="Main navigation">{navItems.map(item => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}><Icon name={item.icon} size={17} /><span>{item.label}</span>{item.id === 'approvals' && approvals > 0 && <span className="nav-count">{approvals}</span>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="sidebar-note"><span className="note-light"><Icon name="shield" size={15} /></span><div><strong>Execution boundary</strong><p>Run orchestration and repository access stay in the backend.</p></div></div><div className="sidebar-profile"><Avatar name="Nina Park" initials="NP" tone="avatar-sidebar" /><span className="profile-name"><strong>Nina Park</strong><small>Workspace admin</small></span></div></div>
  </aside></>
}

function Topbar({ query, onSearch, onRefresh, refreshing, onMenu, connectionState, approvalCount, onApprovals }: { query: string; onSearch: (value: string) => void; onRefresh: () => void; refreshing: boolean; onMenu: () => void; connectionState: ConnectionState; approvalCount: number; onApprovals: () => void }) {
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus() } }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])
  const connectionLabels: Record<ConnectionState, string> = { demo: 'Demo workspace', connecting: 'Connecting', connected: 'Backend connected', disconnected: 'Backend unavailable' }
  return <header className="topbar"><button className="icon-button mobile-menu" onClick={onMenu} aria-label="Open navigation"><Icon name="menu" /></button><label className="global-search"><Icon name="search" size={17} /><input ref={searchRef} value={query} onChange={event => onSearch(event.target.value)} placeholder="Search runs, requirements..." aria-label="Search runs and requirements" /><kbd>Ctrl K</kbd></label><div className="topbar-actions"><span className={`system-health health-${connectionState}`}><span className="health-dot" />{connectionLabels[connectionState]}</span><button className="icon-button top-refresh" onClick={onRefresh} aria-label="Refresh workspace data" title="Refresh workspace data"><Icon name="refresh" size={17} className={refreshing ? 'spin' : ''} /></button><button className="icon-button notification-button" onClick={onApprovals} aria-label={`${approvalCount} pending approvals`} title="Open approvals"><Icon name="bell" size={18} />{approvalCount > 0 && <span>{approvalCount}</span>}</button><span className="topbar-divider" /><Avatar name="Nina Park" initials="NP" /></div></header>
}

function PageTitle({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="page-title-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{detail}</p></div>{action && <div className="title-action">{action}</div>}</div>
}

function PrimaryButton({ children, onClick, icon = 'plus', type = 'button', disabled = false }: { children: ReactNode; onClick?: () => void; icon?: IconName; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button type={type} className="button-primary" onClick={onClick} disabled={disabled}><Icon name={icon} size={16} />{children}</button>
}

function OverviewPage({ runs, requirements, approvals, activity, connectionState, openRun, go, viewProject, create }: { runs: Run[]; requirements: Requirement[]; approvals: Approval[]; activity: ActivityEvent[]; connectionState: ConnectionState; openRun: (id: string) => void; go: (page: Page) => void; viewProject: (project: string) => void; create: () => void }) {
  const activeRuns = runs.filter(run => run.status === 'running' || run.status === 'waiting')
  const completedToday = runs.filter(run => run.status === 'completed' && Date.now() - new Date(run.updatedAt).getTime() < 86_400_000).length
  const failedRuns = runs.filter(run => run.status === 'failed')
  const atRiskProjects = new Set(failedRuns.map(run => run.project)).size
  const activeProjects = new Set(activeRuns.map(run => run.project)).size
  const deliveredRuns = runs.filter(run => run.status === 'completed').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4)
  const queuedRequirements = requirements.filter(item => item.status === 'queued').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const projects = [...new Set([...runs.map(run => run.project), ...requirements.map(item => item.project)])].map(project => {
    const projectRuns = runs.filter(run => run.project === project)
    const projectRequirements = requirements.filter(item => item.project === project)
    const openCount = projectRuns.filter(run => run.status === 'running' || run.status === 'waiting').length
    const failedCount = projectRuns.filter(run => run.status === 'failed').length
    const decisions = approvals.filter(approval => projectRuns.some(run => run.id === approval.runId)).length
    const state = failedCount ? 'At risk' : decisions ? 'Decision needed' : openCount ? 'In progress' : projectRequirements.some(item => item.status === 'queued') ? 'Queued' : projectRuns.length ? 'Delivered' : 'Intake'
    return { project, projectRuns, projectRequirements, openCount, failedCount, decisions, state }
  }).sort((a, b) => (b.failedCount - a.failedCount) || (b.decisions - a.decisions) || (b.openCount - a.openCount) || a.project.localeCompare(b.project))
  const runStatusSummary = [
    { label: 'Delivered', count: runs.filter(run => run.status === 'completed').length, tone: 'delivered' },
    { label: 'In progress', count: runs.filter(run => run.status === 'running').length, tone: 'active' },
    { label: 'In review', count: runs.filter(run => run.status === 'waiting').length, tone: 'review' },
    { label: 'At risk', count: failedRuns.length, tone: 'risk' },
    { label: 'Cancelled', count: runs.filter(run => run.status === 'cancelled').length, tone: 'closed' },
  ].filter(item => item.count > 0)
  const priorityApprovals = [...approvals].sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime())
  const portfolioNeedsAttention = failedRuns.length > 0 || approvals.length > 0
  const connectionLabel: Record<ConnectionState, string> = { demo: 'Mock data', connecting: 'Connecting', connected: 'Live data', disconnected: 'Data unavailable' }
  return <>
    <section className="exec-hero">
      <div><div className="exec-eyebrow">NORTHSTAR <span>/</span> EXECUTIVE VIEW</div><h1>Executive dashboard</h1><p>Delivery outcomes, project risk, and decisions requiring leadership attention.</p><div className="exec-context"><span className={`exec-source ${connectionState}`}><i />{connectionLabel[connectionState]}</span><span>As of {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())}</span></div></div>
      <div className="exec-hero-actions"><PrimaryButton onClick={create}>Submit request</PrimaryButton><button onClick={() => go('runs')}>View operations <Icon name="arrow" size={14} /></button></div>
    </section>
    <section className="exec-metric-grid" aria-label="Executive summary">
      <article className="exec-metric"><span className="exec-metric-label">DELIVERED · 24 HOURS</span><strong>{completedToday}</strong><small>Completed initiatives</small><span className="exec-metric-accent delivered"><Icon name="check-circle" size={18} /></span></article>
      <article className="exec-metric"><span className="exec-metric-label">ACTIVE INITIATIVES</span><strong>{activeProjects}</strong><small>{activeRuns.length} work items in progress or review</small><span className="exec-metric-accent active"><Icon name="activity" size={18} /></span></article>
      <article className="exec-metric"><span className="exec-metric-label">DECISIONS NEEDED</span><strong>{approvals.length}</strong><small>Requests awaiting leadership review</small><span className="exec-metric-accent decision"><Icon name="shield" size={18} /></span></article>
      <article className="exec-metric"><span className="exec-metric-label">PROJECTS AT RISK</span><strong>{atRiskProjects}</strong><small>With a backend-reported failed run</small><span className="exec-metric-accent risk"><Icon name="alert" size={18} /></span></article>
    </section>
    <div className="exec-dashboard-grid">
      <section className="panel exec-pulse-panel"><div className="exec-section-head"><div><span className="exec-kicker">PORTFOLIO PULSE</span><h2>Overall delivery health</h2><p>Snapshot of work currently in the system</p></div><span className={`exec-health-badge ${portfolioNeedsAttention ? 'attention' : 'healthy'}`}><i />{portfolioNeedsAttention ? 'Action required' : activeRuns.length ? 'In progress' : 'On track'}</span></div>
        <div className="exec-pulse-body"><div className="exec-pulse-summary"><strong>{projects.length}</strong><span>projects in view</span><p>{atRiskProjects ? `${atRiskProjects} project${atRiskProjects === 1 ? '' : 's'} at risk` : 'No projects currently at risk'}<br />{approvals.length ? `${approvals.length} decision${approvals.length === 1 ? '' : 's'} awaiting review` : 'No pending decisions'}</p></div>
          <div className="exec-status-breakdown"><div className="exec-status-bar" role="img" aria-label={runStatusSummary.map(item => `${item.count} ${item.label.toLowerCase()}`).join(', ')}>{runStatusSummary.map(item => <span key={item.tone} className={item.tone} style={{ flexGrow: item.count }} />)}</div><div className="exec-status-legend">{runStatusSummary.map(item => <span key={item.tone}><i className={item.tone} /><strong>{item.count}</strong>{item.label}</span>)}</div></div>
        </div><div className="exec-pulse-foot"><span>Based on {runs.length} reported runs</span>{activity[0] && <span>Latest update {relativeTime(activity[0].time)}</span>}<button onClick={() => go('runs')}>View operations <Icon name="arrow" size={13} /></button></div>
      </section>
      <section className="panel exec-attention-panel"><div className="exec-section-head"><div><span className="exec-kicker">LEADERSHIP ACTIONS</span><h2>Priority items</h2><p>{portfolioNeedsAttention ? 'Items requiring a decision or follow-up' : 'No open issues or decisions'}</p></div><span className={`exec-attention-count ${portfolioNeedsAttention ? 'has-items' : ''}`}>{failedRuns.length + approvals.length}</span></div>
        <div className="exec-attention-list">
          {failedRuns.slice(0, 2).map(run => <article className="exec-attention-item risk" key={run.id}><span className="exec-attention-mark"><Icon name="alert" size={15} /></span><div><span className="exec-item-label">PROJECT AT RISK <time>{relativeTime(run.updatedAt)}</time></span><strong>{run.project}</strong><small>{run.title}</small></div><button className="exec-review-button" onClick={() => openRun(run.id)}>View <Icon name="chevron" size={13} /></button></article>)}
          {priorityApprovals.slice(0, 3).map(item => <article className="exec-attention-item decision" key={item.id}><span className="exec-attention-mark"><Icon name="shield" size={15} /></span><div><span className="exec-item-label">DECISION NEEDED <time>{relativeTime(item.requestedAt)}</time></span><strong>{item.title}</strong><small>{item.scope} · {item.requester}</small></div><button className="exec-review-button" onClick={() => openRun(item.runId)}>Review <Icon name="chevron" size={13} /></button></article>)}
          {!portfolioNeedsAttention && <div className="exec-all-clear"><span><Icon name="check-circle" size={18} /></span><div><strong>No leadership actions pending</strong><small>New risks and decisions will appear here.</small></div></div>}
        </div>
        <button className="exec-attention-link" onClick={() => go('approvals')}>Open decision queue <Icon name="arrow" size={13} /></button>
      </section>
      <section className="panel exec-portfolio-panel"><div className="exec-section-head"><div><span className="exec-kicker">PROJECT SCORECARD</span><h2>Delivery by project</h2><p>Current status, delivery, and exposure across {projects.length} projects</p></div><button className="text-link" onClick={() => go('requirements')}>All requests <Icon name="arrow" size={14} /></button></div>
        <div className="exec-project-table"><div className="exec-project-head"><span>PROJECT</span><span>REQUESTS</span><span>RUNS</span><span>DELIVERED</span><span>OPEN ITEMS</span><span>STATUS</span><span /></div>
          {projects.length ? projects.slice(0, 6).map(item => <div className="exec-project-row" key={item.project}><span className="exec-project-name"><i className={`project-health ${item.state === 'At risk' ? 'risk' : item.state === 'Decision needed' ? 'decision' : item.state === 'In progress' ? 'active' : 'steady'}`} /><span><strong>{item.project}</strong><small>{item.projectRequirements.length} requirement{item.projectRequirements.length === 1 ? '' : 's'}</small></span></span><span className="exec-project-number">{item.projectRequirements.length}</span><span className="exec-project-number">{item.projectRuns.length}</span><span className="exec-project-number delivered">{item.projectRuns.filter(run => run.status === 'completed').length}</span><span className={`exec-project-exposure ${item.failedCount ? 'risk' : item.decisions ? 'decision' : ''}`}>{item.failedCount ? `${item.failedCount} at risk` : item.decisions ? `${item.decisions} decision${item.decisions === 1 ? '' : 's'}` : item.openCount ? `${item.openCount} active` : '—'}</span><span className={`exec-state-chip ${item.state === 'At risk' ? 'risk' : item.state === 'Decision needed' ? 'decision' : item.state === 'In progress' ? 'active' : 'steady'}`}>{item.state}</span><button className="icon-button subtle" onClick={() => viewProject(item.project)} aria-label={`View ${item.project} work`}><Icon name="chevron" size={15} /></button></div>) : <EmptyState icon="grid" title="No projects to summarize" detail="Projects appear when requirements or runs are added." />}
        </div>
        <div className="exec-panel-foot"><span>Project status is calculated from reported run and approval state.</span><button onClick={() => go('runs')}>Open work queue <Icon name="arrow" size={13} /></button></div>
      </section>
      <section className="panel exec-delivery-panel"><div className="exec-section-head"><div><span className="exec-kicker">RECENT DELIVERY</span><h2>Delivered work</h2><p>Most recently completed initiatives</p></div><button className="text-link" onClick={() => go('runs')}>All runs <Icon name="arrow" size={14} /></button></div>
        {deliveredRuns.length ? <div className="exec-delivery-list">{deliveredRuns.map(run => <button key={run.id} onClick={() => openRun(run.id)}><span className="exec-delivery-check"><Icon name="check" size={14} /></span><span><strong>{run.title}</strong><small>{run.project} <i>·</i> Delivered {relativeTime(run.updatedAt)}</small></span><Icon name="chevron" size={15} /></button>)}</div> : <EmptyState icon="check-circle" title="No completed work yet" detail="Completed runs will be summarized here." />}
      </section>
      <section className="panel exec-intake-panel"><div className="exec-section-head"><div><span className="exec-kicker">INCOMING DEMAND</span><h2>Unstarted requests</h2><p>{queuedRequirements.length} request{queuedRequirements.length === 1 ? '' : 's'} in the intake queue</p></div><span className="exec-intake-count">{queuedRequirements.length}</span></div>
        {queuedRequirements.length ? <div className="exec-intake-list">{queuedRequirements.slice(0, 3).map(item => <button key={item.id} onClick={() => go('requirements')}><span className="exec-intake-mark"><Icon name="inbox" size={14} /></span><span><strong>{item.title}</strong><small>{item.project} <i>·</i> Received {relativeTime(item.createdAt)}</small></span><Icon name="chevron" size={15} /></button>)}</div> : <div className="exec-intake-clear"><Icon name="check-circle" size={15} />No unstarted requests</div>}
        <button className="exec-attention-link" onClick={() => go('requirements')}>Review intake <Icon name="arrow" size={13} /></button>
      </section>
    </div>
  </>
}

function RequirementsPage({ requirements, query, setQuery, openRun, create }: { requirements: Requirement[]; query: string; setQuery: (v: string) => void; openRun: (id: string) => void; create: () => void }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const filtered = requirements.filter(item => `${item.id} ${item.title} ${item.project} ${item.status}`.toLowerCase().includes(query.toLowerCase()) && (statusFilter === 'all' || item.status === statusFilter))
  return <><PageTitle eyebrow="INTAKE" title="Requirements" detail="Turn clear requirements into reviewable engineering work." action={<PrimaryButton onClick={create}>New requirement</PrimaryButton>} />
    <div className="list-toolbar"><div className="inline-search"><Icon name="search" size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter requirements" aria-label="Filter requirements" /></div><select className="select-filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter requirements by status"><option value="all">All requirements</option><option value="queued">Queued</option><option value="in-progress">In progress</option><option value="needs-review">Needs review</option><option value="complete">Complete</option></select><span className="toolbar-count">{filtered.length} requirements</span></div>
    <section className="panel table-panel"><div className="data-table requirements-table"><div className="table-head"><span>REQUIREMENT</span><span>PROJECT</span><span>SUBMITTED</span><span>STATUS</span><span></span></div>{filtered.length ? filtered.map(item => <div key={item.id} className="table-row requirement-row"><div className="requirement-cell"><span className="req-icon"><Icon name="inbox" size={16} /></span><span><strong>{item.title}</strong><small>{item.id} <span>·</span> {item.description}</small></span></div><span className="project-name"><span className="project-dot" />{item.project}</span><span className="table-muted">{relativeTime(item.createdAt)}</span><StatusPill status={item.status} /><button className="icon-button subtle" aria-label={`Open ${item.title}`} onClick={() => item.runId && openRun(item.runId)} disabled={!item.runId}><Icon name={item.runId ? 'chevron' : 'dots'} size={16} /></button></div>) : <EmptyState icon="search" title="No matching requirements" detail="Try a different search or submit a new requirement." />}</div></section>
    <div className="inline-note"><Icon name="shield" size={16} /><span>Submitted requirements are sent to the backend. Repository changes are made by the backend workflow only.</span></div>
  </>
}

function RunsPage({ runs, query, setQuery, openRun }: { runs: Run[]; query: string; setQuery: (v: string) => void; openRun: (id: string) => void }) {
  const [statusFilter, setStatusFilter] = useState('All runs')
  const shown = statusFilter === 'All runs' ? runs : runs.filter(run => statusFilter === 'Active' ? run.status === 'running' || run.status === 'waiting' : run.status === statusFilter.toLowerCase())
  return <><PageTitle eyebrow="EXECUTION" title="Runs" detail="Track progress, review outputs, and return to any saved run." />
    <div className="list-toolbar"><div className="inline-search"><Icon name="search" size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by run, requirement, project" aria-label="Search runs" /></div><select className="select-filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter runs by status"><option>All runs</option><option>Active</option><option>Completed</option><option>Failed</option><option>Cancelled</option></select><span className="toolbar-count">{shown.length} runs</span></div>
    <section className="panel table-panel"><div className="data-table runs-table"><div className="table-head"><span>RUN</span><span>STATUS</span><span>CURRENT STEP</span><span>STARTED</span><span></span></div>{shown.length ? shown.map(run => <button key={run.id} className="table-row runs-row" onClick={() => openRun(run.id)}><span className="run-name-cell"><span className={`mini-run-icon ${run.status}`}><Icon name={run.status === 'completed' ? 'check' : run.status === 'failed' ? 'alert' : 'play'} size={14} /></span><span><strong>{run.title}</strong><small><code>{run.id}</code><span>·</span>{run.project}</small></span></span><StatusPill status={run.status} /><span className="current-cell">{run.currentStep}</span><span className="table-muted">{relativeTime(run.createdAt)}</span><Icon name="chevron" size={15} className="row-chevron" /></button>) : <EmptyState icon="play" title="No runs match" detail="Try another filter or start with a new requirement." />}</div></section>
    <p className="list-footnote"><Icon name="activity" size={15} />Run status refreshes from the backend when you reload this page.</p>
  </>
}

function ApprovalsPage({ approvals, query, openRun, decide }: { approvals: Approval[]; query: string; openRun: (id: string) => void; decide: (approval: Approval, decision: 'approve' | 'request-changes') => void }) {
  const matching = approvals.filter(item => `${item.id} ${item.title} ${item.description} ${item.scope} ${item.runId} ${item.requester}`.toLowerCase().includes(query.toLowerCase()))
  const pending = matching.filter(item => item.status === 'pending')
  const history = matching.filter(item => item.status !== 'pending')
  return <><PageTitle eyebrow="GOVERNANCE" title="Approvals" detail="Review backend requests and record a decision for the audit trail." />
    <div className="approval-context"><span className="context-icon"><Icon name="shield" size={17} /></span><span><strong>Decisions are recorded server-side.</strong><small>The backend validates access and applies each approved action.</small></span></div>
    <section className="approval-section"><div className="section-heading"><div><h2>Waiting for you</h2><p>{pending.length ? `${pending.length} request${pending.length > 1 ? 's' : ''} need your decision` : 'All requests have a decision.'}</p></div><span className="heading-count large">{pending.length}</span></div>
      {pending.length ? <div className="approval-grid">{pending.map(item => <ApprovalCard key={item.id} approval={item} openRun={openRun} decide={decide} />)}</div> : <section className="panel"><EmptyState icon="check-circle" title="You're all caught up" detail="New approval requests will appear here." /></section>}
    </section>
    {!!history.length && <section className="approval-section history-section"><div className="section-heading"><div><h2>Decision history</h2><p>Previously resolved approval requests</p></div></div><section className="panel history-list">{history.map(item => <button key={item.id} className="history-row" onClick={() => openRun(item.runId)}><Avatar name={item.requester} initials={item.initials} /><span className="history-main"><strong>{item.title}</strong><small>{item.scope} <span>·</span> {relativeTime(item.requestedAt)}</small></span><StatusPill status={item.status} /><Icon name="chevron" size={15} /></button>)}</section></section>}
  </>
}

function ApprovalCard({ approval, openRun, decide }: { approval: Approval; openRun: (id: string) => void; decide: (approval: Approval, decision: 'approve' | 'request-changes') => void }) {
  return <article className="panel approval-card"><div className="approval-card-top"><span className="approval-glyph"><Icon name="shield" size={18} /></span><StatusPill status={approval.status} /></div><div className="approval-card-copy"><h3>{approval.title}</h3><p>{approval.description}</p></div><button className="approval-run-link" onClick={() => openRun(approval.runId)}><span><code>{approval.runId}</code><span>{approval.scope}</span></span><Icon name="external" size={14} /></button><div className="approval-requester"><Avatar name={approval.requester} initials={approval.initials} /><span><strong>{approval.requester}</strong><small>Requested {relativeTime(approval.requestedAt)}</small></span></div><div className="approval-card-actions"><button className="button-secondary" onClick={() => decide(approval, 'request-changes')}>Request changes</button><button className="button-primary button-approval" onClick={() => decide(approval, 'approve')}><Icon name="check" size={15} />Approve</button></div></article>
}

function ArtifactsPage({ artifacts, runs, query, openRun }: { artifacts: Artifact[]; runs: Run[]; query: string; openRun: (id: string) => void }) {
  const filtered = artifacts.filter(item => `${item.path} ${item.runId} ${runs.find(run => run.id === item.runId)?.title ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  return <><PageTitle eyebrow="OUTPUTS" title="Artifacts" detail="Browse generated files by run and review concise previews." /><div className="artifact-summary"><span className="artifact-summary-icon"><Icon name="file" size={17} /></span><span><strong>{artifacts.length} artifacts</strong><small>Across {new Set(artifacts.map(item => item.runId)).size} runs</small></span><span className="artifact-summary-side">Files stay in the backend repository</span></div>
    <div className="artifact-grid">{filtered.length ? filtered.map(artifact => { const run = runs.find(item => item.id === artifact.runId); return <article className="panel artifact-card" key={artifact.id}><div className="artifact-card-head"><span className="artifact-file-icon"><Icon name={artifact.path.includes('test') ? 'flask' : 'file'} size={17} /></span><button className="icon-button subtle" onClick={() => openRun(artifact.runId)} aria-label="Open run"><Icon name="external" size={15} /></button></div><div className="artifact-path"><strong>{artifact.path.split('/').pop()}</strong><small>{artifact.path}</small></div><div className="artifact-run-link"><button onClick={() => openRun(artifact.runId)}>{run?.title ?? artifact.runId}</button><code>{artifact.runId}</code></div><pre className="artifact-snippet"><code>{artifact.preview}</code></pre><div className="artifact-card-foot"><span className={`change-kind ${artifact.kind}`}>{artifact.kind === 'added' ? 'A' : artifact.kind === 'modified' ? 'M' : 'D'}</span><span className="change-stats"><strong>+{artifact.additions}</strong> <span>−{artifact.deletions}</span></span><span className="artifact-reference">Backend reference</span></div></article> }) : <section className="panel grid-empty"><EmptyState icon="file" title={query ? 'No matching artifacts' : 'No artifacts yet'} detail={query ? 'Try a different search term.' : 'Generated files will show up here when a run creates them.'} /></section>}</div>
    <div className="inline-note"><Icon name="shield" size={16} /><span>Artifact previews are read-only. All repository changes stay on the backend.</span></div>
  </>
}

function TestsPage({ tests, runs, query, openRun }: { tests: TestResult[]; runs: Run[]; query: string; openRun: (id: string) => void }) {
  const filtered = tests.filter(item => `${item.name} ${item.command} ${item.detail} ${item.runId} ${runs.find(run => run.id === item.runId)?.title ?? ''} ${item.status}`.toLowerCase().includes(query.toLowerCase()))
  const passed = filtered.filter(item => item.status === 'passed').length
  const failed = filtered.filter(item => item.status === 'failed').length
  return <><PageTitle eyebrow="VERIFICATION" title="Test results" detail="See the evidence behind completed work and inspect any failures." />
    <div className="test-overview-cards"><div className="panel test-overview-item"><span className="test-overview-icon passed"><Icon name="check-circle" size={18} /></span><span><small>Checks passed</small><strong>{passed}</strong></span><div className="test-overview-bar"><i style={{ width: `${filtered.length ? Math.round(passed / filtered.length * 100) : 0}%` }} /></div></div><div className="panel test-overview-item"><span className="test-overview-icon failed"><Icon name="alert" size={18} /></span><span><small>Checks failed</small><strong>{failed}</strong></span><div className="test-overview-bar failed"><i style={{ width: `${filtered.length ? Math.round(failed / filtered.length * 100) : 0}%` }} /></div></div></div>
    <section className="panel table-panel test-results-panel"><div className="panel-heading"><div><h2>Latest checks</h2><p>Test evidence reported by each run</p></div><span className="toolbar-count">{filtered.length} checks</span></div><div className="data-table tests-table"><div className="table-head"><span>CHECK</span><span>RUN</span><span>RESULT</span><span>DURATION</span><span></span></div>{filtered.length ? filtered.map(test => { const run = runs.find(item => item.id === test.runId); return <button className="table-row test-row" key={test.id} onClick={() => openRun(test.runId)}><span className="test-name-cell"><span className={`test-check-icon ${test.status}`}><Icon name={test.status === 'passed' ? 'check' : test.status === 'failed' ? 'alert' : 'clock'} size={14} /></span><span><strong>{test.name}</strong><small><code>{test.command}</code><span>·</span>{test.detail}</small></span></span><span className="test-run-name">{run?.title ?? test.runId}<small>{test.runId}</small></span><StatusPill status={test.status} /><span className="table-muted">{test.duration}</span><Icon name="chevron" size={15} /></button> }) : <EmptyState icon="flask" title={query ? 'No matching results' : 'No test results'} detail={query ? 'Try a different search term.' : 'Test evidence appears when a backend run completes its checks.'} />}</div></section>
    <div className="inline-note"><Icon name="shield" size={16} /><span>Commands run on the backend. The workbench only displays reported results.</span></div>
  </>
}

function RunDetail({ run, bundle, tab, setTab, cancel, decideApproval }: { run: Run; bundle: RunBundle | null; tab: RunTab; setTab: (tab: RunTab) => void; cancel: () => void; decideApproval: (approval: Approval, decision: 'approve' | 'request-changes') => void }) {
  const tabs: RunTab[] = ['Overview', 'Workflow', 'Artifacts', 'Tests', 'Activity']
  const isActive = run.status === 'running' || run.status === 'waiting'
  const approval = bundle?.approvals.find(item => item.status === 'pending')
  const passed = bundle?.tests.filter(test => test.status === 'passed').length ?? 0
  const testCount = bundle?.tests.length ?? 0
  return <>
    <div className="run-detail-header"><div className="run-title-wrap"><div className="run-title-line"><span className={`large-run-icon ${run.status}`}><Icon name={run.status === 'completed' ? 'check' : run.status === 'failed' ? 'alert' : run.status === 'waiting' ? 'clock' : 'play'} size={18} /></span><div><div className="run-detail-eyebrow"><code>{run.id}</code><span>·</span><span>{run.project}</span><span>·</span><span>Started {relativeTime(run.createdAt)}</span></div><h1>{run.title}</h1></div></div><p>{run.summary}</p></div><div className="run-header-actions"><StatusPill status={run.status} />{isActive && <button className="button-secondary" onClick={cancel}>Cancel run</button>}</div></div>
    <div className="run-repo-strip"><span className="repo-badge"><Icon name="folder" size={15} />{run.project}</span><span className="repo-strip-sep" /><span className="branch-badge"><Icon name="git" size={15} />{run.branch}</span><button onClick={() => navigator.clipboard?.writeText(run.branch)} className="icon-button subtle" aria-label="Copy branch name"><Icon name="copy" size={14} /></button><span className="repo-spacer" /><span className="avatar-stack"><Avatar name={run.requester} initials={run.requesterInitials} /></span><span className="repo-requester">Requested by <strong>{run.requester}</strong></span><button className="icon-button subtle" title="Copy run link" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/#run/${run.id}`)} aria-label="Copy run link"><Icon name="link" size={15} /></button></div>
    <nav className="run-tabs" aria-label="Run detail sections">{tabs.map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}{item === 'Artifacts' && bundle?.artifacts.length ? <span>{bundle.artifacts.length}</span> : null}{item === 'Tests' && testCount ? <span>{testCount}</span> : null}</button>)}</nav>
    {!bundle ? <div className="loading-state bundle-loading"><span className="spinner" /><span>Loading run details…</span></div> : <div className="run-detail-content">
      {tab === 'Overview' && <div className="run-overview-grid"><div className="run-overview-main"><section className="panel current-step-card"><div className="current-step-top"><span className={`step-icon ${run.status}`}><Icon name={run.status === 'waiting' ? 'clock' : run.status === 'completed' ? 'check' : run.status === 'failed' ? 'alert' : 'activity'} size={17} /></span><span className="current-step-label">CURRENT STEP</span><span className="current-step-time">UPDATED {relativeTime(run.updatedAt).toUpperCase()}</span></div><h2>{run.currentStep}</h2><p>{run.status === 'waiting' ? 'This run is waiting for your review before the next backend action.' : run.status === 'running' ? 'The backend is progressing through this step. Check back for new activity.' : run.status === 'failed' ? 'The backend stopped after reporting a failed check.' : run.status === 'completed' ? 'All workflow steps have completed.' : 'This run was cancelled.'}</p><div className="step-progress">{run.steps.map(step => <span key={step.id} className={`progress-segment ${step.status}`} title={step.label} />)}</div><div className="step-progress-caption"><span>{run.steps.filter(step => step.status === 'complete').length} of {run.steps.length} steps complete</span><span>{Math.round(run.steps.filter(step => step.status === 'complete').length / run.steps.length * 100)}%</span></div></section>
          {approval && <section className="panel review-callout"><span className="review-callout-icon"><Icon name="shield" size={18} /></span><div><span className="eyebrow">ACTION REQUIRED</span><h3>{approval.title}</h3><p>{approval.description}</p><div className="review-actions"><button className="button-secondary" onClick={() => decideApproval(approval, 'request-changes')}>Request changes</button><button className="button-primary" onClick={() => decideApproval(approval, 'approve')}><Icon name="check" size={15} />Approve request</button></div></div></section>}
          <section className="panel overview-activity"><div className="panel-heading"><div><h2>Recent activity</h2><p>Safe summaries from the backend</p></div><button className="text-link" onClick={() => setTab('Activity')}>View all <Icon name="arrow" size={15} /></button></div><ActivityList events={bundle.activity.slice(0, 3)} openRun={() => {}} /></section>
        </div><aside className="run-overview-side"><section className="panel run-facts-card"><h3>Run details</h3><Fact label="Requirement" value={run.requirementId} icon="inbox" /><Fact label="Requested by" value={run.requester} icon="activity" /><Fact label="Created" value={absoluteDate(run.createdAt)} icon="calendar" /><Fact label="Last updated" value={absoluteDate(run.updatedAt)} icon="clock" /></section><section className="panel evidence-card"><div className="evidence-head"><span className="evidence-icon"><Icon name="flask" size={16} /></span><div><h3>Test evidence</h3><p>Backend-reported results</p></div></div><div className="evidence-score"><strong>{passed}</strong><span>/{testCount} checks passed</span></div><button className="evidence-link" onClick={() => setTab('Tests')}>View test results <Icon name="arrow" size={14} /></button></section><section className="panel artifact-count-card"><div><h3>Generated files</h3><p>{bundle.artifacts.length} file{bundle.artifacts.length === 1 ? '' : 's'} in this run</p></div><button className="artifact-count-value" onClick={() => setTab('Artifacts')}>{bundle.artifacts.length}<Icon name="chevron" size={16} /></button></section></aside></div>}
      {tab === 'Workflow' && <section className="panel workflow-panel"><div className="panel-heading"><div><h2>Workflow progress</h2><p>Step summaries and timings reported by the backend</p></div><StatusPill status={run.status} /></div><div className="workflow-steps">{run.steps.map((step, index) => <div className={`workflow-step ${step.status}`} key={step.id}><div className="workflow-rail"><span className="workflow-marker">{step.status === 'complete' ? <Icon name="check" size={13} /> : step.status === 'active' ? <span className="marker-dot" /> : step.status === 'blocked' ? <Icon name="alert" size={13} /> : <span>{String(index + 1).padStart(2, '0')}</span>}</span>{index < run.steps.length - 1 && <span className="workflow-connector" />}</div><div className="workflow-copy"><div className="workflow-title-row"><h3>{step.label}</h3>{step.duration && <span className="duration-badge"><Icon name="clock" size={12} />{step.duration}</span>}{step.status === 'active' && <span className="workflow-active-label">IN PROGRESS</span>}</div><p>{step.detail}</p></div></div>)}</div></section>}
      {tab === 'Artifacts' && <><div className="section-heading run-section-heading"><div><h2>Generated artifacts</h2><p>Review the output references from this run.</p></div><span className="toolbar-count">{bundle.artifacts.length} files</span></div>{bundle.artifacts.length ? <div className="artifact-grid">{bundle.artifacts.map(item => <ArtifactDetailCard key={item.id} artifact={item} />)}</div> : <section className="panel"><EmptyState icon="file" title="No artifacts yet" detail="Backend-generated files will appear when available." /></section>}</>}
      {tab === 'Tests' && <section className="panel table-panel test-results-panel"><div className="panel-heading"><div><h2>Test evidence</h2><p>Results reported by the backend for {run.id}</p></div><span className="test-result-count"><strong>{passed}</strong> / {testCount} passed</span></div><div className="data-table tests-table"><div className="table-head"><span>CHECK</span><span>RESULT</span><span>DURATION</span><span>DETAIL</span><span></span></div>{bundle.tests.length ? bundle.tests.map(test => <div className="table-row detail-test-row" key={test.id}><span className="test-name-cell"><span className={`test-check-icon ${test.status}`}><Icon name={test.status === 'passed' ? 'check' : 'alert'} size={14} /></span><span><strong>{test.name}</strong><small><code>{test.command}</code></small></span></span><StatusPill status={test.status} /><span className="table-muted">{test.duration}</span><span className="table-muted">{test.detail}</span><span /></div>) : <EmptyState icon="flask" title="Checks are pending" detail="Results will be shown after the backend finishes running checks." />}</div></section>}
      {tab === 'Activity' && <section className="panel activity-full-panel"><div className="panel-heading"><div><h2>Activity</h2><p>Timestamped updates for {run.id}</p></div><span className="toolbar-count">{bundle.activity.length} events</span></div><ActivityList events={bundle.activity} openRun={() => {}} /></section>}
    </div>}
    <div className="run-detail-footer"><span><span className="connection-dot" />State loaded from {usesMockApi ? 'the mock API' : 'the backend API'}</span><span>Refreshed {relativeTime(run.updatedAt)}</span></div>
  </>
}

function Fact({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return <div className="fact-row"><span className="fact-icon"><Icon name={icon} size={14} /></span><span><small>{label}</small><strong>{value}</strong></span></div>
}

function ActivityList({ events, openRun }: { events: ActivityEvent[]; openRun: (runId: string) => void }) {
  const iconFor: Record<ActivityEvent['type'], IconName> = { system: 'play', agent: 'spark', approval: 'shield', artifact: 'file', test: 'flask' }
  return <div className="activity-list">{events.length ? events.map(event => <button key={event.id} className="activity-row" onClick={() => openRun(event.runId)}><span className={`activity-marker ${event.type}`}><Icon name={iconFor[event.type]} size={13} /></span><span className="activity-copy"><span>{event.message}</span><small>{relativeTime(event.time)}</small></span></button>) : <EmptyState icon="activity" title="No activity yet" detail="Updates will appear as the run progresses." />}</div>
}

function ArtifactDetailCard({ artifact }: { artifact: Artifact }) {
  const [expanded, setExpanded] = useState(false)
  return <article className={`panel artifact-card ${expanded ? 'expanded' : ''}`}><div className="artifact-card-head"><span className="artifact-file-icon"><Icon name={artifact.path.includes('test') ? 'flask' : 'file'} size={17} /></span><button className="icon-button subtle" onClick={() => setExpanded(v => !v)} aria-label={expanded ? 'Collapse artifact' : 'Expand artifact'}><Icon name={expanded ? 'close' : 'external'} size={15} /></button></div><div className="artifact-path"><strong>{artifact.path.split('/').pop()}</strong><small>{artifact.path}</small></div><pre className={`artifact-snippet ${expanded ? 'full' : ''}`}><code>{artifact.preview}</code></pre><div className="artifact-card-foot"><span className={`change-kind ${artifact.kind}`}>{artifact.kind === 'added' ? 'A' : artifact.kind === 'modified' ? 'M' : 'D'}</span><span className="change-stats"><strong>+{artifact.additions}</strong> <span>−{artifact.deletions}</span></span><span className="artifact-reference">Read-only preview</span></div></article>
}

function CreateRequirementModal({ close, submit }: { close: () => void; submit: (input: { title: string; description: string; project: string }) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [project, setProject] = useState('commerce-api')
  const [submitting, setSubmitting] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const valid = title.trim().length > 0 && description.trim().length > 0
  const onSubmit = async (event: FormEvent) => { event.preventDefault(); setAttempted(true); if (!valid || submitting) return; setSubmitting(true); try { await submit({ title: title.trim(), description: description.trim(), project }) } finally { setSubmitting(false) } }
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !submitting) close() }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [close, submitting])
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !submitting) close() }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="create-title"><div className="modal-top"><span className="modal-glyph"><Icon name="spark" size={20} /></span><button className="icon-button subtle" onClick={close} aria-label="Close"><Icon name="close" /></button></div><div className="modal-heading"><div className="eyebrow">NEW WORK ITEM</div><h2 id="create-title">Start with a requirement</h2><p>Describe the outcome you want. The backend will handle planning and execution.</p></div><form onSubmit={onSubmit} noValidate><label className="form-field"><span>Requirement title <i>*</i></span><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Add a magic link sign-in option" aria-invalid={attempted && !title.trim()} /><small>Make the desired outcome easy to understand.</small></label><label className="form-field"><span>Description <i>*</i></span><textarea value={description} onChange={event => setDescription(event.target.value)} rows={5} placeholder="What should change? Include relevant behaviour and constraints." aria-invalid={attempted && !description.trim()} /><small>Include context and acceptance criteria where you can.</small></label><label className="form-field"><span>Project</span><select value={project} onChange={event => setProject(event.target.value)}><option value="commerce-api">commerce-api</option><option value="commerce-web">commerce-web</option><option value="console-app">console-app</option><option value="docs-site">docs-site</option><option value="events-service">events-service</option></select></label><div className="modal-security"><Icon name="shield" size={15} /><span>The backend validates access before repository actions begin.</span></div><div className="modal-actions"><button type="button" className="button-secondary" onClick={close} disabled={submitting}>Cancel</button><PrimaryButton type="submit" icon="arrow" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit requirement'}</PrimaryButton></div></form></section></div>
}

function ChangeRequestModal({ approval, close, submit }: { approval: Approval; close: () => void; submit: (note: string) => Promise<void> }) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const onSubmit = async (event: FormEvent) => { event.preventDefault(); if (!note.trim() || submitting) return; setSubmitting(true); try { await submit(note.trim()) } finally { setSubmitting(false) } }
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !submitting) close() }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [close, submitting])
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !submitting) close() }}><section className="modal-card compact-modal" role="dialog" aria-modal="true" aria-labelledby="changes-title"><div className="modal-top"><span className="modal-glyph amber-glyph"><Icon name="alert" size={19} /></span><button className="icon-button subtle" onClick={close} aria-label="Close"><Icon name="close" /></button></div><div className="modal-heading"><div className="eyebrow">REQUEST CHANGES · {approval.id}</div><h2 id="changes-title">What should be updated?</h2><p>Your note is sent to the backend with this approval decision.</p></div><div className="change-request-target"><strong>{approval.title}</strong><small>{approval.scope}</small></div><form onSubmit={onSubmit}><label className="form-field"><span>Feedback <i>*</i></span><textarea autoFocus rows={4} value={note} onChange={event => setNote(event.target.value)} placeholder="Describe the changes needed before this can be approved." aria-invalid={note.length > 0 && !note.trim()} required /></label><div className="modal-actions"><button type="button" className="button-secondary" onClick={close} disabled={submitting}>Cancel</button><button type="submit" className="button-primary changes-submit" disabled={!note.trim() || submitting}><Icon name="arrow" size={15} />{submitting ? 'Sending…' : 'Send feedback'}</button></div></form></section></div>
}

function ErrorBanner({ message, retry, onClose }: { message: string; retry: () => void; onClose: () => void }) {
  return <div className="error-banner" role="alert"><span className="error-icon"><Icon name="alert" size={17} /></span><span><strong>Couldn’t update this view</strong><small>{message}</small></span><button className="error-retry" onClick={retry}>Retry</button><button className="icon-button subtle" onClick={onClose} aria-label="Dismiss error"><Icon name="close" size={15} /></button></div>
}

function Toast({ children }: { children: ReactNode }) { return <div className="toast" role="status"><span><Icon name="check-circle" size={16} /></span>{children}</div> }
