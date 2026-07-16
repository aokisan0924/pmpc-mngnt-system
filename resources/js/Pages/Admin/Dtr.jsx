import { router, usePage } from '@inertiajs/react'
import { useState } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'

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
            <div className="min-h-screen bg-bg">
                <div className="p-4 sm:p-6 max-w-7xl mx-auto">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-lg font-medium text-text">DTR records</h1>
                            <p className="text-sm text-sub mt-0.5">
                                Monthly attendance summary for all employees
                            </p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-panel rounded-xl border border-border p-4 mb-5">
                        <div className="flex items-end gap-3 flex-wrap">
                            {/* Month */}
                            <div>
                                <label className="block text-xs text-sub mb-1">Month</label>
                                <input type="month" defaultValue={month}
                                    onChange={e => router.get('/admin/dtr', {
                                        month: e.target.value,
                                        employee_id: selectedEmployee || undefined,
                                    })}
                                    className="px-3 py-2 text-sm border border-border rounded-lg bg-panel text-text focus:outline-none focus:ring-2 focus:ring-violet/20 focus:border-violet" />
                            </div>

                            {/* Employee filter */}
                            <div>
                                <label className="block text-xs text-sub mb-1">Employee</label>
                                <select value={selectedEmployee}
                                    onChange={e => setSelectedEmployee(e.target.value)}
                                    className="px-3 py-2 text-sm border border-border rounded-lg bg-panel text-text min-w-48 focus:outline-none focus:ring-2 focus:ring-violet/20 focus:border-violet">
                                    <option value="">All employees</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.full_name} ({e.employee_id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button onClick={applyFilter}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-violet text-bg hover:brightness-110 transition-all">
                                Apply filter
                            </button>
                        </div>
                    </div>

                    {/* Month navigator */}
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={() => handleMonthChange(-1)}
                            className="text-sm text-sub hover:text-text px-2 py-1">
                            ← Prev
                        </button>
                        <p className="text-sm font-medium text-text">{monthLabel}</p>
                        <button onClick={() => handleMonthChange(1)}
                            className="text-sm text-sub hover:text-text px-2 py-1">
                            Next →
                        </button>
                    </div>

                    {/* Summary table */}
                    <div className="bg-panel rounded-xl border border-border overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm min-w-[720px]">
                            <thead>
                                <tr className="bg-field border-b border-border">
                                    <th className="text-left px-4 py-3 text-xs text-dim font-medium">Employee</th>
                                    <th className="text-center px-4 py-3 text-xs text-dim font-medium">Present</th>
                                    <th className="text-center px-4 py-3 text-xs text-dim font-medium">Late</th>
                                    <th className="text-center px-4 py-3 text-xs text-dim font-medium">Absent</th>
                                    <th className="text-center px-4 py-3 text-xs text-dim font-medium">Half day</th>
                                    <th className="text-center px-4 py-3 text-xs text-dim font-medium">Hours</th>
                                    <th className="text-center px-4 py-3 text-xs text-dim font-medium"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {dtrSummary.map(emp => (
                                    <tr key={emp.id}
                                        className="border-b border-border last:border-0 hover:bg-hover transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 bg-violet/15 text-violet">
                                                    {emp.initials}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-text">{emp.full_name}</p>
                                                    <p className="text-xs text-dim">{emp.employee_id} · {emp.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-sm font-medium text-teal">{emp.days_present}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-sm font-medium ${emp.days_late > 0 ? 'text-amber' : 'text-dim'}`}>
                                                {emp.days_late}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-sm font-medium ${emp.days_absent > 0 ? 'text-red' : 'text-dim'}`}>
                                                {emp.days_absent}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-sm font-medium ${emp.half_days > 0 ? 'text-purple' : 'text-dim'}`}>
                                                {emp.half_days}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-sm text-sub">{emp.hours_rendered}h</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <a href={`/admin/dtr/${emp.id}?month=${month}`}
                                                    className="text-xs px-3 py-1.5 rounded-lg border border-border text-sub hover:bg-hover transition-colors">
                                                    View
                                                </a>
                                                <a href={`/admin/dtr/${emp.id}/print?month=${month}`}
                                                    target="_blank"
                                                    className="text-xs px-3 py-1.5 rounded-lg border border-border text-sub hover:bg-hover transition-colors">
                                                    Print ↓
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {dtrSummary.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-dim">
                                            No DTR records found for this period.
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