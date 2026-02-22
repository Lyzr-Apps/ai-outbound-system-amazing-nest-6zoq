'use client'

import React, { useState, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { copyToClipboard } from '@/lib/clipboard'
import {
  FiTarget,
  FiUsers,
  FiBarChart2,
  FiMail,
  FiTrendingUp,
  FiChevronDown,
  FiChevronRight,
  FiCopy,
  FiCheck,
  FiAlertCircle,
  FiGlobe,
  FiStar,
  FiZap,
  FiActivity,
  FiArrowRight,
  FiPlay,
  FiDatabase,
  FiFilter,
  FiExternalLink,
  FiLoader,
  FiX,
  FiInfo,
  FiCheckCircle,
} from 'react-icons/fi'
import { FaLinkedin } from 'react-icons/fa'

// ─── CONSTANTS ───────────────────────────────────────────
const AGENT_IDS = {
  enrichment: '699b295b458d38ce831d298b',
  scoring: '699b295b0f2baa7d103206d3',
  outreach: '699b295b952ac769d7566f38',
} as const

const TABS = [
  { id: 'input', label: 'Lead Input', icon: FiDatabase },
  { id: 'enrichment', label: 'Enrichment', icon: FiZap },
  { id: 'scoring', label: 'Scoring', icon: FiBarChart2 },
  { id: 'outreach', label: 'Outreach', icon: FiMail },
  { id: 'pipeline', label: 'Pipeline', icon: FiActivity },
] as const

const SOURCES = ['LinkedIn Sales Navigator', 'Crunchbase', 'G2 / Clutch', 'Manual Entry'] as const

const SAMPLE_DATA = `First Name,Last Name,Company Name,Job Title,Company Size,LinkedIn URL,Website,Work Email,Recent Activity,Growth Signal
Sarah,Mitchell,ScaleUp Ventures,CEO,35,https://linkedin.com/in/sarahmitchell,https://scaleupventures.com,sarah@scaleupventures.com,Posted about leadership challenges last week,Recently raised Series A funding
James,Rodriguez,GrowthPath Consulting,Founder & Managing Director,12,https://linkedin.com/in/jamesrodriguez,https://growthpath.co,james@growthpath.co,Spoke at SaaStr conference,Expanded to 3 new markets this quarter
Michelle,Chen,Apex Performance Group,VP of Operations,85,https://linkedin.com/in/michellechen,https://apexperformance.io,michelle@apexperformance.io,Engaged with multiple coaching posts,Hiring 5 new senior roles
David,Thompson,Elevate Digital Agency,Co-Founder,22,https://linkedin.com/in/davidthompson,https://elevatedigital.com,david@elevatedigital.com,Published article on scaling agencies,Revenue doubled year-over-year
Priya,Sharma,NextLevel Solutions,Chief Strategy Officer,150,https://linkedin.com/in/priyasharma,https://nextlevelsolutions.com,priya@nextlevelsolutions.com,Active in B2B communities,Launched new enterprise division
Robert,Kim,Pioneer Advisory,Managing Partner,8,https://linkedin.com/in/robertkim,https://pioneeradvisory.com,robert@pioneeradvisory.com,Low recent activity,No significant signals
Amanda,Foster,Catalyst Business Group,Director of Growth,45,https://linkedin.com/in/amandafoster,https://catalystbg.com,amanda@catalystbg.com,Commenting on growth strategy posts daily,Just completed a major restructuring`

// ─── TYPES ───────────────────────────────────────────────
interface EnrichedLead {
  first_name: string
  last_name: string
  company_name: string
  job_title: string
  company_size: string
  company_size_category: string
  linkedin_url: string
  website: string
  work_email: string
  recent_activity: string
  growth_signals: string
  buyer_persona_fit: string
  data_quality_score: string
  enrichment_notes: string
}

interface EnrichmentResult {
  enriched_leads: EnrichedLead[]
  total_leads_processed: string
  data_quality_summary: string
  enrichment_summary: string
}

interface ScoredLead {
  lead_name: string
  company: string
  job_title: string
  overall_score: string
  title_fit_score: string
  company_size_score: string
  growth_signal_score: string
  activity_score: string
  intent_score: string
  qualification_tier: string
  scoring_rationale: string
  recommended_action: string
}

interface ScoringResult {
  scored_leads: ScoredLead[]
  total_leads_scored: string
  qualified_count: string
  average_score: string
  score_distribution: string
  top_recommendation: string
}

interface OutreachPlan {
  lead_name: string
  company: string
  primary_channel: string
  messaging_angle: string
  linkedin_message: string
  email_subject: string
  email_body: string
  follow_up_sequence: string
  conversation_starters: string
  timing_recommendation: string
  urgency_level: string
  key_talking_points: string
}

interface OutreachResult {
  outreach_plans: OutreachPlan[]
  total_plans_generated: string
  channel_distribution: string
  overall_strategy_summary: string
  priority_outreach_order: string
}

interface StatusMessage {
  type: 'success' | 'error' | 'info'
  text: string
}

type PipelineStep = 'pending' | 'running' | 'complete' | 'error'

interface PipelineStatus {
  enrichment: PipelineStep
  scoring: PipelineStep
  outreach: PipelineStep
}

// ─── HELPER COMPONENTS ───────────────────────────────────

function StatusBanner({ message, onDismiss }: { message: StatusMessage; onDismiss: () => void }) {
  const bgMap = {
    success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    error: 'bg-red-500/15 border-red-500/30 text-red-400',
    info: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
  }
  const iconMap = {
    success: FiCheckCircle,
    error: FiAlertCircle,
    info: FiInfo,
  }
  const Icon = iconMap[message.type]
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${bgMap[message.type]} mb-4`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1 text-sm">{message.text}</span>
      <button onClick={onDismiss} className="hover:opacity-70 transition-opacity">
        <FiX className="w-4 h-4" />
      </button>
    </div>
  )
}

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return <FiLoader className={`${sizeMap[size]} animate-spin text-blue-400`} />
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color = 'blue',
  subtitle,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color?: string
  subtitle?: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20 text-red-400',
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400',
  }
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400 font-medium">{label}</span>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}

function ScoreBar({ value, max = 2, label }: { value: number; max?: number; label: string }) {
  const pct = Math.min((value / max) * 100, 100)
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-16 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-300 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const t = tier.toUpperCase()
  const map: Record<string, string> = {
    HOT: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    WARM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    COOL: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    COLD: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  const match = Object.keys(map).find((k) => t.includes(k))
  const cls = match ? map[match] : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{tier}</span>
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
    >
      {copied ? <FiCheck className="w-3 h-3 text-emerald-400" /> : <FiCopy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-300 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md">{subtitle}</p>
    </div>
  )
}

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-slate-800/50 rounded-lg" />
      ))}
    </div>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────
export default function Page() {
  // State
  const [activeTab, setActiveTab] = useState<string>('input')
  const [leadInput, setLeadInput] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('LinkedIn Sales Navigator')
  const [enrichmentResult, setEnrichmentResult] = useState<EnrichmentResult | null>(null)
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null)
  const [outreachResult, setOutreachResult] = useState<OutreachResult | null>(null)
  const [enrichmentLoading, setEnrichmentLoading] = useState(false)
  const [scoringLoading, setScoringLoading] = useState(false)
  const [outreachLoading, setOutreachLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  const [scoreFilter, setScoreFilter] = useState<string>('all')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [expandedOutreach, setExpandedOutreach] = useState<Set<number>>(new Set())
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    enrichment: 'pending',
    scoring: 'pending',
    outreach: 'pending',
  })
  const [pipelineRunning, setPipelineRunning] = useState(false)

  // Toggle expanded row
  const toggleRow = useCallback((idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }, [])

  const toggleOutreach = useCallback((idx: number) => {
    setExpandedOutreach((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }, [])

  // ─── AGENT CALLS ────────────────────────────────────
  const enrichLeads = async () => {
    if (!leadInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter lead data before enriching.' })
      return
    }
    setEnrichmentLoading(true)
    setStatusMessage({ type: 'info', text: 'Enriching lead data... This may take a moment.' })
    setPipelineStatus((p) => ({ ...p, enrichment: 'running' }))
    try {
      const result = await callAIAgent(
        `Enrich the following B2B lead data sourced from ${selectedSource}. Analyze each lead for coaching/consulting buyer fit ($3K-$20K offers):\n\n${leadInput}`,
        AGENT_IDS.enrichment
      )
      if (result.success && result.response?.result) {
        setEnrichmentResult(result.response.result as unknown as EnrichmentResult)
        setStatusMessage({ type: 'success', text: 'Lead enrichment complete! Review results in the Enrichment tab.' })
        setPipelineStatus((p) => ({ ...p, enrichment: 'complete' }))
        setActiveTab('enrichment')
      } else {
        setStatusMessage({ type: 'error', text: result.error || 'Enrichment failed. Please try again.' })
        setPipelineStatus((p) => ({ ...p, enrichment: 'error' }))
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error during enrichment.' })
      setPipelineStatus((p) => ({ ...p, enrichment: 'error' }))
    }
    setEnrichmentLoading(false)
  }

  const scoreLeads = async () => {
    if (!enrichmentResult?.enriched_leads) {
      setStatusMessage({ type: 'error', text: 'No enriched leads to score. Run enrichment first.' })
      return
    }
    setScoringLoading(true)
    setStatusMessage({ type: 'info', text: 'Scoring and qualifying leads...' })
    setPipelineStatus((p) => ({ ...p, scoring: 'running' }))
    const leadsText = Array.isArray(enrichmentResult.enriched_leads)
      ? enrichmentResult.enriched_leads
          .map(
            (l) =>
              `${l.first_name} ${l.last_name} | ${l.company_name} | ${l.job_title} | Size: ${l.company_size} (${l.company_size_category}) | Growth: ${l.growth_signals} | Activity: ${l.recent_activity} | Persona Fit: ${l.buyer_persona_fit}`
          )
          .join('\n')
      : JSON.stringify(enrichmentResult.enriched_leads)
    try {
      const result = await callAIAgent(
        `Score the following enriched B2B leads for coaching/consulting fit ($3K-$20K offers). Qualified threshold is 7+:\n\n${leadsText}`,
        AGENT_IDS.scoring
      )
      if (result.success && result.response?.result) {
        setScoringResult(result.response.result as unknown as ScoringResult)
        setStatusMessage({ type: 'success', text: 'Lead scoring complete! Review scores in the Scoring tab.' })
        setPipelineStatus((p) => ({ ...p, scoring: 'complete' }))
        setActiveTab('scoring')
      } else {
        setStatusMessage({ type: 'error', text: result.error || 'Scoring failed.' })
        setPipelineStatus((p) => ({ ...p, scoring: 'error' }))
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error during scoring.' })
      setPipelineStatus((p) => ({ ...p, scoring: 'error' }))
    }
    setScoringLoading(false)
  }

  const generateOutreach = async () => {
    if (!scoringResult?.scored_leads) {
      setStatusMessage({ type: 'error', text: 'No scored leads. Run scoring first.' })
      return
    }
    const qualified = Array.isArray(scoringResult.scored_leads)
      ? scoringResult.scored_leads.filter((l) => parseFloat(l.overall_score) >= 7)
      : []
    if (qualified.length === 0) {
      setStatusMessage({ type: 'error', text: 'No qualified leads (score 7+) found for outreach.' })
      return
    }
    setOutreachLoading(true)
    setStatusMessage({ type: 'info', text: 'Generating personalized outreach strategies...' })
    setPipelineStatus((p) => ({ ...p, outreach: 'running' }))
    const leadsText = qualified
      .map(
        (l) =>
          `${l.lead_name} | ${l.company} | ${l.job_title} | Score: ${l.overall_score} | Tier: ${l.qualification_tier} | Rationale: ${l.scoring_rationale}`
      )
      .join('\n')
    try {
      const result = await callAIAgent(
        `Generate personalized outreach strategies for these qualified B2B leads (score 7+). Target: coaching/consulting offers $3K-$20K:\n\n${leadsText}`,
        AGENT_IDS.outreach
      )
      if (result.success && result.response?.result) {
        setOutreachResult(result.response.result as unknown as OutreachResult)
        setStatusMessage({ type: 'success', text: 'Outreach strategies ready! Check the Outreach tab.' })
        setPipelineStatus((p) => ({ ...p, outreach: 'complete' }))
        setActiveTab('outreach')
      } else {
        setStatusMessage({ type: 'error', text: result.error || 'Outreach generation failed.' })
        setPipelineStatus((p) => ({ ...p, outreach: 'error' }))
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error during outreach generation.' })
      setPipelineStatus((p) => ({ ...p, outreach: 'error' }))
    }
    setOutreachLoading(false)
  }

  const runFullPipeline = async () => {
    if (!leadInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter lead data first.' })
      return
    }
    setPipelineRunning(true)
    setPipelineStatus({ enrichment: 'pending', scoring: 'pending', outreach: 'pending' })
    setEnrichmentResult(null)
    setScoringResult(null)
    setOutreachResult(null)

    // Step 1: Enrich
    setPipelineStatus((p) => ({ ...p, enrichment: 'running' }))
    setStatusMessage({ type: 'info', text: 'Pipeline Step 1/3: Enriching leads...' })
    try {
      const enrichRes = await callAIAgent(
        `Enrich the following B2B lead data sourced from ${selectedSource}. Analyze each lead for coaching/consulting buyer fit ($3K-$20K offers):\n\n${leadInput}`,
        AGENT_IDS.enrichment
      )
      if (!enrichRes.success || !enrichRes.response?.result) {
        setPipelineStatus((p) => ({ ...p, enrichment: 'error' }))
        setStatusMessage({ type: 'error', text: 'Pipeline failed at enrichment step.' })
        setPipelineRunning(false)
        return
      }
      const enrichData = enrichRes.response.result as unknown as EnrichmentResult
      setEnrichmentResult(enrichData)
      setPipelineStatus((p) => ({ ...p, enrichment: 'complete' }))

      // Step 2: Score
      setPipelineStatus((p) => ({ ...p, scoring: 'running' }))
      setStatusMessage({ type: 'info', text: 'Pipeline Step 2/3: Scoring leads...' })
      const enrichedLeads = Array.isArray(enrichData.enriched_leads) ? enrichData.enriched_leads : []
      const scoreText = enrichedLeads
        .map(
          (l) =>
            `${l.first_name} ${l.last_name} | ${l.company_name} | ${l.job_title} | Size: ${l.company_size} (${l.company_size_category}) | Growth: ${l.growth_signals} | Activity: ${l.recent_activity} | Persona Fit: ${l.buyer_persona_fit}`
        )
        .join('\n')
      const scoreRes = await callAIAgent(
        `Score the following enriched B2B leads for coaching/consulting fit ($3K-$20K offers). Qualified threshold is 7+:\n\n${scoreText}`,
        AGENT_IDS.scoring
      )
      if (!scoreRes.success || !scoreRes.response?.result) {
        setPipelineStatus((p) => ({ ...p, scoring: 'error' }))
        setStatusMessage({ type: 'error', text: 'Pipeline failed at scoring step.' })
        setPipelineRunning(false)
        return
      }
      const scoreData = scoreRes.response.result as unknown as ScoringResult
      setScoringResult(scoreData)
      setPipelineStatus((p) => ({ ...p, scoring: 'complete' }))

      // Step 3: Outreach (only qualified)
      const qualifiedLeads = Array.isArray(scoreData.scored_leads)
        ? scoreData.scored_leads.filter((l) => parseFloat(l.overall_score) >= 7)
        : []
      if (qualifiedLeads.length === 0) {
        setPipelineStatus((p) => ({ ...p, outreach: 'complete' }))
        setStatusMessage({
          type: 'success',
          text: 'Pipeline complete! No leads scored 7+ for outreach. Review scoring results.',
        })
        setActiveTab('scoring')
        setPipelineRunning(false)
        return
      }
      setPipelineStatus((p) => ({ ...p, outreach: 'running' }))
      setStatusMessage({ type: 'info', text: 'Pipeline Step 3/3: Generating outreach strategies...' })
      const outreachText = qualifiedLeads
        .map(
          (l) =>
            `${l.lead_name} | ${l.company} | ${l.job_title} | Score: ${l.overall_score} | Tier: ${l.qualification_tier} | Rationale: ${l.scoring_rationale}`
        )
        .join('\n')
      const outreachRes = await callAIAgent(
        `Generate personalized outreach strategies for these qualified B2B leads (score 7+). Target: coaching/consulting offers $3K-$20K:\n\n${outreachText}`,
        AGENT_IDS.outreach
      )
      if (outreachRes.success && outreachRes.response?.result) {
        setOutreachResult(outreachRes.response.result as unknown as OutreachResult)
        setPipelineStatus((p) => ({ ...p, outreach: 'complete' }))
        setStatusMessage({ type: 'success', text: 'Full pipeline complete! All leads processed successfully.' })
        setActiveTab('outreach')
      } else {
        setPipelineStatus((p) => ({ ...p, outreach: 'error' }))
        setStatusMessage({ type: 'error', text: 'Pipeline failed at outreach step.' })
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Pipeline encountered a network error.' })
    }
    setPipelineRunning(false)
  }

  // ─── FILTERED SCORED LEADS ──────────────────────────
  const filteredScoredLeads = React.useMemo(() => {
    if (!scoringResult?.scored_leads || !Array.isArray(scoringResult.scored_leads)) return []
    if (scoreFilter === 'all') return scoringResult.scored_leads
    return scoringResult.scored_leads.filter((l) => {
      const s = parseFloat(l.overall_score)
      switch (scoreFilter) {
        case 'hot':
          return s >= 7
        case 'warm':
          return s >= 5 && s < 7
        case 'cool':
          return s >= 3 && s < 5
        case 'cold':
          return s < 3
        default:
          return true
      }
    })
  }, [scoringResult, scoreFilter])

  const qualifiedCount = React.useMemo(() => {
    if (!scoringResult?.scored_leads || !Array.isArray(scoringResult.scored_leads)) return 0
    return scoringResult.scored_leads.filter((l) => parseFloat(l.overall_score) >= 7).length
  }, [scoringResult])

  // ─── Score color helper ─────────────────────────────
  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-emerald-400'
    if (score >= 5) return 'text-amber-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 7) return 'bg-emerald-500/20 border-emerald-500/30'
    if (score >= 5) return 'bg-amber-500/20 border-amber-500/30'
    return 'bg-red-500/20 border-red-500/30'
  }

  const getPersonaColor = (fit: string) => {
    const f = fit.toLowerCase()
    if (f.includes('high') || f.includes('strong')) return 'text-emerald-400 bg-emerald-500/15'
    if (f.includes('medium') || f.includes('moderate')) return 'text-amber-400 bg-amber-500/15'
    return 'text-red-400 bg-red-500/15'
  }

  const getUrgencyColor = (urgency: string) => {
    const u = urgency.toLowerCase()
    if (u.includes('high')) return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (u.includes('medium') || u.includes('moderate')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }

  const getChannelIcon = (channel: string) => {
    const c = channel.toLowerCase()
    if (c.includes('linkedin')) return FaLinkedin
    if (c.includes('email')) return FiMail
    if (c.includes('phone')) return FiActivity
    return FiMail
  }

  // Pipeline step status helper
  const stepColor = (s: PipelineStep) => {
    switch (s) {
      case 'complete':
        return 'bg-emerald-500 border-emerald-400'
      case 'running':
        return 'bg-blue-500 border-blue-400 animate-pulse'
      case 'error':
        return 'bg-red-500 border-red-400'
      default:
        return 'bg-slate-600 border-slate-500'
    }
  }

  const stepTextColor = (s: PipelineStep) => {
    switch (s) {
      case 'complete':
        return 'text-emerald-400'
      case 'running':
        return 'text-blue-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-slate-500'
    }
  }

  const stepLabel = (s: PipelineStep) => {
    switch (s) {
      case 'complete':
        return 'Complete'
      case 'running':
        return 'Running...'
      case 'error':
        return 'Error'
      default:
        return 'Pending'
    }
  }

  // ─── RENDER ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <FiTarget className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">LeadPulse AI</h1>
                <p className="text-xs text-slate-400">B2B Lead Intelligence for Coaches & Consultants</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${pipelineStatus.enrichment === 'complete' ? 'bg-emerald-500' : pipelineStatus.enrichment === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`} />
              <span>Enrich</span>
              <FiArrowRight className="w-3 h-3" />
              <span className={`w-2 h-2 rounded-full ${pipelineStatus.scoring === 'complete' ? 'bg-emerald-500' : pipelineStatus.scoring === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`} />
              <span>Score</span>
              <FiArrowRight className="w-3 h-3" />
              <span className={`w-2 h-2 rounded-full ${pipelineStatus.outreach === 'complete' ? 'bg-emerald-500' : pipelineStatus.outreach === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`} />
              <span>Outreach</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-slate-800 bg-[#0f172a]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {statusMessage && <StatusBanner message={statusMessage} onDismiss={() => setStatusMessage(null)} />}

        {/* ─── TAB: Lead Input ─────────────────────────── */}
        {activeTab === 'input' && (
          <div className="space-y-6">
            <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Import Lead Data</h2>
              <p className="text-sm text-slate-400 mb-5">
                Paste CSV data or enter lead information from your preferred source.
              </p>

              {/* Source selector */}
              <div className="mb-4">
                <label className="text-sm text-slate-400 mb-2 block">Data Source</label>
                <div className="flex flex-wrap gap-2">
                  {SOURCES.map((src) => (
                    <button
                      key={src}
                      onClick={() => setSelectedSource(src)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedSource === src
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format guide */}
              <div className="mb-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <FiInfo className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-slate-300">Expected Fields</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  First Name, Last Name, Company Name, Job Title, Company Size, LinkedIn URL, Website, Work Email,
                  Recent Activity Indicator, Growth Signal Flag
                </p>
              </div>

              {/* Textarea */}
              <textarea
                value={leadInput}
                onChange={(e) => setLeadInput(e.target.value)}
                placeholder="Paste your CSV data here or type lead information manually...&#10;&#10;Example:&#10;Sarah,Mitchell,ScaleUp Ventures,CEO,35,https://linkedin.com/in/sarahmitchell,https://scaleupventures.com,sarah@scaleupventures.com,Posted about leadership,Series A funding"
                className="w-full h-64 bg-[#0f172a] border border-slate-700 rounded-lg p-4 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 font-mono"
              />

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button
                  onClick={enrichLeads}
                  disabled={enrichmentLoading || !leadInput.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-all"
                >
                  {enrichmentLoading ? <Spinner size="sm" /> : <FiZap className="w-4 h-4" />}
                  {enrichmentLoading ? 'Enriching...' : 'Enrich Leads'}
                </button>
                <button
                  onClick={() => setLeadInput(SAMPLE_DATA)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-all border border-slate-700"
                >
                  <FiDatabase className="w-4 h-4" />
                  Load Sample Data
                </button>
                {leadInput && (
                  <button
                    onClick={() => setLeadInput('')}
                    className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
                  >
                    <FiX className="w-4 h-4" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: Enrichment Results ────────────────── */}
        {activeTab === 'enrichment' && (
          <div className="space-y-6">
            {enrichmentLoading ? (
              <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Spinner />
                  <span className="text-slate-300">Enriching lead data...</span>
                </div>
                <LoadingSkeleton rows={5} />
              </div>
            ) : !enrichmentResult ? (
              <EmptyState
                icon={FiZap}
                title="No enrichment data yet"
                subtitle="Go to Lead Input tab and run enrichment on your lead data to see results here."
              />
            ) : (
              <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <KpiCard
                    label="Leads Processed"
                    value={enrichmentResult.total_leads_processed || '0'}
                    icon={FiUsers}
                    color="blue"
                  />
                  <KpiCard
                    label="Data Quality"
                    value={enrichmentResult.data_quality_summary || 'N/A'}
                    icon={FiStar}
                    color="green"
                    subtitle="Overall data completeness"
                  />
                  <KpiCard
                    label="Enrichment Coverage"
                    value={
                      Array.isArray(enrichmentResult.enriched_leads)
                        ? `${enrichmentResult.enriched_leads.length} leads`
                        : '0 leads'
                    }
                    icon={FiDatabase}
                    color="cyan"
                  />
                </div>

                {/* Enrichment Summary */}
                {enrichmentResult.enrichment_summary && (
                  <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 p-5">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Enrichment Summary</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{enrichmentResult.enrichment_summary}</p>
                  </div>
                )}

                {/* Enriched Leads Table */}
                <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">Enriched Leads</h3>
                    <button
                      onClick={scoreLeads}
                      disabled={scoringLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-all"
                    >
                      {scoringLoading ? <Spinner size="sm" /> : <FiBarChart2 className="w-4 h-4" />}
                      {scoringLoading ? 'Scoring...' : 'Score Leads'}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="px-4 py-3 text-left w-8"></th>
                          <th className="px-4 py-3 text-left">Name</th>
                          <th className="px-4 py-3 text-left">Company</th>
                          <th className="px-4 py-3 text-left">Title</th>
                          <th className="px-4 py-3 text-left">Size</th>
                          <th className="px-4 py-3 text-center">Links</th>
                          <th className="px-4 py-3 text-left">Activity</th>
                          <th className="px-4 py-3 text-left">Growth</th>
                          <th className="px-4 py-3 text-left">Persona Fit</th>
                          <th className="px-4 py-3 text-center">Quality</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {Array.isArray(enrichmentResult.enriched_leads) &&
                          enrichmentResult.enriched_leads.map((lead, idx) => (
                            <React.Fragment key={idx}>
                              <tr
                                className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                                onClick={() => toggleRow(idx)}
                              >
                                <td className="px-4 py-3">
                                  {expandedRows.has(idx) ? (
                                    <FiChevronDown className="w-4 h-4 text-slate-500" />
                                  ) : (
                                    <FiChevronRight className="w-4 h-4 text-slate-500" />
                                  )}
                                </td>
                                <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                                  {lead.first_name} {lead.last_name}
                                </td>
                                <td className="px-4 py-3 text-slate-300">{lead.company_name}</td>
                                <td className="px-4 py-3 text-slate-300">{lead.job_title}</td>
                                <td className="px-4 py-3">
                                  <span className="text-slate-300">{lead.company_size}</span>
                                  <span className="text-xs text-slate-500 block">{lead.company_size_category}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    {lead.linkedin_url && lead.linkedin_url !== 'N/A' && (
                                      <a
                                        href={lead.linkedin_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-blue-400 hover:text-blue-300"
                                      >
                                        <FaLinkedin className="w-4 h-4" />
                                      </a>
                                    )}
                                    {lead.website && lead.website !== 'N/A' && (
                                      <a
                                        href={lead.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-slate-400 hover:text-slate-300"
                                      >
                                        <FiGlobe className="w-4 h-4" />
                                      </a>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-slate-400 line-clamp-1 max-w-[140px]">
                                    {lead.recent_activity}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">
                                    <FiTrendingUp className="w-3 h-3" />
                                    <span className="line-clamp-1 max-w-[100px]">{lead.growth_signals}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs px-2 py-0.5 rounded ${getPersonaColor(lead.buyer_persona_fit)}`}>
                                    {lead.buyer_persona_fit}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-sm font-semibold text-slate-200">{lead.data_quality_score}</span>
                                </td>
                              </tr>
                              {expandedRows.has(idx) && (
                                <tr className="bg-slate-800/20">
                                  <td colSpan={10} className="px-8 py-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-slate-500 text-xs uppercase tracking-wider">Email</span>
                                        <p className="text-slate-300 mt-1">{lead.work_email}</p>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 text-xs uppercase tracking-wider">Recent Activity</span>
                                        <p className="text-slate-300 mt-1">{lead.recent_activity}</p>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 text-xs uppercase tracking-wider">Growth Signals</span>
                                        <p className="text-slate-300 mt-1">{lead.growth_signals}</p>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 text-xs uppercase tracking-wider">
                                          Enrichment Notes
                                        </span>
                                        <p className="text-slate-300 mt-1">{lead.enrichment_notes}</p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── TAB: Scoring Results ───────────────────── */}
        {activeTab === 'scoring' && (
          <div className="space-y-6">
            {scoringLoading ? (
              <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Spinner />
                  <span className="text-slate-300">Scoring and qualifying leads...</span>
                </div>
                <LoadingSkeleton rows={5} />
              </div>
            ) : !scoringResult ? (
              <EmptyState
                icon={FiBarChart2}
                title="No scoring data yet"
                subtitle="Enrich your leads first, then run scoring to see qualification results here."
              />
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    label="Total Scored"
                    value={scoringResult.total_leads_scored || '0'}
                    icon={FiUsers}
                    color="blue"
                  />
                  <KpiCard
                    label="Qualified (7+)"
                    value={scoringResult.qualified_count || String(qualifiedCount)}
                    icon={FiStar}
                    color="green"
                    subtitle={`${
                      Array.isArray(scoringResult.scored_leads) && scoringResult.scored_leads.length > 0
                        ? Math.round((qualifiedCount / scoringResult.scored_leads.length) * 100)
                        : 0
                    }% qualification rate`}
                  />
                  <KpiCard
                    label="Average Score"
                    value={scoringResult.average_score || 'N/A'}
                    icon={FiBarChart2}
                    color="amber"
                  />
                  <KpiCard
                    label="Distribution"
                    value={scoringResult.score_distribution || 'N/A'}
                    icon={FiTrendingUp}
                    color="cyan"
                  />
                </div>

                {/* Top Recommendation */}
                {scoringResult.top_recommendation && (
                  <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20 p-5">
                    <div className="flex items-start gap-3">
                      <FiStar className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold text-blue-400 mb-1">Top Recommendation</h3>
                        <p className="text-sm text-slate-300 leading-relaxed">{scoringResult.top_recommendation}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter & Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FiFilter className="w-4 h-4 text-slate-500" />
                    {(['all', 'hot', 'warm', 'cool', 'cold'] as const).map((f) => {
                      const labels: Record<string, string> = {
                        all: 'All',
                        hot: 'Hot (7+)',
                        warm: 'Warm (5-6)',
                        cool: 'Cool (3-4)',
                        cold: 'Cold (<3)',
                      }
                      const colors: Record<string, string> = {
                        all: scoreFilter === 'all' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : '',
                        hot: scoreFilter === 'hot' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : '',
                        warm: scoreFilter === 'warm' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : '',
                        cool: scoreFilter === 'cool' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : '',
                        cold: scoreFilter === 'cold' ? 'bg-red-500/20 text-red-400 border-red-500/30' : '',
                      }
                      return (
                        <button
                          key={f}
                          onClick={() => setScoreFilter(f)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            scoreFilter === f
                              ? colors[f]
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          {labels[f]}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={generateOutreach}
                    disabled={outreachLoading || qualifiedCount === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-all"
                  >
                    {outreachLoading ? <Spinner size="sm" /> : <FiMail className="w-4 h-4" />}
                    {outreachLoading ? 'Generating...' : `Generate Outreach (${qualifiedCount} leads)`}
                  </button>
                </div>

                {/* Scored Leads */}
                <div className="space-y-3">
                  {filteredScoredLeads.map((lead, idx) => {
                    const score = parseFloat(lead.overall_score) || 0
                    const isExpanded = expandedRows.has(idx + 1000)
                    return (
                      <div
                        key={idx}
                        className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden hover:border-slate-600/50 transition-colors"
                      >
                        <div
                          className="px-5 py-4 flex items-center gap-4 cursor-pointer"
                          onClick={() => {
                            setExpandedRows((prev) => {
                              const next = new Set(prev)
                              const key = idx + 1000
                              next.has(key) ? next.delete(key) : next.add(key)
                              return next
                            })
                          }}
                        >
                          {/* Score Badge */}
                          <div
                            className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center flex-shrink-0 ${getScoreBg(score)}`}
                          >
                            <span className={`text-xl font-bold ${getScoreColor(score)}`}>{lead.overall_score}</span>
                            <span className="text-[10px] text-slate-400">/10</span>
                          </div>

                          {/* Lead Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-white">{lead.lead_name}</h4>
                              <TierBadge tier={lead.qualification_tier} />
                            </div>
                            <p className="text-sm text-slate-400 mt-0.5">
                              {lead.job_title} at {lead.company}
                            </p>
                          </div>

                          {/* Mini Scores */}
                          <div className="hidden lg:flex flex-col gap-1 w-48">
                            <ScoreBar value={parseFloat(lead.title_fit_score) || 0} label="Title" />
                            <ScoreBar value={parseFloat(lead.company_size_score) || 0} label="Size" />
                            <ScoreBar value={parseFloat(lead.growth_signal_score) || 0} label="Growth" />
                            <ScoreBar value={parseFloat(lead.activity_score) || 0} label="Activity" />
                            <ScoreBar value={parseFloat(lead.intent_score) || 0} label="Intent" />
                          </div>

                          {/* Action */}
                          <div className="text-right flex-shrink-0 hidden md:block">
                            <p className="text-xs text-slate-400 max-w-[180px] line-clamp-2">{lead.recommended_action}</p>
                          </div>

                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <FiChevronDown className="w-5 h-5 text-slate-500" />
                            ) : (
                              <FiChevronRight className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-slate-700/30 pt-4">
                            {/* Mobile score bars */}
                            <div className="lg:hidden mb-4 grid grid-cols-2 gap-2">
                              <ScoreBar value={parseFloat(lead.title_fit_score) || 0} label="Title Fit" />
                              <ScoreBar value={parseFloat(lead.company_size_score) || 0} label="Company Size" />
                              <ScoreBar value={parseFloat(lead.growth_signal_score) || 0} label="Growth" />
                              <ScoreBar value={parseFloat(lead.activity_score) || 0} label="Activity" />
                              <ScoreBar value={parseFloat(lead.intent_score) || 0} label="Intent" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider">Scoring Rationale</span>
                                <p className="text-sm text-slate-300 mt-1 leading-relaxed">{lead.scoring_rationale}</p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider">Recommended Action</span>
                                <p className="text-sm text-slate-300 mt-1 leading-relaxed">{lead.recommended_action}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {filteredScoredLeads.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-sm">
                      No leads match the selected filter.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── TAB: Outreach Strategies ───────────────── */}
        {activeTab === 'outreach' && (
          <div className="space-y-6">
            {outreachLoading ? (
              <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Spinner />
                  <span className="text-slate-300">Generating personalized outreach strategies...</span>
                </div>
                <LoadingSkeleton rows={4} />
              </div>
            ) : !outreachResult ? (
              <EmptyState
                icon={FiMail}
                title="No outreach plans yet"
                subtitle="Score your leads first, then generate outreach strategies for qualified leads (7+)."
              />
            ) : (
              <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <KpiCard
                    label="Plans Generated"
                    value={outreachResult.total_plans_generated || '0'}
                    icon={FiMail}
                    color="blue"
                  />
                  <KpiCard
                    label="Channel Mix"
                    value={outreachResult.channel_distribution || 'N/A'}
                    icon={FiActivity}
                    color="green"
                  />
                  <KpiCard
                    label="Priority Order"
                    value={outreachResult.priority_outreach_order || 'N/A'}
                    icon={FiTrendingUp}
                    color="amber"
                  />
                </div>

                {/* Overall Strategy */}
                {outreachResult.overall_strategy_summary && (
                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20 p-5">
                    <div className="flex items-start gap-3">
                      <FiTarget className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold text-blue-400 mb-1">Overall Strategy</h3>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {outreachResult.overall_strategy_summary}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Outreach Plans */}
                {Array.isArray(outreachResult.outreach_plans) &&
                  outreachResult.outreach_plans.map((plan, idx) => {
                    const ChannelIcon = getChannelIcon(plan.primary_channel)
                    const isExpanded = expandedOutreach.has(idx)
                    return (
                      <div
                        key={idx}
                        className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden"
                      >
                        {/* Header */}
                        <div
                          className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-slate-800/20 transition-colors"
                          onClick={() => toggleOutreach(idx)}
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <ChannelIcon className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-white">{plan.lead_name}</h4>
                              <span className="text-sm text-slate-500">at {plan.company}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">
                                {plan.primary_channel}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded border ${getUrgencyColor(plan.urgency_level)}`}>
                                {plan.urgency_level}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <FiChevronDown className="w-5 h-5 text-slate-500" />
                            ) : (
                              <FiChevronRight className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-slate-700/30 pt-4 space-y-5">
                            {/* Messaging Angle */}
                            <div>
                              <h5 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Messaging Angle</h5>
                              <p className="text-sm text-slate-300 leading-relaxed">{plan.messaging_angle}</p>
                            </div>

                            {/* LinkedIn Message */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                  <FaLinkedin className="w-3 h-3" /> LinkedIn Message
                                </h5>
                                <CopyButton text={plan.linkedin_message} />
                              </div>
                              <div className="bg-[#0f172a] border border-slate-700 rounded-lg p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {plan.linkedin_message}
                              </div>
                            </div>

                            {/* Email Template */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                  <FiMail className="w-3 h-3" /> Email Template
                                </h5>
                                <CopyButton text={`Subject: ${plan.email_subject}\n\n${plan.email_body}`} />
                              </div>
                              <div className="bg-[#0f172a] border border-slate-700 rounded-lg overflow-hidden">
                                <div className="px-4 py-2 border-b border-slate-700 bg-slate-800/30">
                                  <span className="text-xs text-slate-500">Subject:</span>
                                  <span className="text-sm text-white ml-2">{plan.email_subject}</span>
                                </div>
                                <div className="px-4 py-3 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {plan.email_body}
                                </div>
                              </div>
                            </div>

                            {/* Follow-up & Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h5 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Follow-up Sequence</h5>
                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {plan.follow_up_sequence}
                                </p>
                              </div>
                              <div>
                                <h5 className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                                  Conversation Starters
                                </h5>
                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {plan.conversation_starters}
                                </p>
                              </div>
                              <div>
                                <h5 className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                                  Timing Recommendation
                                </h5>
                                <p className="text-sm text-slate-300 leading-relaxed">{plan.timing_recommendation}</p>
                              </div>
                              <div>
                                <h5 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Key Talking Points</h5>
                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {plan.key_talking_points}
                                </p>
                              </div>
                            </div>

                            {/* Copy All */}
                            <div className="flex justify-end pt-2 border-t border-slate-700/30">
                              <CopyButton
                                text={`OUTREACH PLAN: ${plan.lead_name} (${plan.company})\n\nChannel: ${plan.primary_channel}\nUrgency: ${plan.urgency_level}\n\nMESSAGING ANGLE:\n${plan.messaging_angle}\n\nLINKEDIN MESSAGE:\n${plan.linkedin_message}\n\nEMAIL:\nSubject: ${plan.email_subject}\n${plan.email_body}\n\nFOLLOW-UP:\n${plan.follow_up_sequence}\n\nCONVERSATION STARTERS:\n${plan.conversation_starters}\n\nTIMING: ${plan.timing_recommendation}\n\nTALKING POINTS:\n${plan.key_talking_points}`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </>
            )}
          </div>
        )}

        {/* ─── TAB: Pipeline View ─────────────────────── */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            {/* Pipeline Visual */}
            <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Lead Intelligence Pipeline</h2>
                <button
                  onClick={runFullPipeline}
                  disabled={pipelineRunning || !leadInput.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-all"
                >
                  {pipelineRunning ? <Spinner size="sm" /> : <FiPlay className="w-4 h-4" />}
                  {pipelineRunning ? 'Running Pipeline...' : 'Run Full Pipeline'}
                </button>
              </div>

              {/* Pipeline Steps */}
              <div className="flex flex-col md:flex-row items-stretch gap-4">
                {/* Step 1: Enrichment */}
                <div className="flex-1 bg-[#0f172a] rounded-xl border border-slate-700 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-3 h-3 rounded-full border-2 ${stepColor(pipelineStatus.enrichment)}`} />
                    <h3 className="text-sm font-semibold text-white">1. Lead Enrichment</h3>
                  </div>
                  <p className={`text-xs mb-3 ${stepTextColor(pipelineStatus.enrichment)}`}>
                    {stepLabel(pipelineStatus.enrichment)}
                  </p>
                  <div className="space-y-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <FiZap className="w-3 h-3" />
                      <span>Validate & enrich data fields</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiTrendingUp className="w-3 h-3" />
                      <span>Identify growth signals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiUsers className="w-3 h-3" />
                      <span>Assess buyer persona fit</span>
                    </div>
                  </div>
                  {enrichmentResult && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <p className="text-xs text-emerald-400">
                        {enrichmentResult.total_leads_processed} leads processed
                      </p>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="hidden md:flex items-center">
                  <FiArrowRight className="w-5 h-5 text-slate-600" />
                </div>
                <div className="md:hidden flex justify-center">
                  <FiChevronDown className="w-5 h-5 text-slate-600" />
                </div>

                {/* Step 2: Scoring */}
                <div className="flex-1 bg-[#0f172a] rounded-xl border border-slate-700 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-3 h-3 rounded-full border-2 ${stepColor(pipelineStatus.scoring)}`} />
                    <h3 className="text-sm font-semibold text-white">2. Lead Scoring</h3>
                  </div>
                  <p className={`text-xs mb-3 ${stepTextColor(pipelineStatus.scoring)}`}>
                    {stepLabel(pipelineStatus.scoring)}
                  </p>
                  <div className="space-y-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <FiBarChart2 className="w-3 h-3" />
                      <span>Score 1-10 across 5 criteria</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiStar className="w-3 h-3" />
                      <span>Qualify at threshold 7+</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiTarget className="w-3 h-3" />
                      <span>$3K-$20K offer fit analysis</span>
                    </div>
                  </div>
                  {scoringResult && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <p className="text-xs text-emerald-400">
                        {scoringResult.qualified_count || qualifiedCount} qualified / {scoringResult.total_leads_scored} total
                      </p>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="hidden md:flex items-center">
                  <FiArrowRight className="w-5 h-5 text-slate-600" />
                </div>
                <div className="md:hidden flex justify-center">
                  <FiChevronDown className="w-5 h-5 text-slate-600" />
                </div>

                {/* Step 3: Outreach */}
                <div className="flex-1 bg-[#0f172a] rounded-xl border border-slate-700 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-3 h-3 rounded-full border-2 ${stepColor(pipelineStatus.outreach)}`} />
                    <h3 className="text-sm font-semibold text-white">3. Outreach Strategy</h3>
                  </div>
                  <p className={`text-xs mb-3 ${stepTextColor(pipelineStatus.outreach)}`}>
                    {stepLabel(pipelineStatus.outreach)}
                  </p>
                  <div className="space-y-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <FiMail className="w-3 h-3" />
                      <span>Personalized messaging</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaLinkedin className="w-3 h-3" />
                      <span>LinkedIn + Email templates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiActivity className="w-3 h-3" />
                      <span>Follow-up sequences</span>
                    </div>
                  </div>
                  {outreachResult && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <p className="text-xs text-emerald-400">
                        {outreachResult.total_plans_generated} outreach plans
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Pipeline Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="bg-[#0f172a] rounded-lg p-3 border border-slate-700/50">
                  <span className="text-xs text-slate-500">Target Niche</span>
                  <p className="text-slate-200 mt-1">B2B Coaches & Consultants</p>
                </div>
                <div className="bg-[#0f172a] rounded-lg p-3 border border-slate-700/50">
                  <span className="text-xs text-slate-500">Offer Range</span>
                  <p className="text-slate-200 mt-1">$3,000 - $20,000</p>
                </div>
                <div className="bg-[#0f172a] rounded-lg p-3 border border-slate-700/50">
                  <span className="text-xs text-slate-500">Qualification Threshold</span>
                  <p className="text-slate-200 mt-1">Score 7+ / 10</p>
                </div>
                <div className="bg-[#0f172a] rounded-lg p-3 border border-slate-700/50">
                  <span className="text-xs text-slate-500">Lead Sources</span>
                  <p className="text-slate-200 mt-1">LinkedIn, Crunchbase, G2/Clutch</p>
                </div>
              </div>
            </div>

            {/* Input Preview */}
            {leadInput && (
              <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Current Lead Data</h3>
                  <span className="text-xs text-slate-500">Source: {selectedSource}</span>
                </div>
                <div className="bg-[#0f172a] rounded-lg border border-slate-700 p-4 max-h-40 overflow-y-auto">
                  <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono">{leadInput}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs text-slate-600">
          <span>LeadPulse AI - B2B Lead Intelligence Platform</span>
          <span>Compliance-first architecture - No illegal scraping</span>
        </div>
      </footer>
    </div>
  )
}
