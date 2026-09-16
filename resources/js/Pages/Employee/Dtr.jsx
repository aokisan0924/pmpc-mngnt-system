import { useEffect, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'
import DtrEditRequestModal from '@/Components/DtrEditRequestModal'
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'

const PUNCH_LABELS = {
    am_time_in:  'AM In',
    am_time_out: 'AM Out',
    pm_time_in:  'PM In',
    pm_time_out: 'PM Out',
}
const SLOT_ORDER = ['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out']

export default function Dtr({ logs = [], today = {}, summary = {}, month, next_punch }) {
    const { flash } = usePage().props
    const [editTarget, setEditTarget] = useState(null)
    const [punching, setPunching]     = useState(false)
    const [now, setNow] = useState(new Date())
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

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
        router.get('/employee/dtr', { month: newMonth }, { preserveState: true })
    }

    const nextLabel = next_punch ? PUNCH_LABELS[next_punch] : null
    const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    function getStatusBadge(log) {
        if (log.has_pending_edit) {
            return <Badge variant="purple" size="sm">Pending Edit</Badge>
        }
        switch (log.status) {
            case 'on_time':
                return <Badge variant="emerald" size="sm">On Time</Badge>
            case 'late':
                return <Badge variant="amber" size="sm">Late</Badge>
            case 'undertime':
                return <Badge variant="indigo" size="sm">Undertime</Badge>
            case 'half_day':
                return <Badge variant="purple" size="sm">Half Day</Badge>
            case 'absent':
                return <Badge variant="rose" size="sm">Absent</Badge>
            default:
                return <Badge variant="slate" size="sm">{log.status || '—'}</Badge>
        }
    }

    return (
        <EmployeeLayout title="Daily Time Record">
            <div className="mx-auto min-h-screen max-w-6xl space-y-6 bg-bg px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">

                {flash?.success && (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold font-display text-text tracking-tight">Daily Time Record</h1>
                            <Badge variant="emerald" size="sm">Attendance Portal</Badge>
                        </div>
                        <p className="text-sm text-sub mt-1">
                            Punch attendance timestamps, inspect monthly hour totals, and file corrections
                        </p>
                    </div>

                    <a
                        href={`/employee/dtr/print?month=${month}`}
                        target="_blank"
                        className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-border bg-panel px-4 py-2 text-xs font-semibold text-text shadow-2xs transition-all hover:border-emerald-500/30 hover:bg-hover"
                    >
                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Print Official DTR</span>
                    </a>
                </div>

                {/* Hero Punch Stepper Card */}
                <Card className="relative overflow-hidden p-5 sm:p-6">
                    <div className="flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between sm:pb-6">
                        <div>
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                                {now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-text">
                                {timeStr}
                            </p>
                        </div>

                        <div>
                            {nextLabel ? (
                                <button
                                    onClick={handlePunch}
                                    disabled={punching}
                                    className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                                    <span>{punching ? 'Recording Punch...' : `Clock In: ${nextLabel}`}</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>All 4 Punches Completed Today</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stepper Progress */}
                    <div className="pt-5 sm:pt-6">
                        <div className="relative grid grid-cols-4 gap-2 sm:gap-4">
                            {SLOT_ORDER.map((slot, i) => {
                                const done = Boolean(today[slot])
                                const isNext = slot === next_punch

                                return (
                                    <div key={slot} className="flex flex-col items-center text-center">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-mono text-xs font-bold transition-all ${
                                            done
                                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                                : isNext
                                                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-4 ring-amber-500/20 animate-pulse'
                                                    : 'bg-field border-border text-dim'
                                        }`}>
                                            {done ? (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <span>0{i + 1}</span>
                                            )}
                                        </div>
                                        <p className={`text-xs font-semibold mt-2 ${done ? 'text-text' : isNext ? 'text-amber-600 dark:text-amber-400' : 'text-dim'}`}>
                                            {PUNCH_LABELS[slot]}
                                        </p>
                                        <p className="text-[11px] font-mono mt-0.5 text-sub">
                                            {done ? today[slot].slice(0, 5) : isNext ? 'Pending' : '—'}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </Card>

                {/* Monthly Summary Stats */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                    <StatCard
                        title="Days Present"
                        value={summary.days_present ?? 0}
                        subtitle="Verified attendance logs"
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
                        subtitle="Beyond shift grace period"
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
                        subtitle="Cumulative working hours"
                        accent="indigo"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Pending Edits"
                        value={summary.pending_edits ?? 0}
                        subtitle="Awaiting admin review"
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
                            <CardDescription>
                                Itemized chronological punches and calculated rendered hours
                            </CardDescription>
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
                                <tr className="bg-field/70 border-b border-border text-dim uppercase tracking-wider font-semibold">
                                    <th className="text-left px-6 py-3.5">Calendar Date</th>
                                    <th className="text-center px-3 py-3.5">AM In</th>
                                    <th className="text-center px-3 py-3.5 border-r border-border">AM Out</th>
                                    <th className="text-center px-3 py-3.5">PM In</th>
                                    <th className="text-center px-3 py-3.5 border-r border-border">PM Out</th>
                                    <th className="text-center px-4 py-3.5">Rendered</th>
                                    <th className="text-center px-4 py-3.5">Status</th>
                                    <th className="text-right px-6 py-3.5">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 font-mono">
                                {logs?.map((log) => (
                                    <tr key={log.id} className="hover:bg-hover/60 transition-colors">
                                        <td className="px-6 py-3.5 font-sans font-medium text-text whitespace-nowrap">
                                            {log.date_label}
                                        </td>
                                        <td className="px-3 py-3.5 text-center text-text font-semibold">
                                            {log.am_time_in ? log.am_time_in.slice(0, 5) : <span className="text-dim font-normal">—</span>}
                                        </td>
                                        <td className="px-3 py-3.5 text-center text-text font-semibold border-r border-border/60">
                                            {log.am_time_out ? log.am_time_out.slice(0, 5) : <span className="text-dim font-normal">—</span>}
                                        </td>
                                        <td className="px-3 py-3.5 text-center text-text font-semibold">
                                            {log.pm_time_in ? log.pm_time_in.slice(0, 5) : <span className="text-dim font-normal">—</span>}
                                        </td>
                                        <td className="px-3 py-3.5 text-center text-text font-semibold border-r border-border/60">
                                            {log.pm_time_out ? log.pm_time_out.slice(0, 5) : <span className="text-dim font-normal">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-center text-sub font-semibold">
                                            {log.hours_rendered ? `${log.hours_rendered}h` : <span className="text-dim font-normal">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-center font-sans">
                                            {getStatusBadge(log)}
                                        </td>
                                        <td className="px-6 py-3.5 text-right font-sans">
                                            {!log.has_pending_edit && (
                                                log.edit_window_open ? (
                                                    <button
                                                        onClick={() => setEditTarget(log)}
                                                        className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-2xs transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                                                    >
                                                        Request Edit
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex h-8 cursor-not-allowed items-center rounded-lg border border-border bg-field px-3 text-xs text-dim" title="Edits permitted only within 7 days of occurrence">
                                                        Locked
                                                    </span>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {(!logs || logs.length === 0) && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-dim font-sans">
                                            No daily time record entries found for this month.
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
                                <div className="grid grid-cols-4 gap-2 text-center bg-panel p-2.5 rounded-lg border border-border/60 font-mono text-xs">
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
                                            onClick={() => setEditTarget(log)}
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
