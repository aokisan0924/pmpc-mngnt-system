import { useState } from 'react'
import { router } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    })
}

export default function ThirteenthMonthCompute({
    employees, year, tranche, tranche_label, period_from, period_to,
}) {
    const [processing, setProcessing] = useState(false)

    const totalBasicPay     = employees.reduce((s, e) => s + (parseFloat(e.total_basic_pay)      || 0), 0)
    const total13th         = employees.reduce((s, e) => s + (parseFloat(e.thirteenth_month_pay) || 0), 0)
    const alreadyProcessed  = employees.filter(e => e.already_processed).length

    function save() {
        setProcessing(true)
        router.post('/admin/thirteenth-month', {
            year,
            tranche,
            period_from,
            period_to,
            items: employees.map(e => ({
                employee_id:          e.id,
                days_present:         e.days_present,
                daily_rate:           e.daily_rate,
                total_basic_pay:      e.total_basic_pay,
                thirteenth_month_pay: e.thirteenth_month_pay,
            })),
        }, {
            onError: () => setProcessing(false),
        })
    }

    return (
        <AdminLayout>
            <div className="p-6">

                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
                            <a href="/admin/thirteenth-month" className="hover:text-gray-600">
                                ← 13th month pay
                            </a>
                            <span>/</span>
                            <span className="text-gray-600">Compute</span>
                        </div>
                        <h1 className="text-lg font-medium text-gray-900">
                            13th month pay — {year}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                tranche === 'mid_year'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-purple-50 text-purple-700'
                            }`}>
                                {tranche_label}
                            </span>
                            <span className="text-xs text-gray-400">
                                {period_from} – {period_to}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-gray-400">Total 13th month payout</p>
                            <p className="text-lg font-medium text-emerald-700">₱ {fmt(total13th)}</p>
                        </div>
                        <button onClick={save} disabled={processing}
                            className="px-5 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                            style={{ background: '#26215C' }}>
                            {processing ? 'Saving…' : 'Save computation'}
                        </button>
                    </div>
                </div>

                {/* Formula reminder */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4 text-xs text-gray-400">
                    <span>Basic pay = <strong className="text-gray-600">daily rate × days present in period</strong></span>
                    <span>·</span>
                    <span>13th month = <strong className="text-gray-600">total basic pay ÷ 12</strong></span>
                    <span>·</span>
                    <span>Pro-ration is <strong className="text-gray-600">automatic</strong> — based on actual DTR days</span>
                </div>

                {alreadyProcessed > 0 && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                        {alreadyProcessed} employee{alreadyProcessed > 1 ? 's' : ''} already
                        have a record for this tranche. Saving will overwrite the existing draft.
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Employee</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Days present</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Daily rate</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium bg-blue-50">Total basic pay</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">÷ 12</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium bg-emerald-50">13th month pay</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
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
                                    <td className="px-4 py-3 text-center font-medium text-gray-700">
                                        {emp.days_present}
                                        {emp.days_present === 0 && (
                                            <span className="ml-1 text-xs text-amber-600">(no DTR)</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600">
                                        ₱ {fmt(emp.daily_rate)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-800 bg-blue-50">
                                        ₱ {fmt(emp.total_basic_pay)}
                                        <p className="text-xs text-gray-400 font-normal">
                                            {fmt(emp.daily_rate)} × {emp.days_present}d
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                                        ÷ 12
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-emerald-700 bg-emerald-50">
                                        ₱ {fmt(emp.thirteenth_month_pay)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {emp.already_processed && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                emp.existing_status === 'finalized'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-amber-50 text-amber-700'
                                            }`}>
                                                {emp.existing_status}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-200 bg-gray-50 font-medium">
                                <td className="px-4 py-3 text-gray-600">
                                    Totals — {employees.length} employees
                                </td>
                                <td className="px-4 py-3 text-center text-gray-700">
                                    {employees.reduce((s, e) => s + e.days_present, 0)}d
                                </td>
                                <td></td>
                                <td className="px-4 py-3 text-right text-gray-800 bg-blue-50">
                                    ₱ {fmt(totalBasicPay)}
                                </td>
                                <td></td>
                                <td className="px-4 py-3 text-right text-emerald-700 bg-emerald-50">
                                    ₱ {fmt(total13th)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </AdminLayout>
    )
}