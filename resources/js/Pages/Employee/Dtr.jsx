import { useEffect, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'
import DtrEditRequestModal from '@/Components/DtrEditRequestModal'
import Card, { CardContent, CardHeader, CardTitle } from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'

const PUNCH_LABELS = {
    am_time_in:  'AM In',
    am_time_out: 'AM Out',
    pm_time_in:  'PM In',
    pm_time_out: 'PM Out',
}
const SLOT_ORDER = ['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out']

function DtrLiveClock() {
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    const formatOptions = { timeZone: 'Asia/Manila' }
    const timeStr = now.toLocaleTimeString('en-PH', { ...formatOptions, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const dateStr = now.toLocaleDateString('en-PH', { ...formatOptions, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

    return (
        <div>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
                {dateStr}
            </p>
            <p className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-text tnum" aria-live="off">
                {timeStr}
            </p>
        </div>
    )
}

export default function Dtr({ logs = [], today = {}, summary = {}, month, next_punch, weeklyStrip = [] }) {
    const { flash, errors } = usePage().props
    const [editTarget, setEditTarget] = useState(null)
    const [punching, setPunching]     = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const stop = router.on('start', () => setLoading(true))
        const finish = router.on('finish', () => setLoading(false))
        return () => { stop(); finish() }
    }, [])

    function handlePunch() {
        setPunching(true)
        router.post('/employee/dtr/punch', {}, {
            onFinish: () => setPunching(false),
        })
    }

    function handleMonthChange(dir) {
        if (loading) return
        const d = new Date(month + '-01')
        d.setMonth(d.getMonth() + dir)
        const newMonth = d.toISOString().slice(0, 7)
        router.get('/employee/dtr', { month: newMonth }, { preserveState: true, preserveScroll: true })
    }

    const nextLabel = next_punch ? PUNCH_LABELS[next_punch] : null

    function getStatusBadge(log) {
        if (log.has_pending_edit) {
            return <Badge variant="amber" size="sm">Pending Edit</Badge>
        }
        switch (log.status) {
            case 'in_progress':
                return <Badge variant="amber" dot pulse size="sm">In Progress</Badge>
            case 'on_time':
                return <Badge variant="emerald" size="sm">On Time</Badge>
            case 'late':
                return <Badge variant="amber" size="sm">Late</Badge>
            case 'undertime':
                return <Badge variant="amber" size="sm">Undertime</Badge>
            case 'half_day':
                return <Badge variant="amber" size="sm">Half Day</Badge>
            case 'absent':
                return <Badge variant="rose" size="sm">Absent</Badge>
            default:
                return <Badge variant="slate" size="sm">{log.status || '—'}</Badge>
        }
    }

    return (
        <EmployeeLayout title="Daily Time Record">
            <div className="mx-auto max-w-6xl space-y-3.5 sm:space-y-4 bg-bg px-3.5 sm:px-5 lg:px-6 py-3.5 sm:py-4">

                {flash?.success && (
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}

                {errors?.punch && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-400" role="alert">
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3Z" />
                        </svg>
                        <span>{errors.punch}</span>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold font-display text-text tracking-tight">Daily Time Record</h1>
                    </div>

                    <a
                        href={`/employee/dtr/print?month=${month}`}
                        target="_blank"
                        className="inline-flex min-h-8 w-fit items-center gap-2 rounded-xl border border-border bg-panel px-3.5 py-1.5 text-xs font-semibold text-text shadow-2xs transition-all hover:border-emerald-500/30 hover:bg-hover"
                    >
                        <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Print Official DTR</span>
                    </a>
                </div>

                {/* Hero Punch Stepper Card */}
                <Card className="relative overflow-hidden p-3.5 sm:p-4">
                    <div className="flex flex-col gap-3.5 border-b border-border pb-3.5 sm:flex-row sm:items-center sm:justify-between sm:pb-4">
                        <DtrLiveClock />

                        <div>
                            {nextLabel ? (
                                <button
                                    type="button"
                                    onClick={handlePunch}
                                    disabled={punching}
                                    aria-label={punching ? 'Recording punch...' : `Record ${nextLabel}`}
                                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    <div className="w-2 h-2 rounded-full bg-white animate-ping" aria-hidden="true" />
                                    <span>{punching ? 'Recording Punch...' : `Record ${nextLabel}`}</span>
                                </button>
                            ) : (
                                <Badge variant="emerald" dot size="sm">Day Complete</Badge>
                            )}
                        </div>
                    </div>

                    {/* Stepper Progress */}
                    <div className="pt-3.5 sm:pt-4">
                        <div className="relative grid grid-cols-4 gap-2 sm:gap-3">
                            {SLOT_ORDER.map((slot, i) => {
                                const done = Boolean(today[slot])
                                const isNext = slot === next_punch

                                return (
                                    <div key={slot} className="flex flex-col items-center text-center">
                                        <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center border font-mono text-xs font-bold transition-all ${
                                            done
                                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                                : isNext
                                                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-3 ring-amber-500/20 animate-pulse'
                                                    : 'bg-field border-border text-dim'
                                        }`}>
                                            {done ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <span>0{i + 1}</span>
                                            )}
                                        </div>
                                        <p className={`text-[11px] font-semibold mt-1.5 ${done ? 'text-text' : isNext ? 'text-amber-600 dark:text-amber-400' : 'text-dim'}`}>
                                            {PUNCH_LABELS[slot]}
                                        </p>
                                        <p className="text-[10px] font-mono mt-0.5 text-sub">
                                            {done ? today[slot].slice(0, 5) : isNext ? 'Pending' : '—'}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* ── 5-Day Weekly Attendance Strip (Mon-Fri Sanity Check) ── */}
                    {weeklyStrip && weeklyStrip.length > 0 && (
                        <div className="pt-5 mt-5 border-t border-border">
                            <p className="text-xs font-semibold text-text mb-3">This Week's Attendance</p>

                            <div className="grid grid-cols-5 gap-2 sm:gap-3">
                                {weeklyStrip.map((day) => {
                                    const isComplete = day.punches_count === 4
                                    const isPartial = day.punches_count > 0 && day.punches_count < 4
                                    const isAbsent = day.is_past && day.punches_count === 0

                                    return (
                                        <div
                                            key={day.date}
                                            className={`p-2.5 sm:p-3 rounded-xl border transition-all text-center flex flex-col justify-between select-none ${
                                                day.is_today
                                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-500/80 shadow-xs ring-1.5 ring-emerald-500/30'
                                                    : day.is_future
                                                    ? 'bg-field/20 border-border/40 opacity-70'
                                                    : isComplete
                                                    ? 'bg-panel border-emerald-300 dark:border-emerald-800/60'
                                                    : isPartial
                                                    ? 'bg-panel border-amber-300 dark:border-amber-800/60'
                                                    : 'bg-field/30 border-border/60'
                                            }`}
                                        >
                                            {/* Day Header */}
                                            <div className="flex items-center justify-between text-[10px] leading-tight mb-1">
                                                <span className={`font-bold uppercase tracking-wider ${
                                                    day.is_today ? 'text-emerald-700 dark:text-emerald-300' : 'text-sub'
                                                }`}>
                                                    {day.day_name}
                                                </span>
                                                {day.is_today ? (
                                                    <span className="px-1.5 py-0.25 rounded text-[8px] font-extrabold bg-emerald-500 text-white leading-none">
                                                        TODAY
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-dim">{day.day_number}</span>
                                                )}
                                            </div>

                                            {/* Status Badge / Punch Count */}
                                            <div className="py-1 sm:py-1.5">
                                                {day.is_future ? (
                                                    <span className="text-[10px] text-dim font-medium">Scheduled</span>
                                                ) : isComplete ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                            4/4
                                                        </span>
                                                        <span className="text-[9px] text-sub font-mono">{day.hours_rendered}h</span>
                                                    </div>
                                                ) : isPartial ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            {day.punches_count}/4
                                                        </span>
                                                        <span className="text-[9px] text-amber-700 dark:text-amber-300 font-medium">
                                                            {day.is_today ? 'In progress' : 'Incomplete'}
                                                        </span>
                                                    </div>
                                                ) : isAbsent ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                                                            0/4
                                                        </span>
                                                        <span className="text-[9px] text-dim">Absent / Off</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-sub">--</span>
                                                )}
                                            </div>

                                            {/* Punch Time snippet */}
                                            <div className="hidden">
                                                {day.am_time_in ? (
                                                    <span>In: {day.am_time_in.slice(0, 5)}</span>
                                                ) : day.is_future ? (
                                                    <span>—</span>
                                                ) : (
                                                    <span>No log</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </Card>

                {/* Monthly Summary Stats */}
                <div className="grid gap-3 sm:grid-cols-3 lg:gap-4">
                    <StatCard
                        title="Days Present"
                        value={summary.days_present ?? 0}

                        accent="emerald"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Late Days"
                        value={summary.days_late ?? 0}

                        accent="amber"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Rendered Hours"
                        value={`${summary.hours_rendered ?? 0}h`}

                        accent="emerald"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Pending Edits"
                        className="hidden"
                        value={summary.pending_edits ?? 0}

                        accent="indigo"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        }
                    />
                </div>

                {/* Monthly DTR Log Card */}
                <Card className="overflow-hidden">
                    <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                            <CardTitle>Monthly Attendance Log</CardTitle>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                onClick={() => handleMonthChange(-1)}
                                disabled={loading}
                                className="rounded-lg border border-border bg-panel p-2 text-sub transition-all hover:bg-hover hover:text-text disabled:opacity-40"
                                title="Previous Month"
                                aria-label="View previous month"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="min-w-24 rounded-lg border border-border bg-field px-3 py-2 text-center font-mono text-xs font-semibold text-text">
                                {new Date(month + '-01').toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}
                            </span>
                            <button
                                onClick={() => handleMonthChange(1)}
                                disabled={loading}
                                className="rounded-lg border border-border bg-panel p-2 text-sub transition-all hover:bg-hover hover:text-text disabled:opacity-40"
                                title="Next Month"
                                aria-label="View next month"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                    {/* Desktop Table */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-field/70 border-b border-border text-dim uppercase tracking-wider font-semibold text-[10px]">
                                    <th scope="col" className="text-left px-4 py-2.5">Date</th>
                                    <th scope="col" className="text-center px-2.5 py-2.5">AM In</th>
                                    <th scope="col" className="text-center px-2.5 py-2.5 border-r border-border">AM Out</th>
                                    <th scope="col" className="text-center px-2.5 py-2.5">PM In</th>
                                    <th scope="col" className="text-center px-2.5 py-2.5 border-r border-border">PM Out</th>
                                    <th scope="col" className="text-center px-3 py-2.5">Rendered</th>
                                    <th scope="col" className="text-center px-3 py-2.5">Status</th>
                                    <th scope="col" className="text-right px-4 py-2.5">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 font-mono">
                                {logs?.map((log) => (
                                    <tr key={log.id} className="hover:bg-hover/60 transition-colors">
                                        <td className="px-4 py-2 sm:py-2.5 font-sans font-medium text-text whitespace-nowrap">
                                            {log.date_label}
                                        </td>
                                        <td className="px-2.5 py-2 sm:py-2.5 text-center text-text font-semibold">
                                            {log.am_time_in ? log.am_time_in.slice(0, 5) : <span className="text-dim font-normal">—</span>}
                                        </td>
                                        <td className="px-2.5 py-2 sm:py-2.5 text-center text-text font-semibold border-r border-border/60">
                                            {log.am_time_out ? log.am_time_out.slice(0, 5) : <span className="text-dim font-normal">—</span>}
                                        </td>
                                        <td className="px-2.5 py-2 sm:py-2.5 text-center text-text font-semibold">
                                            {log.pm_time_in ? log.pm_time_in.slice(0, 5) : <span className="text-dim font-normal">—</span>}
                                        </td>
                                        <td className="px-2.5 py-2 sm:py-2.5 text-center text-text font-semibold border-r border-border/60">
                                            {log.pm_time_out ? log.pm_time_out.slice(0, 5) : <span className="text-dim font-normal">—</span>}
                                        </td>
                                        <td className="px-3 py-2 sm:py-2.5 text-center text-sub font-semibold">
                                            {log.hours_rendered ? `${log.hours_rendered}h` : <span className="text-dim font-normal">—</span>}
                                        </td>
                                        <td className="px-3 py-2 sm:py-2.5 text-center font-sans">
                                            {getStatusBadge(log)}
                                        </td>
                                        <td className="px-4 py-2 sm:py-2.5 text-right font-sans">
                                            {!log.has_pending_edit && (
                                                log.edit_window_open ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditTarget(log)}
                                                        aria-label={`Request edit for ${log.date_label}`}
                                                        className="inline-flex h-7 items-center justify-center whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 shadow-2xs transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                                                    >
                                                        <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m16.86 3.49 3.65 3.65M4 20l4.25-.85L19.49 7.91a2.58 2.58 0 0 0-3.65-3.65L4.6 15.5 4 20Z" />
                                                        </svg>
                                                        Edit
                                                    </button>
                                                ) : (
                                                    <span className="text-[11px] text-dim" title="Edits permitted only within 7 days of occurrence">
                                                        Unavailable
                                                    </span>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {(!logs || logs.length === 0) && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-dim font-sans">
                                            No records for this month.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card List */}
                    <div className="space-y-3 p-4 md:hidden">
                        {logs?.map((log) => (
                            <div key={log.id} className="p-4 rounded-xl border border-border bg-field/60 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-text">{log.date_label}</p>
                                    {getStatusBadge(log)}
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-panel p-2.5 font-mono text-xs">
                                    <div>
                                        <span className="text-[10px] text-dim block">AM In</span>
                                        <strong className="text-text">{log.am_time_in ? log.am_time_in.slice(0, 5) : '—'}</strong>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-dim block">AM Out</span>
                                        <strong className="text-text">{log.am_time_out ? log.am_time_out.slice(0, 5) : '—'}</strong>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-dim block">PM In</span>
                                        <strong className="text-text">{log.pm_time_in ? log.pm_time_in.slice(0, 5) : '—'}</strong>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-dim block">PM Out</span>
                                        <strong className="text-text">{log.pm_time_out ? log.pm_time_out.slice(0, 5) : '—'}</strong>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-xs pt-1">
                                    <span className="text-sub font-mono font-medium">
                                        {log.hours_rendered ? `${log.hours_rendered}h rendered` : 'No hours'}
                                    </span>
                                    {!log.has_pending_edit && log.edit_window_open && (
                                        <button
                                            type="button"
                                            onClick={() => setEditTarget(log)}
                                            aria-label={`Request edit for ${log.date_label}`}
                                            className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 font-semibold text-emerald-700 shadow-2xs transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                                        >
                                            Request Edit
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    </CardContent>
                </Card>

            </div>

            {editTarget && (
                <DtrEditRequestModal
                    log={editTarget}
                    onClose={() => setEditTarget(null)}
                />
            )}
        </EmployeeLayout>
    )
}
