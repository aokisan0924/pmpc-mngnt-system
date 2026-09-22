import { useState, useMemo } from 'react'
import { router, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import Button from '@/Components/UI/Button'
import AdminPageHeader from '@/Components/AdminPageHeader'

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

export default function PayrollCreate({ employees = [], period_from, period_to, period_label, cutoff, is_first }) {
    const [items, setItems]           = useState(employees.map(e => ({ ...e })))
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

    const { totalGross, totalDed, totalNet } = useMemo(() => {
        let gross = 0
        let ded = 0
        let net = 0
        for (const item of items) {
            gross += computeGross(item)
            ded   += (parseFloat(item.total_deductions) || 0)
            net   += computeNet(item)
        }
        return { totalGross: gross, totalDed: ded, totalNet: net }
    }, [items])

    return (
        <AdminLayout>
            <div className="admin-page-shell space-y-4 sm:space-y-5 page-enter">
                {/* ── Top Header ────────────────────────────────────── */}
                <AdminPageHeader
                    eyebrow="Payroll batch preparation"
                    title={period_label}
                    description="Verify DTR days, enter overtime adjustments, and inspect deduction splits before saving this batch."
                    badge={is_first ? '1st cutoff · full deductions' : '2nd cutoff · deductions waived'}
                    meta={<Link href="/admin/payroll" className="font-medium text-indigo-100 hover:text-white">← Back to Payroll Ledger</Link>}
                    action={
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-4 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs shadow-xs">
                            <div>
                                <span className="block text-[10px] font-semibold uppercase text-indigo-200">Gross Pay</span>
                                <strong className="font-heading text-sm font-bold text-white tnum">₱ {fmt(totalGross)}</strong>
                            </div>
                            <div className="h-7 w-px bg-white/20" />
                            <div>
                                <span className="block text-[10px] font-semibold uppercase text-rose-200">Deductions</span>
                                <strong className="font-heading text-sm font-bold text-rose-100 tnum">-₱ {fmt(totalDed)}</strong>
                            </div>
                            <div className="h-7 w-px bg-white/20" />
                            <div>
                                <span className="block text-[10px] font-semibold uppercase text-emerald-200">Net Payout</span>
                                <strong className="font-heading text-sm font-bold text-emerald-100 tnum">₱ {fmt(totalNet)}</strong>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            size="md"
                            loading={processing}
                            onClick={submit}
                            className="admin-header-primary shadow-xs"
                        >
                            Save Payroll Batch →
                        </Button>
                    </div>
                    }
                />

                {/* ── Formula Reminder ──────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 rounded-xl bg-field/60 border border-border/80 text-xs text-sub">
                    <span className="font-semibold text-text">Compensation Formulas:</span>
                    <span>Monthly Basic = <strong className="text-text font-mono">Daily Rate × 22</strong></span>
                    <span className="text-dim">•</span>
                    <span>Cutoff Basic = <strong className="text-text font-mono">Monthly Basic ÷ 2</strong></span>
                    <span className="text-dim">•</span>
                    <span>Weekday OT = <strong className="text-text font-mono">Rate/8 × 125% × Hrs</strong></span>
                    <span className="text-dim">•</span>
                    <span>Weekend/Rest OT = <strong className="text-text font-mono">Rate/8 × 130% × Hrs</strong></span>
                </div>

                {/* ── Table Card ────────────────────────────────────── */}
                <Card className="admin-workspace-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="text-xs w-full min-w-[1200px]">
                            <thead>
                                <tr className="bg-field/70 border-b border-border/80 text-sub">
                                    {/* Employee */}
                                    <th scope="col" rowSpan={2} className="text-left px-5 py-3 font-semibold text-[11px] uppercase" style={{ minWidth: 190, verticalAlign: 'middle' }}>
                                        Employee
                                    </th>
                                    <th scope="col" rowSpan={2} className="text-center px-3 py-3 font-semibold text-[11px] uppercase" style={{ verticalAlign: 'middle' }}>
                                        Days<br/>Present
                                    </th>

                                    {/* Gross group */}
                                    <th scope="colgroup" colSpan={4} className="text-center px-3 py-2 font-semibold text-[11px] uppercase text-indigo-600 dark:text-indigo-400 border-l border-border/80">
                                        Gross Components (Cutoff)
                                    </th>

                                    {/* OT group */}
                                    <th scope="colgroup" colSpan={4} className="text-center px-3 py-2 font-semibold text-[11px] uppercase text-amber-600 dark:text-amber-400 border-l border-border/80">
                                        Overtime Adjustments
                                    </th>

                                    {/* Totals */}
                                    <th scope="col" rowSpan={2} className="text-right px-4 py-2 font-semibold text-[11px] uppercase text-emerald-600 dark:text-emerald-400 border-l border-border/80" style={{ verticalAlign: 'middle' }}>
                                        Gross Pay
                                    </th>

                                    {/* Deductions group */}
                                    <th scope="colgroup" colSpan={is_first ? 5 : 1} className="text-center px-3 py-2 font-semibold text-[11px] uppercase text-rose-600 dark:text-rose-400 border-l border-border/80">
                                        Deductions
                                    </th>

                                    <th scope="col" rowSpan={2} className="text-right px-5 py-2 font-semibold text-[11px] uppercase text-text border-l border-border/80" style={{ verticalAlign: 'middle' }}>
                                        Net Pay
                                    </th>
                                </tr>
                                <tr className="bg-field/50 border-b border-border/80 text-sub text-[11px]">
                                    {/* Gross sub-headers */}
                                    <th scope="col" className="text-right px-3 py-2 font-medium border-l border-border/80">Basic</th>
                                    <th scope="col" className="text-right px-3 py-2 font-medium">Transpo</th>
                                    <th scope="col" className="text-right px-3 py-2 font-medium">Rep</th>
                                    <th scope="col" className="text-right px-3 py-2 font-medium">Quarterly</th>

                                    {/* OT sub-headers */}
                                    <th scope="col" className="text-center px-2 py-2 font-medium border-l border-border/80" style={{ minWidth: 70 }}>WD Hrs</th>
                                    <th scope="col" className="text-right px-2 py-2 font-medium">WD Pay</th>
                                    <th scope="col" className="text-center px-2 py-2 font-medium" style={{ minWidth: 70 }}>WE Hrs</th>
                                    <th scope="col" className="text-right px-2 py-2 font-medium">WE Pay</th>

                                    {/* Deduction sub-headers */}
                                    {is_first && (
                                        <>
                                            <th scope="col" className="text-right px-3 py-2 font-medium border-l border-border/80">SSS</th>
                                            <th scope="col" className="text-right px-3 py-2 font-medium">PhilHealth</th>
                                            <th scope="col" className="text-right px-3 py-2 font-medium">Pag-IBIG</th>
                                            <th scope="col" className="text-right px-3 py-2 font-medium">Tax</th>
                                        </>
                                    )}
                                    <th scope="col" className="text-right px-3 py-2 font-medium border-l border-border/80">Other Ded.</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-border/60 tnum">
                                {items.map((item, index) => {
                                    const { weekdayOtPay, weekendOtPay } = computeOtPay(item)
                                    const gross = computeGross(item)
                                    const net   = computeNet(item)
                                    const splitDed = (parseFloat(item.loan_deduction) || 0)
                                        + (parseFloat(item.capital_contribution_deduction) || 0)
                                        + (parseFloat(item.cash_advance_deduction) || 0)
                                        + (parseFloat(item.rental_deduction) || 0)
                                        + (parseFloat(item.savings_deduction) || 0)
                                        + (parseFloat(item.other_deductions) || 0)

                                    return (
                                        <tr key={item.id} className="hover:bg-field/40 transition-colors">
                                            {/* Employee */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-heading font-semibold text-xs flex-shrink-0">
                                                        {item.initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-text whitespace-nowrap">{item.full_name}</p>
                                                        <p className="text-[11px] text-sub font-mono">{item.employee_id} • ₱{fmt(item.daily_rate)}/day</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Days present */}
                                            <td className="px-3 py-3.5 text-center font-semibold text-text">
                                                {item.days_present}
                                            </td>

                                            {/* Gross components */}
                                            <td className="px-3 py-3.5 text-right font-medium text-text border-l border-border/80">₱ {fmt(item.cutoff_basic)}</td>
                                            <td className="px-3 py-3.5 text-right text-sub">₱ {fmt(item.cutoff_transpo)}</td>
                                            <td className="px-3 py-3.5 text-right text-sub">₱ {fmt(item.cutoff_rep)}</td>
                                            <td className="px-3 py-3.5 text-right text-sub">₱ {fmt(item.cutoff_quarterly)}</td>

                                            {/* OT inputs */}
                                            <td className="px-2 py-2.5 border-l border-border/80">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={item.weekday_ot_hours ?? ''}
                                                    onChange={e => update(index, 'weekday_ot_hours', e.target.value)}
                                                    placeholder="0"
                                                    aria-label={`Weekday OT hours for ${item.full_name}`}
                                                    className="w-full px-2 py-1.5 border border-amber-500/30 rounded-lg text-center font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 placeholder:text-dim"
                                                />
                                            </td>
                                            <td className="px-2 py-3.5 text-right font-medium text-amber-600 dark:text-amber-400">₱ {fmt(weekdayOtPay)}</td>
                                            <td className="px-2 py-2.5">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={item.weekend_ot_hours ?? ''}
                                                    onChange={e => update(index, 'weekend_ot_hours', e.target.value)}
                                                    placeholder="0"
                                                    aria-label={`Weekend OT hours for ${item.full_name}`}
                                                    className="w-full px-2 py-1.5 border border-amber-500/30 rounded-lg text-center font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 placeholder:text-dim"
                                                />
                                            </td>
                                            <td className="px-2 py-3.5 text-right font-medium text-amber-600 dark:text-amber-400">₱ {fmt(weekendOtPay)}</td>

                                            {/* Gross pay */}
                                            <td className="px-4 py-3.5 text-right font-semibold text-text border-l border-border/80">
                                                ₱ {fmt(gross)}
                                            </td>

                                            {/* Deductions */}
                                            {is_first && (
                                                <>
                                                    <td className="px-3 py-3.5 text-right text-rose-600 border-l border-border/80">₱ {fmt(item.sss_deduction)}</td>
                                                    <td className="px-3 py-3.5 text-right text-rose-600">₱ {fmt(item.philhealth_deduction)}</td>
                                                    <td className="px-3 py-3.5 text-right text-rose-600">₱ {fmt(item.pagibig_deduction)}</td>
                                                    <td className="px-3 py-3.5 text-right text-rose-600">₱ {fmt(item.tax_deduction)}</td>
                                                </>
                                            )}
                                            <td className="px-3 py-3.5 text-right text-rose-600 border-l border-border/80" title="Loan + CC + Cash advance + Savings + Share capital + Other">
                                                -₱ {fmt(splitDed)}
                                            </td>

                                            {/* Net pay */}
                                            <td className={`px-5 py-3.5 text-right font-heading font-bold text-sm border-l border-border/80 ${net < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                ₱ {fmt(net)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>

                            {/* Footer totals */}
                            <tfoot>
                                <tr className="border-t-2 border-border/80 bg-field/60 font-semibold tnum">
                                    <td colSpan={2} className="px-5 py-3.5 text-text font-heading">
                                        Totals — {items.length} employees
                                    </td>
                                    <td colSpan={4} className="px-3 py-3.5 text-right text-text border-l border-border/80">
                                        ₱ {fmt(items.reduce((s, i) => s + (parseFloat(i.cutoff_gross) || 0), 0))}
                                    </td>
                                    <td colSpan={4} className="px-2 py-3.5 text-right text-amber-600 dark:text-amber-400 border-l border-border/80">
                                        ₱ {fmt(items.reduce((s, i) => { const { totalOtPay } = computeOtPay(i); return s + totalOtPay }, 0))}
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-text font-bold border-l border-border/80">
                                        ₱ {fmt(totalGross)}
                                    </td>
                                    <td colSpan={is_first ? 5 : 1} className="px-3 py-3.5 text-right text-rose-600 border-l border-border/80">
                                        -₱ {fmt(totalDed)}
                                    </td>
                                    <td className="px-5 py-3.5 text-right text-emerald-600 font-heading font-bold text-base border-l border-border/80">
                                        ₱ {fmt(totalNet)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>

                {/* ── Legend ────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-sub px-1">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500/40" />
                        <span><strong>WD</strong> = Weekday OT (×1.25)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500/40" />
                        <span><strong>WE</strong> = Weekend/Rest Day OT (×1.30)</span>
                    </span>
                    {!is_first && (
                        <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.949 3.374H4.646c-1.732 0-2.815-1.874-1.949-3.374L10.05 3.374c.866-1.5 3.034-1.5 3.9 0l7.353 12.752zM12 15.75h.008v.008H12v-.008z" />
                            </svg>
                            <span>2nd Cutoff Notice: Statutory contributions (SSS, PhilHealth, Pag-IBIG, Tax) waived for this cycle.</span>
                        </span>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
