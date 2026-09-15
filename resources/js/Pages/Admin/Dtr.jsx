import { router } from '@inertiajs/react'
import { useState } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'

export default function Dtr({ employees = [], dtrSummary = [], month, employeeId }) {
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
        month: 'long',
        year: 'numeric',
    })

    return (
        <AdminLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 page-enter">
                {/* ── Top Header ────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="indigo" dot>Attendance Ledger</Badge>
                            <span className="text-xs text-sub">• Monthly Records for {monthLabel}</span>
                        </div>
                        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text tracking-tight">
                            Daily Time Records
                        </h1>
                        <p className="text-xs sm:text-sm text-sub mt-0.5">
                            Audit staff attendance logs, hours rendered, and generate official cooperative DTR PDFs.
                        </p>
                    </div>

                    {/* Month Navigator */}
                    <div className="flex items-center gap-2 bg-panel p-1 rounded-xl border border-border/80 shadow-xs self-start sm:self-auto">
                        <button
                            onClick={() => handleMonthChange(-1)}
                            className="p-1.5 rounded-lg text-sub hover:text-text hover:bg-field transition-colors"
                            title="Previous Month"
                        >
                            ←
                        </button>
                        <span className="text-xs font-semibold px-2 text-text font-heading">{monthLabel}</span>
                        <button
                            onClick={() => handleMonthChange(1)}
                            className="p-1.5 rounded-lg text-sub hover:text-text hover:bg-field transition-colors"
                            title="Next Month"
                        >
                            →
                        </button>
                    </div>
                </div>

                {/* ── Filters Card ──────────────────────────────────── */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 flex-wrap">
                            <div>
                                <label className="block text-xs font-medium text-sub mb-1">Month Period</label>
                                <input
                                    type="month"
                                    defaultValue={month}
                                    onChange={e => router.get('/admin/dtr', {
                                        month: e.target.value,
                                        employee_id: selectedEmployee || undefined,
                                    })}
                                    className="px-3 py-2 text-xs border border-border rounded-lg bg-panel text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>

                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-sub mb-1">Employee Filter</label>
                                <select
                                    value={selectedEmployee}
                                    onChange={e => setSelectedEmployee(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-panel text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <option value="">All Employees ({employees.length})</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.full_name} ({e.employee_id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Button variant="primary" size="sm" onClick={applyFilter}>
                                Apply Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Summary Table ─────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Attendance Roster for {monthLabel}</CardTitle>
                        <span className="text-xs text-sub">{dtrSummary.length} employee records</span>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[760px]">
                                <thead>
                                    <tr className="bg-field/70 border-b border-border/80 text-sub uppercase text-[11px]">
                                        <th className="text-left px-5 py-3 font-semibold">Employee</th>
                                        <th className="text-center px-4 py-3 font-semibold text-emerald-600">Present</th>
                                        <th className="text-center px-4 py-3 font-semibold text-amber-600">Late</th>
                                        <th className="text-center px-4 py-3 font-semibold text-rose-600">Absent</th>
                                        <th className="text-center px-4 py-3 font-semibold text-sky-600">Half Day</th>
                                        <th className="text-center px-4 py-3 font-semibold">Hours</th>
                                        <th className="text-right px-5 py-3 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 tnum">
                                    {dtrSummary.map(emp => (
                                        <tr key={emp.id} className="hover:bg-field/40 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-heading font-semibold text-xs flex-shrink-0">
                                                        {emp.initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-text">{emp.full_name}</p>
                                                        <p className="text-[11px] text-sub font-mono">{emp.employee_id} • {emp.department}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-semibold text-emerald-600">
                                                {emp.days_present}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`font-semibold ${emp.days_late > 0 ? 'text-amber-600' : 'text-dim'}`}>
                                                    {emp.days_late}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`font-semibold ${emp.days_absent > 0 ? 'text-rose-600' : 'text-dim'}`}>
                                                    {emp.days_absent}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`font-semibold ${emp.half_days > 0 ? 'text-sky-600' : 'text-dim'}`}>
                                                    {emp.half_days}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-semibold text-text">
                                                {emp.hours_rendered}h
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <a
                                                        href={`/admin/dtr/${emp.id}?month=${month}`}
                                                        className="px-2.5 py-1 text-xs rounded-md border border-border/80 text-text hover:bg-field font-medium transition-colors"
                                                    >
                                                        View Log
                                                    </a>
                                                    <a
                                                        href={`/admin/dtr/${emp.id}/print?month=${month}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-2.5 py-1 text-xs rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium hover:bg-indigo-100 transition-colors"
                                                    >
                                                        Print PDF ↗
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {dtrSummary.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-sub">
                                                No DTR attendance records found for this period.
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