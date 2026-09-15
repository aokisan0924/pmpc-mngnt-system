import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'
import Card from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

function StatusBadge({ status }) {
    switch (status) {
        case 'complete':
            return <Badge variant="emerald" size="sm">Complete Month</Badge>
        case 'partial':
            return <Badge variant="amber" size="sm">Partial Cutoff</Badge>
        default:
            return <Badge variant="slate" size="sm">No Data</Badge>
    }
}

function CutoffCard({ label, period, days, basic, transpo, ot, gross, deductions, net, status }) {
    const finalized = status === 'finalized'
    return (
        <div className={`rounded-xl border p-4 transition-all ${
            finalized
                ? 'border-border bg-panel shadow-xs'
                : 'border-dashed border-border/80 bg-field/40'
        }`}>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
                <div>
                    <p className="text-xs font-bold font-display uppercase tracking-wider text-text">{label}</p>
                    {period && <p className="text-[11px] font-mono text-dim mt-0.5">{period}</p>}
                </div>
                {status && (
                    <Badge variant={finalized ? 'emerald' : 'amber'} size="sm">
                        {finalized ? 'Finalized' : 'Draft'}
                    </Badge>
                )}
            </div>

            {days > 0 ? (
                <>
                    <div className="space-y-2 mb-3 font-mono text-xs">
                        <div className="flex justify-between">
                            <span className="font-sans text-sub">Days Present:</span>
                            <span className="font-bold text-text">{days} days</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-sans text-sub">Basic Pay:</span>
                            <span className="text-text">₱ {fmt(basic)}</span>
                        </div>
                        {transpo > 0 && (
                            <div className="flex justify-between">
                                <span className="font-sans text-sub">Allowances:</span>
                                <span className="text-text">₱ {fmt(transpo)}</span>
                            </div>
                        )}
                        {ot > 0 && (
                            <div className="flex justify-between">
                                <span className="font-sans text-sub">Overtime Pay:</span>
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">+ ₱ {fmt(ot)}</span>
                            </div>
                        )}
                        <div className="border-t border-border/60 pt-2 space-y-1">
                            <div className="flex justify-between font-bold">
                                <span className="font-sans text-text">Gross Earnings:</span>
                                <span className="text-text">₱ {fmt(gross)}</span>
                            </div>
                            <div className="flex justify-between text-rose-500 font-semibold">
                                <span className="font-sans text-sub">Total Deductions:</span>
                                <span>− ₱ {fmt(deductions)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-field/80 rounded-lg px-3.5 py-2.5 border border-border">
                        <span className="text-xs font-bold font-sans text-sub">Cutoff Net Pay</span>
                        <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">₱ {fmt(net)}</span>
                    </div>
                </>
            ) : (
                <div className="py-6 text-center">
                    <p className="text-xs text-dim">No records registered for this cutoff period.</p>
                </div>
            )}
        </div>
    )
}

export default function Payslips({ payslips = [], summary = {} }) {
    const { flash } = usePage().props
    const [selected, setSelected] = useState(payslips[0]?.month ?? null)
    const [yearFilter, setYearFilter] = useState('all')

    const years = [...new Set(payslips.map(p => p.year))].sort((a, b) => b - a)

    const filtered = yearFilter === 'all'
        ? payslips
        : payslips.filter(p => p.year === parseInt(yearFilter))

    const active = payslips.find(p => p.month === selected)

    return (
        <EmployeeLayout title="My Payslips">
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
                            <h1 className="text-2xl font-bold font-display text-text tracking-tight">My Payslips</h1>
                            <Badge variant="emerald" size="sm">Earnings Archive</Badge>
                        </div>
                        <p className="text-sm text-sub mt-1">
                            Inspect your semi-monthly compensation vouchers, statutory contributions, and net payouts
                        </p>
                    </div>
                </div>

                {/* Career summary stats */}
                {payslips.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard
                            title="Months on Record"
                            value={summary.total_months ?? 0}
                            sub="Official payroll batches"
                            color="indigo"
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            }
                        />
                        <StatCard
                            title="Total Days Rendered"
                            value={`${summary.total_days ?? 0} days`}
                            sub="Cumulative present days"
                            color="emerald"
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                        />
                        <StatCard
                            title="Total Gross Earned"
                            value={`₱ ${fmt(summary.total_gross)}`}
                            sub="Before statutory withholdings"
                            color="amber"
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                        />
                        <StatCard
                            title="Total Net Received"
                            value={`₱ ${fmt(summary.total_earned)}`}
                            sub="Total take-home disbursed"
                            color="emerald"
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            }
                        />
                    </div>
                )}

                {payslips.length === 0 ? (
                    <Card>
                        <div className="py-14 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-field flex items-center justify-center mx-auto mb-3 text-sub">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-base font-semibold text-text">No Payslips Generated Yet</p>
                            <p className="text-xs text-dim mt-1">Your itemized vouchers will be listed here once payroll is finalized by HR.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                        {/* Left Column — Month Selector */}
                        <div className="lg:col-span-2 space-y-3">
                            {/* Year filter */}
                            <div className="flex gap-1.5 p-1 bg-field rounded-xl border border-border">
                                <button
                                    onClick={() => setYearFilter('all')}
                                    className={`flex-1 text-xs py-2 rounded-lg font-semibold transition-all ${
                                        yearFilter === 'all'
                                            ? 'bg-panel text-text shadow-xs border border-border'
                                            : 'text-sub hover:text-text'
                                    }`}
                                >
                                    All
                                </button>
                                {years.map(y => (
                                    <button
                                        key={y}
                                        onClick={() => setYearFilter(y)}
                                        className={`flex-1 text-xs py-2 rounded-lg font-semibold transition-all ${
                                            yearFilter === y
                                                ? 'bg-panel text-text shadow-xs border border-border'
                                                : 'text-sub hover:text-text'
                                        }`}
                                    >
                                        {y}
                                    </button>
                                ))}
                            </div>

                            {/* Month list */}
                            <div className="space-y-2">
                                {filtered.map(p => {
                                    const isCurrent = selected === p.month
                                    return (
                                        <button
                                            key={p.month}
                                            onClick={() => setSelected(p.month)}
                                            className={`w-full text-left rounded-xl border p-4 transition-all ${
                                                isCurrent
                                                    ? 'border-emerald-500/50 bg-emerald-500/5 ring-2 ring-emerald-500/10 shadow-xs'
                                                    : 'border-border bg-panel hover:border-emerald-500/30'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <p className="text-sm font-bold font-display text-text">{p.month_label}</p>
                                                <StatusBadge status={p.status} />
                                            </div>
                                            <div className="flex items-center justify-between font-mono text-xs">
                                                <div className="flex gap-1">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                        p.has_first ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-field text-dim'
                                                    }`}>
                                                        1st Cutoff
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                        p.has_second ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-field text-dim'
                                                    }`}>
                                                        2nd Cutoff
                                                    </span>
                                                </div>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                    ₱ {fmt(p.total_net)}
                                                </span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Right Column — Details & Cutoffs */}
                        <div className="lg:col-span-3">
                            {active ? (
                                <div className="space-y-4">
                                    {/* Detail Top Header Card */}
                                    <Card>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-xl font-bold font-display text-text">{active.month_label}</h2>
                                                    <StatusBadge status={active.status} />
                                                </div>
                                                <p className="text-xs font-mono text-dim mt-1">
                                                    {active.total_days} days present · ₱ {fmt(active.total_gross)} gross earnings
                                                </p>
                                            </div>

                                            <a
                                                href={`/employee/payslips/${active.month}`}
                                                target="_blank"
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                <span>Download Official PDF</span>
                                            </a>
                                        </div>

                                        {/* Net Pay Highlight Banner */}
                                        <div className="mt-5 p-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md">
                                            <p className="text-xs uppercase tracking-wider font-semibold opacity-80">
                                                Net Compensation Disbursed
                                            </p>
                                            <p className="text-3xl sm:text-4xl font-mono font-bold tracking-tight mt-1">
                                                ₱ {fmt(active.total_net)}
                                            </p>
                                            <p className="text-xs font-mono opacity-80 mt-1">
                                                ₱ {fmt(active.total_gross)} Gross Earnings − ₱ {fmt(active.total_ded)} Deductions
                                            </p>
                                        </div>
                                    </Card>

                                    {/* Cutoffs Grid */}
                                    <div className={`grid gap-4 ${active.has_first && active.has_second ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                                        {active.has_first && (
                                            <CutoffCard
                                                label="1st Cutoff Period"
                                                period={active.first_period}
                                                days={active.first_days}
                                                basic={active.first_basic}
                                                transpo={active.first_transpo}
                                                ot={active.first_ot}
                                                gross={active.first_gross}
                                                deductions={active.first_deductions}
                                                net={active.first_net}
                                                status={active.first_status}
                                            />
                                        )}
                                        {active.has_second && (
                                            <CutoffCard
                                                label="2nd Cutoff Period"
                                                period={active.second_period}
                                                days={active.second_days}
                                                basic={active.second_basic}
                                                transpo={active.second_transpo}
                                                ot={active.second_ot}
                                                gross={active.second_gross}
                                                deductions={active.second_deductions}
                                                net={active.second_net}
                                                status={active.second_status}
                                            />
                                        )}
                                    </div>

                                    {/* Financial Breakdown Card */}
                                    {active.total_gross > 0 && (
                                        <Card title="Monthly Retention Summary">
                                            <div className="space-y-3 pt-1">
                                                {[
                                                    { label: 'Gross Total', value: active.total_gross, color: '#10B981', pct: 100 },
                                                    { label: 'Statutory & Other Deductions', value: active.total_ded, color: '#F43F5E', pct: active.total_gross > 0 ? (active.total_ded / active.total_gross * 100) : 0 },
                                                    { label: 'Final Take-Home Net', value: active.total_net, color: '#059669', pct: active.total_gross > 0 ? (active.total_net / active.total_gross * 100) : 0 },
                                                ].map(row => (
                                                    <div key={row.label}>
                                                        <div className="flex justify-between text-xs mb-1 font-mono">
                                                            <span className="font-sans text-sub">{row.label}</span>
                                                            <span className="font-bold text-text">₱ {fmt(row.value)}</span>
                                                        </div>
                                                        <div className="h-2 bg-field rounded-full overflow-hidden border border-border/40">
                                                            <div
                                                                className="h-full rounded-full transition-all"
                                                                style={{ width: `${Math.min(row.pct, 100)}%`, background: row.color }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            ) : (
                                <Card>
                                    <div className="py-14 text-center text-dim">
                                        Select a monthly payroll batch on the left to inspect its details.
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </EmployeeLayout>
    )
}