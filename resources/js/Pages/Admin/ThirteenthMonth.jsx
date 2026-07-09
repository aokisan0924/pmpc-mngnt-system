import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

export default function ThirteenthMonth({ records }) {
    const { flash }         = usePage().props
    const [year, setYear]   = useState(new Date().getFullYear())
    const [tranche, setTranche] = useState('mid_year')

    function fmt(num) {
        return Number(num || 0).toLocaleString('en-PH', {
            minimumFractionDigits: 2, maximumFractionDigits: 2,
        })
    }

    function startCompute() {
        router.get('/admin/thirteenth-month/compute', { year, tranche })
    }

    return (
        <AdminLayout>
            <div className="p-6 max-w-5xl mx-auto">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        {flash.success}
                    </div>
                )}

                <div className="mb-6">
                    <h1 className="text-lg font-medium text-gray-900">13th month pay</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Compute semi-annual 13th month pay per Philippine labor law (RA 6686)
                    </p>
                </div>

                {/* Compute form */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                    <p className="text-sm font-medium text-gray-800 mb-1">Compute new 13th month pay</p>
                    <p className="text-xs text-gray-400 mb-4">
                        Formula: <strong className="text-gray-600">total basic pay earned in period ÷ 12</strong>
                        &nbsp;·&nbsp; Basic pay pulled from DTR (daily rate × days present)
                    </p>

                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Year</label>
                            <input type="number"
                                value={year}
                                onChange={e => setYear(e.target.value)}
                                min="2020" max="2099"
                                className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Tranche</label>
                            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                                {[
                                    { value: 'mid_year',  label: 'Mid-year  (Jan–Jun)'  },
                                    { value: 'year_end',  label: 'Year-end  (Jul–Dec)'  },
                                ].map(opt => (
                                    <button key={opt.value} type="button"
                                        onClick={() => setTranche(opt.value)}
                                        className={`px-3 py-1.5 text-xs rounded-md transition-all whitespace-nowrap ${
                                            tranche === opt.value
                                                ? 'bg-white text-gray-800 font-medium shadow-sm border border-gray-200'
                                                : 'text-gray-500'
                                        }`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={startCompute}
                            className="px-5 py-2 text-sm font-medium text-white rounded-lg"
                            style={{ background: '#26215C' }}>
                            Compute →
                        </button>
                    </div>
                </div>

                {/* History */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Period</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Tranche</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Employees</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Total payout</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.batch_key}
                                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-gray-800">{r.year}</p>
                                        <p className="text-xs text-gray-400">{r.period_from} – {r.period_to}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            r.tranche === 'mid_year'
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'bg-purple-50 text-purple-700'
                                        }`}>
                                            {r.tranche_label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                        {r.employee_count}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-emerald-700">
                                        ₱ {fmt(r.total_payout)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            r.status === 'finalized'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-amber-50 text-amber-700'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <a href={`/admin/thirteenth-month/show?year=${r.year}&tranche=${r.tranche}`}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                                            View
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {records.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                                        No 13th month pay records yet. Compute one above.
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