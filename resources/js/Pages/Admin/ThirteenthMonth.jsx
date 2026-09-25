import { useState } from 'react'
import { router, usePage, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'
import AdminPageHeader from '@/Components/AdminPageHeader'

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

    return (
        <AdminLayout>
            <div className="admin-page-shell max-w-6xl space-y-4 sm:space-y-5 page-enter">

                {flash?.success && (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}

                <AdminPageHeader
                    eyebrow="Statutory compensation"
                    title="13th Month Pay"
                    description="Compute and manage mandatory 13th month pay using verified DTR days and current employee rates."
                    badge="PD 851"
                />

                {/* Compute Action Card */}
                <Card className="admin-workspace-card overflow-hidden">
                    <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
                        <div>
                            <CardTitle>Run a New Computation</CardTitle>
                            <CardDescription>
                                Pull verified DTR attendance and employee daily rates for the selected period.
                            </CardDescription>
                        </div>
                        <Badge variant="indigo" size="sm">PD 851</Badge>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-6">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                        <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-end">
                            <div>
                                <label htmlFor="calendar-year" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-sub">
                                    Calendar Year
                                </label>
                                <input
                                    id="calendar-year"
                                    type="number"
                                    value={year}
                                    onChange={e => setYear(e.target.value)}
                                    min="2020"
                                    max="2099"
                                    className="h-11 w-full rounded-xl border border-border bg-field px-3.5 font-mono text-sm font-semibold text-text transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-sub">
                                    Tranche Window
                                </label>
                                <div
                                    role="radiogroup"
                                    aria-label="Tranche window selection"
                                    className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-field p-1"
                                >
                                    {[
                                        { value: 'mid_year', label: 'Mid-Year (Jan 1 – Jun 30)' },
                                        { value: 'year_end', label: 'Year-End (Jul 1 – Dec 31)' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={tranche === opt.value}
                                            onClick={() => setTranche(opt.value)}
                                            className={`min-h-9 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                                                tranche === opt.value
                                                    ? 'border border-indigo-200 bg-panel font-semibold text-indigo-800 shadow-xs dark:border-indigo-800 dark:text-indigo-200'
                                                    : 'text-sub hover:bg-panel/70 hover:text-text'
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
                            className="h-11 w-full shrink-0 whitespace-nowrap sm:w-auto"
                            icon={
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0-7 7m7-7H3" />
                                </svg>
                            }
                            iconPosition="right"
                        >
                            <span>Compute Tranche</span>
                        </Button>
                    </div>
                    </CardContent>
                </Card>

                {/* History Table */}
                <Card className="overflow-hidden">
                    <CardHeader>
                        <div>
                            <CardTitle>13th Month Disbursement Records</CardTitle>
                            <CardDescription>Archive of finalized statutory calculations and disbursements.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                    <div className={`overflow-x-auto ${records.length === 0 ? 'hidden sm:block' : ''}`}>
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
                                        <td className="px-4 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
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
                    {records.length === 0 && (
                        <div className="px-5 py-12 text-center text-dim sm:hidden">
                            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-field text-sub">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-2.586a1 1 0 0 0-.707.293l-2.414 2.414a1 1 0 0 1-.707.293h-3.172a1 1 0 0 1-.707-.293l-2.414-2.414A1 1 0 0 0 6.586 13H4" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-sub">No disbursement records yet.</p>
                            <p className="mt-1 text-xs">Run a computation above to create the first record.</p>
                        </div>
                    )}
                    </CardContent>
                </Card>

            </div>
        </AdminLayout>
    )
}
