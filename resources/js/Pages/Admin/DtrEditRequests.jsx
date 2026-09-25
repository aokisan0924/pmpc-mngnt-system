import { useState, useMemo, useEffect } from 'react'
import { router, usePage, usePoll } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'
import AdminPageHeader from '@/Components/AdminPageHeader'

const PUNCH_ROWS = [
    ['AM In', 'am_time_in'],
    ['AM Out', 'am_time_out'],
    ['PM In', 'pm_time_in'],
    ['PM Out', 'pm_time_out'],
]

export default function DtrEditRequests({ requests = [], pendingCount = 0 }) {
    const { flash, auth } = usePage().props
    const canManage = auth?.employee?.can_manage_dtr_requests ?? true
    const [filter, setFilter] = useState('pending')
    const [activeId, setActiveId] = useState(null)
    const [adminNotes, setAdminNotes] = useState({})
    const [processing, setProcessing] = useState(false)

    // Silent real-time background poll every 12s so admin sees incoming edit requests without manual refresh
    usePoll(12000, {
        only: ['requests', 'pendingCount'],
        preserveScroll: true,
        preserveState: true,
    })

    // Instant WebSocket listener if Echo / Pusher is connected
    useEffect(() => {
        if (!window.Echo) return
        const channel = window.Echo.channel('dtr-edit-requests')
        channel.listen('.dtr.edit_requested', () => {
            router.reload({ only: ['requests', 'pendingCount'], preserveScroll: true, preserveState: true })
        })
        return () => {
            window.Echo.leaveChannel('dtr-edit-requests')
        }
    }, [])

    const counts = useMemo(() => ({
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        declined: requests.filter(r => r.status === 'declined').length,
        all: requests.length,
    }), [requests])

    const filtered = useMemo(() => {
        return filter === 'all'
            ? requests
            : requests.filter(r => r.status === filter)
    }, [filter, requests])

    function resolve(id, action) {
        if (!canManage) return
        setProcessing(true)
        router.post(`/admin/edit-requests/${id}/${action}`, { admin_note: adminNotes[id] ?? '' }, {
            onSuccess: () => {
                setActiveId(null)
                setAdminNotes(prev => {
                    const next = { ...prev }
                    delete next[id]
                    return next
                })
                setProcessing(false)
            },
            onError: () => setProcessing(false),
        })
    }

    return (
        <AdminLayout pendingEditCount={pendingCount}>
            <div className="admin-page-shell space-y-4 sm:space-y-5 page-enter">
                {!canManage && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 text-xs font-medium">
                        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <span>Permission Notice: Your account does not have permission to approve or decline DTR edit requests. You are in read-only mode.</span>
                    </div>
                )}
                {flash?.success && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        {flash.success}
                    </div>
                )}

                <AdminPageHeader
                    eyebrow="Attendance review"
                    title="DTR Edit Requests"
                    description="Compare requested punch changes with original records and resolve employee attendance corrections."
                    badge={`${pendingCount} pending review`}
                    action={
                    <div
                        role="group"
                        aria-label="Filter edit requests by status"
                        className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-white/20 bg-white/10 p-1"
                    >
                        {[
                            { key: 'pending', label: 'Pending' },
                            { key: 'approved', label: 'Approved' },
                            { key: 'declined', label: 'Declined' },
                            { key: 'all', label: 'All Requests' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                aria-pressed={filter === tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                                    filter === tab.key
                                            ? 'bg-white text-indigo-950 shadow-2xs font-semibold'
                                            : 'text-indigo-100 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {tab.label} ({counts[tab.key]})
                            </button>
                        ))}
                    </div>
                    }
                />

                {/* ── Requests List ─────────────────────────────────── */}
                <div className="space-y-3">
                    {filtered.map(req => {
                        const isOpen = activeId === req.id
                        const isPending = req.status === 'pending'

                        return (
                            <Card key={req.id} className="overflow-hidden">
                                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-heading font-semibold text-xs flex-shrink-0">
                                            {req.employee_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-heading font-semibold text-sm text-text truncate">
                                                    {req.employee_name}
                                                </p>
                                                <span className="text-xs text-dim font-mono tnum">({req.employee_id})</span>
                                            </div>
                                            <p className="text-xs text-sub mt-0.5">
                                                Date of Attendance:{' '}
                                                <strong className="text-text font-medium">{req.date}</strong>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <Badge variant={req.status} dot size="sm">
                                            {req.status}
                                        </Badge>
                                        <Button
                                            variant={isPending ? 'primary' : 'outline'}
                                            size="sm"
                                            aria-expanded={isOpen}
                                            aria-label={`${isOpen ? 'Close' : isPending ? 'Review Diff for' : 'View Details for'} ${req.employee_name} (${req.date})`}
                                            onClick={() => setActiveId(isOpen ? null : req.id)}
                                        >
                                            {isOpen ? 'Close' : isPending ? 'Review Diff' : 'View Details'}
                                        </Button>
                                    </div>
                                </div>

                                {/* Expanded Diff & Resolution Drawer */}
                                {isOpen && (
                                    <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-border/70 bg-field/30 space-y-4">
                                        {/* Punch Diff Comparison */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Original */}
                                            <div className="p-4 rounded-xl bg-panel border border-border/80">
                                                <p className="text-[11px] font-semibold text-sub uppercase tracking-wider mb-3">
                                                    Original DTR Punches
                                                </p>
                                                <div className="grid grid-cols-2 gap-y-2.5">
                                                    {PUNCH_ROWS.map(([label, key]) => (
                                                        <div key={label}>
                                                            <p className="text-[10px] text-dim">{label}</p>
                                                            <p className="text-xs font-mono font-medium text-sub tnum">
                                                                {req[`original_${key}`] ? req[`original_${key}`].slice(0, 5) : '—:—'}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Requested Corrections */}
                                            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
                                                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-3">
                                                    Requested Corrections
                                                </p>
                                                <div className="grid grid-cols-2 gap-y-2.5">
                                                    {PUNCH_ROWS.map(([label, key]) => {
                                                        const orig = req[`original_${key}`]
                                                        const mod = req[`requested_${key}`]
                                                        const changed = Boolean(mod && mod !== orig)

                                                        return (
                                                            <div key={label}>
                                                                <p className="text-[10px] text-emerald-600/80">{label}</p>
                                                                <p className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 tnum flex items-center gap-1">
                                                                    {mod ? mod.slice(0, 5) : '—:—'}
                                                                    {changed && (
                                                                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-200/60 text-emerald-800">
                                                                            Edited
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Employee Reason */}
                                        <div className="p-3.5 rounded-xl bg-panel border border-border/80 text-xs">
                                            <p className="font-semibold text-text mb-1">Employee Explanation:</p>
                                            <p className="text-sub italic leading-relaxed">
                                                "{req.reason || 'No explanation provided.'}"
                                            </p>
                                        </div>

                                        {/* Admin Action Area (if pending) */}
                                        {isPending ? (
                                            canManage ? (
                                                <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <input
                                                        type="text"
                                                        value={adminNotes[req.id] ?? ''}
                                                        onChange={e => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                                                        placeholder="Add optional supervisor note or reason…"
                                                        aria-label="Supervisor note or reason for decision"
                                                        className="flex-1 px-3 py-2 text-xs border border-border rounded-lg bg-panel text-text placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            loading={processing}
                                                            aria-label={`Decline edit request for ${req.employee_name}`}
                                                            onClick={() => resolve(req.id, 'decline')}
                                                        >
                                                            Decline Request
                                                        </Button>
                                                        <Button
                                                            variant="emerald"
                                                            size="sm"
                                                            loading={processing}
                                                            aria-label={`Approve edit request for ${req.employee_name}`}
                                                            onClick={() => resolve(req.id, 'approve')}
                                                        >
                                                            Approve & Overwrite DTR
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                                                    <span>You do not have permission to approve or decline this request.</span>
                                                    <Badge variant="amber" size="sm">Read-Only</Badge>
                                                </div>
                                            )
                                        ) : req.admin_note && (
                                            <p className="text-xs text-dim italic">
                                                Admin note: "{req.admin_note}"
                                            </p>
                                        )}
                                    </div>
                                )}
                            </Card>
                        )
                    })}

                    {filtered.length === 0 && (
                        <Card>
                            <CardContent className="text-center py-12 text-sub">
                                No DTR edit requests found for this filter.
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
