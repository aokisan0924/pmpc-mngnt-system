import { useMemo, useRef, useState } from 'react'
import { Link, router, usePoll } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardContent, CardHeader, CardTitle } from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'

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

export default function Dashboard({ stats = {}, active_cutoff = {}, today_snapshot = [], pending_edit_requests = [] }) {
    const [searchQuery, setSearchQuery] = useState('')
    const [processingId, setProcessingId] = useState(null)
    const [declineTarget, setDeclineTarget] = useState(null)
    const [declineReason, setDeclineReason] = useState('')
    const [feedback, setFeedback] = useState(null)
    const processingRef = useRef(false)

    // Silent background poll every 12s for real-time triage updates
    usePoll(12000, {
        only: ['stats', 'pending_edit_requests', 'today_snapshot'],
        preserveScroll: true,
        preserveState: true,
    })

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
        if (processingRef.current) return
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
        if (!declineTarget || processingRef.current) return
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

    return (
        <AdminLayout pendingEditCount={stats.pending_edits ?? 0}>
            <div className="mx-auto max-w-7xl space-y-4 px-3.5 py-3.5 sm:space-y-5 sm:px-5 sm:py-4 lg:px-6">
                <section className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#26215C] to-indigo-950 p-5 text-white shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-200">Admin portal</p>
                        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Operations overview</h1>
                        <p className="mt-1 text-sm text-indigo-100">Review today&apos;s workforce status and resolve priority work.</p>
                    </div>

                    <div className="flex min-w-56 items-center justify-between gap-4 rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">Current payroll cycle</p>
                            <p className="mt-1 text-sm font-bold">{active_cutoff?.label || 'Current cutoff'}</p>
                            <p className="mt-0.5 text-xs text-indigo-200">{active_cutoff?.days_remaining ?? 0} days remaining</p>
                        </div>
                        <Link href={active_cutoff?.status === 'finalized' ? `/admin/payroll/${active_cutoff.payroll_id}` : `/admin/payroll/create?cutoff=${active_cutoff?.key}&period_from=${active_cutoff?.period_from}&period_to=${active_cutoff?.period_to}`}>
                            <Button variant={active_cutoff?.status === 'finalized' ? 'outline' : 'emerald'} size="sm" className="h-9 whitespace-nowrap border-white/25 bg-white/10 px-3 text-xs text-white hover:bg-white/20">
                                {active_cutoff?.status === 'finalized' ? 'View payroll' : active_cutoff?.status === 'draft' ? 'Resume payroll' : 'Process payroll'}
                            </Button>
                        </Link>
                    </div>
                </section>

                <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Operational summary">
                    <StatCard title="Total Workforce" value={stats.total_employees ?? 0} accent="indigo" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20a5 5 0 0 0-10 0m5-5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 5a4 4 0 0 0-4-4m0-1a3 3 0 1 0-1.2-5.75" /></svg>} />
                    <StatCard title="Present Today" value={stats.present_today ?? 0} accent="emerald" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m8 12 2.5 2.5L16 9m5 3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} />
                    <StatCard title="Late Arrivals" value={stats.late_today ?? 0} accent={(stats.late_today ?? 0) > 0 ? 'amber' : 'slate'} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} />
                    <StatCard title="Pending Edits" value={stats.pending_edits ?? 0} accent={(stats.pending_edits ?? 0) > 0 ? 'amber' : 'slate'} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m16.9 3.5 3.6 3.6M4 20l4.2-.8L19.5 7.9a2.6 2.6 0 0 0-3.7-3.7L4.6 15.5 4 20Z" /></svg>} />
                </section>

                {pending_edit_requests.length > 0 && (
                    <Card className="overflow-hidden border-amber-200/80 dark:border-amber-800/60">
                        <CardHeader className="flex-col gap-3 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle>Pending DTR edits</CardTitle>
                                    <Badge variant="amber" size="sm">{pending_edit_requests.length}</Badge>
                                </div>
                                <p className="mt-1 text-xs text-sub">Review the most recent requests here, or open the complete queue.</p>
                            </div>
                            <Link href="/admin/edit-requests" className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-100">Open request queue</Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            {feedback && <div className={`mx-4 mt-4 rounded-xl border px-3 py-2.5 text-xs font-medium ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'}`}>{feedback.message}</div>}
                            <div className="divide-y divide-border/60">
                                {pending_edit_requests.slice(0, 3).map(request => {
                                    const processing = processingId === request.id
                                    return (
                                        <div key={request.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <p className="text-sm font-semibold text-text">{request.employee_name}</p>
                                                    <span className="text-xs text-sub">{request.department}</span>
                                                    <span className="text-xs text-dim">{request.date}</span>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {changeLabels(request).map(([label, original, requested]) => <span key={label} className="rounded-lg border border-border bg-field px-2 py-1 font-mono text-[10px] text-sub">{label}: {original || '--:--'} <span className="text-indigo-600 dark:text-indigo-300">to {requested}</span></span>)}
                                                </div>
                                                {request.reason && <p className="mt-2 max-w-2xl text-xs leading-relaxed text-sub">{request.reason}</p>}
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                <Button variant="emerald" size="sm" disabled={processing} onClick={() => approve(request.id)} className="h-9 px-3 text-xs">{processing ? 'Saving...' : 'Approve'}</Button>
                                                <Button variant="outline" size="sm" disabled={processing} onClick={() => { setDeclineTarget(request); setDeclineReason('') }} className="h-9 border-rose-200 px-3 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30">Decline</Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Today&apos;s attendance</CardTitle>
                            <p className="mt-1 text-xs text-sub">Live staff status for the current workday.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="sr-only" htmlFor="attendance-search">Search attendance</label>
                            <input id="attendance-search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search staff" className="h-9 w-40 rounded-xl border border-border bg-field px-3 text-xs text-text outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15" />
                            <Link href="/admin/dtr" className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-100">View DTR records</Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/60">
                            {filteredSnapshot.slice(0, 8).map(employee => (
                                <div key={employee.id} className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-field/50">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 font-heading text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">{employee.initials}</div>
                                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-text">{employee.full_name}</p><p className="truncate text-xs text-sub">{employee.department}</p></div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-4"><span className="hidden font-mono text-xs text-sub sm:inline">AM In {employee.am_time_in?.slice(0, 5) ?? '--:--'}</span><AttendanceStatus status={employee.status} /></div>
                                </div>
                            ))}
                            {filteredSnapshot.length === 0 && <div className="px-4 py-10 text-center text-sm text-sub">No attendance entries match this search.</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {declineTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="decline-dtr-title">
                    <form onSubmit={event => { event.preventDefault(); decline() }} className="w-full max-w-md rounded-2xl border border-border bg-panel p-5 shadow-xl">
                        <h2 id="decline-dtr-title" className="font-display text-lg font-bold text-text">Decline edit request</h2>
                        <p className="mt-1 text-sm text-sub">Add a brief note for {declineTarget.employee_name}.</p>
                        <label className="mt-4 block text-xs font-semibold text-text" htmlFor="decline-note">Reason</label>
                        <textarea id="decline-note" value={declineReason} onChange={event => setDeclineReason(event.target.value)} required rows={4} className="mt-2 w-full rounded-xl border border-border bg-field p-3 text-sm text-text outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15" placeholder="Explain what needs to be corrected or clarified." />
                        <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDeclineTarget(null)}>Cancel</Button><Button type="submit" variant="danger" loading={processingId === declineTarget.id}>Decline request</Button></div>
                    </form>
                </div>
            )}
        </AdminLayout>
    )
}
