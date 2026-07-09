import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

const C = {
    purple: '#26215C',
    purpleLight: '#EEEDFE',
    purpleText: '#534AB7',
}

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
            <div className="p-6 max-w-6xl mx-auto">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        {flash.success}
                    </div>
                )}

                <div className="mb-6">
                    <h1 className="text-lg font-medium text-gray-900">Payroll</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Semi-monthly payroll processing</p>
                </div>

                {/* New payroll card */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                    <p className="text-sm font-medium text-gray-800 mb-1">Process new payroll</p>
                    <p className="text-xs text-gray-400 mb-4">
                        Select the cutoff period and date range, then input OT hours per employee.
                    </p>

                    <div className="flex flex-wrap items-end gap-3">
                        {/* Cutoff selector */}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Cutoff</label>
                            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                                {[
                                    { value: 'first',  label: '1st cutoff  (1–15)'   },
                                    { value: 'second', label: '2nd cutoff  (16–30)'  },
                                ].map(opt => (
                                    <button key={opt.value} type="button"
                                        onClick={() => setCutoff(opt.value)}
                                        className={`px-3 py-1.5 text-xs rounded-md transition-all whitespace-nowrap ${
                                            cutoff === opt.value
                                                ? 'bg-white text-gray-800 font-medium shadow-sm border border-gray-200'
                                                : 'text-gray-500'
                                        }`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Period from</label>
                            <input type="date" value={periodFrom}
                                onChange={e => setPeriodFrom(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Period to</label>
                            <input type="date" value={periodTo}
                                onChange={e => setPeriodTo(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                        </div>

                        <button onClick={startPayroll}
                            className="px-5 py-2 text-sm font-medium text-white rounded-lg"
                            style={{ background: C.purple }}>
                            Start payroll →
                        </button>
                    </div>

                    {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                </div>

                {/* Payroll history table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Period</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Cutoff</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Gross pay</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Deductions</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Net pay</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {payrolls.map(p => (
                                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-gray-800">{p.period_label}</p>
                                        <p className="text-xs text-gray-400">{p.period_from} – {p.period_to}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            p.cutoff === 'first'
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'bg-purple-50 text-purple-700'
                                        }`}>
                                            {p.cutoff === 'first' ? '1st cutoff' : '2nd cutoff'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs text-gray-700 font-medium">
                                        ₱ {fmt(p.total_gross)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs text-red-600">
                                        ₱ {fmt(p.total_deductions)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-medium text-emerald-700">
                                        ₱ {fmt(p.total_net)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            p.status === 'finalized'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-amber-50 text-amber-700'
                                        }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <a href={`/admin/payroll/${p.id}`}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                                            View
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {payrolls.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                                        No payrolls processed yet.
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