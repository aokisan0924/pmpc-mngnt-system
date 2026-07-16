import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

function StatusBadge({ status }) {
    const styles = {
        complete: 'bg-teal/10 text-teal border-teal/25',
        partial:  'bg-amber/10 text-amber border-amber/25',
        none:     'bg-field text-dim border-border',
    }
    const labels = { complete: 'Complete', partial: 'Partial', none: 'No data' }
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${styles[status] ?? styles.none}`}>
            {labels[status] ?? '—'}
        </span>
    )
}

function CutoffCard({ label, period, days, basic, transpo, ot, gross, deductions, net, status, month, cutoff }) {
    const finalized = status === 'finalized'
    return (
        <div className={`rounded-xl border p-4 ${finalized ? 'border-border bg-panel' : 'border-dashed border-border bg-field'}`}>
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-xs font-medium text-sub">{label}</p>
                    {period && <p className="text-xs text-dim mt-0.5">{period}</p>}
                </div>
                {status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        finalized ? 'bg-teal/10 text-teal' : 'bg-amber/10 text-amber'
                    }`}>
                        {finalized ? 'Finalized' : 'Draft'}
                    </span>
                )}
            </div>

            {days > 0 ? (
                <>
                    <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between text-xs">
                            <span className="text-sub">Days present</span>
                            <span className="font-medium text-sub">{days} days</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-sub">Basic pay</span>
                            <span className="text-sub">₱ {fmt(basic)}</span>
                        </div>
                        {transpo > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-sub">Allowances</span>
                                <span className="text-sub">₱ {fmt(transpo)}</span>
                            </div>
                        )}
                        {ot > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-sub">Overtime</span>
                                <span className="text-amber">+ ₱ {fmt(ot)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs border-t border-border pt-1.5 mt-1.5">
                            <span className="text-sub">Gross pay</span>
                            <span className="font-medium text-text">₱ {fmt(gross)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-sub">Deductions</span>
                            <span className="text-red">− ₱ {fmt(deductions)}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-field rounded-lg px-3 py-2 border border-border">
                        <span className="text-xs font-medium text-sub">Net pay</span>
                        <span className="text-sm font-medium text-teal">₱ {fmt(net)}</span>
                    </div>
                </>
            ) : (
                <div className="py-4 text-center">
                    <p className="text-xs text-dim">No payroll data yet</p>
                </div>
            )}
        </div>
    )
}

