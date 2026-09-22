import { useState } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import AdminPageHeader from '@/Components/AdminPageHeader'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ComposedChart, Area,
} from 'recharts'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    })
}

function fmtShort(num) {
    if (num >= 1_000_000) return '₱' + (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000)     return '₱' + (num / 1_000).toFixed(1) + 'K'
    return '₱' + Math.round(num)
}

const COLORS = {
    indigo:  '#4F46E5',
    emerald: '#10B981',
    rose:    '#F43F5E',
    amber:   '#F59E0B',
    sky:     '#0284C7',
    purple:  '#8B5CF6',
    pink:    '#EC4899',
    cyan:    '#06B6D4',
    teal:    '#0D9488',
    slate:   '#64748B',
}

const DED_COLORS = {
    sss:                  COLORS.sky,
    philhealth:           COLORS.emerald,
    pagibig:              COLORS.amber,
    tax:                  COLORS.rose,
    loan:                 COLORS.purple,
    capital_contribution: COLORS.pink,
    cash_advance:         COLORS.indigo,
    rental:               COLORS.cyan,
    savings:              COLORS.teal,
    other:                COLORS.slate,
}

const DED_LABELS = {
    sss:                  'SSS',
    philhealth:           'PhilHealth',
    pagibig:              'Pag-IBIG',
    tax:                  'W/H Tax',
    loan:                 'Loan',
    capital_contribution: 'Capital Contribution',
    cash_advance:         'Cash Advance',
    rental:               'Rental',
    savings:              'Savings',
    other:                'Other',
}

// ── Custom tooltip ─────────────────────────────────────────────────────────

function PayrollTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-panel/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl p-3.5 min-w-48 text-xs">
            <p className="font-semibold text-text mb-2.5 pb-1.5 border-b border-border/60">{label}</p>
            <div className="space-y-1.5">
                {payload.map(p => (
                    <div key={p.name} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                            <span className="text-sub">{p.name}</span>
                        </div>
                        <span className="font-medium text-text font-mono">
                            {typeof p.value === 'number' && p.value > 100
                                ? '₱ ' + fmt(p.value)
                                : p.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function PayrollAnalytics({
    kpis, monthlyTrend = [], departmentBreakdown = [], deductionsBreakdown = [], latestPayroll,
}) {
    const [dedView, setDedView] = useState('chart')

    const hasData = monthlyTrend.length > 0
    const hasDept = departmentBreakdown.length > 0
    const hasDed  = deductionsBreakdown.length > 0

    const dedKeys = Object.keys(DED_LABELS).filter(k =>
        deductionsBreakdown.some(r => (r[k] ?? 0) > 0)
    )

    return (
        <AdminLayout>
            <div className="admin-page-shell space-y-4 sm:space-y-5 page-enter">

                <AdminPageHeader
                    eyebrow="Financial intelligence"
                    title="Payroll Analytics"
                    description="Track organizational payroll cost, statutory deductions, and compensation movement across finalized periods."
                    badge="Executive view"
                    action={latestPayroll && (
                        <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2 shadow-xs">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <div className="text-xs">
                                <span className="font-medium text-indigo-200">Latest run: </span>
                                <span className="font-semibold text-white">{latestPayroll.period_label}</span>
                                <span className="ml-1.5 font-mono text-indigo-200">({latestPayroll.cutoff_label})</span>
                            </div>
                        </div>
                    )}
                />

                {/* KPI cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Gross Cost"
                        value={fmtShort(kpis.total_payroll_cost)}
                        sub={`Across ${kpis.total_payrolls} finalized runs`}
                        color="indigo"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Total Net Paid Out"
                        value={fmtShort(kpis.total_net_paid)}
                        sub="Disbursed to personnel take-home"
                        color="emerald"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Total Deductions"
                        value={fmtShort(kpis.total_deductions)}
                        sub="Govt statutory + voluntary"
                        color="rose"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Avg Net Per Employee"
                        value={fmtShort(kpis.avg_net_per_employee)}
                        sub={`${kpis.active_employees} active employees on record`}
                        color="amber"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        }
                    />
                </div>

                {/* Chart 1 — Monthly net pay trend */}
                <Card
                    title="Gross Pay, Net Payout & Deductions Trend"
                    description="Semi-monthly historical trajectory of total compensation expenditure"
                >
                    {hasData ? (
                        <div className="h-72 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={monthlyTrend} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-dim)' }} tickLine={false} axisLine={false} />
                                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-dim)' }} tickLine={false} axisLine={false} width={60} />
                                    <Tooltip content={<PayrollTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} iconType="circle" iconSize={8} />
                                    <Area type="monotone" dataKey="total_gross" name="Gross Pay" fill="url(#grossGradient)" stroke={COLORS.indigo} strokeWidth={2.5} />
                                    <Line type="monotone" dataKey="total_net" name="Net Pay" stroke={COLORS.emerald} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.emerald, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="total_deductions" name="Deductions" stroke={COLORS.rose} strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: COLORS.rose }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No finalized payroll records available yet." />
                    )}
                </Card>

                {/* Chart 2 & 3 Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Headcount vs Cost */}
                    <Card
                        title="Headcount vs Payroll Cost"
                        description="Correlation between active payroll headcount and total gross outlay"
                    >
                        {hasData ? (
                            <div className="h-64 w-full pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" vertical={false} />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-dim)' }} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="cost" tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-dim)' }} tickLine={false} axisLine={false} width={56} />
                                        <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11, fill: 'var(--color-dim)' }} tickLine={false} axisLine={false} width={36} />
                                        <Tooltip content={<PayrollTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 14 }} iconType="circle" iconSize={8} />
                                        <Bar yAxisId="cost" dataKey="total_gross" name="Gross Pay" fill={COLORS.indigo} radius={[6, 6, 0, 0]} opacity={0.85} maxBarSize={32} />
                                        <Line yAxisId="count" type="monotone" dataKey="headcount" name="Headcount" stroke={COLORS.amber} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.amber }} activeDot={{ r: 6 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyState message="No payroll headcount history available." />
                        )}
                    </Card>

                    {/* Department Cost Bar */}
                    <Card
                        title="Department Cost Distribution"
                        description="All-time gross and net expenditure distributed across divisions"
                    >
                        {hasDept ? (
                            <div className="h-64 w-full pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={departmentBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" vertical={false} />
                                        <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'var(--color-dim)' }} tickLine={false} axisLine={false} />
                                        <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-dim)' }} tickLine={false} axisLine={false} width={56} />
                                        <Tooltip content={<PayrollTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 14 }} iconType="circle" iconSize={8} />
                                        <Bar dataKey="total_gross" name="Gross Pay" fill={COLORS.indigo} radius={[4, 4, 0, 0]} opacity={0.9} maxBarSize={28} />
                                        <Bar dataKey="total_net" name="Net Pay" fill={COLORS.emerald} radius={[4, 4, 0, 0]} opacity={0.9} maxBarSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyState message="No department distribution records found." />
                        )}
                    </Card>
                </div>

                {/* Department Details Table */}
                {hasDept && (
                    <Card
                        title="Department Financial Breakdown"
                        description="Cumulative summary of payroll figures and effective deduction ratios"
                    >
                        <div className="overflow-x-auto -mx-6 -my-4">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-field/70 border-b border-border text-dim uppercase tracking-wider font-semibold">
                                        <th className="text-left px-6 py-3">Department</th>
                                        <th className="text-center px-4 py-3">Active Headcount</th>
                                        <th className="text-right px-4 py-3">Cumulative Gross</th>
                                        <th className="text-right px-4 py-3">Cumulative Net</th>
                                        <th className="text-right px-6 py-3">Deduction Ratio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 font-mono">
                                    {departmentBreakdown.map(d => {
                                        const dedPct = d.total_gross > 0
                                            ? ((d.total_gross - d.total_net) / d.total_gross * 100).toFixed(1)
                                            : '0.0'
                                        return (
                                            <tr key={d.department} className="hover:bg-hover/60 transition-colors">
                                                <td className="px-6 py-3.5 font-sans font-medium text-text">{d.department}</td>
                                                <td className="px-4 py-3.5 text-center text-sub">{d.headcount}</td>
                                                <td className="px-4 py-3.5 text-right text-text">₱ {fmt(d.total_gross)}</td>
                                                <td className="px-4 py-3.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">₱ {fmt(d.total_net)}</td>
                                                <td className="px-6 py-3.5 text-right text-rose-600 dark:text-rose-400">{dedPct}%</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Deductions Breakdown per Employee */}
                <Card
                    title={`Deductions Breakdown per Employee${latestPayroll ? ' — ' + latestPayroll.period_label : ''}`}
                    description="Itemized statutory and company deduction allocations from the latest payroll"
                    action={
                        <div
                            role="group"
                            aria-label="Deductions view mode"
                            className="flex gap-1 p-1 bg-field rounded-lg border border-border"
                        >
                            <button
                                type="button"
                                aria-pressed={dedView === 'chart'}
                                onClick={() => setDedView('chart')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                    dedView === 'chart'
                                        ? 'bg-panel text-text shadow-2xs font-semibold'
                                        : 'text-sub hover:text-text'
                                }`}
                            >
                                Chart
                            </button>
                            <button
                                type="button"
                                aria-pressed={dedView === 'table'}
                                onClick={() => setDedView('table')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                    dedView === 'table'
                                        ? 'bg-panel text-text shadow-2xs font-semibold'
                                        : 'text-sub hover:text-text'
                                }`}
                            >
                                Table
                            </button>
                        </div>
                    }
                >
                    {hasDed ? (
                        dedView === 'chart' ? (
                            <div className="w-full pt-2" style={{ height: Math.max(300, deductionsBreakdown.length * 48) }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={deductionsBreakdown} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" horizontal={false} />
                                        <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--color-dim)' }} tickLine={false} axisLine={false} />
                                        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: 'var(--color-sub)' }} tickLine={false} axisLine={false} />
                                        <Tooltip content={<PayrollTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 14 }} iconType="circle" iconSize={7} />
                                        {dedKeys.map(key => (
                                            <Bar
                                                key={key}
                                                dataKey={key}
                                                name={DED_LABELS[key]}
                                                stackId="ded"
                                                fill={DED_COLORS[key]}
                                                radius={key === dedKeys[dedKeys.length - 1] ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-6 -my-4">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-field/70 border-b border-border text-dim uppercase tracking-wider font-semibold">
                                            <th className="text-left px-6 py-3">Employee</th>
                                            {dedKeys.map(k => (
                                                <th key={k} className="text-right px-3 py-3">
                                                    {DED_LABELS[k]}
                                                </th>
                                            ))}
                                            <th className="text-right px-6 py-3">Net Take-Home</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60 font-mono">
                                        {deductionsBreakdown.map(r => (
                                            <tr key={r.name} className="hover:bg-hover/60 transition-colors">
                                                <td className="px-6 py-3.5 font-sans">
                                                    <p className="font-semibold text-text">{r.name}</p>
                                                    <p className="text-[11px] text-dim">{r.department}</p>
                                                </td>
                                                {dedKeys.map(k => (
                                                    <td key={k} className="px-3 py-3.5 text-right text-rose-600 dark:text-rose-400">
                                                        {r[k] > 0 ? `₱ ${fmt(r[k])}` : '—'}
                                                    </td>
                                                ))}
                                                <td className="px-6 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                    ₱ {fmt(r.net_pay)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-border bg-field/80 font-mono font-bold">
                                            <td className="px-6 py-3.5 font-sans text-text">Aggregate Totals</td>
                                            {dedKeys.map(k => (
                                                <td key={k} className="px-3 py-3.5 text-right text-rose-600 dark:text-rose-400">
                                                    ₱ {fmt(deductionsBreakdown.reduce((s, r) => s + (r[k] ?? 0), 0))}
                                                </td>
                                            ))}
                                            <td className="px-6 py-3.5 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                                                ₱ {fmt(deductionsBreakdown.reduce((s, r) => s + r.net_pay, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )
                    ) : (
                        <EmptyState message="No deductions data available for the selected period." />
                    )}
                </Card>

            </div>
        </AdminLayout>
    )
}

function EmptyState({ message }) {
    return (
        <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            </div>
            <p className="text-sm font-medium text-text">{message}</p>
            <p className="text-xs text-dim mt-1">Finalized payroll records will populate these analytics charts automatically.</p>
        </div>
    )
}
