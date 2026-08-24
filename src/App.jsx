import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BadgeCheck, Bell, BookOpen,
  Bot, Box, Check, ChevronDown, ChevronRight, CircleDot, Clock3, Database, ExternalLink,
  Eye, FileSearch, Filter, Fingerprint, Gauge, GitBranch, Globe2, Hash, Info, Layers3,
  ListFilter, LockKeyhole, Menu, MessageSquareWarning, Network, Pause, Play, Radar,
  RefreshCw, ScanSearch, Search, Server, Settings, Shield, ShieldAlert, ShieldCheck,
  Sparkles, TerminalSquare, Users, X, Zap,
} from 'lucide-react'

const ACTIONS = ['Allow', 'Warn', 'Reduce Reach', 'Moderator Review', 'Escalate']

const initialIncidents = [
  {
    id: 'HF-48291', age: '18s', source: 'social-web', author: 'acct_7f2a', reach: '18.4K',
    content: "They're replacing us. Make sure no Muslim-owned shop gets a cent from us. Share this list.",
    target: 'Muslims — protected religious group', targetShort: 'Protected group',
    intent: 'Exclusion + mobilization', severity: 'Severe', severityScore: 92, confidence: 97,
    context: 'Direct assertion; not quotation or counterspeech', coordination: 92,
    action: 'Escalate', status: 'critical', campaign: 'Cinder-17', policy: 'HG-2.1 / COORD-4.2',
    why: 'The post targets Muslims as people, advocates group-based economic exclusion, and includes a redistribution cue linked to a coordinated list.',
    distinction: 'Criticism safeguard not triggered: the target is Muslim people and their businesses—not Islamic doctrine, a government, a law, or an individual’s conduct.',
    evidence: [
      { phrase: 'replacing us', label: 'Threat narrative', detail: 'Frames a protected group as a collective demographic threat.' },
      { phrase: 'no Muslim-owned shop', label: 'Group exclusion', detail: 'Calls for discriminatory treatment based on religious identity.' },
      { phrase: 'Share this list', label: 'Mobilization', detail: 'Operational cue; same phrase appeared in 41 near-duplicate posts.' },
    ],
    thread: [
      { who: 'acct_22e1', text: 'Drop the updated list in the channel before 8.' },
      { who: 'acct_7f2a', text: 'Use the same caption so it trends.' },
    ],
    signals: ['41 near-duplicates / 9 min', '7 accounts created < 14 days ago', 'Phrase burst 6.4× baseline', 'Shared outbound list hash'],
  },
  {
    id: 'HF-48288', age: '46s', source: 'social-web', author: 'acct_113c', reach: '6.1K',
    content: 'Every mosque in the district should be watched. You cannot trust Muslims with public safety.',
    target: 'Muslims — protected religious group', targetShort: 'Protected group',
    intent: 'Collective suspicion', severity: 'High', severityScore: 78, confidence: 94,
    context: 'Generalizing claim; local safety thread', coordination: 31,
    action: 'Moderator Review', status: 'high', campaign: null, policy: 'HG-2.2',
    why: 'The text assigns collective untrustworthiness to Muslims and advocates surveillance of religious institutions without conduct-specific evidence.',
    distinction: 'This is not criticism of a mosque’s documented conduct or a security policy; it generalizes suspicion to all Muslims and mosques.',
    evidence: [
      { phrase: 'Every mosque', label: 'Scope generalization', detail: 'Extends a claim to all institutions associated with the group.' },
      { phrase: 'cannot trust Muslims', label: 'Inherent trait claim', detail: 'Attributes dangerousness to a protected group as a whole.' },
    ],
    thread: [{ who: 'acct_113c', text: 'Not one mosque—every one. Stop pretending.' }],
    signals: ['3 reports in 4 min', 'No known cluster match', 'Local-event keyword spike'],
  },
  {
    id: 'HF-48283', age: '1m', source: 'forum', author: 'acct_98bd', reach: '940',
    content: "I oppose the new blasphemy law. Religious ideas aren't above debate, and this policy chills speech.",
    target: 'Government law + religious ideas', targetShort: 'Policy / ideas',
    intent: 'Political and doctrinal criticism', severity: 'None', severityScore: 3, confidence: 98,
    context: 'Policy debate; no group-directed hostility', coordination: 4,
    action: 'Allow', status: 'clear', campaign: null, policy: 'SAFE-CRIT-1.0',
    why: 'The post criticizes a law and argues that religious ideas are open to debate. It makes no hostile claim about Muslims as people.',
    distinction: 'Legitimate criticism safeguard triggered: the targets are a law and religious ideas, not a protected group.',
    evidence: [
      { phrase: 'blasphemy law', label: 'Policy target', detail: 'Names a government policy as the object of criticism.' },
      { phrase: "ideas aren't above debate", label: 'Idea criticism', detail: 'Challenges doctrine/ideas without attacking adherents.' },
    ],
    thread: [{ who: 'acct_98bd', text: 'I would make the same argument about any religion.' }],
    signals: ['No identity-based predicate', 'No exclusion or harm intent', 'Civic-discourse context'],
  },
  {
    id: 'HF-48279', age: '2m', source: 'social-web', author: 'acct_a818', reach: '3.2K',
    content: 'The Saudi government’s sentencing policy is authoritarian and should face international scrutiny.',
    target: 'Saudi government policy', targetShort: 'Government',
    intent: 'Government criticism', severity: 'None', severityScore: 2, confidence: 99,
    context: 'Human-rights policy discussion', coordination: 6,
    action: 'Allow', status: 'clear', campaign: null, policy: 'SAFE-CRIT-1.0',
    why: 'The post criticizes a government and its sentencing policy. It does not target Muslims, Arabs, or religious adherents.',
    distinction: 'Legitimate government criticism safeguard triggered. Strong language about a state or policy is not anti-Muslim hatred.',
    evidence: [
      { phrase: 'Saudi government’s sentencing policy', label: 'Government target', detail: 'Precisely identifies state conduct as the object of criticism.' },
      { phrase: 'authoritarian', label: 'Political judgment', detail: 'A viewpoint about governance, not an identity-based attack.' },
    ],
    thread: [], signals: ['Named institutional target', 'No protected-class generalization'],
  },
  {
    id: 'HF-48271', age: '3m', source: 'short-video', author: 'acct_51df', reach: '24.8K',
    content: "Muslims can't be loyal citizens. Employers should think twice before putting them in sensitive roles.",
    target: 'Muslims — protected religious group', targetShort: 'Protected group',
    intent: 'Discrimination / exclusion', severity: 'High', severityScore: 84, confidence: 96,
    context: 'Spoken monologue; transcription confidence 0.93', coordination: 54,
    action: 'Reduce Reach', status: 'high', campaign: 'Slate-09', policy: 'HG-2.1 / EMP-3.1',
    why: 'The speaker claims Muslims inherently lack civic loyalty and promotes employment discrimination on religious grounds.',
    distinction: 'The post does not criticize a specific person’s performance or a defined security standard; it excludes people by group identity.',
    evidence: [
      { phrase: "can't be loyal citizens", label: 'Inherent disloyalty', detail: 'Assigns a negative trait to every member of a protected group.' },
      { phrase: 'Employers should think twice', label: 'Discriminatory cue', detail: 'Encourages adverse treatment in employment.' },
    ],
    thread: [], signals: ['Audio-text agreement 93%', '12 remixes share opening line', 'Velocity +82% / 10 min'],
  },
  {
    id: 'HF-48266', age: '4m', source: 'forum', author: 'acct_31aa', reach: '410',
    content: 'That imam should answer questions about how the charity funds were managed. Publish the audit.',
    target: 'Named public individual / conduct', targetShort: 'Individual conduct',
    intent: 'Accountability criticism', severity: 'None', severityScore: 4, confidence: 97,
    context: 'Charity audit thread with linked report', coordination: 3,
    action: 'Allow', status: 'clear', campaign: null, policy: 'SAFE-CRIT-1.1',
    why: 'The post requests accountability from an individual for alleged financial conduct and does not generalize to Muslims or Islam.',
    distinction: 'Legitimate criticism safeguard triggered: scrutiny of an individual’s actions is allowed when it does not attack protected identity.',
    evidence: [
      { phrase: 'That imam', label: 'Specific individual', detail: 'The target is a public figure in a defined role.' },
      { phrase: 'charity funds', label: 'Conduct claim', detail: 'The criticism concerns financial management, not religion or identity.' },
    ],
    thread: [], signals: ['Conduct-specific language', 'Linked audit context'],
  },
  {
    id: 'HF-48260', age: '5m', source: 'social-web', author: 'acct_d401', reach: '1.7K',
    content: 'Quoting the leaflet for documentation: “Keep Muslims out.” This message is hateful and our town should reject it.',
    target: 'Quoted anti-Muslim slogan', targetShort: 'Counterspeech',
    intent: 'Documentation + condemnation', severity: 'None', severityScore: 7, confidence: 95,
    context: 'Quotation explicitly condemned by author', coordination: 8,
    action: 'Allow', status: 'clear', campaign: null, policy: 'CONTEXT-QUOTE-2.0',
    why: 'Although the post contains hostile quoted text, the author clearly attributes and condemns it. The communicative intent is counterspeech.',
    distinction: 'Context safeguard triggered: quotation, documentation, and explicit rejection reverse the apparent surface meaning.',
    evidence: [
      { phrase: 'Quoting the leaflet', label: 'Attribution', detail: 'Signals that the hostile words originate from another source.' },
      { phrase: 'hateful ... reject it', label: 'Explicit condemnation', detail: 'The author rejects rather than endorses the quoted message.' },
    ],
    thread: [], signals: ['Quotation boundary detected', 'Negative stance toward quoted text', 'Civic response context'],
  },
  {
    id: 'HF-48252', age: '7m', source: 'social-web', author: 'acct_f8b2', reach: '8.9K',
    content: 'Flood the replies at 9 tonight. Use the mosque image and the exact caption from the folder.',
    target: 'Religious institution / associated community', targetShort: 'Campaign target',
    intent: 'Coordinated harassment planning', severity: 'Moderate', severityScore: 63, confidence: 91,
    context: 'Closed-group leak; refers to external asset folder', coordination: 96,
    action: 'Escalate', status: 'critical', campaign: 'Cinder-17', policy: 'COORD-4.2',
    why: 'The message gives timing, target, and asset instructions consistent with coordinated harassment. Harm is inferred from linked campaign context.',
    distinction: 'No substantive criticism of doctrine, policy, or conduct appears; the text is operational planning aimed at a religious institution.',
    evidence: [
      { phrase: 'Flood the replies at 9', label: 'Synchronized action', detail: 'Specifies a common action and exact launch time.' },
      { phrase: 'exact caption from the folder', label: 'Shared asset', detail: 'Coordinates duplicate media and copy across accounts.' },
    ],
    thread: [{ who: 'acct_f8b2', text: 'Confirm with a check when scheduled.' }],
    signals: ['Linked to 18 accounts', 'Shared media perceptual hash', 'Launch window in 42 min'],
  },
]

