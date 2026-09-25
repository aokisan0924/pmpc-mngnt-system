import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'
import EmployeePageHeader from '@/Components/EmployeePageHeader'
import Card from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'

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
        <div className={`rounded-2xl border p-5 transition-all sm:p-6 ${
            finalized
                ? 'border-border bg-panel shadow-xs'
                : 'border-dashed border-border/80 bg-field/40'
        }`}>
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                    <p className="text-sm font-bold font-display text-text">{label}</p>
                    {period && <p className="mt-1 text-xs font-mono text-dim">{period}</p>}
                </div>
                {status && (
                    <Badge variant={finalized ? 'emerald' : 'amber'} size="sm">
                        {finalized ? 'Finalized' : 'Draft'}
                    </Badge>
                )}
            </div>

            {days > 0 ? (
                <>
                    <div className="mb-5 space-y-3 font-mono text-sm">
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
                    <div className="flex items-center justify-between rounded-xl border border-border bg-field/80 px-4 py-3">
                        <span className="text-sm font-bold font-sans text-sub">Cutoff Net Pay</span>
                        <span className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">₱ {fmt(net)}</span>
                    </div>
                </>
            ) : (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-field/30 px-5 text-center">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-panel text-dim shadow-2xs">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-semibold text-text">No payroll results yet</p>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-dim">This cutoff will show its attendance and pay details after HR completes processing.</p>
                </div>
            )}
        </div>
    )
}

