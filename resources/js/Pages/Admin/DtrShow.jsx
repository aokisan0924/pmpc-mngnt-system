import { router } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

const STATUS_STYLES = {
    on_time:   { bg: 'bg-teal/10',   text: 'text-teal',   label: 'On time'   },
    late:      { bg: 'bg-amber/10',  text: 'text-amber',  label: 'Late'      },
    undertime: { bg: 'bg-blue/10',   text: 'text-blue',   label: 'Undertime' },
    half_day:  { bg: 'bg-purple/10', text: 'text-purple', label: 'Half day'  },
    absent:    { bg: 'bg-red/10',    text: 'text-red',    label: 'Absent'    },
}

const PUNCH_LABELS = {
    am_time_in: 'AM In', am_time_out: 'AM Out',
    pm_time_in: 'PM In', pm_time_out: 'PM Out',
}

export default function DtrShow({ employee, logs, summary, month }) {

    function handleMonthChange(dir) {
        const d = new Date(month + '-02')
        d.setMonth(d.getMonth() + dir)
        router.get(`/admin/dtr/${employee.id}`, {
            month: d.toISOString().slice(0, 7),
        }, { preserveState: true })
    }

    const monthLabel = new Date(month + '-02').toLocaleDateString('en-PH', {
        month: 'long', year: 'numeric',
    })

    return (
        <AdminLayout>
            <div className="min-h-screen bg-bg">
            <div className="p-4 sm:p-6 max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-dim">
                            <a href="/admin/dtr" className="hover:text-text">← DTR records</a>
                            <span>/</span>
                            <span className="text-sub">{employee.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-violet/15 text-violet">
                                {employee.initials}
                            </div>
                            <div>
                                <h1 className="text-base font-medium text-text">{employee.full_name}</h1>
                                <p className="text-xs text-dim">
                                    {employee.employee_id} · {employee.department} · {employee.position}
                                </p>
                            </div>
                        </div>
                    </div>

                    <a href={`/admin/dtr/${employee.id}/print?month=${month}`}
                        target="_blank"
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-teal text-bg hover:brightness-110 transition-all">
                        Print DTR ↓
                    </a>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                    {[
                        { label: 'Days present',   value: summary.days_present,            color: 'text-teal' },
                        { label: 'Days late',      value: summary.days_late,               color: 'text-amber'   },
                        { label: 'Days absent',    value: summary.days_absent,             color: 'text-red'     },
                        { label: 'Half days',      value: summary.half_days,               color: 'text-purple'  },
                        { label: 'Hours rendered', value: `${summary.hours_rendered}h`,    color: 'text-text'    },
                    ].map(s => (
                        <div key={s.label} className="bg-panel rounded-xl border border-border p-3 text-center">
                            <p className={`text-xl font-medium ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-dim mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Month navigator */}
                <div className="flex items-center justify-between mb-3">
                    <button onClick={() => handleMonthChange(-1)}
                        className="text-sm text-sub hover:text-text px-2 py-1">
                        ← Prev
                    </button>
                    <p className="text-sm font-medium text-sub">{monthLabel}</p>
                    <button onClick={() => handleMonthChange(1)}
                        className="text-sm text-sub hover:text-text px-2 py-1">
                        Next →
                    </button>
                </div>

                {/* DTR table */}
                <div className="bg-panel rounded-xl border border-border overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm min-w-[720px]">
                        <thead>
                            <tr className="bg-field border-b border-border">
                                <th className="text-left px-4 py-3 text-xs text-dim font-medium">Date</th>
                                <th className="text-center px-3 py-3 text-xs text-dim font-medium">AM In</th>
                                <th className="text-center px-3 py-3 text-xs text-dim font-medium border-r border-border">AM Out</th>
                                <th className="text-center px-3 py-3 text-xs text-dim font-medium">PM In</th>
                                <th className="text-center px-3 py-3 text-xs text-dim font-medium border-r border-border">PM Out</th>
                                <th className="text-center px-3 py-3 text-xs text-dim font-medium">Hours</th>
                                <th className="text-center px-3 py-3 text-xs text-dim font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => {
                                const style = STATUS_STYLES[log.status] ?? STATUS_STYLES.absent
                                return (
                                    <tr key={log.id}
                                        className={`border-b border-border transition-colors ${
                                            log.is_weekend ? 'bg-hover' : 'hover:bg-hover'
                                        }`}>
                                        <td className="px-4 py-3">
                                            <p className="text-xs text-sub">{log.date_label}</p>
                                            {log.is_weekend && (
                                                <p className="text-xs text-dim">Rest day</p>
                                            )}
                                        </td>
                                        {['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out'].map((slot, i) => (
                                            <td key={slot}
                                                className={`px-3 py-3 text-center text-xs font-medium ${
                                                    i === 1 ? 'border-r border-border' :
                                                    i === 3 ? 'border-r border-border' : ''
                                                }`}>
                                                {log[slot]
                                                    ? <span className="text-text font-mono">{log[slot].slice(0, 5)}</span>
                                                    : <span className="text-dim">—</span>}
                                            </td>
                                        ))}
                                        <td className="px-3 py-3 text-center text-xs text-sub">
                                            {log.hours_rendered ? `${log.hours_rendered}h` : '—'}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                                                {log.has_pending_edit ? 'Pending edit' : style.label}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-dim">
                                        No DTR records for this month.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
        </AdminLayout>
    )
}