const streamItems = [
  { source: 'social-web', text: 'Policy critique: the city consultation excluded too many community groups.', className: 'clear', result: 'ALLOW', score: 4 },
  { source: 'forum', text: 'Documenting a hostile slogan and asking residents to report it.', className: 'clear', result: 'ALLOW · CONTEXT', score: 9 },
  { source: 'short-video', text: 'Collective loyalty claim detected in auto-transcribed clip.', className: 'high', result: 'REVIEW', score: 78 },
  { source: 'social-web', text: 'Near-duplicate mobilization phrase matched to Cinder-17.', className: 'critical', result: 'ESCALATE', score: 94 },
  { source: 'forum', text: 'Government policy criticism; no protected-group target.', className: 'clear', result: 'ALLOW', score: 2 },
]

const trend = [22, 25, 23, 28, 31, 27, 29, 33, 38, 35, 44, 40, 49, 43, 46, 58, 53, 61, 55, 63, 68, 60, 66, 72]
const bars = [34, 46, 29, 54, 61, 43, 70, 51, 64, 78, 58, 74, 67, 82, 62, 76, 88, 69, 80, 92, 73, 86, 79, 90]

const networkNodes = [
  { id: 'A01', x: 252, y: 145, r: 17, kind: 'origin', label: 'acct_7f2a' },
  { id: 'A02', x: 166, y: 88, r: 11, kind: 'amplifier', label: 'acct_22e1' },
  { id: 'A03', x: 340, y: 79, r: 12, kind: 'amplifier', label: 'acct_19c4' },
  { id: 'A04', x: 396, y: 155, r: 10, kind: 'amplifier', label: 'acct_b170' },
  { id: 'A05', x: 322, y: 230, r: 9, kind: 'recent', label: 'acct_340e' },
  { id: 'A06', x: 185, y: 232, r: 9, kind: 'recent', label: 'acct_3ba8' },
  { id: 'A07', x: 88, y: 147, r: 8, kind: 'recent', label: 'acct_76fd' },
  { id: 'A08', x: 458, y: 83, r: 7, kind: 'recent', label: 'acct_92d0' },
  { id: 'A09', x: 459, y: 254, r: 7, kind: 'recent', label: 'acct_818a' },
  { id: 'A10', x: 77, y: 249, r: 7, kind: 'recent', label: 'acct_5f27' },
  { id: 'A11', x: 255, y: 286, r: 7, kind: 'recent', label: 'acct_ec20' },
]

const networkEdges = [
  ['A01','A02'],['A01','A03'],['A01','A04'],['A01','A05'],['A01','A06'],['A02','A07'],
  ['A02','A03'],['A03','A08'],['A04','A08'],['A04','A09'],['A05','A09'],['A05','A11'],
  ['A06','A10'],['A06','A11'],['A07','A10'],['A02','A06'],['A03','A04'],
]

const navItems = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'lab', label: 'Judge Lab', icon: Sparkles, count: 'TRY' },
  { id: 'incidents', label: 'Incident Queue', icon: ShieldAlert, count: 12 },
  { id: 'campaigns', label: 'Campaign Graph', icon: Network, count: 3 },
  { id: 'sources', label: 'Signal Sources', icon: Database },
  { id: 'audit', label: 'Audit Trail', icon: Fingerprint },
]

