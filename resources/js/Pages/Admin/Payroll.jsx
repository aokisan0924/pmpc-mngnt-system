import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

export default function Payroll({ payrolls }) {
    const { flash }           = usePage().props
    const [periodFrom, setPeriodFrom] = useState('')
    const [periodTo, setPeriodTo]     = useState('')
    const [cutoff, setCutoff]         = useState('first')
    const [error, setError]           = useState('')

    function startPayroll() {
        if (!periodFrom || !periodTo) { setError('Please select both dates.'); return }
        if (periodFrom > periodTo)    { setError('End date must be after start date.'); return }
        setError('')
        router.get('/admin/payroll/create', { period_from: periodFrom, period_to: periodTo, cutoff })
    }

    function fmt(num) {
        return Number(num).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    return (
        <AdminLayout>
            <div className="min-h-screen bg-bg">
                <div className="p-4 sm:p-6 max-w-6xl mx-auto">

                    {flash?.success && (
                        <div className="mb-4 px-4 py-3 rounded-lg bg-teal/10 border border-teal/25 text-teal text-sm">
                            {flash.success}
                        </div>
                    )}

                    <div className="mb-6">
                        <h1 className="text-lg font-medium text-text">Payroll</h1>
                        <p className="text-sm text-sub mt-0.5">Semi-monthly payroll processing</p>
                    </div>

                    {/* New payroll card */}
                    <div className="bg-panel rounded-xl border border-border p-5 mb-6">
                        <p className="text-sm font-medium text-text mb-1">Process new payroll</p>
                        <p className="text-xs text-dim mb-4">
                            Select the cutoff period and date range, then input OT hours per employee.
                        </p>

                        <div className="flex flex-wrap items-end gap-3">
                            {/* Cutoff selector */}
                            <div>
                                <label className="block text-xs text-sub mb-1">Cutoff</label>
                                <div className="flex gap-1 p-1 bg-field rounded-lg">
                                    {[
                                        { value: 'first',  label: '1st cutoff  (1–15)'   },
                                        { value: 'second', label: '2nd cutoff  (16–30)'  },
                                    ].map(opt => (
                                        <button key={opt.value} type="button"
                                            onClick={() => setCutoff(opt.value)}
                                            className={`px-3 py-1.5 text-xs rounded-md transition-all whitespace-nowrap ${
                                                cutoff === opt.value
                                                    ? 'bg-panel text-text font-medium shadow-sm ring-1 ring-border'
                                                    : 'text-sub'
                                            }`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-sub mb-1">Period from</label>
                                <input type="date" value={periodFrom}
                                    onChange={e => setPeriodFrom(e.target.value)}
                                    className="px-3 py-2 text-sm border border-border rounded-lg bg-panel text-text focus:outline-none focus:ring-2 focus:ring-violet/20 focus:border-violet" />
                            </div>

                            <div>
                                <label className="block text-xs text-sub mb-1">Period to</label>
                                <input type="date" value={periodTo}
                                    onChange={e => setPeriodTo(e.target.value)}
                                    className="px-3 py-2 text-sm border border-border rounded-lg bg-panel text-text focus:outline-none focus:ring-2 focus:ring-violet/20 focus:border-violet" />
                            </div>

                            <button onClick={startPayroll}
                                className="px-5 py-2 text-sm font-medium rounded-lg bg-violet text-bg hover:brightness-110 transition-all">
                                Start payroll →
                            </button>
                        </div>

                        {error && <p className="mt-2 text-xs text-red">{error}</p>}
                    </div>

                    {/* Payroll history table */}
                    <div className="bg-panel rounded-xl border border-border overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm min-w-[720px]">
                            <thead>
                                <tr className="border-b border-border bg-field">
                                    <th className="text-left px-4 py-3 text-xs text-dim font-medium">Period</th>
                                    <th className="text-left px-4 py-3 text-xs text-dim font-medium">Cutoff</th>
                                    <th className="text-right px-4 py-3 text-xs text-dim font-medium">Gross pay</th>
                                    <th className="text-right px-4 py-3 text-xs text-dim font-medium">Deductions</th>
                                    <th className="text-right px-4 py-3 text-xs text-dim font-medium">Net pay</th>
                                    <th className="text-center px-4 py-3 text-xs text-dim font-medium">Status</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrolls.map(p => (
                                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-hover transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-text">{p.period_label}</p>
                                            <p className="text-xs text-dim">{p.period_from} – {p.period_to}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                p.cutoff === 'first'
                                                    ? 'bg-blue/10 text-blue'
                                                    : 'bg-purple/10 text-purple'
                                            }`}>
                                                {p.cutoff === 'first' ? '1st cutoff' : '2nd cutoff'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-sub font-medium">
                                            ₱ {fmt(p.total_gross)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-red">
                                            ₱ {fmt(p.total_deductions)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-medium text-teal">
                                            ₱ {fmt(p.total_net)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                p.status === 'finalized'
                                                    ? 'bg-teal/10 text-teal'
                                                    : 'bg-amber/10 text-amber'
                                            }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <a href={`/admin/payroll/${p.id}`}
                                                className="text-xs px-3 py-1.5 rounded-lg border border-border text-sub hover:bg-hover transition-colors">
                                                View
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                                {payrolls.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-dim">
                                            No payrolls processed yet.
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