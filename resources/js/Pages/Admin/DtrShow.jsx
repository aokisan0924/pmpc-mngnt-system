import { router, Link } from '@inertiajs/react'
import { useMemo } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'

const STATUS_STYLES = {
    on_time:   { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', label: 'On time' },
    late:      { bg: 'bg-amber-500/10 border-amber-500/20',   text: 'text-amber-600 dark:text-amber-400',     label: 'Late' },
    undertime: { bg: 'bg-sky-500/10 border-sky-500/20',       text: 'text-sky-600 dark:text-sky-400',         label: 'Undertime' },
    half_day:  { bg: 'bg-indigo-500/10 border-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', label: 'Half day' },
    absent:    { bg: 'bg-rose-500/10 border-rose-500/20',     text: 'text-rose-600 dark:text-rose-400',       label: 'Absent' },
}

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
            <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 page-enter">
                {/* ── Top Header ────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-xs text-sub">
                            <Link href="/admin/dtr" className="hover:text-text flex items-center gap-1 font-medium transition-colors">
                                ← Back to DTR Ledger
                            </Link>
                            <span>/</span>
                            <span className="text-text font-semibold">{employee.full_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-heading font-bold text-sm shadow-xs flex-shrink-0">
                                {employee.initials}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="font-heading font-bold text-xl sm:text-2xl text-text tracking-tight">
                                        {employee.full_name}
                                    </h1>
                                    <Badge variant="indigo">{employee.position}</Badge>
                                </div>
                                <p className="text-xs text-sub mt-0.5 font-mono">
                                    {employee.employee_id} • {employee.department}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                        {/* Month Navigator */}
                        <div className="flex items-center gap-2 bg-panel p-1 rounded-xl border border-border/80 shadow-xs">
                            <button
                                type="button"
                                onClick={() => handleMonthChange(-1)}
                                className="p-1.5 rounded-lg text-sub hover:text-text hover:bg-field transition-colors"
                                title="Previous Month"
                                aria-label="View previous month"
                            >
                                ←
                            </button>
                            <span className="text-xs font-semibold px-2 text-text font-heading">{monthLabel}</span>
                            <button
                                type="button"
                                onClick={() => handleMonthChange(1)}
                                className="p-1.5 rounded-lg text-sub hover:text-text hover:bg-field transition-colors"
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
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                        >
                            <span>Print DTR</span>
                            <span aria-hidden="true">↓</span>
                        </a>
                    </div>
                </div>

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
                                    {logs.map(log => {
                                        const style = STATUS_STYLES[log.status] ?? STATUS_STYLES.absent
                                        return (
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
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                                            Pending Edit
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style.bg} ${style.text}`}>
                                                            {style.label}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
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