function formatClock(date) {
  return new Intl.DateTimeFormat('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date)
}

function statusTone(value) {
  if (value === 'critical' || value === 'Severe' || value === 'Escalate') return 'red'
  if (value === 'high' || value === 'High' || value === 'Moderator Review') return 'amber'
  if (value === 'Moderate' || value === 'Reduce Reach' || value === 'Warn') return 'blue'
  return 'green'
}

function Panel({ className = '', children }) {
  return <section className={`panel ${className}`}>{children}</section>
}

function PanelHeader({ eyebrow, title, description, children }) {
  return (
    <div className="panel-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="panel-header-actions">{children}</div>}
    </div>
  )
}

function MiniSpark({ values, color = '#59e0bd' }) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const points = values.map((v, i) => `${i * (88 / (values.length - 1))},${28 - ((v - min) / Math.max(1, max - min)) * 24}`).join(' ')
  return (
    <svg className="mini-spark" viewBox="0 0 88 32" aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function MetricCard({ label, value, unit, change, up = true, icon: Icon, tone = 'teal', values }) {
  return (
    <div className={`metric-card metric-${tone}`}>
      <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={15} /></span></div>
      <div className="metric-value">{value}<small>{unit}</small></div>
      <div className="metric-foot">
        <span className={up ? 'positive' : 'negative'}>{up ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>} {change}</span>
        <MiniSpark values={values} color={tone === 'red' ? '#ff6b7d' : tone === 'amber' ? '#f4b860' : tone === 'blue' ? '#73a9ff' : '#59e0bd'} />
      </div>
    </div>
  )
}

function TimelineChart({ paused }) {
  const max = Math.max(...trend)
  const points = trend.map((v, i) => `${24 + i * (690 / (trend.length - 1))},${200 - (v / max) * 150}`).join(' ')
  const area = `24,200 ${points} 714,200`
  return (
    <div className="chart-wrap">
      <div className="chart-y-labels"><span>3.5k</span><span>2.0k</span><span>0</span></div>
      <svg className="timeline-chart" viewBox="0 0 740 230" preserveAspectRatio="none" role="img" aria-label="Analyzed content and intervention trend over the last 60 minutes">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#58e0bd" stopOpacity=".23"/><stop offset="100%" stopColor="#58e0bd" stopOpacity="0"/></linearGradient>
          <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#efb457" stopOpacity=".7"/><stop offset="100%" stopColor="#efb457" stopOpacity=".15"/></linearGradient>
        </defs>
        {[50,100,150,200].map(y => <line key={y} x1="24" x2="714" y1={y} y2={y} stroke="#1d2a35" strokeWidth="1" strokeDasharray="3 5" />)}
        {bars.map((v, i) => <rect key={i} x={25 + i * 29.9} y={200 - v * .74} width="7" height={v * .74} rx="2" fill="url(#barFill)" opacity={i > 20 ? 1 : .58}/>) }
        <polygon points={area} fill="url(#areaFill)" />
        <polyline points={points} fill="none" stroke="#5ce2bf" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <line x1="714" x2="714" y1="40" y2="200" stroke="#5ce2bf" strokeOpacity=".55" strokeDasharray="4 4" />
        <circle cx="714" cy={200 - (trend.at(-1) / max) * 150} r="4.5" fill="#071019" stroke="#5ce2bf" strokeWidth="3" className={paused ? '' : 'pulse-node'} />
        <g transform="translate(621 20)"><rect width="94" height="25" rx="5" fill="#12241f" stroke="#285e51"/><text x="47" y="16" textAnchor="middle" fill="#88f0d2" fontSize="10" fontFamily="ui-monospace, monospace">2,847 / MIN</text></g>
      </svg>
      <div className="chart-x-labels"><span>-60m</span><span>-45m</span><span>-30m</span><span>-15m</span><span>now</span></div>
      <div className="chart-legend"><span><i className="legend-line"/> Analyzed</span><span><i className="legend-bar"/> Interventions</span><span className="chart-note">15 sec rolling average</span></div>
    </div>
  )
}

function DecisionSnapshot() {
  const rows = [
    { label: 'Allow', value: 84.2, color: 'green' },
    { label: 'Warn', value: 6.7, color: 'blue' },
    { label: 'Reduce reach', value: 4.9, color: 'amber' },
    { label: 'Moderator review', value: 3.1, color: 'orange' },
    { label: 'Escalate', value: 1.1, color: 'red' },
  ]
  return (
    <Panel className="snapshot-panel">
      <PanelHeader eyebrow="DECISION DISTRIBUTION" title="Firewall outcomes" description="Last 60 minutes" />
      <div className="decision-total"><span>86,410</span><small>decisions</small><b><BadgeCheck size={13}/> 99.97% pipeline health</b></div>
      <div className="decision-bars">
        {rows.map(row => (
          <div className="decision-row" key={row.label}>
            <div><span>{row.label}</span><b>{row.value}%</b></div>
            <div className="progress-track"><i className={`progress-${row.color}`} style={{ width: `${row.value}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="guardrail"><ShieldCheck size={16}/><div><b>Criticism safeguard</b><span>8,214 posts correctly separated from group-directed hate</span></div></div>
    </Panel>
  )
}

function IncidentTable({ incidents, onSelect, query = '', compact = false }) {
  const filtered = incidents.filter(item => [item.id, item.content, item.target, item.action, item.author].join(' ').toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="table-scroll">
      <table className={`incident-table ${compact ? 'compact' : ''}`}>
        <thead><tr><th>Incident</th><th>Signal</th><th>Target</th><th>Severity</th><th>Confidence</th><th>Decision</th><th></th></tr></thead>
        <tbody>
          {filtered.map(item => (
            <tr key={item.id} onClick={() => onSelect(item)} tabIndex="0" onKeyDown={e => e.key === 'Enter' && onSelect(item)}>
              <td><div className="incident-id"><i className={`status-dot ${item.status}`}/><div><b>{item.id}</b><span>{item.age} · {item.source}</span></div></div></td>
              <td><div className="signal-cell"><span>{item.content}</span><small>{item.author} · est. reach {item.reach}</small></div></td>
              <td><span className="target-label">{item.targetShort}</span></td>
              <td><span className={`severity-chip tone-${statusTone(item.severity)}`}>{item.severity}</span></td>
              <td><div className="confidence"><b>{item.confidence}%</b><i><em style={{ width: `${item.confidence}%` }}/></i></div></td>
              <td><span className={`action-label tone-${statusTone(item.action)}`}>{item.action}</span></td>
              <td><button className="icon-button row-open" aria-label={`Open ${item.id}`}><ChevronRight size={16}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filtered.length && <div className="empty-state"><Search size={22}/><b>No incidents match</b><span>Try another incident ID, phrase, or action.</span></div>}
    </div>
  )
}

function NetworkGraph({ selectedNode, setSelectedNode, large = false }) {
  const selected = networkNodes.find(n => n.id === selectedNode) || networkNodes[0]
  return (
    <div className={`network-shell ${large ? 'network-large' : ''}`}>
      <svg className="network-svg" viewBox="0 0 540 320" role="img" aria-label="Coordinated campaign account network">
        <defs>
          <filter id="nodeGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <g className="network-rings"><circle cx="252" cy="145" r="53"/><circle cx="252" cy="145" r="112"/><circle cx="252" cy="145" r="178"/></g>
        {networkEdges.map(([a,b], index) => {
          const n1 = networkNodes.find(n => n.id === a); const n2 = networkNodes.find(n => n.id === b)
          return <line key={index} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} className={a === selectedNode || b === selectedNode ? 'edge active' : 'edge'} />
        })}
        {networkNodes.map(node => (
          <g key={node.id} className={`net-node ${node.kind} ${node.id === selectedNode ? 'selected' : ''}`} onClick={() => setSelectedNode(node.id)} role="button" tabIndex="0">
            {node.id === selectedNode && <circle cx={node.x} cy={node.y} r={node.r + 8} className="node-halo"/>}
            <circle cx={node.x} cy={node.y} r={node.r} className="node-circle" filter={node.kind === 'origin' ? 'url(#nodeGlow)' : undefined}/>
            {(large || node.id === selectedNode || node.kind === 'origin') && <text x={node.x} y={node.y + node.r + 14} textAnchor="middle">{node.label}</text>}
          </g>
        ))}
      </svg>
      <div className="network-legend"><span><i className="origin"/> Origin</span><span><i className="amplifier"/> Amplifier</span><span><i className="recent"/> Recent / low-trust</span></div>
      <div className="node-inspector">
        <div className="node-avatar"><Hash size={16}/></div>
        <div><b>{selected.label}</b><span>{selected.kind === 'origin' ? 'Probable campaign origin' : selected.kind === 'amplifier' ? 'High-velocity amplifier' : 'Recently observed account'}</span></div>
        <div className="node-stat"><b>{selected.kind === 'origin' ? '94' : selected.kind === 'amplifier' ? '79' : '61'}%</b><span>link score</span></div>
      </div>
    </div>
  )
}

function CampaignPanel({ selectedNode, setSelectedNode, large = false }) {
  return (
    <Panel className={large ? 'campaign-panel campaign-expanded' : 'campaign-panel'}>
      <PanelHeader eyebrow="COORDINATION INTELLIGENCE" title="Campaign Cinder-17" description="Cross-account similarity · 9 minute burst">
        <span className="live-pill danger"><span/> HIGH RISK</span>
      </PanelHeader>
      <NetworkGraph selectedNode={selectedNode} setSelectedNode={setSelectedNode} large={large}/>
      <div className="campaign-stats">
        <div><span>Accounts</span><b>41</b><small>+12 in 15m</small></div>
        <div><span>Copy similarity</span><b>93%</b><small>exact + semantic</small></div>
        <div><span>Potential reach</span><b>118K</b><small>before controls</small></div>
      </div>
      <button className="text-button"><GitBranch size={14}/> Open full campaign trace <ChevronRight size={14}/></button>
    </Panel>
  )
}

function LiveStream({ paused, feedIndex }) {
  const items = [...streamItems.slice(feedIndex % streamItems.length), ...streamItems.slice(0, feedIndex % streamItems.length)].slice(0, 4)
  return (
    <Panel className="live-stream-panel">
      <PanelHeader eyebrow="EVENT STREAM" title="Live classification feed" description="Redacted model decisions · newest first">
        <span className={`live-pill ${paused ? 'muted' : ''}`}><span/> {paused ? 'PAUSED' : 'STREAMING'}</span>
      </PanelHeader>
      <div className="stream-list">
        {items.map((item, index) => (
          <div className={`stream-row ${index === 0 && !paused ? 'new-row' : ''}`} key={`${item.text}-${index}`}>
            <div className={`stream-score ${item.className}`}>{item.score}</div>
            <div className="stream-copy"><b>{item.text}</b><span><i className="source-dot"/>{item.source} · {index === 0 ? 'just now' : `${index * 4 + 2}s ago`}</span></div>
            <span className={`stream-result ${item.className}`}>{item.result}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function IncidentDrawer({ incident, onClose, onAction, tab, setTab }) {
  if (!incident) return null
  const dimensions = [
    { label: 'Target', value: incident.target, icon: ScanSearch, score: incident.targetShort === 'Protected group' ? 96 : 18 },
    { label: 'Intent', value: incident.intent, icon: Zap, score: incident.severityScore },
    { label: 'Hate severity', value: incident.severity, icon: ShieldAlert, score: incident.severityScore },
    { label: 'Confidence', value: `${incident.confidence}%`, icon: Gauge, score: incident.confidence },
    { label: 'Context', value: incident.context, icon: BookOpen, score: incident.severityScore > 20 ? 74 : 15 },
    { label: 'Coordination risk', value: `${incident.coordination}%`, icon: Network, score: incident.coordination },
  ]
  return (
    <div className="drawer-layer" role="dialog" aria-modal="true" aria-label={`Investigation ${incident.id}`}>
      <button className="drawer-scrim" onClick={onClose} aria-label="Close investigation"/>
      <aside className="incident-drawer">
        <div className="drawer-topbar">
          <div><span>INCIDENT INVESTIGATION</span><b>{incident.id}</b></div>
          <div className="drawer-actions"><button className="icon-button"><ExternalLink size={16}/></button><button className="icon-button" onClick={onClose}><X size={18}/></button></div>
        </div>
        <div className="drawer-status">
          <div className={`risk-emblem tone-${statusTone(incident.severity)}`}><ShieldAlert size={22}/></div>
          <div><span>AI RECOMMENDATION</span><b>{incident.action}</b><small>{incident.policy}</small></div>
          <div className="decision-confidence"><b>{incident.confidence}%</b><span>confidence</span></div>
        </div>
        <div className="drawer-tabs">
          {['Decision', 'Evidence', 'Context'].map(name => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{name}{name === 'Evidence' && <span>{incident.evidence.length}</span>}</button>)}
        </div>
        <div className="drawer-scroll">
          {tab === 'Decision' && (
            <>
              <div className="explanation-card">
                <div className="explanation-title"><Sparkles size={16}/><b>Why this decision</b><span>EXPLAINER v4.3</span></div>
                <p>{incident.why}</p>
                <div className="distinction"><ShieldCheck size={17}/><span><b>Criticism vs. hate check</b>{incident.distinction}</span></div>
              </div>
              <h3 className="section-label">DECISION DIMENSIONS</h3>
              <div className="dimension-grid">
                {dimensions.map(item => (
                  <div className="dimension-card" key={item.label}>
                    <div className="dimension-icon"><item.icon size={15}/></div>
                    <div className="dimension-copy"><span>{item.label}</span><b>{item.value}</b><i><em className={`tone-bg-${item.score > 80 ? 'red' : item.score > 45 ? 'amber' : 'green'}`} style={{ width: `${item.score}%` }}/></i></div>
                  </div>
                ))}
              </div>
              <h3 className="section-label">CONTENT UNDER REVIEW</h3>
              <div className="content-card">
                <div className="content-meta"><span><Globe2 size={13}/>{incident.source}</span><span>{incident.author}</span><span>{incident.age} ago</span></div>
                <blockquote>“{incident.content}”</blockquote>
                <div className="evidence-tags">{incident.evidence.map(e => <span key={e.phrase}>{e.phrase}</span>)}</div>
              </div>
            </>
          )}
          {tab === 'Evidence' && (
            <>
              <div className="evidence-summary"><Radar size={18}/><div><b>{incident.evidence.length} semantic evidence markers</b><span>Markers show model-relevant spans, not a keyword-only decision.</span></div></div>
              <div className="evidence-list">
                {incident.evidence.map((item, i) => (
                  <div className="evidence-item" key={item.phrase}>
                    <div className="evidence-number">0{i + 1}</div>
                    <div><span>“{item.phrase}”</span><b>{item.label}</b><p>{item.detail}</p></div>
                  </div>
                ))}
              </div>
              <h3 className="section-label">CORROBORATING SIGNALS</h3>
              <div className="signal-grid">{incident.signals.map(signal => <div key={signal}><CircleDot size={13}/>{signal}</div>)}</div>
              <div className="policy-trace"><div><LockKeyhole size={16}/><b>Policy trace</b></div><span>{incident.policy}</span><p>Protected characteristic → group-directed predicate → harm/hostility test → context exception → coordination enhancement.</p></div>
            </>
          )}
          {tab === 'Context' && (
            <>
              <div className="context-header"><MessageSquareWarning size={18}/><div><b>Conversation context</b><span>{incident.thread.length ? `${incident.thread.length} linked messages before this post` : 'No material prior messages found'}</span></div></div>
              <div className="thread-card">
                {incident.thread.length ? incident.thread.map((message, index) => (
                  <div className="thread-message" key={index}><div>{message.who.slice(-2).toUpperCase()}</div><p><b>{message.who}</b><span>{message.text}</span></p><small>-{incident.thread.length - index + 1}m</small></div>
                )) : <div className="thread-empty"><MessageSquareWarning size={22}/><span>No preceding text changed the decision.</span></div>}
                <div className="thread-message current"><div>{incident.author.slice(-2).toUpperCase()}</div><p><b>{incident.author} · flagged post</b><span>{incident.content}</span></p><small>now</small></div>
              </div>
              <h3 className="section-label">ACCOUNT + DISTRIBUTION</h3>
              <div className="account-grid"><div><span>Redacted account</span><b>{incident.author}</b></div><div><span>Estimated reach</span><b>{incident.reach}</b></div><div><span>Campaign</span><b>{incident.campaign || 'No match'}</b></div><div><span>Coordination risk</span><b>{incident.coordination}%</b></div></div>
              <div className="privacy-note"><Info size={15}/> Identifiers are redacted in analyst view. Raw evidence access requires elevated authorization and is audit logged.</div>
            </>
          )}
        </div>
        <div className="intervention-bar">
          <div><span>SELECT INTERVENTION</span><small>Every action is reversible and audit logged</small></div>
          <div className="action-buttons">
            {ACTIONS.map(action => <button key={action} className={`${incident.action === action ? 'selected' : ''} action-${action.toLowerCase().replaceAll(' ', '-')}`} onClick={() => onAction(incident.id, action)}>{action === 'Allow' && <Check size={14}/>} {action}</button>)}
          </div>
        </div>
      </aside>
    </div>
  )
}

const judgeSamples = [
  {
    label: 'Legitimate criticism', tone: 'clear',
    text: 'I disagree with this religious doctrine and think the proposed blasphemy law would restrict free expression.',
    context: 'standalone',
  },
  {
    label: 'Group exclusion', tone: 'critical',
    text: 'No Muslims should be hired for public-facing jobs. Share this so every employer follows the same rule.',
    context: 'standalone',
  },
  {
    label: 'Counterspeech', tone: 'context',
    text: 'Quoting a leaflet for documentation: “Keep Muslims out.” This message is hateful and our community should reject it.',
    context: 'counterspeech',
  },
]

function JudgeLab({ onInspect }) {
  const [text, setText] = useState('')
  const [context, setContext] = useState('standalone')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadSample = sample => {
    setText(sample.text)
    setContext(sample.context)
    setResult(null)
    setError('')
  }

  const submit = async event => {
    event.preventDefault()
    if (text.trim().length < 3 || loading) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, context }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Analysis failed')
      setResult(payload)
    } catch (requestError) {
      setError(requestError.message || 'The analysis service is unavailable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const dimensions = result ? [
    ['Target', result.target, ScanSearch],
    ['Intent', result.intent, Zap],
    ['Hate severity', `${result.severity} · ${result.severityScore}/100`, ShieldAlert],
    ['Confidence', `${result.confidence}%`, Gauge],
    ['Context', result.context, BookOpen],
    ['Coordination risk', `${result.coordination}%`, Network],
  ] : []

  return (
    <>
      <div className="page-intro judge-intro">
        <div><div className="eyebrow">INTERACTIVE JUDGE EXPERIENCE</div><h1>Test the firewall</h1><p>Submit a post and inspect the target, intent, severity, context, coordination risk, and recommended intervention.</p></div>
        <div className="intro-meta"><span><LockKeyhole size={14}/> No submitted text retained</span><span><TerminalSquare size={14}/> Live API analysis</span></div>
      </div>
      <div className="judge-layout">
        <Panel className="judge-compose">
          <PanelHeader eyebrow="POST ANALYZER" title="Submit content for review" description="Use your own example or load a contrast test below.">
            <span className="live-pill"><span/> READY</span>
          </PanelHeader>
          <form className="judge-form" onSubmit={submit}>
            <label className="judge-text-label" htmlFor="judge-post"><span>POST TEXT</span><small>{text.length} / 1,500</small></label>
            <textarea id="judge-post" value={text} maxLength={1500} onChange={event => { setText(event.target.value); setResult(null); setError('') }} placeholder="Paste a social post here…" autoFocus />
            <div className="sample-heading"><span>QUICK CONTRAST TESTS</span><small>These demonstrate criticism, hate, and context safeguards.</small></div>
            <div className="judge-samples">
              {judgeSamples.map(sample => <button type="button" key={sample.label} className={`judge-sample ${sample.tone}`} onClick={() => loadSample(sample)}><i/><span>{sample.label}</span><ChevronRight size={13}/></button>)}
            </div>
            <div className="judge-controls">
              <label><span>SUPPLIED CONTEXT</span><select value={context} onChange={event => { setContext(event.target.value); setResult(null) }}><option value="standalone">Standalone post</option><option value="quotation">Quoted material</option><option value="reporting">News / documentation</option><option value="counterspeech">Counterspeech / condemnation</option></select></label>
              <button className="primary-button judge-submit" type="submit" disabled={loading || text.trim().length < 3}>{loading ? <RefreshCw size={15} className="spinning"/> : <ScanSearch size={15}/>} {loading ? 'Analyzing…' : 'Analyze post'}</button>
            </div>
            {error && <div className="judge-error"><AlertTriangle size={15}/><span>{error}</span></div>}
          </form>
          <div className="judge-privacy"><LockKeyhole size={14}/><span>Input is processed in memory for this request and is not written to the connector cache or audit log unless you explicitly open an investigation.</span></div>
        </Panel>

        {!result ? (
          <Panel className="judge-waiting">
            <div className="scanner-visual"><div/><div/><Shield size={34}/></div>
            <div><div className="eyebrow">AWAITING SIGNAL</div><h2>Analysis appears here</h2><p>The result will expose all six decision dimensions, supporting evidence, the criticism safeguard, and a proportional intervention.</p></div>
            <div className="waiting-steps"><span><b>01</b> Target</span><span><b>02</b> Intent</span><span><b>03</b> Harm</span><span><b>04</b> Context</span><span><b>05</b> Coordination</span><span><b>06</b> Action</span></div>
          </Panel>
        ) : (
          <Panel className="judge-result">
            <div className="judge-result-head">
              <div className={`judge-score tone-${statusTone(result.severity)}`}><strong>{result.severityScore}</strong><span>RISK / 100</span></div>
              <div><div className="eyebrow">FIREWALL RECOMMENDATION</div><h2>{result.action}</h2><p>{result.policy} · {result.processingMs}ms · {result.confidence}% confidence</p></div>
              <span className={`severity-chip tone-${statusTone(result.severity)}`}>{result.severity}</span>
            </div>
            <div className="lab-dimensions">
              {dimensions.map(([label, value, Icon]) => <div key={label}><span className="lab-icon"><Icon size={15}/></span><p><small>{label}</small><b>{value}</b></p></div>)}
            </div>
            <div className="judge-explanation">
              <div><Sparkles size={16}/><b>Why this decision</b></div><p>{result.why}</p>
              <div className="distinction"><ShieldCheck size={17}/><span><b>Criticism vs. hate check</b>{result.distinction}</span></div>
            </div>
            <div className="judge-evidence"><span>DETECTED EVIDENCE</span><div>{result.evidence.map(item => <em key={`${item.label}-${item.phrase}`}>{item.phrase}<small>{item.label}</small></em>)}</div></div>
            <div className="judge-result-actions">
              <div><Info size={14}/><span>{result.disclosure}</span></div>
              <button className="primary-button" onClick={() => onInspect(result)}><FileSearch size={15}/> Open full investigation <ChevronRight size={14}/></button>
            </div>
          </Panel>
        )}
      </div>
      <div className="principle-banner judge-principle"><ShieldCheck size={20}/><div><b>Rights-preserving boundary</b><span>The engine tests protected-group targeting separately from criticism of religion, doctrine, governments, laws, policies, and individual conduct. Context can change the outcome.</span></div><button onClick={() => loadSample(judgeSamples[0])}><Sparkles size={14}/> Try criticism test</button></div>
    </>
  )
}

function Overview({ incidents, onSelect, onOpenLab, query, paused, feedIndex, selectedNode, setSelectedNode, liveData }) {
  const projected = liveData?.aggregate?.projectedPerMinute
  return (
    <>
      <div className="page-intro">
        <div><div className="eyebrow">REAL-TIME MODERATION OPERATIONS</div><h1>Firewall overview</h1><p>Explainable protection against group-directed hate without suppressing legitimate criticism.</p></div>
        <div className="overview-intro-actions"><button className="primary-button" onClick={onOpenLab}><Sparkles size={14}/> Test a post</button><div className="intro-meta"><span><Clock3 size={14}/> Window: last 60 min</span><span><Server size={14}/> ZA region · edge-03</span></div></div>
      </div>
      <div className="metrics-grid">
        <MetricCard label="Content analyzed" value={projected ? projected.toLocaleString() : '2,847'} unit="/min" change="12.4%" icon={Activity} values={[11,13,12,15,16,18,17,21]} />
        <MetricCard label="Intervention rate" value="3.8" unit="%" change="0.6 pts" icon={ShieldAlert} tone="amber" values={[17,16,15,18,20,19,22,21]} />
        <MetricCard label="High-risk incidents" value="12" unit="open" change="3 this hour" icon={AlertTriangle} tone="red" values={[8,7,9,8,10,9,11,12]} />
        <MetricCard label="Decision confidence" value="94.6" unit="%" change="1.2 pts" icon={BadgeCheck} tone="blue" values={[81,83,84,86,87,88,91,94]} />
      </div>
      <div className="dashboard-grid">
        <Panel className="traffic-panel span-8">
          <PanelHeader eyebrow="PIPELINE TELEMETRY" title="Analyzed traffic" description="Total classifications with intervention overlay">
            <div className="source-selector"><Globe2 size={14}/><span>All sources</span><ChevronDown size={14}/></div>
          </PanelHeader>
          <TimelineChart paused={paused}/>
        </Panel>
        <DecisionSnapshot />
        <Panel className="incidents-panel span-8">
          <PanelHeader eyebrow="PRIORITY QUEUE" title="Flagged incidents" description="Ranked by severity, reach, and coordination risk">
            <button className="filter-button"><ListFilter size={14}/> Priority <ChevronDown size={13}/></button>
          </PanelHeader>
          <IncidentTable incidents={incidents.slice(0, 6)} onSelect={onSelect} query={query} compact/>
          <div className="panel-footer"><span><span className="key-hint">↵</span> Select an incident to inspect the decision</span><button>View all 12 <ChevronRight size={14}/></button></div>
        </Panel>
        <CampaignPanel selectedNode={selectedNode} setSelectedNode={setSelectedNode}/>
        <LiveStream paused={paused} feedIndex={feedIndex}/>
        <Panel className="guardrail-panel">
          <PanelHeader eyebrow="FAIRNESS CONTROL" title="Criticism / hate boundary" description="Last 24h safeguard performance" />
          <div className="boundary-score"><div><span>98.7%</span><small>boundary agreement</small></div><svg viewBox="0 0 120 60"><path d="M8 52 Q30 49 42 39 T68 28 T112 8" fill="none" stroke="#68a4ff" strokeWidth="3"/><path d="M8 52 Q30 49 42 39 T68 28 T112 8 L112 60 L8 60Z" fill="url(#areaFill)" opacity=".4"/></svg></div>
          <div className="boundary-list"><div><span>Religion / doctrine criticism</span><b>5,184 allowed</b></div><div><span>Government / policy criticism</span><b>2,431 allowed</b></div><div><span>Individual conduct criticism</span><b>599 allowed</b></div><div className="review"><span>Boundary cases to review</span><b>31 queued</b></div></div>
          <div className="guardrail"><ShieldCheck size={16}/><div><b>Safeguard healthy</b><span>No protected-viewpoint drift detected in current window.</span></div></div>
        </Panel>
      </div>
    </>
  )
}

function IncidentsView({ incidents, onSelect, query }) {
  const [filter, setFilter] = useState('All')
  const displayed = filter === 'All' ? incidents : filter === 'Protected-group hate' ? incidents.filter(i => i.targetShort === 'Protected group') : filter === 'Legitimate criticism' ? incidents.filter(i => i.action === 'Allow') : incidents.filter(i => i.coordination > 70)
  return (
    <>
      <div className="page-intro"><div><div className="eyebrow">TRIAGE + INVESTIGATION</div><h1>Incident queue</h1><p>Review model reasoning, evidence, context, and recommended interventions.</p></div><button className="primary-button"><ShieldCheck size={15}/> Start review session</button></div>
      <div className="queue-summary"><div><span>OPEN</span><b>12</b><small>3 critical</small></div><div><span>OLDEST</span><b>7m 12s</b><small>within 15m SLA</small></div><div><span>HUMAN AGREEMENT</span><b>96.8%</b><small>last 500 reviews</small></div><div><span>APPEAL REVERSAL</span><b>1.7%</b><small>30-day average</small></div></div>
      <Panel className="full-table-panel">
        <PanelHeader eyebrow="DECISION WORKBENCH" title="Active incidents" description={`${displayed.length} incidents in current view`}>
          <button className="filter-button"><Filter size={14}/> Filters <span className="filter-count">2</span></button>
          <button className="icon-button"><RefreshCw size={15}/></button>
        </PanelHeader>
        <div className="filter-tabs">{['All','Protected-group hate','Legitimate criticism','Coordination'].map(name => <button key={name} className={filter === name ? 'active' : ''} onClick={() => setFilter(name)}>{name}{name === 'All' && <span>{incidents.length}</span>}</button>)}</div>
        <IncidentTable incidents={displayed} onSelect={onSelect} query={query}/>
      </Panel>
      <div className="principle-banner"><ShieldCheck size={20}/><div><b>Protected discourse principle</b><span>Criticism of Islam, any religion, a state, a policy, or an individual is allowed unless the content separately attacks people based on protected identity or promotes harm, exclusion, or harassment.</span></div><button><BookOpen size={14}/> Read policy</button></div>
    </>
  )
}

function CampaignsView({ selectedNode, setSelectedNode }) {
  return (
    <>
      <div className="page-intro"><div><div className="eyebrow">ADVERSARIAL BEHAVIOR ANALYSIS</div><h1>Coordinated campaigns</h1><p>Reveal synchronized accounts, shared assets, and cross-platform propagation paths.</p></div><div className="intro-meta"><span><Radar size={14}/> 3 active clusters</span><span><Zap size={14}/> 1 launch imminent</span></div></div>
      <div className="campaign-layout">
        <CampaignPanel selectedNode={selectedNode} setSelectedNode={setSelectedNode} large/>
        <Panel className="campaign-side">
          <PanelHeader eyebrow="ACTIVE CLUSTERS" title="Campaign watchlist" />
          <div className="watch-list">
            <button className="watch-item active"><i className="status-dot critical"/><div><b>Cinder-17</b><span>41 accounts · anti-Muslim exclusion</span></div><em>96</em></button>
            <button className="watch-item"><i className="status-dot high"/><div><b>Slate-09</b><span>18 accounts · loyalty narrative</span></div><em>78</em></button>
            <button className="watch-item"><i className="status-dot medium"/><div><b>Echo-24</b><span>9 accounts · reply flooding</span></div><em>61</em></button>
          </div>
          <h3 className="section-label">CAMPAIGN FINGERPRINT</h3>
          <div className="fingerprint-list"><div><Fingerprint size={15}/><span>Text similarity</span><b>93%</b></div><div><Box size={15}/><span>Shared media hashes</span><b>7</b></div><div><Clock3 size={15}/><span>Median post spacing</span><b>11s</b></div><div><Layers3 size={15}/><span>Cross-source presence</span><b>3</b></div></div>
          <div className="launch-alert"><AlertTriangle size={18}/><div><b>Launch window detected</b><span>Campaign messages reference 20:00–20:15 local time.</span></div></div>
          <button className="primary-button full"><ShieldAlert size={15}/> Open campaign response</button>
        </Panel>
      </div>
      <Panel className="campaign-timeline"><PanelHeader eyebrow="PROPAGATION TRACE" title="Cinder-17 activity" description="Detection events and defensive actions"/><div className="event-timeline">{[
        ['19:02:11','First phrase variant observed','social-web','neutral'],['19:04:38','Shared image hash matched','forum','blue'],['19:07:02','Burst threshold crossed: 4.8×','multi-source','amber'],['19:08:44','Cinder-17 cluster created','firewall','red'],['19:09:16','Reach reduction applied to 12 posts','enforcement','green']
      ].map(([time,title,source,tone]) => <div key={time} className={`timeline-event ${tone}`}><span>{time}</span><i/><div><b>{title}</b><small>{source}</small></div></div>)}</div></Panel>
    </>
  )
}

function SourcesView({ liveData, loading, onRefresh }) {
  const connectors = liveData?.connectors || [
    { id:'news', name:'Google News RSS', type:'Live news context', status:'connecting', batchSize:'—', latencyMs:null },
    { id:'mastodon', name:'Mastodon Public API', type:'Public hashtag sample', status:'connecting', batchSize:'—', latencyMs:null },
  ]
  const signals = liveData?.signals || []
  return (
    <>
      <div className="page-intro"><div><div className="eyebrow">PUBLIC SIGNAL INGESTION</div><h1>Signal sources</h1><p>Live public-data adapters plus a controlled platform event simulation.</p></div><button className="primary-button" onClick={onRefresh} disabled={loading}><RefreshCw size={15} className={loading ? 'spinning' : ''}/> Refresh connectors</button></div>
      <div className="source-cards">
        {connectors.map(connector => (
          <Panel className="source-card" key={connector.id}>
            <div className="source-card-top"><div className={`source-logo ${connector.id}`}><Globe2 size={20}/></div><span className={`connector-status ${connector.status}`}><i/>{connector.status}</span></div>
            <h2>{connector.name}</h2><p>{connector.type}</p>
            <div className="source-metrics"><div><span>Current batch</span><b>{connector.batchSize}</b></div><div><span>Latency</span><b>{connector.latencyMs ? `${connector.latencyMs}ms` : '—'}</b></div><div><span>Polling</span><b>{connector.id === 'news' ? '60s' : '45s'}</b></div></div>
            <div className="source-foot"><span><LockKeyhole size={13}/> public + redacted</span><button>Configure <ChevronRight size={13}/></button></div>
          </Panel>
        ))}
        <Panel className="source-card"><div className="source-card-top"><div className="source-logo sandbox"><TerminalSquare size={20}/></div><span className="connector-status live"><i/>live</span></div><h2>Platform Event Sandbox</h2><p>Synthetic social-post firehose</p><div className="source-metrics"><div><span>Current rate</span><b>2,804/m</b></div><div><span>Latency</span><b>18ms</b></div><div><span>Replay</span><b>24h</b></div></div><div className="source-foot"><span><LockKeyhole size={13}/> no personal data</span><button>Configure <ChevronRight size={13}/></button></div></Panel>
      </div>
      <Panel className="signals-panel">
        <PanelHeader eyebrow="LIVE PUBLIC SAMPLE" title="Recent connector payloads" description={liveData?.disclosure || 'Loading sampled public signals…'}><span className={`mode-badge ${liveData?.mode || 'connecting'}`}>{liveData?.mode || 'connecting'}</span></PanelHeader>
        <div className="signal-table-head"><span>Source / type</span><span>Redacted signal</span><span>Machine triage</span><span>Observed</span></div>
        <div className="public-signals">
          {signals.slice(0, 10).map(signal => (
            <div className="public-signal-row" key={signal.id}>
              <div><b>{signal.source}</b><span>{signal.kind}</span></div>
              <div><b>{signal.title || signal.snippet || 'Context signal'}</b><span>{signal.domain || signal.alias || 'public source'}</span></div>
              <div><span className={`triage-chip ${signal.classification}`}>{signal.classification}</span>{signal.score > 0 && <small>{signal.score}/100</small>}</div>
              <time>{signal.timestamp ? new Date(signal.timestamp).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : 'now'}</time>
            </div>
          ))}
          {!signals.length && <div className="loading-signals"><RefreshCw size={20} className="spinning"/><span>Contacting public providers…</span></div>}
        </div>
      </Panel>
      <div className="data-notice"><LockKeyhole size={19}/><div><b>Responsible collection boundary</b><span>Only public metadata and short, redacted snippets are sampled. Handles are hashed, URLs and emails are removed, and raw connector data is not persisted by this MVP. Verify provider terms and local privacy requirements before production use.</span></div></div>
    </>
  )
}

function AuditView({ audit }) {
  return (
    <>
      <div className="page-intro"><div><div className="eyebrow">ACCOUNTABILITY + OVERSIGHT</div><h1>Audit trail</h1><p>Immutable-style record of model decisions, human actions, and policy changes.</p></div><button className="filter-button"><ExternalLink size={14}/> Export log</button></div>
      <div className="audit-layout">
        <Panel className="audit-panel">
          <PanelHeader eyebrow="RECENT EVENTS" title="Decision history" description="All times shown in Africa/Johannesburg" />
          <div className="audit-list">{audit.map((event,index) => (
            <div className="audit-row" key={`${event.time}-${index}`}><div className={`audit-icon ${event.type}`} >{event.type === 'human' ? <Users size={15}/> : event.type === 'system' ? <Bot size={15}/> : <ShieldCheck size={15}/>}</div><div><b>{event.title}</b><span>{event.detail}</span><small><Clock3 size={12}/>{event.time} · {event.actor}</small></div><button className="icon-button"><ChevronRight size={15}/></button></div>
          ))}</div>
        </Panel>
        <Panel className="audit-health"><PanelHeader eyebrow="CONTROL HEALTH" title="Governance checks"/><div className="health-score"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="48"/><circle cx="60" cy="60" r="48" className="meter"/></svg><div><b>97</b><span>/ 100</span></div></div><div className="check-list"><div><Check size={14}/><span>Decision trace coverage</span><b>100%</b></div><div><Check size={14}/><span>Evidence retention policy</span><b>Healthy</b></div><div><Check size={14}/><span>Reviewer access controls</span><b>Healthy</b></div><div><AlertTriangle size={14}/><span>Appeal SLA</span><b>2 due soon</b></div></div><button className="text-button"><FileSearch size={14}/> View governance report</button></Panel>
      </div>
      <div className="hash-banner"><Fingerprint size={17}/><span>Latest log seal</span><code>sha256:8e27c1a0…a94f</code><b><BadgeCheck size={14}/> VERIFIED</b></div>
    </>
  )
}

export default function App() {
  const [activeView, setActiveView] = useState('overview')
  const [incidents, setIncidents] = useState(initialIncidents)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [drawerTab, setDrawerTab] = useState('Decision')
  const [selectedNode, setSelectedNode] = useState('A01')
  const [query, setQuery] = useState('')
  const [paused, setPaused] = useState(false)
  const [feedIndex, setFeedIndex] = useState(0)
  const [now, setNow] = useState(new Date())
  const [liveData, setLiveData] = useState(null)
  const [loadingLive, setLoadingLive] = useState(true)
  const [toast, setToast] = useState(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [audit, setAudit] = useState([
    { time: '19:09:16', type: 'action', title: 'Automated reach control applied', detail: '12 posts linked to Cinder-17 reduced pending human review.', actor: 'firewall-policy-engine' },
    { time: '19:08:51', type: 'human', title: 'Incident HF-48271 confirmed', detail: 'Reviewer accepted protected-group targeting and employment-exclusion labels.', actor: 'analyst-04' },
    { time: '19:08:44', type: 'system', title: 'Campaign cluster Cinder-17 created', detail: 'Cross-source similarity threshold exceeded at 0.91.', actor: 'coordination-model' },
    { time: '19:04:10', type: 'action', title: 'Context safeguard allowed quotation', detail: 'HF-48260 classified as documentation and explicit counterspeech.', actor: 'context-model' },
    { time: '18:57:33', type: 'system', title: 'Policy bundle verified', detail: 'HF policy v4.3 signature and evaluation checks passed.', actor: 'policy-registry' },
  ])

  const fetchLive = async (force = false) => {
    setLoadingLive(true)
    try {
      const response = await fetch(`/api/live-signals${force ? '?refresh=1' : ''}`)
      if (!response.ok) throw new Error('Signal API unavailable')
      setLiveData(await response.json())
    } catch {
      setLiveData({ mode: 'offline', disclosure: 'Live API is unavailable. The operational simulation remains active.', aggregate: { projectedPerMinute: 2847 }, connectors: [], signals: [] })
    } finally { setLoadingLive(false) }
  }

  useEffect(() => {
    fetchLive()
    const liveTimer = setInterval(() => fetchLive(false), 60_000)
    return () => clearInterval(liveTimer)
  }, [])

  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1_000)
    return () => clearInterval(clockTimer)
  }, [])

  useEffect(() => {
    if (paused) return
    const streamTimer = setInterval(() => setFeedIndex(value => value + 1), 4_000)
    return () => clearInterval(streamTimer)
  }, [paused])

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') { setSelectedIncident(null); setMobileNav(false) }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('.global-search input')?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const openIncident = incident => { setSelectedIncident(incident); setDrawerTab('Decision') }
  const takeAction = (id, action) => {
    setIncidents(current => current.map(item => item.id === id ? { ...item, action } : item))
    setSelectedIncident(current => current?.id === id ? { ...current, action } : current)
    const timestamp = formatClock(new Date())
    setAudit(current => [{ time: timestamp, type: 'human', title: `${action} applied to ${id}`, detail: `Human reviewer changed the intervention outcome to ${action}.`, actor: 'analyst-console' }, ...current])
    setToast({ title: `${action} applied`, text: `${id} updated and written to the audit trail.` })
    setTimeout(() => setToast(null), 3200)
  }

  const inspectJudgeResult = result => {
    setIncidents(current => [result, ...current.filter(item => item.id !== result.id)])
    setSelectedIncident(result)
    setDrawerTab('Decision')
    const timestamp = formatClock(new Date())
    setAudit(current => [{ time: timestamp, type: 'system', title: `Judge Lab analysis opened: ${result.id}`, detail: `${result.action} recommended at ${result.confidence}% confidence. Submitted text was added to this in-memory review session.`, actor: 'judge-lab' }, ...current])
  }

  const sourceStatus = useMemo(() => liveData?.mode === 'live' ? 'PUBLIC API LIVE' : liveData?.mode === 'hybrid' ? 'HYBRID SIGNALS' : 'SIMULATION LIVE', [liveData])

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Shield size={23}/><span/></div><div><b>HATE</b><strong>FIREWALL</strong></div></div>
        <div className="workspace-label">COMMAND CENTER <span>v4.3</span></div>
        <nav>{navItems.map(item => <button key={item.id} className={activeView === item.id ? 'active' : ''} onClick={() => { setActiveView(item.id); setMobileNav(false) }}><item.icon size={17}/><span>{item.label}</span>{item.count && <em>{item.count}</em>}</button>)}</nav>
        <div className="nav-section-label">SYSTEM</div>
        <nav className="secondary-nav"><button><Bot size={17}/><span>Model Registry</span></button><button><BookOpen size={17}/><span>Policy Studio</span></button><button><Settings size={17}/><span>Settings</span></button></nav>
        <div className="system-card"><div><span className="system-orb"><i/></span><b>Firewall active</b></div><p>All classifiers operational</p><div><span>p95 latency</span><b>118ms</b></div></div>
        <div className="sidebar-user"><div className="avatar">AK</div><div><b>Analyst K.</b><span>Trust & Safety</span></div><button><ChevronDown size={14}/></button></div>
      </aside>
      {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
      <main className="main-shell">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileNav(true)}><Menu size={18}/></button>
          <div className="global-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search incident, account, phrase…"/><kbd>⌘ K</kbd>{query && <button onClick={() => setQuery('')}><X size={13}/></button>}</div>
          <div className="topbar-status"><span className="live-pill"><span/>{sourceStatus}</span><div className="clock"><Clock3 size={14}/>{formatClock(now)} <small>SAST</small></div><button className="pause-button" onClick={() => setPaused(value => !value)}>{paused ? <Play size={15}/> : <Pause size={15}/>}<span>{paused ? 'Resume' : 'Pause'}</span></button><button className="notification-button"><Bell size={17}/><i/></button></div>
        </header>
        <div className="main-content">
          {activeView === 'overview' && <Overview incidents={incidents} onSelect={openIncident} onOpenLab={() => setActiveView('lab')} query={query} paused={paused} feedIndex={feedIndex} selectedNode={selectedNode} setSelectedNode={setSelectedNode} liveData={liveData}/>} 
          {activeView === 'lab' && <JudgeLab onInspect={inspectJudgeResult}/>} 
          {activeView === 'incidents' && <IncidentsView incidents={incidents} onSelect={openIncident} query={query}/>} 
          {activeView === 'campaigns' && <CampaignsView selectedNode={selectedNode} setSelectedNode={setSelectedNode}/>} 
          {activeView === 'sources' && <SourcesView liveData={liveData} loading={loadingLive} onRefresh={() => fetchLive(true)}/>} 
          {activeView === 'audit' && <AuditView audit={audit}/>} 
        </div>
      </main>
      <IncidentDrawer incident={selectedIncident} onClose={() => setSelectedIncident(null)} onAction={takeAction} tab={drawerTab} setTab={setDrawerTab}/>
      {toast && <div className="toast"><div><Check size={16}/></div><p><b>{toast.title}</b><span>{toast.text}</span></p><button onClick={() => setToast(null)}><X size={14}/></button></div>}
    </div>
  )
}
