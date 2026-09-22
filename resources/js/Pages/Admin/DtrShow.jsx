import { router, Link } from '@inertiajs/react'
import { useMemo } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import AdminPageHeader from '@/Components/AdminPageHeader'


export default function DtrShow({ employee, logs = [], summary = {}, month }) {
    function handleMonthChange(dir) {
        const d = new Date(month + '-02')
        d.setMonth(d.getMonth() + dir)
        router.get(`/admin/dtr/${employee.id}`, {
            month: d.toISOString().slice(0, 7),
        }, { preserveState: true })
    }

    const monthLabel = useMemo(() => new Date(month + '-02').toLocaleDateString('en-PH', {
        month: 'long',
        year: 'numeric',
    }), [month])

    return (
        <AdminLayout>
            <div className="admin-page-shell max-w-6xl space-y-4 sm:space-y-5 page-enter">
                {/* ── Top Header ────────────────────────────────────── */}
                <AdminPageHeader
                    eyebrow="Individual attendance ledger"
                    title={employee.full_name}
                    description={`${employee.employee_id} · ${employee.department} · ${employee.position}`}
                    badge={monthLabel}
                    leading={<div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 font-heading text-sm font-bold text-white">{employee.initials}</div>}
                    meta={<Link href="/admin/dtr" className="font-medium text-indigo-100 hover:text-white">← Back to DTR Ledger</Link>}
                    action={
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Month Navigator */}
                        <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 p-1 shadow-xs">
                            <button
                                type="button"
                                onClick={() => handleMonthChange(-1)}
                                className="rounded-lg p-1.5 text-indigo-100 transition-colors hover:bg-white/10 hover:text-white"
                                title="Previous Month"
                                aria-label="View previous month"
                            >
                                ←
                            </button>
                            <span className="px-2 font-heading text-xs font-semibold text-white">{monthLabel}</span>
                            <button
                                type="button"
                                onClick={() => handleMonthChange(1)}
                                className="rounded-lg p-1.5 text-indigo-100 transition-colors hover:bg-white/10 hover:text-white"
                                title="Next Month"
                                aria-label="View next month"
                            >
                                →
                            </button>
                        </div>

                        <a
                            href={`/admin/dtr/${employee.id}/print?month=${month}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Print DTR PDF for ${employee.full_name}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white px-4 py-2 text-xs font-semibold text-indigo-950 shadow-xs transition-colors hover:bg-indigo-50 sm:text-sm"
                        >
                            <span>Print DTR</span>
                            <span aria-hidden="true">↓</span>
                        </a>
                    </div>
                    }
                />

                {/* ── Summary Stats ──────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Days Present',   value: summary.days_present ?? 0,         color: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'Days Late',      value: summary.days_late ?? 0,            color: (summary.days_late > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-sub') },
                        { label: 'Days Absent',    value: summary.days_absent ?? 0,          color: (summary.days_absent > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-sub') },
                        { label: 'Half Days',      value: summary.half_days ?? 0,            color: (summary.half_days > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-sub') },
                        { label: 'Hours Rendered', value: `${summary.hours_rendered ?? 0}h`, color: 'text-text' },
                    ].map(s => (
                        <Card key={s.label}>
                            <CardContent className="p-3.5 text-center">
                                <p className={`text-2xl font-bold font-heading tnum ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-sub mt-1 font-medium">{s.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* ── DTR Log Table ─────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Time Record — {monthLabel}</CardTitle>
                        <span className="text-xs text-sub">{logs.length} days in period</span>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[720px]">
                                <thead>
                                    <tr className="bg-field/70 border-b border-border/80 text-sub uppercase text-[11px]">
                                        <th scope="col" className="text-left px-5 py-3 font-semibold">Date</th>
                                        <th scope="col" className="text-center px-3 py-3 font-semibold">AM In</th>
                                        <th scope="col" className="text-center px-3 py-3 font-semibold border-r border-border/80">AM Out</th>
                                        <th scope="col" className="text-center px-3 py-3 font-semibold">PM In</th>
                                        <th scope="col" className="text-center px-3 py-3 font-semibold border-r border-border/80">PM Out</th>
                                        <th scope="col" className="text-center px-3 py-3 font-semibold">Hours</th>
                                        <th scope="col" className="text-center px-4 py-3 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 tnum">
                                    {logs.map(log => (
                                        <tr
                                                key={log.id}
                                                className={`transition-colors ${
                                                    log.is_weekend ? 'bg-field/20' : 'hover:bg-field/40'
                                                }`}
                                            >
                                                <td className="px-5 py-3.5">
                                                    <p className="font-semibold text-text">{log.date_label}</p>
                                                    {log.is_weekend && (
                                                        <p className="text-[11px] text-dim font-medium">Rest day</p>
                                                    )}
                                                </td>
                                                {['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out'].map((slot, i) => (
                                                    <td
                                                        key={slot}
                                                        className={`px-3 py-3.5 text-center font-mono ${
                                                            i === 1 || i === 3 ? 'border-r border-border/80' : ''
                                                        }`}
                                                    >
                                                        {log[slot] ? (
                                                            <span className="text-text font-medium">{log[slot].slice(0, 5)}</span>
                                                        ) : (
                                                            <span className="text-dim">—</span>
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="px-3 py-3.5 text-center font-semibold text-text">
                                                    {log.hours_rendered ? `${log.hours_rendered}h` : '—'}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    {log.has_pending_edit ? (
                                                        <Badge variant="amber" size="sm" dot>
                                                            Pending Edit
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant={log.status ?? 'absent'} size="sm">
                                                            {(log.status ?? 'absent').replace('_', ' ')}
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                    {logs.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-12 text-center text-sub">
                                                No DTR records for this month.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    )
}
