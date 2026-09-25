import { useEffect, useState } from 'react'
import { router, usePage, usePoll } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'
import EmployeePageHeader from '@/Components/EmployeePageHeader'
import DtrEditRequestModal from '@/Components/DtrEditRequestModal'
import Card, { CardContent, CardHeader, CardTitle } from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'

export default function Dtr({ logs = [], today = {}, summary = {}, month, next_punch }) {
    const { flash, errors } = usePage().props
    const [editTarget, setEditTarget] = useState(null)
    const [loading, setLoading] = useState(false)

    // Silent background poll every 15s so employee sees edit approval/status changes and punch updates live
    usePoll(15000, {
        only: ['logs', 'summary', 'today', 'next_punch'],
        preserveScroll: true,
        preserveState: true,
    })

    useEffect(() => {
        const stop = router.on('start', (event) => {
            const visit = event?.detail?.visit
            if (visit?.poll || (Array.isArray(visit?.only) && visit.only.length > 0) || visit?.showProgress === false) {
                return
            }
            setLoading(true)
        })
        const finish = router.on('finish', () => setLoading(false))
        const cancel = router.on('cancel', () => setLoading(false))
        const error = router.on('error', () => setLoading(false))
        return () => { stop(); finish(); cancel(); error() }
    }, [])


    function handleMonthChange(dir) {
        if (loading) return
        const d = new Date(month + '-01')
        d.setMonth(d.getMonth() + dir)
        const newMonth = d.toISOString().slice(0, 7)
        router.get('/employee/dtr', { month: newMonth }, { preserveState: true, preserveScroll: true })
    }

    const nextLabel = next_punch ? {
        am_time_in: 'AM In',
        am_time_out: 'AM Out',
        pm_time_in: 'PM In',
        pm_time_out: 'PM Out',
    }[next_punch] : null

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
            <div className="employee-page-shell space-y-5">

                {flash?.success && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#0F6E56]/10 border border-[#0F6E56]/25 text-[#0F6E56] dark:text-emerald-400 text-xs font-semibold">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}

                {errors?.punch && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-400" role="alert">
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3Z" />
                        </svg>
                        <span>{errors.punch}</span>
                    </div>
                )}

                <EmployeePageHeader
                    eyebrow="Attendance Archive"
                    title="Daily Time Record"
                    description="Review historical monthly attendance logs, audit verified time stamps, and export official DTR vouchers."
                    badge={nextLabel ? `Next: ${nextLabel}` : 'Shift Logged'}
                    action={<a
                        href={`/employee/dtr/print?month=${month}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-extrabold text-[#0F6E56] shadow-md transition-all hover:bg-emerald-50 active:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
                    >
                        <svg className="w-4 h-4 text-[#0F6E56]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Print Official DTR</span>
                    </a>}
                />

                {/* Monthly Summary Stats */}
                <div className="attendance-metrics grid grid-cols-1 gap-px overflow-hidden bg-border sm:grid-cols-3 sm:rounded-xl">
                    <StatCard
                        title="Days Present"
                        value={summary.days_present ?? 0}
                        subtitle="This month"
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
                        subtitle="Recorded tardiness"
                        accent="amber"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Rendered Hours"
                        value={`${Number(summary.hours_rendered ?? 0).toFixed(1)}h`}
                        subtitle="Cumulative total"
                        accent="emerald"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        }
                    />
                </div>

                {/* Monthly DTR Log Card */}
                <Card className="employee-workspace-card overflow-hidden">
                    <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center border-b border-border/60 px-4 py-3 sm:px-6">
                        <div className="min-w-0">
                            <CardTitle>Monthly Attendance Log</CardTitle>
                            <p className="text-xs text-sub mt-0.5">Chronological record of verified daily punches and hours rendered</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 p-1 bg-field rounded-xl border border-border">
                            <button
                                type="button"
                                onClick={() => handleMonthChange(-1)}
                                disabled={loading}
                                className="p-1.5 rounded-lg text-sub hover:text-text hover:bg-panel transition-all disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                                title="Previous Month"
                                aria-label="View previous month"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="min-w-28 px-3 py-1 text-center font-heading text-xs font-bold text-text">
                                {new Date(month + '-01').toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleMonthChange(1)}
                                disabled={loading}
                                className="p-1.5 rounded-lg text-sub hover:text-text hover:bg-panel transition-all disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
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
