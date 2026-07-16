import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PayrollShow({ payroll, items }) {
    const { flash } = usePage().props
    const isFirst   = payroll.cutoff === 'first'

    function finalize() {
        if (confirm('Finalize this payroll? This cannot be undone.')) {
            router.post(`/admin/payroll/${payroll.id}/finalize`)
        }
    }

    return (
        <AdminLayout>
            <div className="min-h-screen bg-bg">
            <div className="p-4 sm:p-6">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-teal/10 border border-teal/25 text-teal text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-dim">
                            <a href="/admin/payroll" className="hover:text-text">← Payroll</a>
                            <span>/</span>
                            <span className="text-sub">{payroll.period_label}</span>
                        </div>
                        <h1 className="text-lg font-medium text-text">{payroll.period_label}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                isFirst ? 'bg-blue/10 text-blue' : 'bg-purple/10 text-purple'
                            }`}>
                                {payroll.cutoff_label}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                payroll.status === 'finalized'
                                    ? 'bg-teal/10 text-teal'
                                    : 'bg-amber/10 text-amber'
                            }`}>
                                {payroll.status}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <a href={`/admin/payslips/download-all?month=${payroll.period_from?.slice(0,7)}`}
                            target="_blank"
                            className="px-4 py-2 text-sm font-medium text-sub border border-border rounded-lg hover:bg-hover transition-colors">
                            Download all payslips ↓
                        </a>
                        {payroll.status === 'draft' && (
                            <button onClick={finalize}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-violet text-bg hover:brightness-110 transition-all">
                                Finalize payroll
                            </button>
                        )}
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'Total gross pay',   value: `₱ ${fmt(payroll.total_gross)}`,      color: 'text-text'    },
                        { label: 'Total deductions',  value: `₱ ${fmt(payroll.total_deductions)}`, color: 'text-red'     },
                        { label: 'Total net pay',     value: `₱ ${fmt(payroll.total_net)}`,        color: 'text-teal' },
                    ].map(card => (
                        <div key={card.label} className="bg-panel rounded-xl border border-border p-4">
                            <p className="text-xs text-dim mb-1">{card.label}</p>
                            <p className={`text-xl font-medium ${card.color}`}>{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* Payroll summary table */}
                <div className="bg-panel rounded-xl border border-border overflow-x-auto">
                    <table className="text-xs w-full" style={{ minWidth: 1200 }}>
                        <thead>
                            <tr className="bg-field border-b border-border">
                                <th className="text-left px-4 py-3 text-dim font-medium" rowSpan={2} style={{ verticalAlign: 'middle', minWidth: 170 }}>Employee</th>
                                <th className="text-center px-3 py-3 text-dim font-medium" rowSpan={2} style={{ verticalAlign: 'middle' }}>Days</th>
                                <th className="text-center px-3 py-2 text-blue font-medium border-l border-border" colSpan={5}>Gross breakdown</th>
                                <th className="text-right px-3 py-2 text-teal font-medium border-l border-border" rowSpan={2} style={{ verticalAlign: 'middle' }}>Gross pay</th>
                                {isFirst
                                    ? <th className="text-center px-3 py-2 text-red font-medium border-l border-border" colSpan={5}>Deductions</th>
                                    : <th className="text-center px-3 py-2 text-red font-medium border-l border-border" colSpan={1}>Deductions</th>
                                }
                                <th className="text-right px-4 py-2 font-medium border-l border-border" rowSpan={2} className="text-violet" style={{ verticalAlign: 'middle' }}>Net pay</th>
                            </tr>
                            <tr className="bg-field border-b border-border text-dim">
                                <th className="text-right px-3 py-2 font-medium border-l border-border">Basic</th>
                                <th className="text-right px-3 py-2 font-medium">Transpo</th>
                                <th className="text-right px-3 py-2 font-medium">Rep</th>
                                <th className="text-right px-3 py-2 font-medium">Quarterly</th>
                                <th className="text-right px-3 py-2 font-medium">OT pay</th>
                                {isFirst && <>
                                    <th className="text-right px-3 py-2 font-medium border-l border-border">SSS</th>
                                    <th className="text-right px-3 py-2 font-medium">PhilHealth</th>
                                    <th className="text-right px-3 py-2 font-medium">Pag-IBIG</th>
                                    <th className="text-right px-3 py-2 font-medium">Tax</th>
                                </>}
                                <th className="text-right px-3 py-2 font-medium border-l border-border">Other ded.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => {
                                const splitDed = item.loan_deduction
                                    + item.cc_deduction
                                    + item.cash_advance_deduction
                                    + item.savings_deduction
                                    + item.share_capital_deduction
                                    + item.other_deductions

                                return (
                                    <tr key={item.id} className="border-b border-border hover:bg-hover transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-medium bg-violet/15 text-violet">
                                                    {item.initials}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-text whitespace-nowrap">{item.full_name}</p>
                                                    <p className="text-dim">{item.employee_id} · {item.position}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center text-sub">{item.days_present}</td>
                                        <td className="px-3 py-3 text-right text-sub border-l border-border">₱ {fmt(item.cutoff_basic)}</td>
                                        <td className="px-3 py-3 text-right text-sub">₱ {fmt(item.cutoff_transpo)}</td>
                                        <td className="px-3 py-3 text-right text-sub">₱ {fmt(item.cutoff_rep)}</td>
                                        <td className="px-3 py-3 text-right text-sub">₱ {fmt(item.cutoff_quarterly)}</td>
                                        <td className="px-3 py-3 text-right text-amber">
                                            {item.total_ot_pay > 0 ? (
                                                <span title={`WD: ₱${fmt(item.weekday_ot_pay)} (${item.weekday_ot_hours}hrs) + WE: ₱${fmt(item.weekend_ot_pay)} (${item.weekend_ot_hours}hrs)`}>
                                                    ₱ {fmt(item.total_ot_pay)} ⓘ
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-3 py-3 text-right font-medium text-text border-l border-border">
                                            ₱ {fmt(item.gross_pay)}
                                        </td>
                                        {isFirst && <>
                                            <td className="px-3 py-3 text-right text-red border-l border-border">₱ {fmt(item.sss_deduction)}</td>
                                            <td className="px-3 py-3 text-right text-red">₱ {fmt(item.philhealth_deduction)}</td>
                                            <td className="px-3 py-3 text-right text-red">₱ {fmt(item.pagibig_deduction)}</td>
                                            <td className="px-3 py-3 text-right text-red">₱ {fmt(item.tax_deduction)}</td>
                                        </>}
                                        <td className="px-3 py-3 text-right text-red border-l border-border"
                                            title="Loan + CC + Cash advance + Savings + Share capital + Other">
                                            ₱ {fmt(splitDed)}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium border-l border-border ${item.net_pay < 0 ? 'text-red' : 'text-teal'}`}>
                                            ₱ {fmt(item.net_pay)}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <a href={`/admin/payslips/${item.id}/download?month=${payroll.period_from?.slice(0,7)}`}
                                                target="_blank"
                                                className="text-xs text-dim hover:text-text">
                                                ↓
                                            </a>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-border bg-field font-medium">
                                <td colSpan={2} className="px-4 py-3 text-sub">
                                    Totals — {items.length} employees
                                </td>
                                <td colSpan={5} className="px-3 py-3 text-right text-sub border-l border-border">
                                    ₱ {fmt(payroll.total_gross - items.reduce((s,i) => s + i.total_ot_pay, 0))}
                                    <span className="text-amber ml-2">+ OT ₱ {fmt(items.reduce((s,i) => s + i.total_ot_pay, 0))}</span>
                                </td>
                                <td className="px-3 py-3 text-right text-text border-l border-border">
                                    ₱ {fmt(payroll.total_gross)}
                                </td>
                                <td colSpan={isFirst ? 5 : 1} className="px-3 py-3 text-right text-red border-l border-border">
                                    ₱ {fmt(payroll.total_deductions)}
                                </td>
                                <td className="px-4 py-3 text-right text-teal border-l border-border">
                                    ₱ {fmt(payroll.total_net)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* OT detail footnote */}
                {items.some(i => i.total_ot_pay > 0) && (
                    <div className="mt-3 bg-amber/10 border border-amber/25 rounded-lg px-4 py-3">
                        <p className="text-xs font-medium text-amber mb-2">Overtime breakdown</p>
                        <div className="space-y-1">
                            {items.filter(i => i.total_ot_pay > 0).map(item => (
                                <p key={item.id} className="text-xs text-amber">
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
            </div>
        </AdminLayout>
    )
}