import { useState } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'
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
    teal:   '#0F6E56',
    purple: '#26215C',
    blue:   '#378ADD',
    amber:  '#F59E0B',
    red:    '#EF4444',
    emerald:'#10B981',
    violet: '#8B5CF6',
    pink:   '#EC4899',
    gray:   '#6B7280',
}

const DED_COLORS = {
    sss:                  COLORS.blue,
    philhealth:           COLORS.emerald,
    pagibig:              COLORS.amber,
    tax:                  COLORS.red,
    loan:                 COLORS.violet,
    capital_contribution: COLORS.pink,
    cash_advance:         COLORS.purple,
    savings:              COLORS.teal,
    other:                COLORS.gray,
}

const DED_LABELS = {
    sss:                  'SSS',
    philhealth:           'PhilHealth',
    pagibig:              'Pag-IBIG',
    tax:                  'W/H Tax',
    loan:                 'Loan',
    capital_contribution: 'Capital contribution',
    cash_advance:         'Cash advance',
    savings:              'Savings',
    other:                'Other',
}

// ── Custom tooltip ─────────────────────────────────────────────────────────

function PayrollTooltip({ active, payload, label }) {
    if (! active || ! payload?.length) return null
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-44">
            <p className="text-xs font-medium text-gray-700 mb-2">{label}</p>
            {payload.map(p => (
                <div key={p.name} className="flex items-center justify-between gap-4 text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-gray-500">{p.name}</span>
                    </div>
                    <span className="font-medium text-gray-800">
                        {typeof p.value === 'number' && p.value > 100
                            ? '₱ ' + fmt(p.value)
                            : p.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

// ── KPI card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, icon }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
            <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-gray-500">{label}</p>
                <span className="text-lg">{icon}</span>
            </div>
            <p className="text-xl font-medium text-gray-900 mb-0.5">{value}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
    )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, sub, children }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="mb-4">
                <p className="text-sm font-medium text-gray-900">{title}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
            {children}
        </div>
    )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function PayrollAnalytics({
    kpis, monthlyTrend, departmentBreakdown, deductionsBreakdown, latestPayroll,
}) {
    const [dedView, setDedView] = useState('chart')

    const hasData     = monthlyTrend.length > 0
    const hasDept     = departmentBreakdown.length > 0
    const hasDed      = deductionsBreakdown.length > 0

    const dedKeys = Object.keys(DED_LABELS).filter(k =>
        deductionsBreakdown.some(r => (r[k] ?? 0) > 0)
    )

    return (
        <AdminLayout>
            <div className="p-6 max-w-7xl mx-auto">

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-lg font-medium text-gray-900">Payroll analytics</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        All-time payroll insights across all finalized payroll records
                    </p>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <KpiCard
                        label="Total gross cost"
                        value={'₱ ' + fmtShort(kpis.total_payroll_cost)}
                        sub={`across ${kpis.total_payrolls} payrolls`}
                        accent={COLORS.teal}
                        icon="💰"
                    />
                    <KpiCard
                        label="Total net paid out"
                        value={'₱ ' + fmtShort(kpis.total_net_paid)}
                        sub="after all deductions"
                        accent={COLORS.emerald}
                        icon="✅"
                    />
                    <KpiCard
                        label="Total deductions"
                        value={'₱ ' + fmtShort(kpis.total_deductions)}
                        sub="govt + other combined"
                        accent={COLORS.red}
                        icon="📉"
                    />
                    <KpiCard
                        label="Avg net per employee"
                        value={'₱ ' + fmtShort(kpis.avg_net_per_employee)}
                        sub={`${kpis.active_employees} active employees`}
                        accent={COLORS.purple}
                        icon="👥"
                    />
                </div>

                {/* Latest payroll snapshot */}
                {latestPayroll && (
                    <div className="mb-6 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">Latest finalized payroll</p>
                            <p className="text-sm font-medium text-gray-800 mt-0.5">
                                {latestPayroll.period_label}
                                <span className="ml-2 text-xs font-normal text-gray-400">
                                    {latestPayroll.cutoff_label}
                                </span>
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Net payout</p>
                            <p className="text-base font-medium text-emerald-700">
                                ₱ {fmt(kpis.latest_net)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Chart 1 — Monthly net pay trend */}
                <div className="mb-5">
                    <Section
                        title="Monthly payroll trend"
                        sub="Gross pay, deductions, and net pay per payroll period">
                        {hasData ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <ComposedChart data={monthlyTrend}
                                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        tickLine={false} axisLine={false} />
                                    <YAxis tickFormatter={fmtShort}
                                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        tickLine={false} axisLine={false} width={56} />
                                    <Tooltip content={<PayrollTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                                        iconType="circle" iconSize={8} />
                                    <Area type="monotone" dataKey="total_gross"
                                        name="Gross pay" fill="#E6F7F1" stroke={COLORS.teal}
                                        strokeWidth={2} fillOpacity={0.4} />
                                    <Line type="monotone" dataKey="total_net"
                                        name="Net pay" stroke={COLORS.emerald}
                                        strokeWidth={2.5} dot={{ r: 3, fill: COLORS.emerald }}
                                        activeDot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="total_deductions"
                                        name="Deductions" stroke={COLORS.red}
                                        strokeWidth={1.5} strokeDasharray="4 3"
                                        dot={{ r: 2, fill: COLORS.red }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="No finalized payroll records yet." />
                        )}
                    </Section>
                </div>

                {/* Chart 2 — Headcount vs payroll cost */}
                <div className="mb-5">
                    <Section
                        title="Headcount vs payroll cost"
                        sub="Number of employees paid vs total gross cost per period">
                        {hasData ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <ComposedChart data={monthlyTrend}
                                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="cost" tickFormatter={fmtShort}
                                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        tickLine={false} axisLine={false} width={56} />
                                    <YAxis yAxisId="count" orientation="right"
                                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        tickLine={false} axisLine={false} width={32}
                                        label={{ value: 'Employees', angle: 90, position: 'insideRight', fontSize: 9, fill: '#9CA3AF' }} />
                                    <Tooltip content={<PayrollTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                                        iconType="circle" iconSize={8} />
                                    <Bar yAxisId="cost" dataKey="total_gross"
                                        name="Gross pay" fill={COLORS.teal}
                                        radius={[4, 4, 0, 0]} fillOpacity={0.85} />
                                    <Line yAxisId="count" type="monotone" dataKey="headcount"
                                        name="Headcount" stroke={COLORS.amber}
                                        strokeWidth={2.5} dot={{ r: 3, fill: COLORS.amber }}
                                        activeDot={{ r: 5 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="No finalized payroll records yet." />
                        )}
                    </Section>
                </div>

                {/* Chart 3 — Department breakdown */}
                <div className="mb-5">
                    <Section
                        title="Department payroll cost"
                        sub="Total gross and net pay grouped by department (all time)">
                        {hasDept ? (
                            <>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={departmentBreakdown}
                                        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                                        <XAxis dataKey="department"
                                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            tickLine={false} axisLine={false} />
                                        <YAxis tickFormatter={fmtShort}
                                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            tickLine={false} axisLine={false} width={56} />
                                        <Tooltip content={<PayrollTooltip />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                                            iconType="circle" iconSize={8} />
                                        <Bar dataKey="total_gross" name="Gross pay"
                                            fill={COLORS.teal} radius={[4, 4, 0, 0]} fillOpacity={0.85} />
                                        <Bar dataKey="total_net" name="Net pay"
                                            fill={COLORS.emerald} radius={[4, 4, 0, 0]} fillOpacity={0.85} />
                                    </BarChart>
                                </ResponsiveContainer>

                                {/* Department table */}
                                <div className="mt-4 border border-gray-100 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="text-left px-3 py-2 text-gray-400 font-medium">Department</th>
                                                <th className="text-center px-3 py-2 text-gray-400 font-medium">Employees</th>
                                                <th className="text-right px-3 py-2 text-gray-400 font-medium">Gross pay</th>
                                                <th className="text-right px-3 py-2 text-gray-400 font-medium">Net pay</th>
                                                <th className="text-right px-3 py-2 text-gray-400 font-medium">Ded. %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {departmentBreakdown.map(d => {
                                                const dedPct = d.total_gross > 0
                                                    ? ((d.total_gross - d.total_net) / d.total_gross * 100).toFixed(1)
                                                    : '0.0'
                                                return (
                                                    <tr key={d.department} className="border-b border-gray-50 hover:bg-gray-50">
                                                        <td className="px-3 py-2 font-medium text-gray-700">{d.department}</td>
                                                        <td className="px-3 py-2 text-center text-gray-500">{d.headcount}</td>
                                                        <td className="px-3 py-2 text-right text-gray-700">₱ {fmt(d.total_gross)}</td>
                                                        <td className="px-3 py-2 text-right text-emerald-700">₱ {fmt(d.total_net)}</td>
                                                        <td className="px-3 py-2 text-right text-red-500">{dedPct}%</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <EmptyState message="No department data available." />
                        )}
                    </Section>
                </div>

                {/* Chart 4 — Deductions breakdown per employee */}
                <div className="mb-5">
                    <Section
                        title={`Deductions breakdown per employee${latestPayroll ? ' — ' + latestPayroll.period_label : ''}`}
                        sub="Stacked view of each deduction type per employee in the latest finalized payroll">
                        {hasDed ? (
                            <>
                                {/* Toggle */}
                                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4 w-fit">
                                    {['chart', 'table'].map(v => (
                                        <button key={v} onClick={() => setDedView(v)}
                                            className={`px-3 py-1.5 text-xs rounded-md capitalize transition-all ${
                                                dedView === v
                                                    ? 'bg-white text-gray-800 font-medium shadow-sm border border-gray-200'
                                                    : 'text-gray-500'
                                            }`}>
                                            {v === 'chart' ? '📊 Chart' : '📋 Table'}
                                        </button>
                                    ))}
                                </div>

                                {dedView === 'chart' ? (
                                    <ResponsiveContainer width="100%" height={Math.max(260, deductionsBreakdown.length * 44)}>
                                        <BarChart
                                            layout="vertical"
                                            data={deductionsBreakdown}
                                            margin={{ top: 4, right: 80, left: 8, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                                            <XAxis type="number" tickFormatter={fmtShort}
                                                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                                tickLine={false} axisLine={false} />
                                            <YAxis type="category" dataKey="name" width={110}
                                                tick={{ fontSize: 10, fill: '#6B7280' }}
                                                tickLine={false} axisLine={false} />
                                            <Tooltip content={<PayrollTooltip />} />
                                            <Legend
                                                wrapperStyle={{ fontSize: 10, paddingTop: 12 }}
                                                iconType="circle" iconSize={7} />
                                            {dedKeys.map(key => (
                                                <Bar key={key} dataKey={key}
                                                    name={DED_LABELS[key]}
                                                    stackId="ded"
                                                    fill={DED_COLORS[key]}
                                                    radius={key === dedKeys[dedKeys.length - 1] ? [0, 3, 3, 0] : [0, 0, 0, 0]} />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs" style={{ minWidth: 700 }}>
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-100">
                                                    <th className="text-left px-3 py-2 text-gray-400 font-medium">Employee</th>
                                                    {dedKeys.map(k => (
                                                        <th key={k} className="text-right px-3 py-2 text-gray-400 font-medium">
                                                            {DED_LABELS[k]}
                                                        </th>
                                                    ))}
                                                    <th className="text-right px-3 py-2 text-gray-400 font-medium">Net pay</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {deductionsBreakdown.map(r => (
                                                    <tr key={r.name} className="border-b border-gray-50 hover:bg-gray-50">
                                                        <td className="px-3 py-2">
                                                            <p className="font-medium text-gray-800">{r.name}</p>
                                                            <p className="text-gray-400">{r.department}</p>
                                                        </td>
                                                        {dedKeys.map(k => (
                                                            <td key={k} className="px-3 py-2 text-right text-red-500">
                                                                {r[k] > 0 ? `₱ ${fmt(r[k])}` : '—'}
                                                            </td>
                                                        ))}
                                                        <td className="px-3 py-2 text-right font-medium text-emerald-700">
                                                            ₱ {fmt(r.net_pay)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t-2 border-gray-200 bg-gray-50 font-medium">
                                                    <td className="px-3 py-2 text-gray-600">Totals</td>
                                                    {dedKeys.map(k => (
                                                        <td key={k} className="px-3 py-2 text-right text-red-600">
                                                            ₱ {fmt(deductionsBreakdown.reduce((s, r) => s + (r[k] ?? 0), 0))}
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2 text-right text-emerald-700">
                                                        ₱ {fmt(deductionsBreakdown.reduce((s, r) => s + r.net_pay, 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </>
                        ) : (
                            <EmptyState message="No finalized payroll to analyze deductions from." />
                        )}
                    </Section>
                </div>

                {/* Footer note */}
                <p className="text-xs text-gray-400 text-center mt-2">
                    Analytics based on finalized payroll records only · Draft payrolls are excluded
                </p>
            </div>
        </AdminLayout>
    )
}

function EmptyState({ message }) {
    return (
        <div className="py-12 text-center">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm text-gray-400">{message}</p>
        </div>
    )
}