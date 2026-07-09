import { router, usePage } from '@inertiajs/react'
import { useState } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'

const STATUS_COLORS = {
    on_time:   'text-emerald-700',
    late:      'text-amber-600',
    undertime: 'text-blue-600',
    half_day:  'text-purple-600',
    absent:    'text-red-600',
}

export default function Dtr({ employees, dtrSummary, month, employeeId }) {
    const [selectedEmployee, setSelectedEmployee] = useState(employeeId ?? '')

    function applyFilter() {
        router.get('/admin/dtr', {
            month,
            employee_id: selectedEmployee || undefined,
        }, { preserveState: true })
    }

    function handleMonthChange(dir) {
        const d = new Date(month + '-02')
        d.setMonth(d.getMonth() + dir)
        const newMonth = d.toISOString().slice(0, 7)
        router.get('/admin/dtr', {
            month: newMonth,
            employee_id: selectedEmployee || undefined,
        }, { preserveState: true })
    }

    const monthLabel = new Date(month + '-02').toLocaleDateString('en-PH', {
        month: 'long', year: 'numeric',
    })

    return (
        <AdminLayout>
            <div className="p-6 max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-lg font-medium text-gray-900">DTR records</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Monthly attendance summary for all employees
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
                    <div className="flex items-end gap-3 flex-wrap">
                        {/* Month */}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Month</label>
                            <input type="month" defaultValue={month}
                                onChange={e => router.get('/admin/dtr', {
                                    month: e.target.value,
                                    employee_id: selectedEmployee || undefined,
                                })}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                        </div>

                        {/* Employee filter */}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Employee</label>
                            <select value={selectedEmployee}
                                onChange={e => setSelectedEmployee(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 bg-white min-w-48">
                                <option value="">All employees</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>
                                        {e.full_name} ({e.employee_id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button onClick={applyFilter}
                            className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                            style={{ background: '#26215C' }}>
                            Apply filter
                        </button>
                    </div>
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

                {/* Summary table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Employee</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Present</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Late</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Absent</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Half day</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Hours</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {dtrSummary.map(emp => (
                                <tr key={emp.id}
                                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                                                style={{ background: '#26215C' }}>
                                                {emp.initials}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{emp.full_name}</p>
                                                <p className="text-xs text-gray-400">{emp.employee_id} · {emp.department}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-sm font-medium text-emerald-700">{emp.days_present}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-sm font-medium ${emp.days_late > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                            {emp.days_late}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-sm font-medium ${emp.days_absent > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                            {emp.days_absent}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-sm font-medium ${emp.half_days > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                                            {emp.half_days}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-sm text-gray-600">{emp.hours_rendered}h</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <a href={`/admin/dtr/${emp.id}?month=${month}`}
                                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                                                View
                                            </a>
                                            <a href={`/admin/dtr/${emp.id}/print?month=${month}`}
                                                target="_blank"
                                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                                                Print ↓
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {dtrSummary.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                                        No DTR records found for this period.
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