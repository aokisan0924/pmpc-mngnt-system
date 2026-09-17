import { useMemo, useRef, useState } from 'react'
import { Link, router } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'
import useTheme from '@/hooks/useTheme'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
    ComposedChart, Area, Line,
} from 'recharts'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

function fmtShort(num) {
    if (num >= 1_000_000) return '₱' + (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000) return '₱' + (num / 1_000).toFixed(1) + 'K'
    return '₱' + Math.round(num)
}

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-panel border border-border shadow-md rounded-xl p-3 min-w-40 text-xs">
            <p className="font-heading font-semibold text-text mb-2 border-b border-border/70 pb-1">{label}</p>
            {payload.map(p => (
                <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-sub">{p.name}</span>
                    </div>
                    <span className="font-semibold text-text tnum">
                        {typeof p.value === 'number' && p.value > 999
                            ? '₱ ' + fmt(p.value)
                            : p.value + (p.name?.includes('Rate') || p.name?.includes('%') ? '%' : '')}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default function Dashboard({
    stats,
    active_cutoff,
    shift_phase,
    today_snapshot = [],
    monthly_attendance = [],
    department_attendance = [],
    payroll_trend = [],
    payroll_cost_summary = null,
    headcount_breakdown = [],
    pending_edit_requests = [],
    recent_activity = [],
}) {
    const { isDark } = useTheme()
    const [snapshotFilter, setSnapshotFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [processingId, setProcessingId] = useState(null)
    const [triageFeedback, setTriageFeedback] = useState(null)
    const [declineTarget, setDeclineTarget] = useState(null)
    const [declineReason, setDeclineReason] = useState('')
    const processingRef = useRef(false)

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    // Filter snapshot by status and search query with memoization
    const filteredSnapshot = useMemo(() => {
        return today_snapshot.filter(e => {
            const matchesFilter = snapshotFilter === 'all' || e.status === snapshotFilter
            const matchesSearch = searchQuery.trim() === ''
                || e.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
                || e.department?.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesFilter && matchesSearch
        })
    }, [today_snapshot, snapshotFilter, searchQuery])

    const statusCounts = useMemo(() => {
        return today_snapshot.reduce((acc, e) => {
            acc[e.status] = (acc[e.status] || 0) + 1
            return acc
        }, { all: today_snapshot.length })
    }, [today_snapshot])

    const donutData = useMemo(() => {
        return [
            { name: 'Present', value: stats?.present_today || 0, color: '#10B981' },
            { name: 'Late', value: stats?.late_today || 0, color: '#F59E0B' },
            { name: 'Absent', value: Math.max(0, stats?.absent_today || 0), color: '#F43F5E' },
        ].filter(d => d.value > 0)
    }, [stats?.present_today, stats?.late_today, stats?.absent_today])

    const axisTick = { fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(148, 163, 184, 0.15)'

    // Direct 1-Click Approve / Accessible Modal Decline from Dashboard Triage Hub
    function handleApprove(requestId) {
        if (processingRef.current) return
        processingRef.current = true
        setProcessingId(requestId)
        setTriageFeedback(null)

        router.post(`/admin/edit-requests/${requestId}/approve`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setTriageFeedback({ type: 'success', message: 'DTR edit request approved successfully.' })
                setTimeout(() => setTriageFeedback(null), 4000)
            },
            onError: (err) => {
                setTriageFeedback({ type: 'error', message: err?.error || 'Failed to approve request.' })
                setTimeout(() => setTriageFeedback(null), 5000)
            },
            onFinish: () => {
                processingRef.current = false
                setProcessingId(null)
            },
        })
    }

    function openDeclineModal(request) {
        if (processingRef.current) return
        setDeclineTarget(request)
        setDeclineReason('')
    }

    function submitDecline() {
        if (!declineTarget || processingRef.current) return
        processingRef.current = true
        setProcessingId(declineTarget.id)
        setTriageFeedback(null)

        router.post(`/admin/edit-requests/${declineTarget.id}/decline`, { admin_note: declineReason }, {
            preserveScroll: true,
            onSuccess: () => {
                setTriageFeedback({ type: 'success', message: 'DTR edit request declined.' })
                setDeclineTarget(null)
                setDeclineReason('')
                setTimeout(() => setTriageFeedback(null), 4000)
            },
            onError: (err) => {
                setTriageFeedback({ type: 'error', message: err?.error || 'Failed to decline request.' })
                setTimeout(() => setTriageFeedback(null), 5000)
            },
            onFinish: () => {
                processingRef.current = false
                setProcessingId(null)
            },
        })
    }

    return (
        <AdminLayout pendingEditCount={stats.pending_edits}>
            <div className="p-3.5 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-4 page-enter">
                {/* ── Top Executive Command Banner & Cutoff Milestone Tracker ── */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#1E1B4B] via-[#26215C] to-indigo-950 text-white shadow-xs relative overflow-hidden select-none">
                    <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                Asia/Manila (GMT+8)
                            </span>
                            {shift_phase && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-indigo-100 border border-white/15">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {shift_phase}
                                </span>
                            )}
                            <span className="text-[11px] text-indigo-200/80">• {dateStr}</span>
                        </div>
                        <h1 className="font-heading font-bold text-lg sm:text-xl text-white tracking-tight">
                            Workforce & Operations Executive Hub
                        </h1>
                        <p className="text-xs text-indigo-100/90 mt-0.5 leading-relaxed">
                            Monitor live employee turnout, resolve attendance disputes, and track semi-monthly cooperative payroll milestones.
                        </p>
                    </div>

                    {/* Active Payroll Cutoff Milestone Card */}
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/10 backdrop-blur-md p-3 sm:px-4 sm:py-3 rounded-lg border border-white/15 shrink-0 shadow-xs">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">Active Payroll Cycle</span>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.25 rounded-full ${
                                    active_cutoff?.status === 'finalized'
                                        ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                                        : active_cutoff?.status === 'draft'
                                        ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                                        : 'bg-white/20 text-white border border-white/20'
                                }`}>
                                    {active_cutoff?.status === 'finalized' ? 'Finalized' : active_cutoff?.status === 'draft' ? 'Draft Active' : 'Not Started'}
                                </span>
                            </div>
                            <p className="font-heading font-bold text-sm sm:text-base text-white">
                                {active_cutoff?.label || 'Current Cutoff'}
                            </p>
                            <p className="text-[11px] text-indigo-200">
                                {active_cutoff?.days_remaining} {active_cutoff?.days_remaining === 1 ? 'day' : 'days'} remaining in this period
                            </p>
                        </div>

                        <div className="sm:border-l sm:border-white/15 sm:pl-3">
                            {active_cutoff?.status === 'finalized' ? (
                                <Link href={`/admin/payroll/${active_cutoff.payroll_id}`}>
                                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-white/10 text-white border-white/30 hover:bg-white/20">
                                        View Batch →
                                    </Button>
                                </Link>
                            ) : (
                                <Link href={`/admin/payroll/create?cutoff=${active_cutoff?.key}&period_from=${active_cutoff?.period_from}&period_to=${active_cutoff?.period_to}`}>
                                    <Button variant="emerald" size="sm" className="h-8 px-3 text-xs font-semibold shadow-xs">
                                        {active_cutoff?.status === 'draft' ? 'Resume Payroll →' : 'Process Payroll →'}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── KPI Stat Cards with Progress Tracks ────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <StatCard
                        title="Total Workforce"
                        value={stats.total_employees}
                        subtitle={`${stats.active_employees} active staff members`}
                        accent="indigo"
                        progress={{
                            value: stats.active_employees,
                            max: Math.max(1, stats.total_employees),
                            label: 'Active staff ratio',
                            color: 'bg-indigo-500',
                        }}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Present Today"
                        value={stats.present_today}
                        subtitle={stats.active_employees > 0 ? `${Math.round((stats.present_today / stats.active_employees) * 100)}% active turnout` : 'No active staff'}
                        accent="emerald"
                        progress={{
                            value: stats.present_today,
                            max: Math.max(1, stats.active_employees),
                            label: 'Turnout today',
                            color: 'bg-emerald-500',
                        }}
                        trend={stats.active_employees > 0 ? `${Math.round((stats.present_today / stats.active_employees) * 100)}%` : null}
                        trendDirection="up"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Late Arrivals"
                        value={stats.late_today}
                        subtitle={stats.late_today === 0 ? 'Flawless on-time arrivals' : `${stats.late_today} arrival(s) outside grace`}
                        accent={stats.late_today > 0 ? 'amber' : 'slate'}
                        progress={{
                            value: Math.max(0, stats.present_today - stats.late_today),
                            max: Math.max(1, stats.present_today),
                            label: 'On-time punctuality',
                            color: stats.late_today > 0 ? 'bg-amber-500' : 'bg-emerald-500',
                        }}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Pending DTR Edits"
                        value={stats.pending_edits}
                        subtitle={stats.pending_edits > 0 ? 'Requires admin triage' : 'All disputes resolved'}
                        accent={stats.pending_edits > 0 ? 'rose' : 'slate'}
                        trend={stats.pending_edits > 0 ? 'Action required' : 'Clear'}
                        trendDirection={stats.pending_edits > 0 ? 'down' : 'neutral'}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                        }
                    />
                </div>

                {/* ── Direct 1-Click DTR Edit Requests Triage Hub ────── */}
                {pending_edit_requests.length > 0 && (
                    <Card className="border border-amber-300 dark:border-amber-800/70 bg-gradient-to-br from-amber-50/30 via-panel to-panel dark:from-amber-950/20 shadow-xs overflow-hidden">
                        <CardHeader className="border-b border-border/60 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-[11px]">
                                    {pending_edit_requests.length}
                                </div>
                                <div>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        Pending DTR Edit Requests Triage
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                    </CardTitle>
                                    <p className="text-[11px] text-sub">
                                        Review and approve employee punch adjustments directly without navigating away.
                                    </p>
                                </div>
                            </div>
                            <Link href="/admin/edit-requests">
                                <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                                    Open Full Request Queue ({stats.pending_edits}) →
                                </Button>
                            </Link>
                        </CardHeader>

                        <CardContent className="p-3 sm:p-3.5">
                            {triageFeedback && (
                                <div className={`p-2.5 rounded-lg text-xs font-semibold mb-2.5 ${
                                    triageFeedback.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200'
                                }`}>
                                    {triageFeedback.message}
                                </div>
                            )}

                            <div className="divide-y divide-border/60">
                                {pending_edit_requests.map(req => {
                                    const isProcessing = processingId === req.id
                                    return (
                                        <div key={req.id} className="py-2.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <div className="w-7 h-7 rounded-lg bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 flex items-center justify-center font-heading font-semibold text-[11px] shrink-0 border border-amber-200 dark:border-amber-800">
                                                    {req.initials}
                                                </div>
                                                <div className="space-y-0.5 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="text-xs font-bold text-text">{req.employee_name}</span>
                                                        <span className="text-[10px] text-sub">({req.department})</span>
                                                        <span className="text-[10px] text-dim">• Log: {req.date}</span>
                                                    </div>

                                                    {/* Adjustment Comparison */}
                                                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                                        <span className="text-sub text-[11px]">Requested change:</span>
                                                        {req.requested_am_time_in && (
                                                            <span className="px-1.5 py-0.25 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-mono text-[10px] border border-emerald-200">
                                                                AM In: {req.original_am_time_in || '--:--'} → <strong>{req.requested_am_time_in}</strong>
                                                            </span>
                                                        )}
                                                        {req.requested_am_time_out && (
                                                            <span className="px-1.5 py-0.25 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-mono text-[10px] border border-emerald-200">
                                                                AM Out: {req.original_am_time_out || '--:--'} → <strong>{req.requested_am_time_out}</strong>
                                                            </span>
                                                        )}
                                                        {req.requested_pm_time_in && (
                                                            <span className="px-1.5 py-0.25 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-mono text-[10px] border border-emerald-200">
                                                                PM In: {req.original_pm_time_in || '--:--'} → <strong>{req.requested_pm_time_in}</strong>
                                                            </span>
                                                        )}
                                                        {req.requested_pm_time_out && (
                                                            <span className="px-1.5 py-0.25 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-mono text-[10px] border border-emerald-200">
                                                                PM Out: {req.original_pm_time_out || '--:--'} → <strong>{req.requested_pm_time_out}</strong>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Reason */}
                                                    {req.reason && (
                                                        <p className="text-[11px] text-sub italic bg-field/60 dark:bg-slate-900/40 p-1.5 rounded-md border border-border/50 max-w-2xl">
                                                            &ldquo;{req.reason}&rdquo;
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                                                <Button
                                                    variant="emerald"
                                                    size="sm"
                                                    disabled={isProcessing}
                                                    onClick={() => handleApprove(req.id)}
                                                    aria-label={`Approve DTR edit for ${req.employee_name}`}
                                                    className="font-semibold shadow-xs h-7 px-2.5 text-xs"
                                                >
                                                    {isProcessing ? 'Saving...' : '✓ Approve'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isProcessing}
                                                    onClick={() => openDeclineModal(req)}
                                                    aria-label={`Decline DTR edit for ${req.employee_name}`}
                                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-border h-7 px-2.5 text-xs"
                                                >
                                                    Decline
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Row 1: Today's Snapshot with Live Search + Turnout Donut ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                    {/* Today's Attendance Snapshot (2 cols) */}
                    <div className="lg:col-span-2">
                        <Card className="h-full flex flex-col justify-between">
                            <CardHeader className="flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-2.5 pb-2 border-b border-border/60">
                                <div>
                                    <CardTitle className="text-sm sm:text-base">Today's Attendance Live Monitor</CardTitle>
                                    <p className="text-[11px] text-sub mt-0.5">
                                        {stats.present_today} Present • {stats.late_today} Late • {Math.max(0, stats.absent_today)} Absent
                                    </p>
                                </div>

                                {/* Filter Tabs & Search */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search staff..."
                                            aria-label="Search employees by name or department"
                                            className="w-32 sm:w-40 text-xs px-2.5 py-1 rounded-md border border-border bg-field/60 focus:bg-panel focus:outline-none focus:ring-1.5 focus:ring-indigo-500/20"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2 top-1 text-xs text-sub hover:text-text"
                                                aria-label="Clear search"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-0.5 bg-field p-0.5 rounded-lg border border-border/70" role="tablist" aria-label="Attendance status filter">
                                        {[
                                            { key: 'all', label: 'All' },
                                            { key: 'on_time', label: 'On Time' },
                                            { key: 'late', label: 'Late' },
                                            { key: 'absent', label: 'Absent' },
                                        ].map(f => (
                                            <button
                                                key={f.key}
                                                role="tab"
                                                aria-selected={snapshotFilter === f.key}
                                                onClick={() => setSnapshotFilter(f.key)}
                                                className={`px-1.5 py-0.5 text-xs rounded font-medium transition-all ${
                                                    snapshotFilter === f.key
                                                        ? 'bg-panel text-text shadow-2xs font-semibold'
                                                        : 'text-sub hover:text-text'
                                                }`}
                                            >
                                                {f.label} {statusCounts[f.key] !== undefined ? `(${statusCounts[f.key]})` : ''}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 p-0">
                                <div className="divide-y divide-border/60 max-h-64 overflow-y-auto">
                                    {filteredSnapshot.map(emp => (
                                        <div key={emp.id} className="p-2.5 px-4 flex items-center justify-between gap-3 hover:bg-field/50 transition-colors">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-heading font-semibold text-[11px] flex-shrink-0">
                                                    {emp.initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-text truncate">{emp.full_name}</p>
                                                    <p className="text-[10px] text-sub truncate">{emp.department}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono tnum text-sub">
                                                    <span>AM In: {emp.am_time_in?.slice(0, 5) ?? '--:--'}</span>
                                                    <span className="text-dim">|</span>
                                                    <span>PM Out: {emp.pm_time_out?.slice(0, 5) ?? '--:--'}</span>
                                                </div>
                                                <Badge variant={emp.status} size="sm">
                                                    {emp.status?.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}

                                    {filteredSnapshot.length === 0 && (
                                        <div className="text-center py-8 text-xs text-sub">
                                            No employee attendance logs match the current query.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Donut Turnout Chart (1 col) */}
                    <div>
                        <Card className="h-full flex flex-col justify-between">
                            <CardHeader className="px-4 py-2.5 pb-2">
                                <CardTitle className="text-sm sm:text-base">Today's Turnout Ratio</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3.5 sm:p-4">
                                {donutData.length > 0 ? (
                                    <>
                                        <div role="img" aria-label={`Today's attendance turnout ratio: ${stats?.present_today || 0} present, ${stats?.late_today || 0} late, ${Math.max(0, stats?.absent_today || 0)} absent`}>
                                            <ResponsiveContainer width="100%" height={135}>
                                                <PieChart>
                                                    <Pie
                                                        data={donutData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={38}
                                                        outerRadius={58}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                        startAngle={90}
                                                        endAngle={-270}
                                                    >
                                                        {donutData.map(entry => (
                                                            <Cell key={entry.name} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<ChartTooltip />} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="space-y-1.5 mt-2.5 pt-2.5 border-t border-border/70">
                                            {donutData.map(d => (
                                                <div key={d.name} className="flex items-center justify-between text-[11px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                                                        <span className="text-sub font-medium">{d.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 tnum">
                                                        <span className="font-semibold text-text">{d.value}</span>
                                                        <span className="text-dim">
                                                            ({stats.active_employees > 0
                                                                ? Math.round((d.value / stats.active_employees) * 100)
                                                                : 0}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-8 text-center text-xs text-sub">
                                        No attendance logged yet today.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* ── Row 2: 6-Month Attendance Performance Trends (Recharts) ── */}
                <Card>
                    <CardHeader className="px-4 py-2.5 pb-2">
                        <div>
                            <CardTitle className="text-sm sm:text-base">Attendance Performance Trends</CardTitle>
                            <p className="text-[11px] text-sub mt-0.5">Monthly attendance rate % and overall turnout over the last 6 operating months</p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-3.5 sm:p-4">
                        {monthly_attendance.length > 0 ? (
                            <div role="img" aria-label="Monthly attendance rate and turnout volume over the last 6 operating months">
                                <ResponsiveContainer width="100%" height={190}>
                                    <ComposedChart data={monthly_attendance} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                        <XAxis dataKey="month_short" tick={axisTick} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="rate" domain={[0, 100]} tickFormatter={v => v + '%'} tick={axisTick} tickLine={false} axisLine={false} width={38} />
                                        <YAxis yAxisId="count" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={28} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} iconType="circle" />
                                        <Bar yAxisId="count" dataKey="present" name="Present Count" fill="#10B981" radius={[3, 3, 0, 0]} fillOpacity={0.3} stackId="a" />
                                        <Bar yAxisId="count" dataKey="late" name="Late Count" fill="#F59E0B" radius={[0, 0, 0, 0]} fillOpacity={0.4} stackId="a" />
                                        <Area yAxisId="rate" type="monotone" dataKey="rate" name="Turnout Rate (%)" stroke="#4F46E5" strokeWidth={2} fill="url(#rateGradient)" dot={{ r: 2.5, fill: '#4F46E5' }} activeDot={{ r: 4 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-xs text-sub">No monthly data accumulated yet.</div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Row 3: Department Efficiency & Payroll Cost Trends ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                    {/* Department Attendance with Turnout Bars */}
                    <Card>
                        <CardHeader className="px-4 py-2.5 pb-2">
                            <div>
                                <CardTitle className="text-sm sm:text-base">Department Attendance & Efficiency</CardTitle>
                                <p className="text-[11px] text-sub mt-0.5">Headcount, monthly turnout volume, and today&apos;s active presence</p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3.5 sm:p-4 space-y-3">
                            {department_attendance.length > 0 ? (
                                <div className="space-y-3">
                                    <div role="img" aria-label="Department attendance headcount and turnout comparison">
                                        <ResponsiveContainer width="100%" height={140}>
                                            <BarChart data={department_attendance} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                                <XAxis dataKey="department" tick={axisTick} tickLine={false} axisLine={false} />
                                                <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Bar dataKey="present" name="Present" fill="#10B981" stackId="a" />
                                                <Bar dataKey="late" name="Late" fill="#F59E0B" stackId="a" />
                                                <Bar dataKey="absent" name="Absent" fill="#F43F5E" radius={[2, 2, 0, 0]} stackId="a" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="border border-border/80 rounded-lg overflow-hidden overflow-x-auto">
                                        <table className="w-full text-[11px]">
                                            <thead>
                                                <tr className="bg-field/70 border-b border-border/80">
                                                    <th className="text-left px-2.5 py-1.5 font-semibold text-sub">Department</th>
                                                    <th className="text-center px-2 py-1.5 font-semibold text-sub">Headcount</th>
                                                    <th className="text-center px-2 py-1.5 font-semibold text-emerald-600">Today</th>
                                                    <th className="text-left px-2.5 py-1.5 font-semibold text-sub">Turnout Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60 tnum">
                                                {department_attendance.map(d => (
                                                    <tr key={d.department} className="hover:bg-field/40">
                                                        <td className="px-2.5 py-1.5 font-medium text-text truncate max-w-28">{d.department}</td>
                                                        <td className="px-2 py-1.5 text-center text-sub">{d.headcount}</td>
                                                        <td className={`px-2 py-1.5 text-center font-semibold ${(d.today_present ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                            {d.today_present ?? 0} / {d.headcount}
                                                        </td>
                                                        <td className="px-2.5 py-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-1.5 flex-1 bg-field dark:bg-slate-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                                            (d.turnout_rate ?? 0) >= 90
                                                                                ? 'bg-emerald-500'
                                                                                : (d.turnout_rate ?? 0) >= 70
                                                                                ? 'bg-amber-500'
                                                                                : 'bg-rose-500'
                                                                        }`}
                                                                        style={{ width: `${d.turnout_rate ?? 0}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] font-semibold text-text w-8 text-right">
                                                                    {d.turnout_rate ?? 0}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-6 text-center text-xs text-sub">No department data recorded.</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payroll Expenditure Trend */}
                    <Card>
                        <CardHeader className="px-4 py-2.5 pb-2">
                            <div>
                                <CardTitle className="text-sm sm:text-base">Payroll Financial Trend</CardTitle>
                                <p className="text-[11px] text-sub mt-0.5">Historical gross, deduction, and net pay disbursement volumes</p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3.5 sm:p-4 space-y-3">
                            {payroll_trend.length > 0 ? (
                                <div className="space-y-3">
                                    <div role="img" aria-label="Historical gross, net pay, and deductions disbursement volumes">
                                        <ResponsiveContainer width="100%" height={140}>
                                            <ComposedChart data={payroll_trend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                                <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
                                                <YAxis tickFormatter={fmtShort} tick={axisTick} tickLine={false} axisLine={false} width={42} />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 9.5, paddingTop: 4 }} iconType="circle" />
                                                <Area type="monotone" dataKey="total_gross" name="Gross Pay" fill="#4F46E5" stroke="#4F46E5" fillOpacity={0.1} />
                                                <Line type="monotone" dataKey="total_net" name="Net Pay" stroke="#10B981" strokeWidth={2} dot={{ r: 2.5, fill: '#10B981' }} />
                                                <Line type="monotone" dataKey="total_deductions" name="Deductions" stroke="#F43F5E" strokeWidth={1.5} strokeDasharray="3 3" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { label: 'Avg Gross', value: fmtShort(payroll_trend.reduce((s, r) => s + r.total_gross, 0) / payroll_trend.length), color: 'text-text' },
                                            { label: 'Avg Deductions', value: fmtShort(payroll_trend.reduce((s, r) => s + r.total_deductions, 0) / payroll_trend.length), color: 'text-rose-600 dark:text-rose-400' },
                                            { label: 'Avg Net Pay', value: fmtShort(payroll_trend.reduce((s, r) => s + r.total_net, 0) / payroll_trend.length), color: 'text-emerald-600 dark:text-emerald-400' },
                                        ].map(s => (
                                            <div key={s.label} className="p-2 rounded-lg border border-border/80 bg-field/40 text-center">
                                                <p className="text-[9px] text-sub uppercase font-medium">{s.label}</p>
                                                <p className={`text-xs font-heading font-bold mt-0.5 tnum ${s.color}`}>{s.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {payroll_cost_summary && (
                                        <div className="pt-2 border-t border-border/70">
                                            <p className="text-[10px] font-medium text-sub mb-1">Latest Finalized Statutory Deduction Split:</p>
                                            <div className="grid grid-cols-4 gap-1.5 text-center">
                                                <div className="p-1.5 rounded-lg bg-field/40 border border-border/60">
                                                    <p className="text-[9px] text-sub uppercase font-medium">SSS</p>
                                                    <p className="text-[11px] font-semibold text-text tnum">₱ {fmt(payroll_cost_summary.sss)}</p>
                                                </div>
                                                <div className="p-1.5 rounded-lg bg-field/40 border border-border/60">
                                                    <p className="text-[9px] text-sub uppercase font-medium">PhilHealth</p>
                                                    <p className="text-[11px] font-semibold text-text tnum">₱ {fmt(payroll_cost_summary.philhealth)}</p>
                                                </div>
                                                <div className="p-1.5 rounded-lg bg-field/40 border border-border/60">
                                                    <p className="text-[9px] text-sub uppercase font-medium">Pag-IBIG</p>
                                                    <p className="text-[11px] font-semibold text-text tnum">₱ {fmt(payroll_cost_summary.pagibig)}</p>
                                                </div>
                                                <div className="p-1.5 rounded-lg bg-field/40 border border-border/60">
                                                    <p className="text-[9px] text-sub uppercase font-medium">W-Tax</p>
                                                    <p className="text-[11px] font-semibold text-text tnum">₱ {fmt(payroll_cost_summary.tax)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    <div className="p-3 rounded-lg border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="text-xs font-semibold text-text">
                                                    {payroll_cost_summary?.period_label ?? 'Active Roster Projections'}
                                                </p>
                                                <p className="text-[10px] text-sub">
                                                    {(payroll_cost_summary?.total_gross ?? 0) > 0
                                                        ? 'Estimated monthly liabilities from active staff compensation'
                                                        : 'Staff compensation rates unconfigured — set daily rates in Directory'}
                                                </p>
                                            </div>
                                            <span className="px-1.5 py-0.25 rounded-full text-[9px] font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                                                Baseline Projections
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                                            <div className="p-2 rounded-lg bg-panel border border-border/80 text-center">
                                                <p className="text-[9px] text-sub uppercase font-medium">Est. Monthly Payroll</p>
                                                <p className="text-xs font-heading font-bold text-text mt-0.5 tnum">₱ {fmt(payroll_cost_summary?.total_gross ?? 0)}</p>
                                            </div>
                                            <div className="p-2 rounded-lg bg-panel border border-border/80 text-center">
                                                <p className="text-[9px] text-sub uppercase font-medium">Avg Staff Daily Rate</p>
                                                <p className="text-xs font-heading font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tnum">₱ {fmt(payroll_cost_summary?.avg_daily_rate ?? 0)}/day</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-medium text-sub mb-1">Monthly Statutory Splits (Projected):</p>
                                            <div className="grid grid-cols-4 gap-1 text-center">
                                                <div className="p-1 rounded bg-panel border border-border/70">
                                                    <p className="text-[8px] text-sub uppercase">SSS</p>
                                                    <p className="text-[10px] font-semibold text-text tnum">₱ {fmt(payroll_cost_summary?.sss ?? 0)}</p>
                                                </div>
                                                <div className="p-1 rounded bg-panel border border-border/70">
                                                    <p className="text-[8px] text-sub uppercase">PhilHealth</p>
                                                    <p className="text-[10px] font-semibold text-text tnum">₱ {fmt(payroll_cost_summary?.philhealth ?? 0)}</p>
                                                </div>
                                                <div className="p-1 rounded bg-panel border border-border/70">
                                                    <p className="text-[8px] text-sub uppercase">Pag-IBIG</p>
                                                    <p className="text-[10px] font-semibold text-text tnum">₱ {fmt(payroll_cost_summary?.pagibig ?? 0)}</p>
                                                </div>
                                                <div className="p-1 rounded bg-panel border border-border/70">
                                                    <p className="text-[8px] text-sub uppercase">W-Tax</p>
                                                    <p className="text-[10px] font-semibold text-text tnum">₱ {fmt(payroll_cost_summary?.tax ?? 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 pt-1">
                                        <p className="text-[10px] text-sub">No finalized batches yet for this period.</p>
                                        <Link
                                            href={`/admin/payroll/create?cutoff=${active_cutoff.key}&period_from=${active_cutoff.period_from}&period_to=${active_cutoff.period_to}`}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
                                        >
                                            Start Payroll Run →
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Quick Admin Shortcuts ─────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 select-none">
                    <Link
                        href="/admin/payroll"
                        className="p-3 rounded-lg border border-border/80 bg-panel hover:border-indigo-400 hover:shadow-xs transition-all flex items-center gap-2.5"
                    >
                        <div className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate">Process Payroll</p>
                            <p className="text-[9px] text-sub">Draft & finalize runs</p>
                        </div>
                    </Link>

                    <Link
                        href="/admin/edit-requests"
                        className="p-3 rounded-lg border border-border/80 bg-panel hover:border-amber-400 hover:shadow-xs transition-all flex items-center justify-between gap-2.5 relative"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-text truncate">Edit Requests</p>
                                <p className="text-[9px] text-sub">Punch dispute approvals</p>
                            </div>
                        </div>
                        {stats.pending_edits > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                    </Link>

                    <Link
                        href="/admin/employees"
                        className="p-3 rounded-lg border border-border/80 bg-panel hover:border-emerald-400 hover:shadow-xs transition-all flex items-center gap-2.5"
                    >
                        <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate">Employees</p>
                            <p className="text-[9px] text-sub">Directory & profiles</p>
                        </div>
                    </Link>

                    <Link
                        href="/admin/payroll/analytics"
                        className="p-3 rounded-lg border border-border/80 bg-panel hover:border-purple-400 hover:shadow-xs transition-all flex items-center gap-2.5"
                    >
                        <div className="w-7 h-7 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate">Analytics</p>
                            <p className="text-[9px] text-sub">KPI cost breakdowns</p>
                        </div>
                    </Link>
                </div>

                {/* ── Accessible Decline Reason Dialog ──────────────── */}
                {declineTarget && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="decline-dialog-title"
                    >
                        <div className="bg-panel border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-border/70 pb-3">
                                <h3 id="decline-dialog-title" className="font-heading font-semibold text-base text-text">
                                    Decline Edit Request
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setDeclineTarget(null)}
                                    className="text-sub hover:text-text text-sm p-1 rounded-lg"
                                    aria-label="Close dialog"
                                >
                                    ✕
                                </button>
                            </div>
                            <div>
                                <p className="text-xs text-sub">
                                    You are declining the DTR edit request from <strong className="text-text font-semibold">{declineTarget.employee_name}</strong>.
                                </p>
                                <div className="mt-3 space-y-1.5">
                                    <label htmlFor="decline-reason-input" className="block text-xs font-medium text-text">
                                        Reason or Note (Optional):
                                    </label>
                                    <textarea
                                        id="decline-reason-input"
                                        rows={3}
                                        value={declineReason}
                                        onChange={e => setDeclineReason(e.target.value)}
                                        placeholder="Enter reason for declining this request..."
                                        className="w-full text-xs p-2.5 rounded-xl border border-border bg-field text-text focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeclineTarget(null)}
                                    disabled={processingId === declineTarget.id}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={submitDecline}
                                    disabled={processingId === declineTarget.id}
                                    className="font-semibold"
                                >
                                    {processingId === declineTarget.id ? 'Declining...' : 'Confirm Decline'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}