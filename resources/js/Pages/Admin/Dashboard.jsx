import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'
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
    const [snapshotFilter, setSnapshotFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [processingId, setProcessingId] = useState(null)
    const [triageFeedback, setTriageFeedback] = useState(null)

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    // Filter snapshot by status and search query
    const filteredSnapshot = today_snapshot.filter(e => {
        const matchesFilter = snapshotFilter === 'all' || e.status === snapshotFilter
        const matchesSearch = searchQuery.trim() === ''
            || e.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
            || e.department?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesFilter && matchesSearch
    })

    const statusCounts = today_snapshot.reduce((acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1
        return acc
    }, { all: today_snapshot.length })

    const donutData = [
        { name: 'Present', value: stats.present_today || 0, color: '#10B981' },
        { name: 'Late', value: stats.late_today || 0, color: '#F59E0B' },
        { name: 'Absent', value: Math.max(0, stats.absent_today || 0), color: '#F43F5E' },
    ].filter(d => d.value > 0)

    const axisTick = { fontSize: 11, fill: '#64748B' }
    const gridColor = 'rgba(148, 163, 184, 0.15)'

    // Direct 1-Click Approve / Decline from Dashboard Triage Hub
    function handleApprove(requestId) {
        if (processingId) return
        setProcessingId(requestId)
        setTriageFeedback(null)

        router.post(`/admin/edit-requests/${requestId}/approve`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setTriageFeedback({ type: 'success', message: 'DTR edit request approved successfully.' })
                setTimeout(() => setTriageFeedback(null), 4000)
            },
            onError: (err) => {
                setTriageFeedback({ type: 'error', message: err.error || 'Failed to approve request.' })
                setTimeout(() => setTriageFeedback(null), 5000)
            },
            onFinish: () => setProcessingId(null),
        })
    }

    function handleDecline(requestId) {
        if (processingId) return
        const reason = window.prompt('Enter an optional note/reason for declining (or leave blank):')
        if (reason === null) return // cancelled prompt

        setProcessingId(requestId)
        setTriageFeedback(null)

        router.post(`/admin/edit-requests/${requestId}/decline`, { admin_note: reason }, {
            preserveScroll: true,
            onSuccess: () => {
                setTriageFeedback({ type: 'success', message: 'DTR edit request declined.' })
                setTimeout(() => setTriageFeedback(null), 4000)
            },
            onError: (err) => {
                setTriageFeedback({ type: 'error', message: err.error || 'Failed to decline request.' })
                setTimeout(() => setTriageFeedback(null), 5000)
            },
            onFinish: () => setProcessingId(null),
        })
    }

    return (
        <AdminLayout pendingEditCount={stats.pending_edits}>
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 page-enter">
                {/* ── Top Executive Command Banner & Cutoff Milestone Tracker ── */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#26215C] to-indigo-950 text-white shadow-sm relative overflow-hidden select-none">
                    <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2 mb-2.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                Asia/Manila (GMT+8)
                            </span>
                            {shift_phase && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-indigo-100 border border-white/15">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {shift_phase}
                                </span>
                            )}
                            <span className="text-xs text-indigo-200/80">• {dateStr}</span>
                        </div>
                        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white tracking-tight">
                            Workforce & Operations Executive Hub
                        </h1>
                        <p className="text-sm text-indigo-100/90 mt-1 leading-relaxed">
                            Monitor live employee turnout, resolve attendance disputes, and track semi-monthly cooperative payroll milestones.
                        </p>
                    </div>

                    {/* Active Payroll Cutoff Milestone Card */}
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/10 backdrop-blur-md p-4 sm:px-5 sm:py-4 rounded-xl border border-white/15 shrink-0 shadow-xs">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">Active Payroll Cycle</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    active_cutoff?.status === 'finalized'
                                        ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                                        : active_cutoff?.status === 'draft'
                                        ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                                        : 'bg-white/20 text-white border border-white/20'
                                }`}>
                                    {active_cutoff?.status === 'finalized' ? 'Finalized' : active_cutoff?.status === 'draft' ? 'Draft Active' : 'Not Started'}
                                </span>
                            </div>
                            <p className="font-heading font-bold text-base sm:text-lg text-white">
                                {active_cutoff?.label || 'Current Cutoff'}
                            </p>
                            <p className="text-xs text-indigo-200">
                                {active_cutoff?.days_remaining} {active_cutoff?.days_remaining === 1 ? 'day' : 'days'} remaining in this period
                            </p>
                        </div>

                        <div className="sm:border-l sm:border-white/15 sm:pl-4">
                            {active_cutoff?.status === 'finalized' ? (
                                <Link href={`/admin/payroll/${active_cutoff.payroll_id}`}>
                                    <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                                        View Batch →
                                    </Button>
                                </Link>
                            ) : (
                                <Link href={`/admin/payroll/create?cutoff=${active_cutoff?.key}&period_from=${active_cutoff?.period_from}&period_to=${active_cutoff?.period_to}`}>
                                    <Button variant="emerald" size="sm" className="font-semibold shadow-xs">
                                        {active_cutoff?.status === 'draft' ? 'Resume Payroll →' : 'Process Payroll →'}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── KPI Stat Cards with Progress Tracks ────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <CardHeader className="border-b border-border/60 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                                    {pending_edit_requests.length}
                                </div>
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        Pending DTR Edit Requests Triage
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                    </CardTitle>
                                    <p className="text-xs text-sub">
                                        Review and approve employee punch adjustments directly without navigating away.
                                    </p>
                                </div>
                            </div>
                            <Link href="/admin/edit-requests">
                                <Button variant="outline" size="sm">
                                    Open Full Request Queue ({stats.pending_edits}) →
                                </Button>
                            </Link>
                        </CardHeader>

                        <CardContent className="p-4 sm:p-5">
                            {triageFeedback && (
                                <div className={`p-3 rounded-lg text-xs font-semibold mb-3 ${
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
                                        <div key={req.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 flex items-center justify-center font-heading font-semibold text-xs shrink-0 border border-amber-200 dark:border-amber-800">
                                                    {req.initials}
                                                </div>
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-bold text-text">{req.employee_name}</span>
                                                        <span className="text-[11px] text-sub">({req.department})</span>
                                                        <span className="text-[11px] text-dim">• Log: {req.date}</span>
                                                    </div>

                                                    {/* Adjustment Comparison */}
                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                        <span className="text-sub">Requested change:</span>
                                                        {req.requested_am_time_in && (
                                                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-mono text-[11px] border border-emerald-200">
                                                                AM In: {req.original_am_time_in || '--:--'} → <strong>{req.requested_am_time_in}</strong>
                                                            </span>
                                                        )}
                                                        {req.requested_am_time_out && (
                                                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-mono text-[11px] border border-emerald-200">
                                                                AM Out: {req.original_am_time_out || '--:--'} → <strong>{req.requested_am_time_out}</strong>
                                                            </span>
                                                        )}
                                                        {req.requested_pm_time_in && (
                                                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-mono text-[11px] border border-emerald-200">
                                                                PM In: {req.original_pm_time_in || '--:--'} → <strong>{req.requested_pm_time_in}</strong>
                                                            </span>
                                                        )}
                                                        {req.requested_pm_time_out && (
                                                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-mono text-[11px] border border-emerald-200">
                                                                PM Out: {req.original_pm_time_out || '--:--'} → <strong>{req.requested_pm_time_out}</strong>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Reason */}
                                                    {req.reason && (
                                                        <p className="text-xs text-sub italic bg-field/60 dark:bg-slate-900/40 p-2 rounded-lg border border-border/50 max-w-2xl">
                                                            &ldquo;{req.reason}&rdquo;
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                                <Button
                                                    variant="emerald"
                                                    size="sm"
                                                    disabled={isProcessing}
                                                    onClick={() => handleApprove(req.id)}
                                                    className="font-semibold shadow-xs"
                                                >
                                                    {isProcessing ? 'Saving...' : '✓ Approve'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isProcessing}
                                                    onClick={() => handleDecline(req.id)}
                                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-border"
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Today's Attendance Snapshot (2 cols) */}
                    <div className="lg:col-span-2">
                        <Card className="h-full flex flex-col justify-between">
                            <CardHeader className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
                                <div>
                                    <CardTitle>Today's Attendance Live Monitor</CardTitle>
                                    <p className="text-xs text-sub mt-0.5">
                                        {stats.present_today} Present • {stats.late_today} Late • {Math.max(0, stats.absent_today)} Absent
                                    </p>
                                </div>

                                {/* Filter Tabs & Search */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search staff..."
                                            className="w-36 sm:w-44 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-field/60 focus:bg-panel focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2 top-1.5 text-xs text-sub hover:text-text"
                                                aria-label="Clear search"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 bg-field p-1 rounded-lg border border-border/70">
                                        {[
                                            { key: 'all', label: 'All' },
                                            { key: 'on_time', label: 'On Time' },
                                            { key: 'late', label: 'Late' },
                                            { key: 'absent', label: 'Absent' },
                                        ].map(f => (
                                            <button
                                                key={f.key}
                                                onClick={() => setSnapshotFilter(f.key)}
                                                className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${
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
                                <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
                                    {filteredSnapshot.map(emp => (
                                        <div key={emp.id} className="p-3.5 px-5 flex items-center justify-between gap-3 hover:bg-field/50 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-heading font-semibold text-xs flex-shrink-0">
                                                    {emp.initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-text truncate">{emp.full_name}</p>
                                                    <p className="text-[11px] text-sub truncate">{emp.department}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                <div className="hidden sm:flex items-center gap-2 text-xs font-mono tnum text-sub">
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
                                        <div className="text-center py-10 text-xs text-sub">
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
                            <CardHeader>
                                <CardTitle>Today's Turnout Ratio</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {donutData.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={170}>
                                            <PieChart>
                                                <Pie
                                                    data={donutData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={48}
                                                    outerRadius={75}
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

                                        <div className="space-y-2 mt-3 pt-3 border-t border-border/70">
                                            {donutData.map(d => (
                                                <div key={d.name} className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                                                        <span className="text-sub font-medium">{d.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 tnum">
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
                                    <div className="py-12 text-center text-xs text-sub">
                                        No attendance logged yet today.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* ── Row 2: 6-Month Attendance Performance Trends (Recharts) ── */}
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Attendance Performance Trends</CardTitle>
                            <p className="text-xs text-sub mt-0.5">Monthly attendance rate % and overall turnout over the last 6 operating months</p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {monthly_attendance.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <ComposedChart data={monthly_attendance} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                    <XAxis dataKey="month_short" tick={axisTick} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="rate" domain={[0, 100]} tickFormatter={v => v + '%'} tick={axisTick} tickLine={false} axisLine={false} width={40} />
                                    <YAxis yAxisId="count" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={30} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" />
                                    <Bar yAxisId="count" dataKey="present" name="Present Count" fill="#10B981" radius={[4, 4, 0, 0]} fillOpacity={0.3} stackId="a" />
                                    <Bar yAxisId="count" dataKey="late" name="Late Count" fill="#F59E0B" radius={[0, 0, 0, 0]} fillOpacity={0.4} stackId="a" />
                                    <Area yAxisId="rate" type="monotone" dataKey="rate" name="Turnout Rate (%)" stroke="#4F46E5" strokeWidth={2.5} fill="url(#rateGradient)" dot={{ r: 3, fill: '#4F46E5' }} activeDot={{ r: 5 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="py-12 text-center text-xs text-sub">No monthly data accumulated yet.</div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Row 3: Department Efficiency & Payroll Cost Trends ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Department Attendance with Turnout Bars */}
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle>Department Attendance & Efficiency</CardTitle>
                                <p className="text-xs text-sub mt-0.5">Headcount, monthly turnout volume, and today&apos;s active presence</p>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {department_attendance.length > 0 ? (
                                <div className="space-y-4">
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={department_attendance} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                            <XAxis dataKey="department" tick={axisTick} tickLine={false} axisLine={false} />
                                            <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar dataKey="present" name="Present" fill="#10B981" stackId="a" />
                                            <Bar dataKey="late" name="Late" fill="#F59E0B" stackId="a" />
                                            <Bar dataKey="absent" name="Absent" fill="#F43F5E" radius={[3, 3, 0, 0]} stackId="a" />
                                        </BarChart>
                                    </ResponsiveContainer>

                                    <div className="border border-border/80 rounded-xl overflow-hidden overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-field/70 border-b border-border/80">
                                                    <th className="text-left px-3 py-2 font-semibold text-sub">Department</th>
                                                    <th className="text-center px-2 py-2 font-semibold text-sub">Headcount</th>
                                                    <th className="text-center px-2 py-2 font-semibold text-emerald-600">Today</th>
                                                    <th className="text-left px-3 py-2 font-semibold text-sub">Turnout Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60 tnum">
                                                {department_attendance.map(d => (
                                                    <tr key={d.department} className="hover:bg-field/40">
                                                        <td className="px-3 py-2.5 font-medium text-text truncate max-w-28">{d.department}</td>
                                                        <td className="px-2 py-2.5 text-center text-sub">{d.headcount}</td>
                                                        <td className="px-2 py-2.5 text-center font-semibold text-emerald-600">
                                                            {d.today_present ?? 0} / {d.headcount}
                                                        </td>
                                                        <td className="px-3 py-2.5">
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
                                                                <span className="text-[11px] font-semibold text-text w-9 text-right">
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
                                <div className="py-8 text-center text-xs text-sub">No department data recorded.</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payroll Expenditure Trend */}
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle>Payroll Financial Trend</CardTitle>
                                <p className="text-xs text-sub mt-0.5">Historical gross, deduction, and net pay disbursement volumes</p>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {payroll_trend.length > 0 ? (
                                <div className="space-y-4">
                                    <ResponsiveContainer width="100%" height={180}>
                                        <ComposedChart data={payroll_trend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                            <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
                                            <YAxis tickFormatter={fmtShort} tick={axisTick} tickLine={false} axisLine={false} width={45} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
                                            <Area type="monotone" dataKey="total_gross" name="Gross Pay" fill="#4F46E5" stroke="#4F46E5" fillOpacity={0.1} />
                                            <Line type="monotone" dataKey="total_net" name="Net Pay" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} />
                                            <Line type="monotone" dataKey="total_deductions" name="Deductions" stroke="#F43F5E" strokeWidth={1.5} strokeDasharray="3 3" />
                                        </ComposedChart>
                                    </ResponsiveContainer>

                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Avg Gross', value: fmtShort(payroll_trend.reduce((s, r) => s + r.total_gross, 0) / payroll_trend.length), color: 'text-text' },
                                            { label: 'Avg Deductions', value: fmtShort(payroll_trend.reduce((s, r) => s + r.total_deductions, 0) / payroll_trend.length), color: 'text-rose-600 dark:text-rose-400' },
                                            { label: 'Avg Net Pay', value: fmtShort(payroll_trend.reduce((s, r) => s + r.total_net, 0) / payroll_trend.length), color: 'text-emerald-600 dark:text-emerald-400' },
                                        ].map(s => (
                                            <div key={s.label} className="p-2.5 rounded-lg border border-border/80 bg-field/40 text-center">
                                                <p className="text-[10px] text-sub uppercase font-medium">{s.label}</p>
                                                <p className={`text-sm font-heading font-bold mt-0.5 tnum ${s.color}`}>{s.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {payroll_cost_summary && (
                                        <div className="pt-2 border-t border-border/70">
                                            <p className="text-[11px] font-medium text-sub mb-1.5">Latest Finalized Statutory Deduction Split:</p>
                                            <div className="grid grid-cols-4 gap-1.5 text-center">
                                                <div className="p-2 rounded-lg bg-field/40 border border-border/60">
                                                    <p className="text-[10px] text-sub uppercase font-medium">SSS</p>
                                                    <p className="text-xs font-semibold text-text tnum">₱ {fmt(payroll_cost_summary.sss)}</p>
                                                </div>
                                                <div className="p-2 rounded-lg bg-field/40 border border-border/60">
                                                    <p className="text-[10px] text-sub uppercase font-medium">PhilHealth</p>
                                                    <p className="text-xs font-semibold text-text tnum">₱ {fmt(payroll_cost_summary.philhealth)}</p>
                                                </div>
                                                <div className="p-2 rounded-lg bg-field/40 border border-border/60">
                                                    <p className="text-[10px] text-sub uppercase font-medium">Pag-IBIG</p>
                                                    <p className="text-xs font-semibold text-text tnum">₱ {fmt(payroll_cost_summary.pagibig)}</p>
                                                </div>
                                                <div className="p-2 rounded-lg bg-field/40 border border-border/60">
                                                    <p className="text-[10px] text-sub uppercase font-medium">W-Tax</p>
                                                    <p className="text-xs font-semibold text-text tnum">₱ {fmt(payroll_cost_summary.tax)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20">
                                        <div className="flex items-center justify-between mb-2.5">
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
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                                                Baseline Projections
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mb-2.5">
                                            <div className="p-2.5 rounded-lg bg-panel border border-border/80 text-center">
                                                <p className="text-[10px] text-sub uppercase font-medium">Est. Monthly Payroll</p>
                                                <p className="text-sm font-heading font-bold text-text mt-0.5 tnum">₱ {fmt(payroll_cost_summary?.total_gross ?? 0)}</p>
                                            </div>
                                            <div className="p-2.5 rounded-lg bg-panel border border-border/80 text-center">
                                                <p className="text-[10px] text-sub uppercase font-medium">Avg Staff Daily Rate</p>
                                                <p className="text-sm font-heading font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tnum">₱ {fmt(payroll_cost_summary?.avg_daily_rate ?? 0)}/day</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-medium text-sub mb-1">Monthly Statutory Splits (Projected):</p>
                                            <div className="grid grid-cols-4 gap-1.5 text-center">
                                                <div className="p-1.5 rounded-lg bg-panel border border-border/70">
                                                    <p className="text-[9px] text-sub uppercase">SSS</p>
                                                    <p className="text-[11px] font-semibold text-text tnum">₱ {fmt(payroll_cost_summary?.sss ?? 0)}</p>
                                                </div>
                                                <div className="p-1.5 rounded-lg bg-panel border border-border/70">
                                                    <p className="text-[9px] text-sub uppercase">PhilHealth</p>
                                                    <p className="text-[11px] font-semibold text-text tnum">₱ {fmt(payroll_cost_summary?.philhealth ?? 0)}</p>
                                                </div>
                                                <div className="p-1.5 rounded-lg bg-panel border border-border/70">
                                                    <p className="text-[9px] text-sub uppercase">Pag-IBIG</p>
                                                    <p className="text-[11px] font-semibold text-text tnum">₱ {fmt(payroll_cost_summary?.pagibig ?? 0)}</p>
                                                </div>
                                                <div className="p-1.5 rounded-lg bg-panel border border-border/70">
                                                    <p className="text-[9px] text-sub uppercase">W-Tax</p>
                                                    <p className="text-[11px] font-semibold text-text tnum">₱ {fmt(payroll_cost_summary?.tax ?? 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 pt-1">
                                        <p className="text-[11px] text-sub">No finalized batches yet for this period.</p>
                                        <Link
                                            href={`/admin/payroll/create?cutoff=${active_cutoff.key}&period_from=${active_cutoff.period_from}&period_to=${active_cutoff.period_to}`}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 select-none">
                    <Link
                        href="/admin/payroll"
                        className="p-4 rounded-xl border border-border/80 bg-panel hover:border-indigo-400 hover:shadow-xs transition-all flex items-center gap-3"
                    >
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate">Process Payroll</p>
                            <p className="text-[10px] text-sub">Draft & finalize runs</p>
                        </div>
                    </Link>

                    <Link
                        href="/admin/edit-requests"
                        className="p-4 rounded-xl border border-border/80 bg-panel hover:border-amber-400 hover:shadow-xs transition-all flex items-center justify-between gap-3 relative"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-text truncate">Edit Requests</p>
                                <p className="text-[10px] text-sub">Punch dispute approvals</p>
                            </div>
                        </div>
                        {stats.pending_edits > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                    </Link>

                    <Link
                        href="/admin/employees"
                        className="p-4 rounded-xl border border-border/80 bg-panel hover:border-emerald-400 hover:shadow-xs transition-all flex items-center gap-3"
                    >
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate">Employees</p>
                            <p className="text-[10px] text-sub">Directory & profiles</p>
                        </div>
                    </Link>

                    <Link
                        href="/admin/payroll/analytics"
                        className="p-4 rounded-xl border border-border/80 bg-panel hover:border-purple-400 hover:shadow-xs transition-all flex items-center gap-3"
                    >
                        <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate">Analytics</p>
                            <p className="text-[10px] text-sub">KPI cost breakdowns</p>
                        </div>
                    </Link>
                </div>
            </div>
        </AdminLayout>
    )
}