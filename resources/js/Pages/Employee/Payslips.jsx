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
        complete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        partial:  'bg-amber-50  text-amber-700  border-amber-200',
        none:     'bg-gray-100  text-gray-400   border-gray-200',
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
        <div className={`rounded-xl border p-4 ${finalized ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-xs font-medium text-gray-700">{label}</p>
                    {period && <p className="text-xs text-gray-400 mt-0.5">{period}</p>}
                </div>
                {status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        finalized ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                        {finalized ? 'Finalized' : 'Draft'}
                    </span>
                )}
            </div>

            {days > 0 ? (
                <>
                    <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Days present</span>
                            <span className="font-medium text-gray-700">{days} days</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Basic pay</span>
                            <span className="text-gray-700">₱ {fmt(basic)}</span>
                        </div>
                        {transpo > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Allowances</span>
                                <span className="text-gray-700">₱ {fmt(transpo)}</span>
                            </div>
                        )}
                        {ot > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Overtime</span>
                                <span className="text-amber-600">+ ₱ {fmt(ot)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5 mt-1.5">
                            <span className="text-gray-500">Gross pay</span>
                            <span className="font-medium text-gray-800">₱ {fmt(gross)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Deductions</span>
                            <span className="text-red-500">− ₱ {fmt(deductions)}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                        <span className="text-xs font-medium text-gray-600">Net pay</span>
                        <span className="text-sm font-medium text-emerald-700">₱ {fmt(net)}</span>
                    </div>
                </>
            ) : (
                <div className="py-4 text-center">
                    <p className="text-xs text-gray-400">No payroll data yet</p>
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
        <EmployeeLayout>
            <div className="p-6 max-w-6xl mx-auto">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-lg font-medium text-gray-900">My payslips</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        View and download your payslip history
                    </p>
                </div>

                {/* Career summary */}
                {payslips.length > 0 && (
                    <div className="grid grid-cols-4 gap-3 mb-6">
                        {[
                            { label: 'Months on payroll', value: summary.total_months,                    sub: 'total records'       },
                            { label: 'Total days present', value: summary.total_days + ' days',            sub: 'across all periods'  },
                            { label: 'Total gross earned', value: '₱ ' + fmt(summary.total_gross),         sub: 'before deductions'   },
                            { label: 'Total net received', value: '₱ ' + fmt(summary.total_earned),        sub: 'after deductions',   color: 'text-emerald-700' },
                        ].map(s => (
                            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3">
                                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                                <p className={`text-base font-medium ${s.color ?? 'text-gray-900'}`}>{s.value}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                            </div>
                        ))}
                    </div>
                )}

                {payslips.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 px-5 py-16 text-center">
                        <div className="text-3xl mb-3">📄</div>
                        <p className="text-sm font-medium text-gray-600">No payslips yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Your payslips will appear here once HR processes your payroll.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-5 gap-5">

                        {/* Left — list */}
                        <div className="col-span-2">
                            {/* Year filter */}
                            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-3">
                                <button
                                    onClick={() => setYearFilter('all')}
                                    className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
                                        yearFilter === 'all'
                                            ? 'bg-white text-gray-800 font-medium shadow-sm border border-gray-200'
                                            : 'text-gray-500'
                                    }`}>
                                    All
                                </button>
                                {years.map(y => (
                                    <button key={y}
                                        onClick={() => setYearFilter(y)}
                                        className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
                                            yearFilter === y
                                                ? 'bg-white text-gray-800 font-medium shadow-sm border border-gray-200'
                                                : 'text-gray-500'
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
                                                ? 'border-gray-300 bg-white shadow-sm'
                                                : 'border-gray-100 bg-white hover:border-gray-200'
                                        }`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-medium text-gray-800">{p.month_label}</p>
                                            <StatusBadge status={p.status} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-1">
                                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                                    p.has_first ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                                                }`}>1st</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                                    p.has_second ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-400'
                                                }`}>2nd</span>
                                            </div>
                                            <span className="text-xs font-medium text-emerald-700">
                                                ₱ {fmt(p.total_net)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right — detail */}
                        <div className="col-span-3">
                            {active ? (
                                <div>
                                    {/* Detail header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-base font-medium text-gray-900">{active.month_label}</h2>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {active.total_days} days present · ₱ {fmt(active.total_gross)} gross
                                            </p>
                                        </div>
                                        <a href={`/employee/payslips/${active.month}`}
                                            target="_blank"
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
                                            style={{ background: '#0F6E56' }}>
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                            </svg>
                                            Download payslip
                                        </a>
                                    </div>

                                    {/* Monthly net pay highlight */}
                                    <div className="rounded-xl p-4 mb-4 border border-emerald-100"
                                        style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #085041 100%)' }}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-emerald-200 mb-0.5 uppercase tracking-wide">
                                                    Monthly net pay
                                                </p>
                                                <p className="text-2xl font-medium text-white">
                                                    ₱ {fmt(active.total_net)}
                                                </p>
                                                <p className="text-xs text-emerald-300 mt-1">
                                                    ₱ {fmt(active.total_gross)} gross − ₱ {fmt(active.total_ded)} deductions
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <StatusBadge status={active.status} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cutoff cards */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
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
                                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                                            <p className="text-xs font-medium text-gray-600 mb-3">Monthly breakdown</p>
                                            <div className="space-y-2">
                                                {[
                                                    { label: 'Gross pay',       value: active.total_gross, color: '#0F6E56', pct: 100 },
                                                    { label: 'Deductions',      value: active.total_ded,   color: '#EF4444', pct: active.total_gross > 0 ? (active.total_ded / active.total_gross * 100) : 0 },
                                                    { label: 'Net pay',         value: active.total_net,   color: '#10B981', pct: active.total_gross > 0 ? (active.total_net / active.total_gross * 100) : 0 },
                                                ].map(row => (
                                                    <div key={row.label}>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-gray-500">{row.label}</span>
                                                            <span className="font-medium text-gray-700">₱ {fmt(row.value)}</span>
                                                        </div>
                                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
                                <div className="bg-white rounded-xl border border-gray-200 px-5 py-16 text-center">
                                    <p className="text-sm text-gray-400">Select a month to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <p className="mt-5 text-xs text-gray-400 text-center">
                    Payslips are available once both cutoffs for the month are finalized by HR.
                    For questions, contact your HR administrator.
                </p>
            </div>
        </EmployeeLayout>
    )
}