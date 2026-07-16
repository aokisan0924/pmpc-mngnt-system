import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import ConfirmModal from '@/Components/ConfirmModal'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

export default function PayrollShow({ payroll, items }) {
    const { flash } = usePage().props
    const isFirst   = payroll.cutoff === 'first'

    const [confirmOpen, setConfirmOpen]   = useState(false)
    const [processing, setProcessing]     = useState(false)

    function finalize() {
        setConfirmOpen(true)
    }

    function handleConfirm() {
        setProcessing(true)
        router.post(`/admin/payroll/${payroll.id}/finalize`, {}, {
            onFinish: () => {
                setProcessing(false)
                setConfirmOpen(false)
            },
        })
    }

    return (
        <AdminLayout>
            <div className="p-6">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
                            <a href="/admin/payroll" className="hover:text-gray-600">← Payroll</a>
                            <span>/</span>
                            <span className="text-gray-600">{payroll.period_label}</span>
                        </div>
                        <h1 className="text-lg font-medium text-gray-900">{payroll.period_label}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                isFirst ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                            }`}>
                                {payroll.cutoff_label}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                payroll.status === 'finalized'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-amber-50 text-amber-700'
                            }`}>
                                {payroll.status}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href={`/admin/payslips/download-all?month=${payroll.period_from?.slice(0,7)}`}
                            target="_blank"
                            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                            Download all payslips ↓
                        </a>
                        {payroll.status === 'draft' && (
                            <button onClick={finalize}
                                className="px-4 py-2 text-sm font-medium text-white rounded-xl"
                                style={{ background: '#26215C' }}>
                                Finalize payroll
                            </button>
                        )}
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'Total gross pay',   value: `₱ ${fmt(payroll.total_gross)}`,      color: 'text-gray-900'    },
                        { label: 'Total deductions',  value: `₱ ${fmt(payroll.total_deductions)}`, color: 'text-red-600'     },
                        { label: 'Total net pay',     value: `₱ ${fmt(payroll.total_net)}`,        color: 'text-emerald-700' },
                    ].map(card => (
                        <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-xs text-gray-400 mb-1">{card.label}</p>
                            <p className={`text-xl font-medium ${card.color}`}>{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* Payroll table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    <table className="text-xs w-full" style={{ minWidth: 1100 }}>
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-3 text-gray-400 font-medium" rowSpan={2} style={{ verticalAlign: 'middle', minWidth: 170 }}>Employee</th>
                                <th className="text-center px-3 py-3 text-gray-400 font-medium" rowSpan={2} style={{ verticalAlign: 'middle' }}>Days</th>
                                <th className="text-center px-3 py-2 text-blue-500 font-medium border-l border-gray-100" colSpan={5}>Gross breakdown</th>
                                <th className="text-right px-3 py-2 text-emerald-600 font-medium border-l border-gray-100" rowSpan={2} style={{ verticalAlign: 'middle' }}>Gross pay</th>
                                {isFirst
                                    ? <th className="text-center px-3 py-2 text-red-500 font-medium border-l border-gray-100" colSpan={5}>Deductions</th>
                                    : <th className="text-center px-3 py-2 text-red-500 font-medium border-l border-gray-100" colSpan={1}>Deductions</th>
                                }
                                <th className="text-right px-4 py-2 font-medium border-l border-gray-100" rowSpan={2} style={{ color: '#26215C', verticalAlign: 'middle' }}>Net pay</th>
                            </tr>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-400">
                                <th className="text-right px-3 py-2 font-medium border-l border-gray-100">Basic</th>
                                <th className="text-right px-3 py-2 font-medium">Transpo</th>
                                <th className="text-right px-3 py-2 font-medium">Rep</th>
                                <th className="text-right px-3 py-2 font-medium">Quarterly</th>
                                <th className="text-right px-3 py-2 font-medium">OT pay</th>
                                {isFirst && <>
                                    <th className="text-right px-3 py-2 font-medium border-l border-gray-100">SSS</th>
                                    <th className="text-right px-3 py-2 font-medium">PhilHealth</th>
                                    <th className="text-right px-3 py-2 font-medium">Pag-IBIG</th>
                                    <th className="text-right px-3 py-2 font-medium">Tax</th>
                                </>}
                                <th className="text-right px-3 py-2 font-medium border-l border-gray-100">Other ded.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => {
                                const splitDed = item.loan_deduction
                                    + item.capital_contribution_deduction
                                    + item.cash_advance_deduction
                                    + item.savings_deduction
                                    + item.other_deductions

                                return (
                                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0 text-[9px] font-medium"
                                                    style={{ background: '#26215C' }}>
                                                    {item.initials}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 whitespace-nowrap">{item.full_name}</p>
                                                    <p className="text-gray-400">{item.employee_id} · {item.position}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center text-gray-700">{item.days_present}</td>
                                        <td className="px-3 py-3 text-right text-gray-700 border-l border-gray-100">₱ {fmt(item.cutoff_basic)}</td>
                                        <td className="px-3 py-3 text-right text-gray-600">₱ {fmt(item.cutoff_transpo)}</td>
                                        <td className="px-3 py-3 text-right text-gray-600">₱ {fmt(item.cutoff_rep)}</td>
                                        <td className="px-3 py-3 text-right text-gray-600">₱ {fmt(item.cutoff_quarterly)}</td>
                                        <td className="px-3 py-3 text-right text-amber-700">
                                            {item.total_ot_pay > 0
                                                ? <span title={`WD: ₱${fmt(item.weekday_ot_pay)} + WE: ₱${fmt(item.weekend_ot_pay)}`}>₱ {fmt(item.total_ot_pay)}</span>
                                                : '—'}
                                        </td>
                                        <td className="px-3 py-3 text-right font-medium text-gray-900 border-l border-gray-100">
                                            ₱ {fmt(item.gross_pay)}
                                        </td>
                                        {isFirst && <>
                                            <td className="px-3 py-3 text-right text-red-600 border-l border-gray-100">₱ {fmt(item.sss_deduction)}</td>
                                            <td className="px-3 py-3 text-right text-red-600">₱ {fmt(item.philhealth_deduction)}</td>
                                            <td className="px-3 py-3 text-right text-red-600">₱ {fmt(item.pagibig_deduction)}</td>
                                            <td className="px-3 py-3 text-right text-red-600">₱ {fmt(item.tax_deduction)}</td>
                                        </>}
                                        <td className="px-3 py-3 text-right text-red-500 border-l border-gray-100">
                                            ₱ {fmt(splitDed)}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium border-l border-gray-100 ${item.net_pay < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                            ₱ {fmt(item.net_pay)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-200 bg-gray-50 font-medium">
                                <td colSpan={2} className="px-4 py-3 text-gray-600">
                                    Totals — {items.length} employees
                                </td>
                                <td colSpan={5} className="px-3 py-3 text-right text-gray-700 border-l border-gray-100">
                                    ₱ {fmt(payroll.total_gross - items.reduce((s,i) => s + i.total_ot_pay, 0))}
                                    <span className="text-amber-600 ml-2">+ OT ₱ {fmt(items.reduce((s,i) => s + i.total_ot_pay, 0))}</span>
                                </td>
                                <td className="px-3 py-3 text-right text-gray-900 border-l border-gray-100">
                                    ₱ {fmt(payroll.total_gross)}
                                </td>
                                <td colSpan={isFirst ? 5 : 1} className="px-3 py-3 text-right text-red-600 border-l border-gray-100">
                                    ₱ {fmt(payroll.total_deductions)}
                                </td>
                                <td className="px-4 py-3 text-right text-emerald-700 border-l border-gray-100">
                                    ₱ {fmt(payroll.total_net)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* OT detail */}
                {items.some(i => i.total_ot_pay > 0) && (
                    <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                        <p className="text-xs font-medium text-amber-700 mb-2">Overtime breakdown</p>
                        <div className="space-y-1">
                            {items.filter(i => i.total_ot_pay > 0).map(item => (
                                <p key={item.id} className="text-xs text-amber-600">
                                    <strong>{item.full_name}</strong>
                                    {item.weekday_ot_hours > 0 && ` · Weekday: ${item.weekday_ot_hours}hrs @ ₱${fmt(item.weekday_ot_pay)}`}
                                    {item.weekend_ot_hours > 0 && ` · Weekend: ${item.weekend_ot_hours}hrs @ ₱${fmt(item.weekend_ot_pay)}`}
                                    {` · Total OT: ₱${fmt(item.total_ot_pay)}`}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm finalize modal */}
            <ConfirmModal
                open={confirmOpen}
                title="Finalize payroll?"
                message={`This will lock the ${payroll.period_label} payroll permanently. Finalized payrolls cannot be edited. Make sure all amounts are correct before proceeding.`}
                confirmLabel="Yes, finalize"
                cancelLabel="Cancel"
                confirmStyle="primary"
                processing={processing}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmOpen(false)}
            />
        </AdminLayout>
    )
}