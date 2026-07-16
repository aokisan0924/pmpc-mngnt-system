import { useState } from 'react'
import { router } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function computeOtPay(item) {
    const hourlyRate    = (parseFloat(item.daily_rate) || 0) / 8
    const weekdayOtPay = hourlyRate * 1.25 * (parseFloat(item.weekday_ot_hours) || 0)
    const weekendOtPay = hourlyRate * 1.30 * (parseFloat(item.weekend_ot_hours) || 0)
    return { weekdayOtPay, weekendOtPay, totalOtPay: weekdayOtPay + weekendOtPay }
}

function computeGross(item) {
    const { totalOtPay } = computeOtPay(item)
    return (parseFloat(item.cutoff_gross) || 0) + totalOtPay
}

function computeNet(item) {
    return computeGross(item) - (parseFloat(item.total_deductions) || 0)
}

export default function PayrollCreate({ employees, period_from, period_to, period_label, cutoff, is_first }) {
    const [items, setItems]       = useState(employees.map(e => ({ ...e })))
    const [processing, setProcessing] = useState(false)

    function update(index, field, value) {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
    }

    function submit() {
        setProcessing(true)
        router.post('/admin/payroll', {
            period_label,
            period_from,
            period_to,
            cutoff,
            items: items.map(item => ({
                employee_id:       item.id,
                days_present:      item.days_present,
                weekday_ot_hours:  item.weekday_ot_hours || 0,
                weekend_ot_hours:  item.weekend_ot_hours || 0,
            })),
        }, { onError: () => setProcessing(false) })
    }

    const totalGross = items.reduce((s, i) => s + computeGross(i), 0)
    const totalDed   = items.reduce((s, i) => s + (parseFloat(i.total_deductions) || 0), 0)
    const totalNet   = items.reduce((s, i) => s + computeNet(i), 0)

    return (
        <AdminLayout>
            <div className="min-h-screen bg-bg">
            <div className="p-4 sm:p-6 max-w-full">

                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-dim">
                            <a href="/admin/payroll" className="hover:text-text">← Payroll</a>
                            <span>/</span>
                            <span className="text-sub">New payroll</span>
                        </div>
                        <h1 className="text-lg font-medium text-text">{period_label}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                is_first ? 'bg-blue/10 text-blue' : 'bg-purple/10 text-purple'
                            }`}>
                                {is_first ? '1st cutoff — SSS/PhilHealth/Pag-IBIG deducted in full' : '2nd cutoff — Govt deductions waived'}
                            </span>
                        </div>
                    </div>

                    {/* Totals + save */}
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden lg:block">
                            <div className="flex gap-5 text-xs text-dim mb-1">
                                <span>Gross <strong className="text-sub text-sm ml-1">₱ {fmt(totalGross)}</strong></span>
                                <span>Deductions <strong className="text-red text-sm ml-1">₱ {fmt(totalDed)}</strong></span>
                                <span>Net pay <strong className="text-teal text-sm ml-1">₱ {fmt(totalNet)}</strong></span>
                            </div>
                        </div>
                        <button onClick={submit} disabled={processing}
                            className="px-5 py-2.5 text-sm font-medium rounded-lg disabled:opacity-60 whitespace-nowrap bg-violet text-bg">
                            {processing ? 'Saving…' : 'Save payroll'}
                        </button>
                    </div>
                </div>

                {/* Formula reminder */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4 text-xs text-dim">
                    <span>Monthly basic = <strong className="text-sub">daily rate × 22</strong></span>
                    <span>·</span>
                    <span>Cutoff basic = <strong className="text-sub">monthly basic ÷ 2</strong></span>
                    <span>·</span>
                    <span>Weekday OT = <strong className="text-sub">rate/8 × 125% × hrs</strong></span>
                    <span>·</span>
                    <span>Weekend OT = <strong className="text-sub">rate/8 × 130% × hrs</strong></span>
                </div>

                {/* Table */}
                <div className="bg-panel rounded-xl border border-border overflow-x-auto">
                    <table className="text-xs w-full" style={{ minWidth: 1200 }}>
                        <thead>
                            <tr className="bg-field border-b border-border">
                                {/* Employee */}
                                <th className="text-left px-4 py-3 text-dim font-medium" rowSpan={2} style={{ minWidth: 170, verticalAlign: 'middle' }}>Employee</th>
                                <th className="text-center px-3 py-3 text-dim font-medium" rowSpan={2} style={{ verticalAlign: 'middle' }}>Days<br/>present</th>

                                {/* Gross group */}
                                <th className="text-center px-3 py-2 text-blue font-medium border-l border-border" colSpan={4}>Gross components (cutoff)</th>

                                {/* OT group */}
                                <th className="text-center px-3 py-2 text-amber font-medium border-l border-border" colSpan={4}>Overtime</th>

                                {/* Totals */}
                                <th className="text-right px-3 py-2 text-teal font-medium border-l border-border" rowSpan={2} style={{ verticalAlign: 'middle' }}>Gross pay</th>

                                {/* Deductions group */}
                                <th className="text-center px-3 py-2 text-red font-medium border-l border-border" colSpan={is_first ? 5 : 1}>Deductions</th>

                                <th className="text-right px-4 py-2 font-medium border-l border-border" rowSpan={2} className="text-violet" style={{ verticalAlign: 'middle' }}>Net pay</th>
                            </tr>
                            <tr className="bg-field border-b border-border text-dim">
                                {/* Gross sub-headers */}
                                <th className="text-right px-3 py-2 font-medium border-l border-border">Basic</th>
                                <th className="text-right px-3 py-2 font-medium">Transpo</th>
                                <th className="text-right px-3 py-2 font-medium">Rep</th>
                                <th className="text-right px-3 py-2 font-medium">Quarterly</th>

                                {/* OT sub-headers */}
                                <th className="text-center px-2 py-2 font-medium border-l border-border" style={{ minWidth: 70 }}>WD hrs</th>
                                <th className="text-right px-2 py-2 font-medium">WD pay</th>
                                <th className="text-center px-2 py-2 font-medium" style={{ minWidth: 70 }}>WE hrs</th>
                                <th className="text-right px-2 py-2 font-medium">WE pay</th>

                                {/* Deduction sub-headers */}
                                {is_first && <>
                                    <th className="text-right px-3 py-2 font-medium border-l border-border">SSS</th>
                                    <th className="text-right px-3 py-2 font-medium">PhilHealth</th>
                                    <th className="text-right px-3 py-2 font-medium">Pag-IBIG</th>
                                    <th className="text-right px-3 py-2 font-medium">Tax</th>
                                </>}
                                <th className="text-right px-3 py-2 font-medium border-l border-border">Other ded.</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((item, index) => {
                                const { weekdayOtPay, weekendOtPay, totalOtPay } = computeOtPay(item)
                                const gross = computeGross(item)
                                const net   = computeNet(item)
                                const splitDed = (parseFloat(item.loan_deduction) || 0)
                                    + (parseFloat(item.cc_deduction) || 0)
                                    + (parseFloat(item.cash_advance_deduction) || 0)
                                    + (parseFloat(item.savings_deduction) || 0)
                                    + (parseFloat(item.share_capital_deduction) || 0)
                                    + (parseFloat(item.other_deductions) || 0)

                                return (
                                    <tr key={item.id} className="border-b border-border hover:bg-hover transition-colors">
                                        {/* Employee */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-medium bg-violet/15 text-violet">
                                                    {item.initials}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-text whitespace-nowrap">{item.full_name}</p>
                                                    <p className="text-dim">{item.employee_id} · ₱{fmt(item.daily_rate)}/day</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Days present */}
                                        <td className="px-3 py-3 text-center font-medium text-sub">{item.days_present}</td>

                                        {/* Gross components */}
                                        <td className="px-3 py-3 text-right text-sub border-l border-border">₱ {fmt(item.cutoff_basic)}</td>
                                        <td className="px-3 py-3 text-right text-sub">₱ {fmt(item.cutoff_transpo)}</td>
                                        <td className="px-3 py-3 text-right text-sub">₱ {fmt(item.cutoff_rep)}</td>
                                        <td className="px-3 py-3 text-right text-sub">₱ {fmt(item.cutoff_quarterly)}</td>

                                        {/* OT inputs */}
                                        <td className="px-2 py-2 border-l border-border">
                                            <input type="number" min="0" step="0.5"
                                                value={item.weekday_ot_hours}
                                                onChange={e => update(index, 'weekday_ot_hours', e.target.value)}
                                                placeholder="0"
                                                className="w-full px-2 py-1.5 border border-border rounded-lg text-center focus:outline-none focus:ring-1 focus:ring-amber/30 bg-amber/10" />
                                        </td>
                                        <td className="px-2 py-3 text-right text-amber">₱ {fmt(weekdayOtPay)}</td>
                                        <td className="px-2 py-2">
                                            <input type="number" min="0" step="0.5"
                                                value={item.weekend_ot_hours}
                                                onChange={e => update(index, 'weekend_ot_hours', e.target.value)}
                                                placeholder="0"
                                                className="w-full px-2 py-1.5 border border-border rounded-lg text-center focus:outline-none focus:ring-1 focus:ring-amber/30 bg-amber/10" />
                                        </td>
                                        <td className="px-2 py-3 text-right text-amber">₱ {fmt(weekendOtPay)}</td>

                                        {/* Gross pay */}
                                        <td className="px-3 py-3 text-right font-medium text-text border-l border-border">
                                            ₱ {fmt(gross)}
                                        </td>

                                        {/* Deductions */}
                                        {is_first && <>
                                            <td className="px-3 py-3 text-right text-red border-l border-border">₱ {fmt(item.sss_deduction)}</td>
                                            <td className="px-3 py-3 text-right text-red">₱ {fmt(item.philhealth_deduction)}</td>
                                            <td className="px-3 py-3 text-right text-red">₱ {fmt(item.pagibig_deduction)}</td>
                                            <td className="px-3 py-3 text-right text-red">₱ {fmt(item.tax_deduction)}</td>
                                        </>}
                                        <td className="px-3 py-3 text-right text-red border-l border-border" title="Loan + CC + Cash advance + Savings + Share capital + Other">
                                            ₱ {fmt(splitDed)}
                                        </td>

                                        {/* Net pay */}
                                        <td className={`px-4 py-3 text-right font-medium border-l border-border ${net < 0 ? 'text-red' : 'text-teal'}`}>
                                            ₱ {fmt(net)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>

                        {/* Footer totals */}
                        <tfoot>
                            <tr className="border-t-2 border-border bg-field font-medium">
                                <td colSpan={2} className="px-4 py-3 text-sub">
                                    Total — {items.length} employees
                                </td>
                                <td colSpan={4} className="px-3 py-3 text-right text-sub border-l border-border">
                                    ₱ {fmt(items.reduce((s, i) => s + (parseFloat(i.cutoff_gross) || 0), 0))}
                                </td>
                                <td colSpan={4} className="px-2 py-3 text-right text-amber border-l border-border">
                                    ₱ {fmt(items.reduce((s, i) => { const { totalOtPay } = computeOtPay(i); return s + totalOtPay }, 0))}
                                </td>
                                <td className="px-3 py-3 text-right text-text border-l border-border">
                                    ₱ {fmt(totalGross)}
                                </td>
                                <td colSpan={is_first ? 5 : 1} className="px-3 py-3 text-right text-red border-l border-border">
                                    ₱ {fmt(totalDed)}
                                </td>
                                <td className="px-4 py-3 text-right text-teal border-l border-border">
                                    ₱ {fmt(totalNet)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-dim">
                    <span><span className="inline-block w-2 h-2 rounded-sm bg-amber/20 border border-amber/40 mr-1"></span>WD = Weekday OT (×1.25) &nbsp; WE = Weekend/Rest day OT (×1.30)</span>
                    {!is_first && <span>⚠ 2nd cutoff — SSS, PhilHealth, Pag-IBIG, Tax not deducted this period.</span>}
                </div>
            </div>
            </div>
        </AdminLayout>
    )
}