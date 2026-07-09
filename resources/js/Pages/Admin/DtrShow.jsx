import { router } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

const STATUS_STYLES = {
    on_time:   { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'On time'   },
    late:      { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Late'      },
    undertime: { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Undertime' },
    half_day:  { bg: 'bg-purple-50',  text: 'text-purple-700',  label: 'Half day'  },
    absent:    { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Absent'    },
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
            <div className="p-6 max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
                            <a href="/admin/dtr" className="hover:text-gray-600">← DTR records</a>
                            <span>/</span>
                            <span className="text-gray-600">{employee.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                                style={{ background: '#26215C' }}>
                                {employee.initials}
                            </div>
                            <div>
                                <h1 className="text-base font-medium text-gray-900">{employee.full_name}</h1>
                                <p className="text-xs text-gray-400">
                                    {employee.employee_id} · {employee.department} · {employee.position}
                                </p>
                            </div>
                        </div>
                    </div>

                    <a href={`/admin/dtr/${employee.id}/print?month=${month}`}
                        target="_blank"
                        className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                        style={{ background: '#0F6E56' }}>
                        Print DTR ↓
                    </a>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-5 gap-3 mb-5">
                    {[
                        { label: 'Days present',   value: summary.days_present,            color: 'text-emerald-700' },
                        { label: 'Days late',      value: summary.days_late,               color: 'text-amber-600'   },
                        { label: 'Days absent',    value: summary.days_absent,             color: 'text-red-600'     },
                        { label: 'Half days',      value: summary.half_days,               color: 'text-purple-600'  },
                        { label: 'Hours rendered', value: `${summary.hours_rendered}h`,    color: 'text-gray-800'    },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                            <p className={`text-xl font-medium ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Month navigator */}
                <div className="flex items-center justify-between mb-3">
                    <button onClick={() => handleMonthChange(-1)}
                        className="text-sm text-gray-500 hover:text-gray-800 px-2 py-1">
                        ← Prev
                    </button>
                    <p className="text-sm font-medium text-gray-700">{monthLabel}</p>
                    <button onClick={() => handleMonthChange(1)}
                        className="text-sm text-gray-500 hover:text-gray-800 px-2 py-1">
                        Next →
                    </button>
                </div>

                {/* DTR table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Date</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">AM In</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium border-r border-gray-100">AM Out</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">PM In</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium border-r border-gray-100">PM Out</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">Hours</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => {
                                const style = STATUS_STYLES[log.status] ?? STATUS_STYLES.absent
                                return (
                                    <tr key={log.id}
                                        className={`border-b border-gray-50 transition-colors ${
                                            log.is_weekend ? 'bg-gray-50/60' : 'hover:bg-gray-50'
                                        }`}>
                                        <td className="px-4 py-3">
                                            <p className="text-xs text-gray-700">{log.date_label}</p>
                                            {log.is_weekend && (
                                                <p className="text-xs text-gray-400">Rest day</p>
                                            )}
                                        </td>
                                        {['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out'].map((slot, i) => (
                                            <td key={slot}
                                                className={`px-3 py-3 text-center text-xs font-medium ${
                                                    i === 1 ? 'border-r border-gray-100' :
                                                    i === 3 ? 'border-r border-gray-100' : ''
                                                }`}>
                                                {log[slot]
                                                    ? <span className="text-gray-800 font-mono">{log[slot].slice(0, 5)}</span>
                                                    : <span className="text-gray-300">—</span>}
                                            </td>
                                        ))}
                                        <td className="px-3 py-3 text-center text-xs text-gray-600">
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
                                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                                        No DTR records for this month.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    )
}