import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    })
}

export default function ThirteenthMonthShow({
    records, year, tranche, tranche_label,
    period_from, period_to, status, total_payout,
}) {
    const { flash } = usePage().props

    function finalize() {
        if (confirm('Finalize 13th month pay? This cannot be undone.')) {
            router.post('/admin/thirteenth-month/finalize', { year, tranche })
        }
    }

    return (
        <AdminLayout>
            <div className="p-6 max-w-6xl mx-auto">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
                            <a href="/admin/thirteenth-month" className="hover:text-gray-600">
                                ← 13th month pay
                            </a>
                            <span>/</span>
                            <span className="text-gray-600">{year} · {tranche_label}</span>
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
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                status === 'finalized'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-amber-50 text-amber-700'
                            }`}>
                                {status}
                            </span>
                        </div>
                    </div>

                    {status === 'draft' && (
                        <button onClick={finalize}
                            className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                            style={{ background: '#26215C' }}>
                            Finalize
                        </button>
                    )}
                </div>

                {/* Summary card */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-400 mb-1">Employees covered</p>
                        <p className="text-xl font-medium text-gray-900">{records.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-400 mb-1">Total basic pay (period)</p>
                        <p className="text-xl font-medium text-gray-900">
                            ₱ {fmt(records.reduce((s, r) => s + r.total_basic_pay, 0))}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-400 mb-1">Total 13th month payout</p>
                        <p className="text-xl font-medium text-emerald-700">₱ {fmt(total_payout)}</p>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Employee</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Days present</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Daily rate</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Total basic pay</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">13th month pay</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.id}
                                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                                                style={{ background: '#26215C' }}>
                                                {r.initials}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{r.full_name}</p>
                                                <p className="text-xs text-gray-400">
                                                    {r.employee_id} · {r.department}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-700 font-medium">
                                        {r.days_present}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600">
                                        ₱ {fmt(r.daily_rate)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-800">
                                        ₱ {fmt(r.total_basic_pay)}
                                        <p className="text-xs text-gray-400">
                                            ₱{fmt(r.daily_rate)} × {r.days_present}d
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-emerald-700">
                                        ₱ {fmt(r.thirteenth_month_pay)}
                                        <p className="text-xs text-gray-400 font-normal">
                                            ÷ 12
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-200 bg-gray-50 font-medium">
                                <td className="px-4 py-3 text-gray-600">
                                    Totals — {records.length} employees
                                </td>
                                <td className="px-4 py-3 text-center text-gray-700">
                                    {records.reduce((s, r) => s + r.days_present, 0)}d
                                </td>
                                <td></td>
                                <td className="px-4 py-3 text-right text-gray-800">
                                    ₱ {fmt(records.reduce((s, r) => s + r.total_basic_pay, 0))}
                                </td>
                                <td className="px-4 py-3 text-right text-emerald-700">
                                    ₱ {fmt(total_payout)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Law reference */}
                <p className="mt-4 text-xs text-gray-400 text-center">
                    Computed per Republic Act 6686 and Presidential Decree 851
                    · Formula: total basic pay earned in period ÷ 12
                </p>
            </div>
        </AdminLayout>
    )
}