export default function Payslips({ payslips, summary }) {
    const { flash }             = usePage().props
    const [selected, setSelected] = useState(payslips[0]?.month ?? null)
    const [yearFilter, setYearFilter] = useState('all')

    const years = [...new Set(payslips.map(p => p.year))].sort((a, b) => b - a)

    const filtered = yearFilter === 'all'
        ? payslips
        : payslips.filter(p => p.year === parseInt(yearFilter))

    const active = payslips.find(p => p.month === selected)

    return (
        <EmployeeLayout title="My payslips">
            <div className="min-h-screen bg-bg">
            <div className="p-4 sm:p-6 max-w-6xl mx-auto">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-teal/10 border border-teal/25 text-teal text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-lg font-medium text-text">My payslips</h1>
                    <p className="text-sm text-sub mt-0.5">
                        View and download your payslip history
                    </p>
                </div>

                {/* Career summary */}
                {payslips.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        {[
                            { label: 'Months on payroll', value: summary.total_months,                    sub: 'total records'       },
                            { label: 'Total days present', value: summary.total_days + ' days',            sub: 'across all periods'  },
                            { label: 'Total gross earned', value: '₱ ' + fmt(summary.total_gross),         sub: 'before deductions'   },
                            { label: 'Total net received', value: '₱ ' + fmt(summary.total_earned),        sub: 'after deductions',   color: 'text-teal' },
                        ].map(s => (
                            <div key={s.label} className="bg-panel rounded-xl border border-border p-3">
                                <p className="text-xs text-dim mb-1">{s.label}</p>
                                <p className={`text-base font-medium ${s.color ?? 'text-text'}`}>{s.value}</p>
                                <p className="text-xs text-dim mt-0.5">{s.sub}</p>
                            </div>
                        ))}
                    </div>
                )}

                {payslips.length === 0 ? (
                    <div className="bg-panel rounded-xl border border-border px-5 py-16 text-center">
                        <div className="text-3xl mb-3">📄</div>
                        <p className="text-sm font-medium text-sub">No payslips yet</p>
                        <p className="text-xs text-dim mt-1">
                            Your payslips will appear here once HR processes your payroll.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                        {/* Left — list */}
                        <div className="lg:col-span-2">
                            {/* Year filter */}
                            <div className="flex gap-1 p-1 bg-field rounded-lg mb-3">
                                <button
                                    onClick={() => setYearFilter('all')}
                                    className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
                                        yearFilter === 'all'
                                            ? 'bg-panel text-text font-medium shadow-sm border border-border'
                                            : 'text-sub'
                                    }`}>
                                    All
                                </button>
                                {years.map(y => (
                                    <button key={y}
                                        onClick={() => setYearFilter(y)}
                                        className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
                                            yearFilter === y
                                                ? 'bg-panel text-text font-medium shadow-sm border border-border'
                                                : 'text-sub'
                                        }`}>
                                        {y}
                                    </button>
                                ))}
                            </div>

                            {/* Month list */}
                            <div className="space-y-1.5">
                                {filtered.map(p => (
                                    <button key={p.month}
                                        onClick={() => setSelected(p.month)}
                                        className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                                            selected === p.month
                                                ? 'border-border bg-panel shadow-sm'
                                                : 'border-border bg-panel hover:border-border'
                                        }`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-medium text-text">{p.month_label}</p>
                                            <StatusBadge status={p.status} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-1">
                                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                                    p.has_first ? 'bg-blue/10 text-blue' : 'bg-field text-dim'
                                                }`}>1st</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                                    p.has_second ? 'bg-purple/10 text-purple' : 'bg-field text-dim'
                                                }`}>2nd</span>
                                            </div>
                                            <span className="text-xs font-medium text-teal">
                                                ₱ {fmt(p.total_net)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right — detail */}
                        <div className="lg:col-span-3">
                            {active ? (
                                <div>
                                    {/* Detail header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                        <div>
                                            <h2 className="text-base font-medium text-text">{active.month_label}</h2>
                                            <p className="text-xs text-dim mt-0.5">
                                                {active.total_days} days present · ₱ {fmt(active.total_gross)} gross
                                            </p>
                                        </div>
                                        <a href={`/employee/payslips/${active.month}`}
                                            target="_blank"
                                            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-opacity hover:opacity-90 w-full sm:w-auto bg-teal text-bg">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                            </svg>
                                            Download payslip
                                        </a>
                                    </div>

                                    {/* Monthly net pay highlight */}
                                    <div className="rounded-xl p-4 mb-4 border border-teal/20"
                                        style={{ background: 'linear-gradient(135deg, var(--color-teal) 0%, color-mix(in srgb, var(--color-teal) 70%, black) 100%)' }}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-teal mb-0.5 uppercase tracking-wide">
                                                    Monthly net pay
                                                </p>
                                                <p className="text-xl sm:text-2xl font-medium" style={{ color: 'var(--color-bg)' }}>
                                                    ₱ {fmt(active.total_net)}
                                                </p>
                                                <p className="text-xs text-teal mt-1">
                                                    ₱ {fmt(active.total_gross)} gross − ₱ {fmt(active.total_ded)} deductions
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <StatusBadge status={active.status} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cutoff cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                        <CutoffCard
                                            label="1st cutoff"
                                            period={active.first_period}
                                            days={active.first_days}
                                            basic={active.first_basic}
                                            transpo={active.first_transpo}
                                            ot={active.first_ot}
                                            gross={active.first_gross}
                                            deductions={active.first_deductions}
                                            net={active.first_net}
                                            status={active.first_status}
                                            month={active.month}
                                            cutoff="first"
                                        />
                                        <CutoffCard
                                            label="2nd cutoff"
                                            period={active.second_period}
                                            days={active.second_days}
                                            basic={active.second_basic}
                                            transpo={active.second_transpo}
                                            ot={active.second_ot}
                                            gross={active.second_gross}
                                            deductions={active.second_deductions}
                                            net={active.second_net}
                                            status={active.second_status}
                                            month={active.month}
                                            cutoff="second"
                                        />
                                    </div>

                                    {/* Breakdown bar */}
                                    {active.total_gross > 0 && (
                                        <div className="bg-panel rounded-xl border border-border p-4">
                                            <p className="text-xs font-medium text-sub mb-3">Monthly breakdown</p>
                                            <div className="space-y-2">
                                                {[
                                                    { label: 'Gross pay',       value: active.total_gross, color: 'var(--color-teal)', pct: 100 },
                                                    { label: 'Deductions',      value: active.total_ded,   color: 'var(--color-red)', pct: active.total_gross > 0 ? (active.total_ded / active.total_gross * 100) : 0 },
                                                    { label: 'Net pay',         value: active.total_net,   color: 'var(--color-emerald)', pct: active.total_gross > 0 ? (active.total_net / active.total_gross * 100) : 0 },
                                                ].map(row => (
                                                    <div key={row.label}>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-sub">{row.label}</span>
                                                            <span className="font-medium text-sub">₱ {fmt(row.value)}</span>
                                                        </div>
                                                        <div className="h-1.5 bg-field rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all"
                                                                style={{ width: `${Math.min(row.pct, 100)}%`, background: row.color }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-panel rounded-xl border border-border px-5 py-16 text-center">
                                    <p className="text-sm text-dim">Select a month to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <p className="mt-5 text-xs text-dim text-center">
                    Payslips are available once both cutoffs for the month are finalized by HR.
                    For questions, contact your HR administrator.
                </p>
            </div>
            </div>
        </EmployeeLayout>
    )
}