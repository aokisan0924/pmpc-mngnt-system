import { useMemo, useRef, useState, useEffect } from 'react'
import { Link, router, usePage, usePoll } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardContent, CardHeader, CardTitle } from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'
import pmpcLogo from '@images/pmpc_ems.png'

const PUNCH_SLOTS = [
    { key: 'am_time_in', label: 'AM In', period: 'Morning', targetTime: '08:00' },
    { key: 'am_time_out', label: 'AM Out', period: 'Lunch Break', targetTime: '12:00' },
    { key: 'pm_time_in', label: 'PM In', period: 'Afternoon', targetTime: '13:00' },
    { key: 'pm_time_out', label: 'PM Out', period: 'End of Shift', targetTime: '17:00' },
]

function formatPunchTime(timeString) {
    if (!timeString) return '--:--'
    const parts = timeString.split(':')
    if (parts.length < 2) return timeString
    const h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${String(h12).padStart(2, '0')}:${m} ${ampm}`
}

function changeLabels(request) {
    return [
        ['AM In', request.original_am_time_in, request.requested_am_time_in],
        ['AM Out', request.original_am_time_out, request.requested_am_time_out],
        ['PM In', request.original_pm_time_in, request.requested_pm_time_in],
        ['PM Out', request.original_pm_time_out, request.requested_pm_time_out],
    ].filter(([, , requested]) => Boolean(requested))
}

function AttendanceStatus({ status }) {
    return <Badge variant={status ?? 'slate'} size="sm">{(status ?? 'No record').replace('_', ' ')}</Badge>
}

function LiveClock() {
    const [time, setTime] = useState(() => new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const formatOptions = { timeZone: 'Asia/Manila' }
    const timeStr = time.toLocaleTimeString('en-PH', { ...formatOptions, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const dateStr = time.toLocaleDateString('en-PH', { ...formatOptions, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

    return (
        <div
            aria-live="off"
            className="relative z-10 flex items-center gap-3 bg-[#17123F]/90 px-4 py-2.5 rounded-xl border border-white/20 w-fit self-start md:self-auto shrink-0 shadow-xs backdrop-blur-xs"
        >
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-300 animate-pulse" aria-hidden="true" />
            <div>
                <p className="font-heading font-bold text-lg sm:text-xl tracking-tight text-white tnum leading-none">
                    {timeStr}
                </p>
                <p className="text-[11px] font-medium text-indigo-200/80 mt-1 leading-none">{dateStr}</p>
            </div>
        </div>
    )
}

export default function Dashboard({
    stats = {},
    active_cutoff = {},
    today_snapshot = [],
    pending_edit_requests = [],
    admin_dtr = null,
    schedule = {},
}) {
    const { auth } = usePage().props
    const canManageRequests = auth?.employee?.can_manage_dtr_requests ?? true
    const canViewRequests = auth?.employee?.can_view_dtr_requests ?? true

    const [searchQuery, setSearchQuery] = useState('')
    const [processingId, setProcessingId] = useState(null)
    const [declineTarget, setDeclineTarget] = useState(null)
    const [declineReason, setDeclineReason] = useState('')
    const [feedback, setFeedback] = useState(null)
    const [punching, setPunching] = useState(false)
    const [punchFeedback, setPunchFeedback] = useState(null)
    const processingRef = useRef(false)

    // Silent background poll every 12s for real-time triage and attendance updates
    usePoll(12000, {
        only: ['stats', 'pending_edit_requests', 'today_snapshot', 'admin_dtr'],
        preserveScroll: true,
        preserveState: true,
    })

    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    // Determine current next expected punch index for administrator
    const completedPunches = PUNCH_SLOTS.filter(s => Boolean(admin_dtr?.[s.key])).length
    const nextPunchIndex = completedPunches < 4 ? completedPunches : -1
    const nextSlot = nextPunchIndex !== -1 ? PUNCH_SLOTS[nextPunchIndex] : null
    const nextScheduledTime = nextSlot ? schedule?.[nextSlot.key] : null

    function handleAdminPunch() {
        if (punching || nextPunchIndex === -1 || !nextSlot) return
        const slotLabel = nextSlot.label
        const punchTime = new Date().toLocaleTimeString('en-PH', {
            timeZone: 'Asia/Manila',
            hour: '2-digit',
            minute: '2-digit',
        })
        setPunching(true)
        setPunchFeedback(null)

        router.post('/admin/dtr/punch', {}, {
            preserveScroll: true,
            onSuccess: () => {
                setPunchFeedback({
                    type: 'success',
                    message: `Recorded ${slotLabel} successfully at ${punchTime}.`,
                })
                setTimeout(() => setPunchFeedback(null), 5000)
            },
            onError: (err) => {
                setPunchFeedback({
                    type: 'error',
                    message: err?.punch || 'Punch recording failed. Please try again.',
                })
                setTimeout(() => setPunchFeedback(null), 6000)
            },
            onFinish: () => {
                setPunching(false)
            },
        })
    }

    const filteredSnapshot = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) return today_snapshot

        return today_snapshot.filter(employee => (
            employee.full_name?.toLowerCase().includes(query)
            || employee.department?.toLowerCase().includes(query)
        ))
    }, [searchQuery, today_snapshot])

    function finishRequest(message, type = 'success') {
        setFeedback({ message, type })
        window.setTimeout(() => setFeedback(null), 4000)
    }

    function approve(requestId) {
        if (!canManageRequests || processingRef.current) return
        processingRef.current = true
        setProcessingId(requestId)

        router.post(`/admin/edit-requests/${requestId}/approve`, {}, {
            preserveScroll: true,
            onSuccess: () => finishRequest('DTR edit request approved.'),
            onError: errors => finishRequest(errors?.error || 'Unable to approve this request.', 'error'),
            onFinish: () => {
                processingRef.current = false
                setProcessingId(null)
            },
        })
    }

    function decline() {
        if (!canManageRequests || !declineTarget || processingRef.current) return
        processingRef.current = true
        setProcessingId(declineTarget.id)

        router.post(`/admin/edit-requests/${declineTarget.id}/decline`, { admin_note: declineReason }, {
            preserveScroll: true,
            onSuccess: () => {
                setDeclineTarget(null)
                setDeclineReason('')
                finishRequest('DTR edit request declined.')
            },
            onError: errors => finishRequest(errors?.error || 'Unable to decline this request.', 'error'),
            onFinish: () => {
                processingRef.current = false
                setProcessingId(null)
            },
        })
    }

    const payrollUrl = active_cutoff?.status === 'finalized'
        ? `/admin/payroll/${active_cutoff.payroll_id}`
        : `/admin/payroll/create?cutoff=${active_cutoff?.key ?? ''}&period_from=${active_cutoff?.period_from ?? ''}&period_to=${active_cutoff?.period_to ?? ''}`

    const payrollActionLabel = active_cutoff?.status === 'finalized'
        ? 'View Finalized Payroll'
        : active_cutoff?.status === 'draft'
            ? 'Resume Draft Payroll'
            : 'Process Cutoff Payroll'

    return (
        <AdminLayout pendingEditCount={stats.pending_edits ?? 0}>
            <div className="admin-page-shell space-y-6">
                {/* ── Operational Command Workstation ────────────── */}
                <section
                    className="relative overflow-hidden rounded-2xl bg-[#26215C] text-white border border-[#201B4D] p-5 sm:p-6 select-none shadow-lg transition-colors"
                    style={{
                        backgroundImage: 'radial-gradient(ellipse 90% 70% at 20% 20%, rgba(64, 56, 120, 0.45), transparent 75%), radial-gradient(ellipse 70% 60% at 85% 85%, rgba(19, 16, 47, 0.65), transparent)'
                    }}
                >
                    {/* Background swiss-grid & watermark emblem */}
                    <div className="absolute inset-0 opacity-[0.08] swiss-grid pointer-events-none" aria-hidden="true" />
                    <div
                        className="absolute right-[-10%] sm:right-[-4%] top-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] pointer-events-none select-none opacity-[0.08] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_80%)]"
                        aria-hidden="true"
                    >
                        <img
                            src={pmpcLogo}
                            alt=""
                            className="w-full h-full object-contain filter grayscale brightness-200 contrast-125"
                            onError={(e) => {
                                if (e.currentTarget.src !== window.location.origin + '/pmpc_ems.png') {
                                    e.currentTarget.src = '/pmpc_ems.png'
                                }
                            }}
                        />
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20 backdrop-blur-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                                    <span>Current Cycle: <strong className="text-white">{active_cutoff?.label || 'Active Cutoff'}</strong></span>
                                    <span className="text-indigo-200">• {active_cutoff?.days_remaining ?? 0} {active_cutoff?.days_remaining === 1 ? 'day' : 'days'} left</span>
                                </span>
                                {canViewRequests && stats.pending_edits > 0 && (
                                    <Link href="/admin/edit-requests">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 hover:bg-amber-400/30 transition-colors">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                            <span>{stats.pending_edits} pending DTR edit{stats.pending_edits === 1 ? '' : 's'}</span>
                                        </span>
                                    </Link>
                                )}
                            </div>
                            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-300 mb-1">
                                {greeting} · Command Workstation
                            </p>
                            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white tracking-tight">
                                Operations overview
                            </h1>
                            <p className="mt-1 text-xs sm:text-sm text-indigo-100/85 max-w-2xl">
                                Real-time workforce attendance tracking, exception resolution, and payroll finalization console.
                            </p>
                        </div>

                        {/* Manila Precision Live Clock */}
                        <LiveClock />
                    </div>

                    {/* Tactical Command Deck */}
                    <div className="relative z-10 mt-5 pt-1 space-y-3.5">
                        {/* ── Administrator Personal DTR & Quick Punch Station ── */}
                        <div className="rounded-xl bg-[#17123F]/90 border border-white/20 p-4 sm:p-5 backdrop-blur-xs shadow-md">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="min-w-0 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-300">
                                            Administrator Attendance · DTR Punch Station
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            nextSlot
                                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                                : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${nextSlot ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                                            {nextSlot ? `Ready for ${nextSlot.label}` : 'All 4 Punches Complete'}
                                        </span>
                                        {(admin_dtr?.hours_rendered ?? 0) > 0 && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white/90 border border-white/15">
                                                {admin_dtr.hours_rendered} hrs rendered
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="font-heading text-lg sm:text-xl font-bold text-white tracking-tight">
                                        {nextSlot ? `Next required action: Punch ${nextSlot.label}` : 'Daily attendance complete for today'}
                                    </h2>
                                    <p className="text-xs text-indigo-100/80">
                                        {nextSlot
                                            ? `Step ${completedPunches + 1} of 4 · Shift ${schedule?.am_time_in || '08:00'}–${schedule?.pm_time_out || '17:00'} (Asia/Manila standard time)`
                                            : 'Daily attendance milestones secured. Shift logged.'}
                                    </p>

                                    {/* 4 Punch Timeline Strip */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                        {PUNCH_SLOTS.map((slot, idx) => {
                                            const punchValue = admin_dtr?.[slot.key]
                                            const isRecorded = Boolean(punchValue)
                                            const isCurrentNext = nextPunchIndex === idx

                                            return (
                                                <div
                                                    key={slot.key}
                                                    className={`flex flex-col p-2.5 rounded-lg border text-xs transition-colors ${
                                                        isRecorded
                                                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                                                            : isCurrentNext
                                                                ? 'bg-indigo-900/60 border-indigo-400/60 text-white ring-1 ring-indigo-400/50'
                                                                : 'bg-white/5 border-white/10 text-indigo-200/60'
                                                    }`}
                                                >
                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                                                        {slot.label}
                                                    </span>
                                                    <span className="font-mono text-sm font-bold mt-0.5 text-white">
                                                        {isRecorded ? formatPunchTime(punchValue) : '--:--'}
                                                    </span>
                                                    <span className="text-[9px] text-indigo-200/70 mt-0.5 truncate">
                                                        {isRecorded
                                                            ? 'Recorded'
                                                            : isCurrentNext
                                                                ? 'Next Required'
                                                                : `Target ${slot.targetTime}`}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Tactile Punch Controller */}
                                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t border-white/10 lg:border-t-0">
                                    {nextSlot ? (
                                        <button
                                            type="button"
                                            onClick={handleAdminPunch}
                                            disabled={punching}
                                            aria-label={punching ? 'Recording punch...' : `Punch ${nextSlot.label}`}
                                            className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold text-[#26215C] bg-white hover:bg-indigo-50 active:bg-indigo-100 disabled:opacity-50 disabled:pointer-events-none transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white shadow-lg cursor-pointer whitespace-nowrap"
                                        >
                                            {punching ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-[#26215C]" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    <span>Recording...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4 text-[#26215C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Punch {nextSlot.label}</span>
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-emerald-200 bg-emerald-950/60 border border-emerald-400/40">
                                            <svg className="w-4 h-4 text-emerald-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                            <span>All Punches Completed</span>
                                        </div>
                                    )}

                                    <Link
                                        href="/employee/dtr"
                                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <span>View Full Attendance Sheet</span>
                                        <span aria-hidden="true">→</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Punch Feedback Alert */}
                            {punchFeedback && (
                                <div
                                    aria-live="polite"
                                    className={`mt-3 flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border ${
                                        punchFeedback.type === 'success'
                                            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                                            : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${punchFeedback.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                    <span>{punchFeedback.message}</span>
                                </div>
                            )}
                        </div>

                        {/* ── Payroll Cycle Control ── */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-xl bg-[#17123F]/85 border border-white/15 p-4 sm:p-5 backdrop-blur-xs shadow-xs">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-300">
                                        Payroll Cycle Control
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        active_cutoff?.status === 'finalized'
                                            ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                                            : active_cutoff?.status === 'draft'
                                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                                : 'bg-white/10 text-white/90 border border-white/15'
                                    }`}>
                                        {active_cutoff?.status === 'finalized' ? 'Batch Finalized' : active_cutoff?.status === 'draft' ? 'Draft In Progress' : 'Pending Batch'}
                                    </span>
                                </div>
                                <h2 className="mt-1 font-heading text-lg sm:text-xl font-bold text-white tracking-tight">
                                    {active_cutoff?.status === 'finalized'
                                        ? 'Payroll batch finalized for this period'
                                        : active_cutoff?.status === 'draft'
                                            ? 'Draft payroll calculations awaiting review'
                                            : 'Ready to compute and finalize cutoff compensation'}
                                </h2>
                                <p className="mt-0.5 text-xs text-indigo-100/80">
                                    Period: {active_cutoff?.period_from ?? '—'} to {active_cutoff?.period_to ?? '—'} · Asia/Manila Labor Standards
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                <Link href={payrollUrl}>
                                    <button
                                        type="button"
                                        className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[#26215C] bg-white hover:bg-indigo-50 active:bg-indigo-100 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white shadow-md cursor-pointer whitespace-nowrap"
                                    >
                                        <svg className="w-4 h-4 text-[#26215C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                        </svg>
                                        <span>{payrollActionLabel}</span>
                                    </button>
                                </Link>

                                {canViewRequests && (
                                    <Link href="/admin/edit-requests">
                                        <button
                                            type="button"
                                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
                                        >
                                            <svg className="w-3.5 h-3.5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                            </svg>
                                            <span>Edit Queue</span>
                                            {stats.pending_edits > 0 && (
                                                <span className="px-1.5 py-0.25 rounded-full text-[10px] font-bold bg-amber-400 text-[#26215C]">
                                                    {stats.pending_edits}
                                                </span>
                                            )}
                                        </button>
                                    </Link>
                                )}

                                <Link href="/admin/employees">
                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
                                    >
                                        <svg className="w-3.5 h-3.5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                        </svg>
                                        <span>Employees</span>
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Operational Telemetry Metrics ─────────────── */}
                <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Operational summary">
                    <StatCard
                        title="Total Workforce"
                        value={stats.total_employees ?? 0}
                        accent="indigo"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20a5 5 0 0 0-10 0m5-5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 5a4 4 0 0 0-4-4m0-1a3 3 0 1 0-1.2-5.75" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Present Today"
                        value={stats.present_today ?? 0}
                        accent="emerald"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m8 12 2.5 2.5L16 9m5 3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Late Arrivals"
                        value={stats.late_today ?? 0}
                        accent={(stats.late_today ?? 0) > 0 ? 'amber' : 'slate'}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Pending Edits"
                        value={stats.pending_edits ?? 0}
                        accent={(stats.pending_edits ?? 0) > 0 ? 'amber' : 'slate'}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m16.9 3.5 3.6 3.6M4 20l4.2-.8L19.5 7.9a2.6 2.6 0 0 0-3.7-3.7L4.6 15.5 4 20Z" />
                            </svg>
                        }
                    />
                </section>

                {/* ── Pending DTR Edit Requests ─────────────────── */}
                {canViewRequests && pending_edit_requests.length > 0 && (
                    <Card className="admin-workspace-card overflow-hidden">
                        <CardHeader className="flex-col gap-3 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle>Pending DTR edit requests</CardTitle>
                                    <Badge variant="amber" size="sm">{pending_edit_requests.length}</Badge>
                                </div>
                                <p className="mt-1 text-xs text-sub">Review employee attendance punch adjustment submissions requiring administrative sign-off.</p>
                            </div>
                            <Link href="/admin/edit-requests" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200">
                                Open full request queue →
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            {feedback && (
                                <div
                                    aria-live="polite"
                                    className={`mx-4 mt-4 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                                        feedback.type === 'success'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                    }`}
                                >
                                    {feedback.message}
                                </div>
                            )}
                            <div className="divide-y divide-border/60">
                                {pending_edit_requests.slice(0, 3).map(request => {
                                    const processing = processingId === request.id
                                    return (
                                        <div key={request.id} className="flex flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between hover:bg-field/40 transition-colors">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                                    <p className="text-sm font-semibold text-text">{request.employee_name}</p>
                                                    <span className="text-xs text-sub">• {request.department}</span>
                                                    <span className="text-xs text-dim">• {request.date}</span>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {changeLabels(request).map(([label, original, requested]) => (
                                                        <span key={label} className="inline-flex items-center gap-1 rounded-lg border border-border bg-field px-2.5 py-1 font-mono text-[11px] text-sub">
                                                            <strong className="text-text font-semibold">{label}:</strong> {original || '--:--'} <span className="text-indigo-600 dark:text-indigo-400 font-bold">→ {requested}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                                {request.reason && <p className="mt-2 max-w-2xl text-xs leading-relaxed text-sub italic">&ldquo;{request.reason}&rdquo;</p>}
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                {canManageRequests ? (
                                                    <>
                                                        <Button
                                                            variant="emerald"
                                                            size="sm"
                                                            disabled={processing}
                                                            onClick={() => approve(request.id)}
                                                            className="h-9 px-3.5 text-xs font-bold"
                                                        >
                                                            {processing ? 'Saving...' : 'Approve'}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={processing}
                                                            onClick={() => { setDeclineTarget(request); setDeclineReason('') }}
                                                            className="h-9 border-rose-200 px-3.5 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                                                        >
                                                            Decline
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                                        Read-Only
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Today's Attendance Roster ─────────────────── */}
                <Card className="admin-workspace-card overflow-hidden">
                    <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70">
                        <div>
                            <CardTitle>Today&apos;s workforce attendance</CardTitle>
                            <p className="mt-1 text-xs text-sub">Real-time attendance punch logs and status indicators for the current shift.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="sr-only" htmlFor="attendance-search">Search attendance</label>
                            <div className="relative">
                                <input
                                    id="attendance-search"
                                    value={searchQuery}
                                    onChange={event => setSearchQuery(event.target.value)}
                                    placeholder="Search staff or dept..."
                                    className="h-9 w-44 sm:w-56 rounded-xl border border-border bg-field px-3 text-xs text-text outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                                />
                            </div>
                            <Link href="/admin/dtr" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 whitespace-nowrap">
                                View all records →
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/60">
                            {filteredSnapshot.slice(0, 8).map(employee => (
                                <div key={employee.id} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 transition-colors hover:bg-field/50">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-200/80 bg-indigo-50 font-heading text-xs font-bold text-indigo-700 dark:border-indigo-800/80 dark:bg-indigo-950/50 dark:text-indigo-300">
                                            {employee.initials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-text">{employee.full_name}</p>
                                            <p className="truncate text-xs text-sub">{employee.department}</p>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-4">
                                        <span className="hidden font-mono text-xs text-sub sm:inline">
                                            AM In: {employee.am_time_in ? formatPunchTime(employee.am_time_in) : '--:--'}
                                        </span>
                                        <AttendanceStatus status={employee.status} />
                                    </div>
                                </div>
                            ))}
                            {filteredSnapshot.length === 0 && (
                                <div className="px-4 py-12 text-center text-sm text-sub">
                                    No workforce attendance records match &ldquo;{searchQuery}&rdquo;.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Decline Edit Request Modal Dialog ───────────── */}
            {declineTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="decline-dtr-title"
                >
                    <form
                        onSubmit={event => { event.preventDefault(); decline() }}
                        className="w-full max-w-md rounded-2xl border border-border bg-panel p-5 sm:p-6 shadow-xl"
                    >
                        <h2 id="decline-dtr-title" className="font-heading text-lg font-bold text-text">
                            Decline DTR Edit Request
                        </h2>
                        <p className="mt-1 text-xs sm:text-sm text-sub">
                            Provide a reason to notify <strong className="text-text">{declineTarget.employee_name}</strong> why this adjustment cannot be processed.
                        </p>
                        <label className="mt-4 block text-xs font-semibold text-text" htmlFor="decline-note">
                            Reason for decline <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            id="decline-note"
                            value={declineReason}
                            onChange={event => setDeclineReason(event.target.value)}
                            required
                            rows={4}
                            className="mt-2 w-full rounded-xl border border-border bg-field p-3 text-xs sm:text-sm text-text outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                            placeholder="Explain the discrepancy or requirement..."
                        />
                        <div className="mt-5 flex justify-end gap-2.5">
                            <Button type="button" variant="outline" onClick={() => setDeclineTarget(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="danger" loading={processingId === declineTarget.id}>
                                Decline Request
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </AdminLayout>
    )
}

