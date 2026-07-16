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
            <div className="min-h-screen bg-bg">
            <div className="p-4 sm:p-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-dim">
                            <a href="/admin/thirteenth-month" className="hover:text-text">
                                ← 13th month pay
                            </a>
                            <span>/</span>
                            <span className="text-sub">Compute</span>
                        </div>
                        <h1 className="text-lg font-medium text-text">
                            13th month pay — {year}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                tranche === 'mid_year'
                                    ? 'bg-blue/10 text-blue'
                                    : 'bg-purple/10 text-purple'
                            }`}>
                                {tranche_label}
                            </span>
                            <span className="text-xs text-dim">
                                {period_from} – {period_to}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="text-right">
                            <p className="text-xs text-dim">Total 13th month payout</p>
                            <p className="text-lg font-medium text-teal">₱ {fmt(total13th)}</p>
                        </div>
                        <button onClick={save} disabled={processing}
                            className="px-5 py-2.5 text-sm font-medium rounded-lg disabled:opacity-60 bg-violet text-bg hover:brightness-110 transition-all">
                            {processing ? 'Saving…' : 'Save computation'}
                        </button>
                    </div>
                </div>

                {/* Formula reminder */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4 text-xs text-dim">
                    <span>Basic pay = <strong className="text-sub">daily rate × days present in period</strong></span>
                    <span>·</span>
                    <span>13th month = <strong className="text-sub">total basic pay ÷ 12</strong></span>
                    <span>·</span>
                    <span>Pro-ration is <strong className="text-sub">automatic</strong> — based on actual DTR days</span>
                </div>

                {alreadyProcessed > 0 && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-amber/10 border border-amber/25 text-amber text-sm">
                        {alreadyProcessed} employee{alreadyProcessed > 1 ? 's' : ''} already
                        have a record for this tranche. Saving will overwrite the existing draft.
                    </div>
                )}

                {/* Table */}
                <div className="bg-panel rounded-xl border border-border overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm min-w-[820px]">
                        <thead>
                            <tr className="bg-field border-b border-border">
                                <th className="text-left px-4 py-3 text-xs text-dim font-medium">Employee</th>
                                <th className="text-center px-4 py-3 text-xs text-dim font-medium">Days present</th>
                                <th className="text-right px-4 py-3 text-xs text-dim font-medium">Daily rate</th>
                                <th className="text-right px-4 py-3 text-xs text-dim font-medium bg-blue/10">Total basic pay</th>
                                <th className="text-right px-4 py-3 text-xs text-dim font-medium">÷ 12</th>
                                <th className="text-right px-4 py-3 text-xs text-dim font-medium bg-teal/10">13th month pay</th>
                                <th className="text-center px-4 py-3 text-xs text-dim font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id}
                                    className="border-b border-border hover:bg-hover transition-colors">
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
                                    <td className="px-4 py-3 text-center font-medium text-sub">
                                        {emp.days_present}
                                        {emp.days_present === 0 && (
                                            <span className="ml-1 text-xs text-amber">(no DTR)</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sub">
                                        ₱ {fmt(emp.daily_rate)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-text bg-blue/10">
                                        ₱ {fmt(emp.total_basic_pay)}
                                        <p className="text-xs text-dim font-normal">
                                            {fmt(emp.daily_rate)} × {emp.days_present}d
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs text-dim">
                                        ÷ 12
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-teal bg-teal/10">
                                        ₱ {fmt(emp.thirteenth_month_pay)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {emp.already_processed && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                emp.existing_status === 'finalized'
                                                    ? 'bg-teal/10 text-teal'
                                                    : 'bg-amber/10 text-amber'
                                            }`}>
                                                {emp.existing_status}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-border bg-field font-medium">
                                <td className="px-4 py-3 text-sub">
                                    Totals — {employees.length} employees
                                </td>
                                <td className="px-4 py-3 text-center text-sub">
                                    {employees.reduce((s, e) => s + e.days_present, 0)}d
                                </td>
                                <td></td>
                                <td className="px-4 py-3 text-right text-text bg-blue/10">
                                    ₱ {fmt(totalBasicPay)}
                                </td>
                                <td></td>
                                <td className="px-4 py-3 text-right text-teal bg-teal/10">
                                    ₱ {fmt(total13th)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            </div>
        </AdminLayout>
    )
}