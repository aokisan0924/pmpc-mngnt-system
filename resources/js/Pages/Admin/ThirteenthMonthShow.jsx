import { useState } from 'react'
import { router, usePage, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import Button from '@/Components/UI/Button'
import ConfirmModal from '@/Components/ConfirmModal'
import AdminPageHeader from '@/Components/AdminPageHeader'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    })
}

export default function ThirteenthMonthShow({
    records = [], year, tranche, tranche_label,
    period_from, period_to, status, total_payout,
}) {
    const { flash } = usePage().props
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [processing, setProcessing]   = useState(false)

    function finalize() {
        setConfirmOpen(true)
    }

    function handleConfirm() {
        setProcessing(true)
        router.post('/admin/thirteenth-month/finalize', { year, tranche }, {
            onFinish: () => {
                setProcessing(false)
                setConfirmOpen(false)
            },
        })
    }

    return (
        <AdminLayout>
            <div className="admin-page-shell max-w-6xl space-y-4 sm:space-y-5 page-enter">
                {flash?.success && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        {flash.success}
                    </div>
                )}

                {/* Header */}
                <AdminPageHeader
                    eyebrow="Statutory batch ledger"
                    title={`13th Month Pay — ${year}`}
                    description={`${period_from} to ${period_to} · ${records.length} employee records`}
                    badge={`${tranche_label} · ${status}`}
                    meta={<Link href="/admin/thirteenth-month" className="font-medium text-indigo-100 hover:text-white">← Back to 13th Month Ledger</Link>}
                    action={status === 'draft' && (
                        <Button
                            variant="primary"
                            size="md"
                            onClick={finalize}
                            className="admin-header-primary shadow-xs"
                        >
                            Finalize Batch
                        </Button>
                    )}
                />

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <p className="text-xs font-semibold text-sub uppercase tracking-wider mb-1">Employees Covered</p>
                            <p className="text-2xl font-heading font-bold text-text tnum">{records.length}</p>
                            <p className="text-[11px] text-dim mt-1">Eligible cooperative personnel</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <p className="text-xs font-semibold text-sub uppercase tracking-wider mb-1">Total Basic Pay (Period)</p>
                            <p className="text-2xl font-heading font-bold text-text tnum">
                                ₱ {fmt(records.reduce((s, r) => s + (parseFloat(r.total_basic_pay) || 0), 0))}
                            </p>
                            <p className="text-[11px] text-dim mt-1">Cumulative qualifying earnings</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Total 13th Month Payout</p>
                            <p className="text-2xl font-heading font-bold text-emerald-600 dark:text-emerald-400 tnum">
                                ₱ {fmt(total_payout)}
                            </p>
                            <p className="text-[11px] text-dim mt-1">Total statutory disbursement</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Table Card */}
                <Card className="admin-workspace-card overflow-hidden">
                    <CardHeader>
                        <CardTitle>Batch Personnel Breakdown</CardTitle>
                        <span className="text-xs text-sub">{records.length} records in batch</span>
                    </CardHeader>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[720px]">
                            <thead>
                                <tr className="bg-field/70 border-b border-border/80 text-sub uppercase text-[11px]">
                                    <th scope="col" className="text-left px-5 py-3 font-semibold">Employee</th>
                                    <th scope="col" className="text-center px-4 py-3 font-semibold">Days Present</th>
                                    <th scope="col" className="text-right px-4 py-3 font-semibold">Daily Rate</th>
                                    <th scope="col" className="text-right px-4 py-3 font-semibold">Total Basic Pay</th>
                                    <th scope="col" className="text-right px-5 py-3 font-semibold text-emerald-600 dark:text-emerald-400">13th Month Pay</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 tnum">
                                {records.map(r => (
                                    <tr key={r.id} className="hover:bg-field/40 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-heading font-semibold text-xs flex-shrink-0">
                                                    {r.initials}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-text">{r.full_name}</p>
                                                    <p className="text-[11px] text-sub font-mono">{r.employee_id} · {r.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-center font-semibold text-text">
                                            {r.days_present}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-medium text-sub">
                                            ₱ {fmt(r.daily_rate)}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-medium text-text">
                                            ₱ {fmt(r.total_basic_pay)}
                                            <p className="text-[10px] text-dim font-mono">
                                                ₱{fmt(r.daily_rate)} × {r.days_present}d
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-heading font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                            ₱ {fmt(r.thirteenth_month_pay)}
                                            <p className="text-[10px] text-dim font-mono">÷ 12</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-border/80 bg-field/60 font-semibold tnum">
                                    <td className="px-5 py-3.5 text-text font-heading">
                                        Totals — {records.length} employees
                                    </td>
                                    <td className="px-4 py-3.5 text-center text-text font-mono">
                                        {records.reduce((s, r) => s + (r.days_present || 0), 0)}d
                                    </td>
                                    <td className="px-4 py-3.5"></td>
                                    <td className="px-4 py-3.5 text-right text-text font-bold">
                                        ₱ {fmt(records.reduce((s, r) => s + (parseFloat(r.total_basic_pay) || 0), 0))}
                                    </td>
                                    <td className="px-5 py-3.5 text-right text-emerald-600 dark:text-emerald-400 font-heading font-bold text-base">
                                        ₱ {fmt(total_payout)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>

                {/* Statutory Reference */}
                <p className="text-center text-xs text-dim">
                    Computed under Republic Act 6686 and Presidential Decree 851 · Statutory formula: Total basic pay earned in period ÷ 12
                </p>
            </div>

            <ConfirmModal
                open={confirmOpen}
                title="Finalize 13th month pay?"
                message={`This will lock the ${year} ${tranche_label} 13th month pay for all ${records.length} employees permanently. Under statutory accounting rules, finalized batches cannot be undone or altered.`}
                confirmLabel="Yes, finalize batch"
                cancelLabel="Cancel"
                confirmStyle="emerald"
                processing={processing}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmOpen(false)}
            />
        </AdminLayout>
    )
}