export default function Payslips({ payslips = [] }) {
    const { flash } = usePage().props
    const [selected, setSelected] = useState(payslips[0]?.month ?? null)
    const [yearFilter, setYearFilter] = useState('all')

    const years = [...new Set(payslips.map(p => p.year))].sort((a, b) => b - a)

    const filtered = yearFilter === 'all'
        ? payslips
        : payslips.filter(p => p.year === parseInt(yearFilter))

    const active = filtered.find(p => p.month === selected) ?? filtered[0]
    const finalizedPayslips = payslips.filter(payslip => payslip.status === 'complete')
    const finalizedGross = finalizedPayslips.reduce((total, payslip) => total + Number(payslip.total_gross || 0), 0)
    const finalizedNet = finalizedPayslips.reduce((total, payslip) => total + Number(payslip.total_net || 0), 0)
    const pendingPeriods = payslips.length - finalizedPayslips.length

    function selectYear(year) {
        const matchingPayslips = year === 'all'
            ? payslips
            : payslips.filter(payslip => payslip.year === year)

        setYearFilter(year)
        setSelected(matchingPayslips[0]?.month ?? null)
    }

    return (
        <EmployeeLayout title="My Payslips">
            <div className="employee-page-shell space-y-5">

                {flash?.success && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#0F6E56]/10 border border-[#0F6E56]/25 text-[#0F6E56] dark:text-emerald-400 text-xs font-semibold">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}

                <EmployeePageHeader
                    eyebrow="Compensation Archive"
                    title="My Payslips"
                    description="Review finalized semi-monthly payroll vouchers, verify earnings breakdowns, and export official payslips."
                    badge={finalizedPayslips.length > 0 ? `${finalizedPayslips.length} finalized periods` : 'Payroll in progress'}
                />

                {/* Career summary stats */}
                {payslips.length > 0 && (
                    <div className="attendance-metrics grid grid-cols-2 gap-px overflow-hidden bg-border sm:grid-cols-4 sm:rounded-xl">
                        <StatCard
                            title="Finalized Months"
                            value={finalizedPayslips.length}
                            subtitle="Disbursed vouchers"
                            accent="emerald"
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            }
                        />
                        <StatCard
                            title="In Progress"
                            value={pendingPeriods}
                            subtitle="Pending HR closure"
                            accent="amber"
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                        />
                        <StatCard
                            title="Total Gross Paid"
                            value={`₱ ${fmt(finalizedGross)}`}
                            subtitle="Taxable base & overtime"
                            accent="amber"
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                        />
                        <StatCard
                            title="Net Pay Received"
                            value={`₱ ${fmt(finalizedNet)}`}
                            subtitle="Take-home disbursements"
                            accent="emerald"
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            }
                        />
                    </div>
                )}

                {pendingPeriods > 0 && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-800 dark:text-amber-200" role="status">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3Z" />
                        </svg>
                        <p><span className="font-semibold">{pendingPeriods} payroll {pendingPeriods === 1 ? 'period is' : 'periods are'} still in progress.</span> Draft values are for reference and become an official payslip after HR finalizes payroll.</p>
                    </div>
                )}

                {payslips.length === 0 ? (
                    <Card className="employee-workspace-card overflow-hidden">
                        <div className="grid gap-0 md:grid-cols-[1fr_0.72fr]">
                        <div className="px-6 py-12 text-center md:px-10 md:text-left">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-700 md:mx-0 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-base font-semibold text-text">No Payslips Generated Yet</p>
                            <p className="text-sm text-sub mt-1 max-w-md">Your itemized vouchers will appear here after HR finalizes a payroll period.</p>
                        </div>
                        <div className="border-t border-border bg-field/70 px-6 py-8 md:border-l md:border-t-0 md:px-8">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">What happens next</p>
                            <ol className="mt-3 space-y-3 text-xs text-sub">
                                <li className="flex gap-2"><span className="font-bold text-emerald-700 dark:text-emerald-300">1.</span><span>HR completes and finalizes the payroll period.</span></li>
                                <li className="flex gap-2"><span className="font-bold text-emerald-700 dark:text-emerald-300">2.</span><span>Your official payslip becomes available here.</span></li>
                                <li className="flex gap-2"><span className="font-bold text-emerald-700 dark:text-emerald-300">3.</span><span>You can review and download the finalized record.</span></li>
                            </ol>
                        </div>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">

                        {/* Left Column — Month Selector */}
                        <aside className="space-y-3 lg:col-span-2 lg:sticky lg:top-4 lg:self-start">
                            <div className="flex items-center justify-between px-0.5">
                                <h2 className="text-sm font-bold font-display text-text">Pay periods</h2>
                                <span className="text-[11px] font-medium text-dim">{filtered.length} {filtered.length === 1 ? 'period' : 'periods'}</span>
                            </div>
                            {/* Year filter */}
                            <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-border bg-field p-1">
                                <button
                                    type="button"
                                    onClick={() => selectYear('all')}
                                    aria-pressed={yearFilter === 'all'}
                                    className={`min-w-14 flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                                        yearFilter === 'all'
                                            ? 'bg-white text-[#0F6E56] dark:bg-emerald-950/80 dark:text-emerald-300 font-bold shadow-xs border border-emerald-200/80 dark:border-emerald-800'
                                            : 'text-sub hover:text-text'
                                    }`}
                                >
                                    All
                                </button>
                                {years.map(y => (
                                    <button
                                        key={y}
                                        type="button"
                                        onClick={() => selectYear(y)}
                                        aria-pressed={yearFilter === y}
                                        className={`min-w-14 flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                                            yearFilter === y
                                                ? 'bg-white text-[#0F6E56] dark:bg-emerald-950/80 dark:text-emerald-300 font-bold shadow-xs border border-emerald-200/80 dark:border-emerald-800'
                                                : 'text-sub hover:text-text'
                                        }`}
                                    >
                                        {y}
                                    </button>
                                ))}
                            </div>

                            {/* Month list */}
                            <div className="space-y-2" aria-label="Available payslip periods">
                                {filtered.map(p => {
                                    const isCurrent = selected === p.month
                                    return (
                                        <button
                                            key={p.month}
                                            type="button"
                                            onClick={() => setSelected(p.month)}
                                            aria-current={isCurrent ? 'true' : undefined}
                                            className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                                                isCurrent
                                                    ? 'border-[#0F6E56] bg-[#0F6E56]/5 ring-2 ring-[#0F6E56]/20 shadow-xs'
                                                    : 'border-border bg-panel hover:border-[#0F6E56]/30'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <p className="text-sm font-bold font-display text-text">{p.month_label}</p>
                                                <StatusBadge status={p.status} />
                                            </div>
                                            <div className="flex items-center justify-between font-mono text-xs">
                                                <div className="flex gap-1">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                        p.has_first ? 'bg-[#0F6E56]/10 text-[#0F6E56] dark:text-emerald-300' : 'bg-field text-dim'
                                                    }`}>
                                                        1st Cutoff
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                        p.has_second ? 'bg-[#0F6E56]/10 text-[#0F6E56] dark:text-emerald-300' : 'bg-field text-dim'
                                                    }`}>
                                                        2nd Cutoff
                                                    </span>
                                                </div>
                                                <span className={`font-bold ${p.status === 'complete' ? 'text-[#0F6E56] dark:text-emerald-400' : 'text-dim'}`}>
                                                    ₱ {fmt(p.total_net)}
                                                </span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </aside>

                        {/* Right Column — Details & Cutoffs */}
                        <section className="min-w-0 lg:col-span-3" aria-label="Selected payslip details">
                            {active ? (
                                <div className="space-y-5">
                                    {/* Detail Top Header Card */}
                                    <Card className="employee-workspace-card p-5 sm:p-6">
                                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-2xl font-bold font-display text-text sm:text-3xl">{active.month_label}</h2>
                                                    <StatusBadge status={active.status} />
                                                </div>
                                                <p className="mt-2 text-sm font-mono text-dim">
                                                    {active.total_days} days present · ₱ {fmt(active.total_gross)} gross earnings
                                                </p>
                                            </div>

                                            {active.status === 'complete' ? (
                                                <a
                                                    href={`/employee/payslips/${active.month}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0F6E56] hover:bg-[#0C5946] active:bg-[#0A4739] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E56] cursor-pointer"
                                                >
                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    <span>Download Official PDF</span>
                                                </a>
                                            ) : (
                                                <span className="inline-flex min-h-10 items-center rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-semibold text-amber-700 dark:text-amber-300">
                                                    Awaiting finalization
                                                </span>
                                            )}
                                        </div>

                                        {/* Net Pay Highlight Banner */}
                                        <div
                                            className="mt-6 rounded-2xl bg-[#0F6E56] border border-[#0D5C48] p-5 sm:p-6 text-white shadow-md relative overflow-hidden select-none"
                                            style={{
                                                backgroundImage: 'radial-gradient(ellipse 90% 70% at 20% 20%, rgba(20, 138, 108, 0.45), transparent 75%), radial-gradient(ellipse 70% 60% at 85% 85%, rgba(6, 46, 36, 0.65), transparent)'
                                            }}
                                        >
                                            <div className="absolute inset-0 opacity-[0.06] swiss-grid pointer-events-none" aria-hidden="true" />
                                            <div className="relative z-10">
                                                <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-emerald-300">
                                                    {active.status === 'complete' ? 'Net compensation received' : 'Projected net compensation'}
                                                </p>
                                                <p className="mt-2 text-4xl font-mono font-bold tracking-tight sm:text-5xl text-white">
                                                    ₱ {fmt(active.total_net)}
                                                </p>
                                                <p className="mt-2 text-xs sm:text-sm font-mono text-emerald-100/80">
                                                    ₱ {fmt(active.total_gross)} Gross Earnings − ₱ {fmt(active.total_ded)} Deductions
                                                </p>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Cutoffs Grid */}
                                    <div className={`grid gap-5 ${active.has_first && active.has_second ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
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
                                        <Card title="Monthly pay breakdown">
                                            <div className="space-y-3 pt-1">
                                                {[
                                                    { label: 'Gross Total', value: active.total_gross, colorClass: 'bg-emerald-600', pct: 100 },
                                                    { label: 'Statutory & Other Deductions', value: active.total_ded, colorClass: 'bg-rose-600', pct: active.total_gross > 0 ? (active.total_ded / active.total_gross * 100) : 0 },
                                                    { label: 'Final Take-Home Net', value: active.total_net, colorClass: 'bg-emerald-700 dark:bg-emerald-500', pct: active.total_gross > 0 ? (active.total_net / active.total_gross * 100) : 0 },
                                                ].map(row => (
                                                    <div key={row.label}>
                                                        <div className="mb-1 flex justify-between gap-4 text-xs font-mono">
                                                            <span className="font-sans text-sub">{row.label}</span>
                                                            <span className="font-bold text-text">₱ {fmt(row.value)}</span>
                                                        </div>
                                                        <div className="h-2 bg-field rounded-full overflow-hidden border border-border/40">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${row.colorClass}`}
                                                                style={{ width: `${Math.min(row.pct, 100)}%` }}
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
                        </section>
                    </div>
                )}

            </div>
        </EmployeeLayout>
    )
}
