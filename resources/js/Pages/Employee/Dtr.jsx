import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'
import DtrEditRequestModal from '@/Components/DtrEditRequestModal'

const STATUS_STYLES = {
    on_time:  { bg: 'bg-emerald-50',  text: 'text-emerald-700',  label: 'On time'   },
    late:     { bg: 'bg-amber-50',    text: 'text-amber-700',    label: 'Late'      },
    undertime:{ bg: 'bg-blue-50',     text: 'text-blue-700',     label: 'Undertime' },
    half_day: { bg: 'bg-purple-50',   text: 'text-purple-700',   label: 'Half day'  },
    absent:   { bg: 'bg-red-50',      text: 'text-red-700',      label: 'Absent'    },
}

const PUNCH_LABELS = {
    am_time_in:  'AM In',
    am_time_out: 'AM Out',
    pm_time_in:  'PM In',
    pm_time_out: 'PM Out',
}

export default function Dtr({ logs, today, summary, month, next_punch }) {
    const { flash } = usePage().props
    const [editTarget, setEditTarget] = useState(null)
    const [punching, setPunching]     = useState(false)

    function handlePunch() {
        setPunching(true)
        router.post('/employee/dtr/punch', {}, {
            onFinish: () => setPunching(false),
        })
    }

    function handleMonthChange(dir) {
        const d = new Date(month + '-01')
        d.setMonth(d.getMonth() + dir)
        const newMonth = d.toISOString().slice(0, 7)
        router.get('/employee/dtr', { month: newMonth }, { preserveState: true })
    }

    const nextLabel = next_punch ? PUNCH_LABELS[next_punch] : null

    return (
        <EmployeeLayout>
            <div className="p-6 max-w-5xl mx-auto">

                {/* Flash */}
                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-lg font-medium text-gray-900">Daily time record</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Track your daily attendance</p>
                    </div>

                    {/* Clock button */}
                    {nextLabel && (
                        <button
                            onClick={handlePunch}
                            disabled={punching}
                            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition-opacity"
                            style={{ background: '#0F6E56' }}>
                            {punching ? 'Recording…' : `Clock ${nextLabel}`}
                        </button>
                    )}
                    {!nextLabel && (
                        <span className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-500">
                            All punches complete
                        </span>
                    )}
                </div>

                {/* Today's punches */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                        Today — {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                        {['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out'].map((slot) => (
                            <div key={slot} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <p className="text-xs text-gray-400 mb-1">{PUNCH_LABELS[slot]}</p>
                                <p className={`text-sm font-medium ${today[slot] ? 'text-gray-800' : 'text-gray-300'}`}>
                                    {today[slot]
                                        ? today[slot].slice(0, 5)
                                        : '—'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                    {[
                        { label: 'Days present',   value: summary.days_present },
                        { label: 'Days late',       value: summary.days_late },
                        { label: 'Hours rendered',  value: `${summary.hours_rendered}h` },
                        { label: 'Pending edits',   value: summary.pending_edits },
                    ].map((s) => (
                        <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3">
                            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                            <p className="text-xl font-medium text-gray-800">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Month navigator */}
                <div className="flex items-center justify-between mb-3">
                    <button onClick={() => handleMonthChange(-1)}
                        className="text-sm text-gray-500 hover:text-gray-800 px-2 py-1">
                        ← Prev
                    </button>
                    <p className="text-sm font-medium text-gray-700">
                        {new Date(month + '-01').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                    </p>
                    <button onClick={() => handleMonthChange(1)}
                        className="text-sm text-gray-500 hover:text-gray-800 px-2 py-1">
                        Next →
                    </button>
                </div>

                {/* DTR log table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Date</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium border-r border-gray-100">AM In</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium border-r border-gray-100">AM Out</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium border-r border-gray-100">PM In</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium border-r border-gray-100">PM Out</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">Hours</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">Status</th>
                                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => {
                                const style = STATUS_STYLES[log.status] ?? STATUS_STYLES.absent
                                return (
                                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-600 text-xs">{log.date_label}</td>
                                        {['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out'].map((slot, i) => (
                                            <td key={slot}
                                                className={`px-3 py-3 text-center text-xs font-medium ${i === 1 ? 'border-r border-gray-100' : ''}`}>
                                                {log[slot]
                                                    ? <span className="text-gray-800">{log[slot].slice(0, 5)}</span>
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
                                        <td className="px-3 py-3 text-center">
                                            {!log.has_pending_edit && (
                                                <button
                                                    onClick={() => setEditTarget(log)}
                                                    className="text-xs hover:underline"
                                                    style={{ color: '#0F6E56' }}>
                                                    Request edit
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                                        No DTR records for this month.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit request modal */}
            {editTarget && (
                <DtrEditRequestModal
                    log={editTarget}
                    onClose={() => setEditTarget(null)}
                />
            )}
        </EmployeeLayout>
    )
}