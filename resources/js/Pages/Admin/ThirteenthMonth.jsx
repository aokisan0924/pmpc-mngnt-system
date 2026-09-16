import { useState } from 'react'
import { router, usePage, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'

export default function ThirteenthMonth({ records = [] }) {
    const { flash } = usePage().props
    const [year, setYear] = useState(new Date().getFullYear())
    const [tranche, setTranche] = useState('mid_year')

    function fmt(num) {
        return Number(num || 0).toLocaleString('en-PH', {
            minimumFractionDigits: 2, maximumFractionDigits: 2,
        })
    }

    function startCompute() {
        router.get('/admin/thirteenth-month/compute', { year, tranche })
    }

    const totalHistoricalPayout = records.reduce((sum, r) => sum + (parseFloat(r.total_payout) || 0), 0)
    const totalBatches = records.length

    return (
        <AdminLayout>
            <div className="min-h-screen bg-bg p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">

                {flash?.success && (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold font-display text-text tracking-tight">13th Month Pay</h1>
                            <Badge variant="indigo" size="sm">Statutory (PD 851)</Badge>
                        </div>
                        <p className="text-sm text-sub mt-1">
                            Compute and disburse semi-annual mandatory 13th month pay based on actual DTR days rendered
                        </p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                        title="Historical 13th Month Total"
                        value={`₱ ${fmt(totalHistoricalPayout)}`}
                        sub="Cumulative statutory payout"
                        color="indigo"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Recorded Batches"
                        value={totalBatches}
                        sub="Finalized computation runs"
                        color="emerald"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Legal Mandate Rule"
                        value="1/12 Total Pay"
                        sub="Daily Rate × Days Present ÷ 12"
                        color="amber"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                </div>

                {/* Compute Action Card */}
                <Card
                    title="Run New 13th Month Computation"
                    description="Pulls verified DTR attendance logs and employee daily rates for the designated tranche"
                >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
                        <div className="flex flex-wrap items-end gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                    Calendar Year
                                </label>
                                <input
                                    type="number"
                                    value={year}
                                    onChange={e => setYear(e.target.value)}
                                    min="2020"
                                    max="2099"
                                    className="w-32 px-3.5 py-2.5 text-sm font-semibold border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                    Tranche Window
                                </label>
                                <div className="flex gap-1.5 p-1 bg-field rounded-xl border border-border">
                                    {[
                                        { value: 'mid_year', label: 'Mid-Year (Jan 1 – Jun 30)' },
                                        { value: 'year_end', label: 'Year-End (Jul 1 – Dec 31)' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setTranche(opt.value)}
                                            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                                                tranche === opt.value
                                                    ? 'bg-panel text-text font-semibold shadow-xs border border-border'
                                                    : 'text-sub hover:text-text'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            size="md"
                            onClick={startCompute}
                            className="shrink-0"
                        >
                            <span>Compute Tranche</span>
                            <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Button>
                    </div>
                </Card>

                {/* History Table */}
                <Card
                    title="13th Month Disbursement Records"
                    description="Archive of finalized statutory calculations and disbursements"
                >
                    <div className="overflow-x-auto -mx-6 -my-4">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-field/70 border-b border-border text-dim uppercase tracking-wider font-semibold">
                                    <th className="text-left px-6 py-3.5">Period Year</th>
                                    <th className="text-left px-4 py-3.5">Coverage Window</th>
                                    <th className="text-left px-4 py-3.5">Tranche</th>
                                    <th className="text-center px-4 py-3.5">Eligible Staff</th>
                                    <th className="text-right px-4 py-3.5">Total Payout</th>
                                    <th className="text-center px-4 py-3.5">Batch Status</th>
                                    <th className="text-right px-6 py-3.5">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {records.map(r => (
                                    <tr key={r.batch_key} className="hover:bg-hover/60 transition-colors">
                                        <td className="px-6 py-4 font-bold text-text font-mono text-sm">
                                            {r.year}
                                        </td>
                                        <td className="px-4 py-4 text-sub font-mono">
                                            {r.period_from} – {r.period_to}
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge
                                                variant={r.tranche === 'mid_year' ? 'indigo' : 'purple'}
                                                size="sm"
                                            >
                                                {r.tranche_label}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4 text-center font-mono text-text font-medium">
                                            {r.employee_count} personnel
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono font-bold text-emerald text-sm">
                                            ₱ {fmt(r.total_payout)}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <Badge
                                                variant={r.status === 'finalized' ? 'emerald' : 'amber'}
                                                size="sm"
                                            >
                                                {r.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/admin/thirteenth-month/show?year=${r.year}&tranche=${r.tranche}`}
                                                className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 shadow-2xs transition-colors hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-indigo-800/70 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                                            >
                                                <span>Inspect Batch</span>
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {records.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-dim">
                                            <div className="w-10 h-10 rounded-full bg-field flex items-center justify-center mx-auto mb-2 text-sub">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                </svg>
                                            </div>
                                            No 13th month disbursement batches have been generated yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

            </div>
        </AdminLayout>
    )
}
