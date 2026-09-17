import { useState } from 'react'
import { router, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardContent } from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    })
}

export default function ThirteenthMonthCompute({
    employees = [], year, tranche, tranche_label, period_from, period_to,
}) {
    const [processing, setProcessing] = useState(false)

    const totalBasicPay     = employees.reduce((s, e) => s + (parseFloat(e.total_basic_pay)      || 0), 0)
    const total13th         = employees.reduce((s, e) => s + (parseFloat(e.thirteenth_month_pay) || 0), 0)
    const alreadyProcessed  = employees.filter(e => e.already_processed).length

    function save() {
        setProcessing(true)
        router.post('/admin/thirteenth-month', {
            year,
            tranche,
            period_from,
            period_to,
            items: employees.map(e => ({
                employee_id:          e.id,
                days_present:         e.days_present,
                daily_rate:           e.daily_rate,
                total_basic_pay:      e.total_basic_pay,
                thirteenth_month_pay: e.thirteenth_month_pay,
            })),
        }, {
            onError: () => setProcessing(false),
        })
    }

    return (
        <AdminLayout>
            <div className="mx-auto max-w-6xl space-y-4 px-3.5 py-3.5 sm:space-y-5 sm:px-5 sm:py-4 lg:px-6 page-enter">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-2 border-b border-border/80">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5 text-xs text-sub">
                            <Link href="/admin/thirteenth-month" className="hover:text-text font-medium transition-colors">
                                ← Back to 13th Month Ledger
                            </Link>
                            <span>/</span>
                            <span className="text-text font-semibold">Computation Batch</span>
                        </div>
                        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text tracking-tight">
                            13th Month Pay — {year}
                        </h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant={tranche === 'mid_year' ? 'indigo' : 'purple'} dot size="sm">
                                {tranche_label}
                            </Badge>
                            <span className="text-xs text-sub font-mono">
                                ({period_from} – {period_to})
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap self-start sm:self-auto">
                        <div className="bg-panel px-4 py-2 rounded-xl border border-border/80 shadow-xs text-right">
                            <p className="text-[10px] font-semibold text-sub uppercase tracking-wider">Total 13th Month Payout</p>
                            <p className="text-lg font-heading font-bold text-emerald-600 dark:text-emerald-400 tnum">₱ {fmt(total13th)}</p>
                        </div>
                        <Button
                            variant="primary"
                            size="md"
                            loading={processing}
                            onClick={save}
                            className="shadow-xs"
                        >
                            Save Computation Batch →
                        </Button>
                    </div>
                </div>

                {/* Formula reminder */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 rounded-xl bg-field/60 border border-border/80 text-xs text-sub">
                    <span className="font-semibold text-text">Computation Rule:</span>
                    <span>Basic Pay = <strong className="text-text font-mono">Daily Rate × Days Present</strong></span>
                    <span className="text-dim">•</span>
                    <span>13th Month Pay = <strong className="text-text font-mono">Total Basic Pay ÷ 12</strong></span>
                    <span className="text-dim">•</span>
                    <span>Automatic pro-ration based on verified DTR attendance</span>
                </div>

                {alreadyProcessed > 0 && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        <span>
                            {alreadyProcessed} employee{alreadyProcessed > 1 ? 's' : ''} already have a saved record for this tranche. Saving will overwrite the existing draft.
                        </span>
                    </div>
                )}

                {/* Table Card */}
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[820px]">
                            <thead>
                                <tr className="bg-field/70 border-b border-border/80 text-sub uppercase text-[11px]">
                                    <th scope="col" className="text-left px-5 py-3 font-semibold">Employee</th>
                                    <th scope="col" className="text-center px-4 py-3 font-semibold">Days Present</th>
                                    <th scope="col" className="text-right px-4 py-3 font-semibold">Daily Rate</th>
                                    <th scope="col" className="text-right px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20">Total Basic Pay</th>
                                    <th scope="col" className="text-center px-3 py-3 font-semibold">Divisor</th>
                                    <th scope="col" className="text-right px-5 py-3 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20">13th Month Pay</th>
                                    <th scope="col" className="text-center px-4 py-3 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 tnum">
                                {employees.map(emp => (
                                    <tr key={emp.id} className="hover:bg-field/40 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-heading font-semibold text-xs flex-shrink-0">
                                                    {emp.initials}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-text">{emp.full_name}</p>
                                                    <p className="text-[11px] text-sub font-mono">{emp.employee_id} · {emp.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-center font-semibold text-text">
                                            {emp.days_present}
                                            {emp.days_present === 0 && (
                                                <span className="ml-1 text-[10px] text-amber-600 font-normal">(No DTR)</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-medium text-sub">
                                            ₱ {fmt(emp.daily_rate)}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-semibold text-text bg-indigo-50/30 dark:bg-indigo-950/20">
                                            ₱ {fmt(emp.total_basic_pay)}
                                            <p className="text-[10px] text-dim font-normal font-mono">
                                                ₱{fmt(emp.daily_rate)} × {emp.days_present}d
                                            </p>
                                        </td>
                                        <td className="px-3 py-3.5 text-center font-mono text-dim">
                                            ÷ 12
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-heading font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 text-sm">
                                            ₱ {fmt(emp.thirteenth_month_pay)}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            {emp.already_processed ? (
                                                <Badge
                                                    variant={emp.existing_status === 'finalized' ? 'emerald' : 'amber'}
                                                    size="sm"
                                                    dot
                                                >
                                                    {emp.existing_status}
                                                </Badge>
                                            ) : (
                                                <span className="text-dim text-[11px]">Ready</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-border/80 bg-field/60 font-semibold tnum">
                                    <td className="px-5 py-3.5 text-text font-heading">
                                        Totals — {employees.length} employees
                                    </td>
                                    <td className="px-4 py-3.5 text-center text-text font-mono">
                                        {employees.reduce((s, e) => s + (e.days_present || 0), 0)}d
                                    </td>
                                    <td className="px-4 py-3.5"></td>
                                    <td className="px-4 py-3.5 text-right text-text font-bold bg-indigo-50/30 dark:bg-indigo-950/20">
                                        ₱ {fmt(totalBasicPay)}
                                    </td>
                                    <td className="px-3 py-3.5"></td>
                                    <td className="px-5 py-3.5 text-right text-emerald-600 dark:text-emerald-400 font-heading font-bold text-base bg-emerald-50/40 dark:bg-emerald-950/20">
                                        ₱ {fmt(total13th)}
                                    </td>
                                    <td className="px-4 py-3.5"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            </div>
        </AdminLayout>
    )
}
