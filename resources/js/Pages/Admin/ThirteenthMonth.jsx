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
            <div className="min-h-screen bg-bg">
            <div className="p-4 sm:p-6 max-w-5xl mx-auto">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-teal/10 border border-teal/25 text-teal text-sm">
                        {flash.success}
                    </div>
                )}

                <div className="mb-6">
                    <h1 className="text-lg font-medium text-text">13th month pay</h1>
                    <p className="text-sm text-sub mt-0.5">
                        Compute semi-annual 13th month pay per Philippine labor law (RA 6686)
                    </p>
                </div>

                {/* Compute form */}
                <div className="bg-panel rounded-xl border border-border p-5 mb-6">
                    <p className="text-sm font-medium text-text mb-1">Compute new 13th month pay</p>
                    <p className="text-xs text-dim mb-4">
                        Formula: <strong className="text-sub">total basic pay earned in period ÷ 12</strong>
                        &nbsp;·&nbsp; Basic pay pulled from DTR (daily rate × days present)
                    </p>

                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className="block text-xs text-sub mb-1">Year</label>
                            <input type="number"
                                value={year}
                                onChange={e => setYear(e.target.value)}
                                min="2020" max="2099"
                                className="w-28 px-3 py-2 text-sm border border-border rounded-lg bg-panel text-text focus:outline-none focus:ring-2 focus:ring-violet/20 focus:border-violet" />
                        </div>

                        <div>
                            <label className="block text-xs text-sub mb-1">Tranche</label>
                            <div className="flex gap-1 p-1 bg-field rounded-lg">
                                {[
                                    { value: 'mid_year',  label: 'Mid-year  (Jan–Jun)'  },
                                    { value: 'year_end',  label: 'Year-end  (Jul–Dec)'  },
                                ].map(opt => (
                                    <button key={opt.value} type="button"
                                        onClick={() => setTranche(opt.value)}
                                        className={`px-3 py-1.5 text-xs rounded-md transition-all whitespace-nowrap ${
                                            tranche === opt.value
                                                ? 'bg-panel text-text font-medium shadow-sm ring-1 ring-border'
                                                : 'text-sub'
                                        }`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={startCompute}
                            className="px-5 py-2 text-sm font-medium rounded-lg bg-violet text-bg hover:brightness-110 transition-all">
                            Compute →
                        </button>
                    </div>
                </div>

                {/* History */}
                <div className="bg-panel rounded-xl border border-border overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead>
                            <tr className="bg-field border-b border-border">
                                <th className="text-left px-4 py-3 text-xs text-dim font-medium">Period</th>
                                <th className="text-left px-4 py-3 text-xs text-dim font-medium">Tranche</th>
                                <th className="text-center px-4 py-3 text-xs text-dim font-medium">Employees</th>
                                <th className="text-right px-4 py-3 text-xs text-dim font-medium">Total payout</th>
                                <th className="text-center px-4 py-3 text-xs text-dim font-medium">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.batch_key}
                                    className="border-b border-border hover:bg-hover transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-text">{r.year}</p>
                                        <p className="text-xs text-dim">{r.period_from} – {r.period_to}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            r.tranche === 'mid_year'
                                                ? 'bg-blue/10 text-blue'
                                                : 'bg-purple/10 text-purple'
                                        }`}>
                                            {r.tranche_label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-sub">
                                        {r.employee_count}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-teal">
                                        ₱ {fmt(r.total_payout)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            r.status === 'finalized'
                                                ? 'bg-teal/10 text-teal'
                                                : 'bg-amber/10 text-amber'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <a href={`/admin/thirteenth-month/show?year=${r.year}&tranche=${r.tranche}`}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-border text-sub hover:bg-hover">
                                            View
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {records.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-dim">
                                        No 13th month pay records yet. Compute one above.
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