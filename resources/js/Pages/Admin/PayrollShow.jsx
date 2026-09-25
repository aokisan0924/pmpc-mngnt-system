import { useState } from 'react'
import { router, usePage, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import Button from '@/Components/UI/Button'
import ConfirmModal from '@/Components/ConfirmModal'
import AdminPageHeader from '@/Components/AdminPageHeader'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

export default function PayrollShow({ payroll, items = [] }) {
    const { flash } = usePage().props
    const isFirst   = payroll.cutoff === 'first'

    const [confirmOpen, setConfirmOpen]   = useState(false)
    const [processing, setProcessing]     = useState(false)
    const [deleteOpen, setDeleteOpen]     = useState(false)
    const [deleting, setDeleting]         = useState(false)

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

    function handleDeleteConfirm() {
        setDeleting(true)
        router.delete(`/admin/payroll/${payroll.id}`, {
            onFinish: () => {
                setDeleting(false)
                setDeleteOpen(false)
            },
        })
    }

    return (
        <AdminLayout>
            <div className="admin-page-shell space-y-4 sm:space-y-5 page-enter">
                {flash?.success && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        {flash.success}
                    </div>
                )}

                {/* ── Top Header ────────────────────────────────────── */}
                <AdminPageHeader
                    eyebrow="Payroll batch ledger"
                    title={payroll.period_label}
                    description={`${payroll.period_from} to ${payroll.period_to} · Generated compensation ledger`}
                    badge={`${payroll.cutoff_label} · ${payroll.status}`}
                    meta={<Link href="/admin/payroll" className="font-medium text-indigo-100 hover:text-white">← Back to Payroll Ledger</Link>}
                    action={
                    <div className="flex flex-wrap items-center gap-3">
                        <a
                            href={`/admin/payslips/download-all?month=${payroll.period_from?.slice(0, 7)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-white/20 sm:text-sm"
                        >
                            <span>Download All Payslips</span>
                            <span aria-hidden="true">↓</span>
                        </a>

                        {payroll.status === 'draft' && (
                            <>
                                <Button
                                    variant="danger"
                                    size="md"
                                    onClick={() => setDeleteOpen(true)}
                                    className="shadow-xs"
                                >
                                    Discard Draft
                                </Button>
                                <Button
                                    variant="primary"
                                    size="md"
                                    onClick={finalize}
                                    className="admin-header-primary shadow-xs"
                                >
                                    Finalize Payroll Batch
                                </Button>
                            </>
                        )}
                    </div>
                    }
                />

                {/* ── Summary Cards ──────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <p className="text-xs font-semibold text-sub uppercase tracking-wider mb-1">Total Gross Pay</p>
                            <p className="text-2xl sm:text-3xl font-heading font-bold text-text tnum">₱ {fmt(payroll.total_gross)}</p>
                            <p className="text-[11px] text-dim mt-1">Base salaries + overtime compensation</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">Total Deductions</p>
                            <p className="text-2xl sm:text-3xl font-heading font-bold text-rose-600 tnum">-₱ {fmt(payroll.total_deductions)}</p>
                            <p className="text-[11px] text-dim mt-1">Statutory contributions & cooperative loans</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Total Net Payout</p>
                            <p className="text-2xl sm:text-3xl font-heading font-bold text-emerald-600 tnum">₱ {fmt(payroll.total_net)}</p>
                            <p className="text-[11px] text-dim mt-1">Disbursable cooperative staff compensation</p>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Payroll Table Card ─────────────────────────────── */}
                <Card className="admin-workspace-card overflow-hidden">
                    <CardHeader>
                        <CardTitle>Batch Itemized Breakdown</CardTitle>
                        <span className="text-xs text-sub">{items.length} employee compensation records</span>
                    </CardHeader>

                    <div className="overflow-x-auto">
                        <table className="text-xs w-full min-w-[1100px]">
                            <thead>
                                <tr className="bg-field/70 border-b border-border/80 text-sub">
                                    <th scope="col" rowSpan={2} className="text-left px-5 py-3 font-semibold text-[11px] uppercase" style={{ verticalAlign: 'middle', minWidth: 190 }}>
                                        Employee
                                    </th>
                                    <th scope="col" rowSpan={2} className="text-center px-3 py-3 font-semibold text-[11px] uppercase" style={{ verticalAlign: 'middle' }}>
                                        Days
                                    </th>
                                    <th scope="colgroup" colSpan={5} className="text-center px-3 py-2 font-semibold text-[11px] uppercase text-indigo-600 dark:text-indigo-400 border-l border-border/80">
                                        Gross Breakdown
                                    </th>
                                    <th scope="col" rowSpan={2} className="text-right px-4 py-2 font-semibold text-[11px] uppercase text-emerald-600 dark:text-emerald-400 border-l border-border/80" style={{ verticalAlign: 'middle' }}>
                                        Gross Pay
                                    </th>
                                    <th scope="colgroup" colSpan={isFirst ? 5 : 1} className="text-center px-3 py-2 font-semibold text-[11px] uppercase text-rose-600 dark:text-rose-400 border-l border-border/80">
                                        Deductions
                                    </th>
                                    <th scope="col" rowSpan={2} className="text-right px-5 py-2 font-semibold text-[11px] uppercase text-text border-l border-border/80" style={{ verticalAlign: 'middle' }}>
                                        Net Pay
                                    </th>
                                </tr>
                                <tr className="bg-field/50 border-b border-border/80 text-sub text-[11px]">
                                    <th scope="col" className="text-right px-3 py-2 font-medium border-l border-border/80">Basic</th>
                                    <th scope="col" className="text-right px-3 py-2 font-medium">Transpo</th>
                                    <th scope="col" className="text-right px-3 py-2 font-medium">Rep</th>
                                    <th scope="col" className="text-right px-3 py-2 font-medium">Quarterly</th>
                                    <th scope="col" className="text-right px-3 py-2 font-medium">OT Pay</th>
                                    {isFirst && (
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
                                {items.map(item => {
                                    const splitDed = (parseFloat(item.loan_deduction) || 0)
                                        + (parseFloat(item.capital_contribution_deduction) || 0)
                                        + (parseFloat(item.cash_advance_deduction) || 0)
                                        + (parseFloat(item.rental_deduction) || 0)
                                        + (parseFloat(item.savings_deduction) || 0)
                                        + (parseFloat(item.other_deductions) || 0)

                                    return (
                                        <tr key={item.id} className="hover:bg-field/40 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-heading font-semibold text-xs flex-shrink-0">
                                                        {item.initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-text whitespace-nowrap">{item.full_name}</p>
                                                        <p className="text-[11px] text-sub font-mono">{item.employee_id} • {item.position}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3.5 text-center font-semibold text-text">{item.days_present}</td>
                                            <td className="px-3 py-3.5 text-right font-medium text-text border-l border-border/80">₱ {fmt(item.cutoff_basic)}</td>
                                            <td className="px-3 py-3.5 text-right text-sub">₱ {fmt(item.cutoff_transpo)}</td>
                                            <td className="px-3 py-3.5 text-right text-sub">₱ {fmt(item.cutoff_rep)}</td>
                                            <td className="px-3 py-3.5 text-right text-sub">₱ {fmt(item.cutoff_quarterly)}</td>
                                            <td className="px-3 py-3.5 text-right text-amber-600 dark:text-amber-400 font-medium">
                                                {item.total_ot_pay > 0 ? (
                                                    <span title={`WD: ₱${fmt(item.weekday_ot_pay)} + WE: ₱${fmt(item.weekend_ot_pay)}`}>
                                                        ₱ {fmt(item.total_ot_pay)}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-semibold text-text border-l border-border/80">
                                                ₱ {fmt(item.gross_pay)}
                                            </td>
                                            {isFirst && (
                                                <>
                                                    <td className="px-3 py-3.5 text-right text-rose-600 border-l border-border/80">₱ {fmt(item.sss_deduction)}</td>
                                                    <td className="px-3 py-3.5 text-right text-rose-600">₱ {fmt(item.philhealth_deduction)}</td>
                                                    <td className="px-3 py-3.5 text-right text-rose-600">₱ {fmt(item.pagibig_deduction)}</td>
                                                    <td className="px-3 py-3.5 text-right text-rose-600">₱ {fmt(item.tax_deduction)}</td>
                                                </>
                                            )}
                                            <td className="px-3 py-3.5 text-right text-rose-600 border-l border-border/80">
                                                -₱ {fmt(splitDed)}
                                            </td>
                                            <td className={`px-5 py-3.5 text-right font-heading font-bold text-sm border-l border-border/80 ${item.net_pay < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                ₱ {fmt(item.net_pay)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-border/80 bg-field/60 font-semibold tnum">
                                    <td colSpan={2} className="px-5 py-3.5 text-text font-heading">
                                        Totals — {items.length} employees
                                    </td>
                                    <td colSpan={5} className="px-3 py-3.5 text-right text-text border-l border-border/80">
                                        ₱ {fmt(payroll.total_gross - items.reduce((s, i) => s + (i.total_ot_pay || 0), 0))}
                                        <span className="text-amber-600 dark:text-amber-400 ml-2">+ OT ₱ {fmt(items.reduce((s, i) => s + (i.total_ot_pay || 0), 0))}</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-text font-bold border-l border-border/80">
                                        ₱ {fmt(payroll.total_gross)}
                                    </td>
                                    <td colSpan={isFirst ? 5 : 1} className="px-3 py-3.5 text-right text-rose-600 border-l border-border/80">
                                        -₱ {fmt(payroll.total_deductions)}
                                    </td>
                                    <td className="px-5 py-3.5 text-right text-emerald-600 font-heading font-bold text-base border-l border-border/80">
                                        ₱ {fmt(payroll.total_net)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>

                {/* ── OT Detail Breakdown ────────────────────────────── */}
                {items.some(i => i.total_ot_pay > 0) && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3.5 text-xs text-amber-700 dark:text-amber-300">
                        <p className="font-heading font-bold mb-2 uppercase tracking-wider text-[11px]">Recorded Overtime Detail Breakdown</p>
                        <div className="space-y-1">
                            {items.filter(i => i.total_ot_pay > 0).map(item => (
                                <p key={item.id} className="font-mono text-xs">
                                    <strong className="text-text">{item.full_name}</strong>
                                    {item.weekday_ot_hours > 0 && ` · Weekday: ${item.weekday_ot_hours}hrs @ ₱${fmt(item.weekday_ot_pay)}`}
                                    {item.weekend_ot_hours > 0 && ` · Weekend: ${item.weekend_ot_hours}hrs @ ₱${fmt(item.weekend_ot_pay)}`}
                                    {` · Total OT: ₱${fmt(item.total_ot_pay)}`}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Confirm Finalize Modal ─────────────────────────── */}
            <ConfirmModal
                open={confirmOpen}
                title="Finalize payroll batch?"
                message={`This will permanently lock the ${payroll.period_label} batch. Under statutory accounting rules, finalized payroll batches and generated payslips cannot be edited or deleted. Make sure all compensation figures and deductions are verified.`}
                confirmLabel="Yes, finalize batch"
                cancelLabel="Cancel"
                confirmStyle="primary"
                processing={processing}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmOpen(false)}
            />

            {/* ── Confirm Discard Draft Modal ────────────────────── */}
            <ConfirmModal
                open={deleteOpen}
                title="Discard draft payroll batch?"
                message={`Are you sure you want to discard the draft batch for ${payroll.period_label}? All draft item calculations will be removed. You can generate a new batch at any time.`}
                confirmLabel="Yes, discard draft"
                cancelLabel="Keep draft"
                confirmStyle="danger"
                processing={deleting}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteOpen(false)}
            />
        </AdminLayout>
    )
}
