import { usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    })
}

export default function Payslips({ payslips }) {
    const { flash } = usePage().props

    return (
        <EmployeeLayout>
            <div className="p-6 max-w-3xl mx-auto">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        {flash.success}
                    </div>
                )}

                <div className="mb-6">
                    <h1 className="text-lg font-medium text-gray-900">My payslips</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Download your monthly payslips combining both cutoffs
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Month</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Cutoffs</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Gross pay</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Deductions</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Net pay</th>
                                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {payslips.map(p => (
                                <tr key={p.month}
                                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-gray-800">{p.month_label}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                                p.has_first
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'bg-gray-100 text-gray-400'
                                            }`}>
                                                1st
                                            </span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                                p.has_second
                                                    ? 'bg-purple-50 text-purple-700'
                                                    : 'bg-gray-100 text-gray-400'
                                            }`}>
                                                2nd
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                                        ₱ {fmt(p.total_gross)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-red-600">
                                        ₱ {fmt(p.total_ded)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-medium text-emerald-700">
                                        ₱ {fmt(p.total_net)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            p.status === 'complete'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-amber-50 text-amber-700'
                                        }`}>
                                            {p.status === 'complete' ? 'Complete' : 'Partial'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <a href={`/employee/payslips/${p.month}`}
                                            target="_blank"
                                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center gap-1">
                                            Download ↓
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {payslips.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                                        No payslips available yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <p className="mt-4 text-xs text-gray-400 text-center">
                    Payslips are available once both cutoffs for the month are finalized by HR.
                </p>
            </div>
        </EmployeeLayout>
    )
}