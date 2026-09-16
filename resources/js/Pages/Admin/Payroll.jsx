import { useState } from 'react'
import { router, usePage, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'

export default function Payroll({ payrolls = [] }) {
    const { flash } = usePage().props
    const [periodFrom, setPeriodFrom] = useState('')
    const [periodTo, setPeriodTo] = useState('')
    const [cutoff, setCutoff] = useState('first')
    const [error, setError] = useState('')

    function startPayroll() {
        if (!periodFrom || !periodTo) {
            setError('Please select both starting and ending dates.')
            return
        }
        if (periodFrom > periodTo) {
            setError('Ending date must be on or after starting date.')
            return
        }
        setError('')
        router.get('/admin/payroll/create', { period_from: periodFrom, period_to: periodTo, cutoff })
    }

    function fmt(num) {
        return Number(num || 0).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    }

    return (
        <AdminLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 page-enter">
                {flash?.success && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        {flash.success}
                    </div>
                )}

                {/* ── Top Header ────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="indigo" dot>Financial Operations</Badge>
                            <span className="text-xs text-sub">• Semi-Monthly Cutoff Processing</span>
                        </div>
                        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text tracking-tight">
                            Payroll Management
                        </h1>
                        <p className="text-xs sm:text-sm text-sub mt-0.5">
                            Calculate base earnings, overtime hours, statutory government contributions, and generate payslips.
                        </p>
                    </div>

                    <Link href="/admin/payroll/analytics">
                        <Button variant="outline" size="sm">
                            View Payroll Analytics ↗
                        </Button>
                    </Link>
                </div>

                {/* ── Process New Payroll Card ──────────────────────── */}
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Initiate New Payroll Batch</CardTitle>
                            <p className="text-xs text-sub mt-0.5">
                                Select the cutoff period to pull DTR attendance days, overtime records, and deduction rules.
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-4 flex-wrap">
                            {/* Cutoff Selector */}
                            <div>
                                <label className="block text-xs font-medium text-sub mb-1.5">Cutoff Type</label>
                                <div className="flex items-center gap-1 bg-field p-1 rounded-lg border border-border/70">
                                    {[
                                        { value: 'first', label: '1st Cutoff (1st–15th: Full Deductions)' },
                                        { value: 'second', label: '2nd Cutoff (16th–EOM: Deductions Waived)' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setCutoff(opt.value)}
                                            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                                                cutoff === opt.value
                                                    ? 'bg-panel text-text shadow-2xs font-semibold'
                                                    : 'text-sub hover:text-text'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="flex items-center gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-sub mb-1.5">From Date</label>
                                    <input
                                        type="date"
                                        value={periodFrom}
                                        onChange={e => setPeriodFrom(e.target.value)}
                                        className="px-3 py-2 text-xs border border-border rounded-lg bg-panel text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-sub mb-1.5">To Date</label>
                                    <input
                                        type="date"
                                        value={periodTo}
                                        onChange={e => setPeriodTo(e.target.value)}
                                        className="px-3 py-2 text-xs border border-border rounded-lg bg-panel text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                            </div>

                            <Button variant="primary" size="md" onClick={startPayroll}>
                                Generate Batch Preview →
                            </Button>
                        </div>

                        {error && (
                            <p className="mt-3 text-xs text-rose-600 font-medium">
                                ⚠ {error}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* ── Payroll History Table ─────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Payroll Archive & Batches</CardTitle>
                        <span className="text-xs text-sub">{payrolls.length} finalized & draft runs</span>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[760px]">
                                <thead>
                                    <tr className="bg-field/70 border-b border-border/80 text-sub uppercase text-[11px]">
                                        <th className="text-left px-5 py-3 font-semibold">Period</th>
                                        <th className="text-left px-4 py-3 font-semibold">Cutoff</th>
                                        <th className="text-right px-4 py-3 font-semibold">Gross Pay</th>
                                        <th className="text-right px-4 py-3 font-semibold text-rose-600">Deductions</th>
                                        <th className="text-right px-4 py-3 font-semibold text-emerald-600">Net Pay</th>
                                        <th className="text-center px-4 py-3 font-semibold">Status</th>
                                        <th className="text-right px-5 py-3 font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 tnum">
                                    {payrolls.map(p => (
                                        <tr key={p.id} className="hover:bg-field/40 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <p className="font-semibold text-text">{p.period_label}</p>
                                                <p className="text-[11px] text-dim">{p.period_from} — {p.period_to}</p>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-sub border border-border/60">
                                                    {p.cutoff === 'first' ? '1st Cutoff' : '2nd Cutoff'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-medium text-text">
                                                ₱ {fmt(p.total_gross)}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-medium text-rose-600">
                                                -₱ {fmt(p.total_deductions)}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-heading font-bold text-sm text-emerald-600">
                                                ₱ {fmt(p.total_net)}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <Badge variant={p.status} dot size="sm">
                                                    {p.status}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <Link
                                                    href={`/admin/payroll/${p.id}`}
                                                    className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 shadow-2xs transition-colors hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-indigo-800/70 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                                                >
                                                    Open Batch →
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}

                                    {payrolls.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-sub">
                                                No payroll batches processed yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    )
}
