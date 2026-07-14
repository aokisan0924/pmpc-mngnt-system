import { useState } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
    ComposedChart, Area,
} from 'recharts'

/* ---------- design tokens (matches DtrEditRequests background) ---------- */
const C = {
    bg:      '#06090D',
    panel:   'rgba(14,20,27,0.72)',
    field:   'rgba(255,255,255,0.03)',
    border:  '#1F2C35',
    text:    '#E7F1EE',
    sub:     '#83979C',
    dim:     '#4C5C61',
    teal:    '#14F1B2',
    blue:    '#5AA9FF',
    amber:   '#FFC168',
    purple:  '#C29CFF',
    violet:  '#8B7CF6',
    red:     '#FF6B81',
}

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

const STATUS_STYLES = {
    on_time:   { color: C.teal,   label: 'On time'   },
    late:      { color: C.amber,  label: 'Late'      },
    undertime: { color: C.blue,   label: 'Undertime' },
    half_day:  { color: C.purple, label: 'Half day'  },
    absent:    { color: C.red,    label: 'Absent'    },
}

const ACTIVITY_STYLES = {
    emerald: { color: C.teal,   icon: '✓' },
    red:     { color: C.red,    icon: '✕' },
    blue:    { color: C.blue,   icon: '+' },
    amber:   { color: C.amber,  icon: '!' },
}

function badgeStyle(color) {
    return {
        background: `${color}1F`,
        color,
        border: `1px solid ${color}4D`,
    }
}

const IconUsers = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 10-8 0 4 4 0 008 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconCheck = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconClock = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconEdit = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconCash = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
    </svg>
)
const IconChart = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 15l4-5 3 3 5-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconPersonAdd = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21v-1a7 7 0 0114 0v1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 8v6M22 11h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

function ChartTooltip({ active, payload, label }) {
    if (! active || ! payload?.length) return null
    return (
        <div className="rounded-xl p-3 min-w-40 border backdrop-blur-xl"
            style={{ background: '#0C1218', borderColor: C.border }}>
            <p className="text-xs font-medium mb-2" style={{ color: C.text }}>{label}</p>
            {payload.map(p => (
                <div key={p.name} className="flex items-center justify-between gap-4 text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span style={{ color: C.sub }}>{p.name}</span>
                    </div>
                    <span className="font-medium" style={{ color: C.text }}>
                        {typeof p.value === 'number' && p.value > 999
                            ? '₱ ' + fmt(p.value)
                            : p.value + (p.name === 'Rate' ? '%' : '')}
                    </span>
                </div>
            ))}
        </div>
    )
}

function Section({ title, sub, children, action, delay = 0 }) {
    return (
        <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-5 animate-in"
            style={{ background: C.panel, borderColor: C.border, animationDelay: `${delay}ms` }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <p className="text-sm font-medium" style={{ color: C.text }}>{title}</p>
                    {sub && <p className="text-xs mt-0.5" style={{ color: C.dim }}>{sub}</p>}
                </div>
                {action}
            </div>
            {children}
        </div>
    )
}

function KpiCard({ label, value, sub, accent, icon: Icon, alert, delay = 0 }) {
    return (
        <div className="rounded-2xl border backdrop-blur-xl p-4 relative overflow-hidden animate-in"
            style={{ background: C.panel, borderColor: C.border, animationDelay: `${delay}ms` }}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
            <div className="flex items-start justify-between mb-2">
                <p className="text-xs leading-tight" style={{ color: C.sub }}>{label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${accent}1A` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                </div>
            </div>
            <p className="text-2xl font-semibold font-display mb-0.5" style={{ color: C.text }}>{value}</p>
            {sub && <p className="text-xs" style={{ color: C.dim }}>{sub}</p>}
            {alert && (
                <span className="inline-block mt-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={badgeStyle(C.red)}>
                    {alert}
                </span>
            )}
        </div>
    )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function Dashboard({
    stats,
    today_snapshot,
    monthly_attendance,
    department_attendance,
    payroll_trend,
    headcount_breakdown,
    recent_activity,
}) {
    const [snapshotFilter, setSnapshotFilter] = useState('all')
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const filteredSnapshot = snapshotFilter === 'all'
        ? today_snapshot
        : today_snapshot.filter(e => e.status === snapshotFilter)

    const statusCounts = today_snapshot.reduce((acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1
        return acc
    }, {})

    // Donut chart data for headcount
    const donutData = [
        { name: 'Present',  value: stats.present_today,               color: C.teal },
        { name: 'Late',     value: stats.late_today,                   color: C.amber },
        { name: 'Absent',   value: Math.max(0, stats.absent_today),    color: C.red },
    ].filter(d => d.value > 0)

    const axisTick  = { fontSize: 10, fill: C.dim }
    const gridColor = 'rgba(255,255,255,0.06)'

    return (
        <AdminLayout pendingEditCount={stats.pending_edits}>
            <div className="relative min-h-screen overflow-hidden hud-grid" style={{ background: C.bg }}>
                <div className="pointer-events-none absolute -top-40 -left-32 w-[28rem] h-[28rem] rounded-full blur-[120px] opacity-15"
                    style={{ background: C.violet }} />

                <div className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 animate-in">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] font-mono mb-1" style={{ color: C.violet }}>
                                Admin Overview
                            </p>
                            <h1 className="font-display text-xl sm:text-2xl font-semibold" style={{ color: C.text }}>
                                Dashboard
                            </h1>
                            <p className="text-sm mt-0.5" style={{ color: C.sub }}>{dateStr}</p>
                        </div>
                        {stats.latest_payroll && (
                            <div className="rounded-xl border px-4 py-2.5 sm:text-right"
                                style={{ background: C.field, borderColor: C.border }}>
                                <p className="text-xs" style={{ color: C.dim }}>Latest payroll</p>
                                <p className="text-sm font-medium" style={{ color: C.text }}>{stats.latest_payroll.period_label}</p>
                                <p className="text-xs font-medium" style={{ color: C.teal }}>₱ {fmt(stats.latest_payroll.total_net)} net</p>
                            </div>
                        )}
                    </div>

                    {/* ── KPI cards ─────────────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        <KpiCard
                            label="Total employees"
                            value={stats.total_employees}
                            sub={`${stats.active_employees} active`}
                            accent={C.violet}
                            icon={IconUsers}
                            delay={0}
                        />
                        <KpiCard
                            label="Present today"
                            value={stats.present_today}
                            sub={`of ${stats.active_employees} active`}
                            accent={C.teal}
                            icon={IconCheck}
                            delay={40}
                        />
                        <KpiCard
                            label="Late today"
                            value={stats.late_today}
                            sub="as of now"
                            accent={C.amber}
                            icon={IconClock}
                            alert={stats.late_today > 0 ? `${stats.late_today} need attention` : null}
                            delay={80}
                        />
                        <KpiCard
                            label="Pending DTR edits"
                            value={stats.pending_edits}
                            sub="awaiting review"
                            accent={C.red}
                            icon={IconEdit}
                            alert={stats.pending_edits > 0 ? 'Action needed' : null}
                            delay={120}
                        />
                    </div>

                    {/* ── Row 1: Today snapshot + Donut ─────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

                        {/* Today snapshot — 2/3 width */}
                        <div className="lg:col-span-2">
                            <Section
                                title="Today's attendance"
                                sub={`${stats.present_today} present · ${stats.late_today} late · ${Math.max(0, stats.absent_today)} absent`}
                                delay={160}
                                action={
                                    <div className="flex gap-1 p-1 rounded-xl border overflow-x-auto"
                                        style={{ background: C.field, borderColor: C.border }}>
                                        {['all', 'on_time', 'late', 'absent'].map(f => (
                                            <button key={f} onClick={() => setSnapshotFilter(f)}
                                                className="px-2 py-1 text-xs rounded-lg capitalize transition-all font-medium whitespace-nowrap"
                                                style={snapshotFilter === f
                                                    ? { background: 'rgba(139,124,246,0.14)', color: C.violet, boxShadow: 'inset 0 0 0 1px rgba(139,124,246,0.35)' }
                                                    : { color: C.dim }}>
                                                {f === 'all' ? `All (${today_snapshot.length})` : (
                                                    STATUS_STYLES[f]?.label + (statusCounts[f] ? ` (${statusCounts[f]})` : '')
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                }>
                                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                                    {filteredSnapshot.map(emp => {
                                        const style = STATUS_STYLES[emp.status] ?? STATUS_STYLES.absent
                                        return (
                                            <div key={emp.id}
                                                className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-colors"
                                                style={{ background: 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 border font-mono"
                                                    style={{ background: 'rgba(139,124,246,0.12)', color: C.violet, borderColor: 'rgba(139,124,246,0.3)' }}>
                                                    {emp.initials}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate" style={{ color: C.text }}>{emp.full_name}</p>
                                                    <p className="text-xs" style={{ color: C.dim }}>{emp.department}</p>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <div className="hidden sm:flex gap-2 text-xs font-mono" style={{ color: C.sub }}>
                                                        <span>{emp.am_time_in?.slice(0,5) ?? '—'}</span>
                                                        <span style={{ color: C.dim }}>|</span>
                                                        <span>{emp.pm_time_out?.slice(0,5) ?? '—'}</span>
                                                    </div>
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                        style={badgeStyle(style.color)}>
                                                        {style.label}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {filteredSnapshot.length === 0 && (
                                        <p className="text-xs text-center py-6" style={{ color: C.dim }}>No employees found.</p>
                                    )}
                                </div>
                            </Section>
                        </div>

                        {/* Donut chart — 1/3 width */}
                        <div>
                            <Section title="Today at a glance" sub="Present · Late · Absent" delay={200}>
                                {donutData.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={160}>
                                            <PieChart>
                                                <Pie data={donutData} cx="50%" cy="50%"
                                                    innerRadius={45} outerRadius={72}
                                                    paddingAngle={3} dataKey="value"
                                                    startAngle={90} endAngle={-270}>
                                                    {donutData.map(entry => (
                                                        <Cell key={entry.name} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value, name) => [value + ' employees', name]}
                                                    contentStyle={{ background: '#0C1218', border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12 }}
                                                    itemStyle={{ color: C.text }}
                                                    labelStyle={{ color: C.sub }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="space-y-2 mt-2">
                                            {donutData.map(d => (
                                                <div key={d.name} className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                                                        <span style={{ color: C.sub }}>{d.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium" style={{ color: C.text }}>{d.value}</span>
                                                        <span style={{ color: C.dim }}>
                                                            ({stats.active_employees > 0
                                                                ? Math.round(d.value / stats.active_employees * 100)
                                                                : 0}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-10 text-center">
                                        <p className="text-xs" style={{ color: C.dim }}>No attendance recorded yet today.</p>
                                    </div>
                                )}
                            </Section>
                        </div>
                    </div>

                    {/* ── Row 2: Monthly attendance trend ───────────────── */}
                    <div className="mb-4">
                        <Section
                            title="Monthly attendance trend"
                            sub="Attendance rate % over the last 6 months"
                            delay={240}>
                            {monthly_attendance.length > 0 ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <ComposedChart data={monthly_attendance}
                                        margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                        <XAxis dataKey="month_short"
                                            tick={{ fontSize: 11, fill: C.dim }}
                                            tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="rate" domain={[0, 100]}
                                            tickFormatter={v => v + '%'}
                                            tick={axisTick}
                                            tickLine={false} axisLine={false} width={40} />
                                        <YAxis yAxisId="count" orientation="right"
                                            tick={axisTick}
                                            tickLine={false} axisLine={false} width={32} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 11, paddingTop: 12, color: C.sub }}
                                            iconType="circle" iconSize={8} />
                                        <Bar yAxisId="count" dataKey="present"
                                            name="Present" fill={C.teal}
                                            radius={[3, 3, 0, 0]} fillOpacity={0.25}
                                            stackId="a" />
                                        <Bar yAxisId="count" dataKey="late"
                                            name="Late" fill={C.amber}
                                            radius={[0, 0, 0, 0]} fillOpacity={0.35}
                                            stackId="a" />
                                        <Line yAxisId="rate" type="monotone" dataKey="rate"
                                            name="Rate" stroke={C.teal}
                                            strokeWidth={2.5}
                                            dot={{ r: 4, fill: C.teal, stroke: '#0C1218', strokeWidth: 2 }}
                                            activeDot={{ r: 6 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="py-10 text-center">
                                    <p className="text-xs" style={{ color: C.dim }}>No attendance data yet.</p>
                                </div>
                            )}
                        </Section>
                    </div>

                    {/* ── Row 3: Department attendance + Payroll trend ──── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

                        {/* Department attendance */}
                        <Section
                            title="Department attendance"
                            sub={`This month — ${new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}`}
                            delay={280}>
                            {department_attendance.length > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={department_attendance}
                                            margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                            <XAxis dataKey="department"
                                                tick={axisTick}
                                                tickLine={false} axisLine={false} />
                                            <YAxis tick={axisTick}
                                                tickLine={false} axisLine={false} width={28} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend
                                                wrapperStyle={{ fontSize: 10, paddingTop: 8, color: C.sub }}
                                                iconType="circle" iconSize={7} />
                                            <Bar dataKey="present" name="Present"
                                                stackId="a" fill={C.teal}
                                                radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="late" name="Late"
                                                stackId="a" fill={C.amber}
                                                radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="absent" name="Absent"
                                                stackId="a" fill="rgba(255,107,129,0.35)"
                                                radius={[3, 3, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>

                                    {/* Department mini table */}
                                    <div className="mt-3 rounded-xl border overflow-hidden overflow-x-auto" style={{ borderColor: C.border }}>
                                        <table className="w-full text-xs min-w-[420px]">
                                            <thead>
                                                <tr className="border-b" style={{ background: C.field, borderColor: C.border }}>
                                                    <th className="text-left px-3 py-2 font-medium" style={{ color: C.dim }}>Dept</th>
                                                    <th className="text-center px-2 py-2 font-medium" style={{ color: C.dim }}>Staff</th>
                                                    <th className="text-center px-2 py-2 font-medium" style={{ color: C.teal }}>Present</th>
                                                    <th className="text-center px-2 py-2 font-medium" style={{ color: C.amber }}>Late</th>
                                                    <th className="text-center px-2 py-2 font-medium" style={{ color: C.red }}>Absent</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {department_attendance.map(d => (
                                                    <tr key={d.department} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                        <td className="px-3 py-2 font-medium truncate max-w-24" style={{ color: C.text }}>{d.department}</td>
                                                        <td className="px-2 py-2 text-center" style={{ color: C.sub }}>{d.headcount}</td>
                                                        <td className="px-2 py-2 text-center font-medium" style={{ color: C.teal }}>{d.present}</td>
                                                        <td className="px-2 py-2 text-center" style={{ color: C.amber }}>{d.late}</td>
                                                        <td className="px-2 py-2 text-center" style={{ color: C.red }}>{d.absent}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <div className="py-10 text-center">
                                    <p className="text-xs" style={{ color: C.dim }}>No department data yet.</p>
                                </div>
                            )}
                        </Section>

                        {/* Payroll trend */}
                        <Section
                            title="Payroll cost trend"
                            sub="Last 6 months — finalized payrolls only"
                            delay={320}>
                            {payroll_trend.length > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <ComposedChart data={payroll_trend}
                                            margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                            <XAxis dataKey="month"
                                                tick={axisTick}
                                                tickLine={false} axisLine={false} />
                                            <YAxis tickFormatter={fmtShort}
                                                tick={axisTick}
                                                tickLine={false} axisLine={false} width={48} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend
                                                wrapperStyle={{ fontSize: 10, paddingTop: 8, color: C.sub }}
                                                iconType="circle" iconSize={7} />
                                            <Area type="monotone" dataKey="total_gross"
                                                name="Gross" fill={C.teal}
                                                stroke={C.teal} strokeWidth={1.5}
                                                fillOpacity={0.12} />
                                            <Line type="monotone" dataKey="total_net"
                                                name="Net pay" stroke={C.teal}
                                                strokeWidth={2.5}
                                                dot={{ r: 3, fill: C.teal, stroke: '#0C1218', strokeWidth: 2 }} />
                                            <Line type="monotone" dataKey="total_deductions"
                                                name="Deductions" stroke={C.red}
                                                strokeWidth={1.5} strokeDasharray="4 3"
                                                dot={{ r: 2, fill: C.red }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>

                                    {/* Payroll mini summary */}
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Avg gross',      value: fmtShort(payroll_trend.reduce((s,r) => s + r.total_gross, 0) / payroll_trend.length), color: C.text },
                                            { label: 'Avg deductions', value: fmtShort(payroll_trend.reduce((s,r) => s + r.total_deductions, 0) / payroll_trend.length), color: C.red },
                                            { label: 'Avg net pay',    value: fmtShort(payroll_trend.reduce((s,r) => s + r.total_net, 0) / payroll_trend.length), color: C.teal },
                                        ].map(s => (
                                            <div key={s.label} className="rounded-lg px-2 py-2 text-center border"
                                                style={{ background: C.field, borderColor: C.border }}>
                                                <p className="text-xs mb-0.5" style={{ color: C.dim }}>{s.label}</p>
                                                <p className="text-xs sm:text-sm font-medium" style={{ color: s.color }}>{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="py-10 text-center">
                                    <p className="text-xs" style={{ color: C.dim }}>No finalized payrolls yet.</p>
                                </div>
                            )}
                        </Section>
                    </div>

                    {/* ── Row 4: Recent activity ─────────────────────────── */}
                    <div className="mb-4">
                        <Section
                            title="Recent activity"
                            sub="Latest actions across the system"
                            delay={360}
                            action={
                                <a href="/admin/edit-requests"
                                    className="text-xs font-medium transition-colors"
                                    style={{ color: C.violet }}>
                                    View all →
                                </a>
                            }>
                            {recent_activity.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {recent_activity.map((act, i) => {
                                        const style = ACTIVITY_STYLES[act.color] ?? ACTIVITY_STYLES.blue
                                        return (
                                            <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-colors"
                                                style={{ borderColor: 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                                    style={badgeStyle(style.color)}>
                                                    {style.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs leading-snug" style={{ color: C.text }}>{act.message}</p>
                                                    <p className="text-xs mt-0.5" style={{ color: C.dim }}>{act.time}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-center py-6" style={{ color: C.dim }}>No recent activity.</p>
                            )}
                        </Section>
                    </div>

                    {/* ── Quick links ────────────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in" style={{ animationDelay: '400ms' }}>
                        {[
                            { label: 'Process payroll',    href: '/admin/payroll',          icon: IconCash,      color: C.teal },
                            { label: 'DTR edit requests',  href: '/admin/edit-requests',    icon: IconEdit,      color: C.violet, badge: stats.pending_edits },
                            { label: 'Add employee',       href: '/admin/employees',        icon: IconPersonAdd, color: C.blue },
                            { label: 'Payroll analytics',  href: '/admin/payroll/analytics',icon: IconChart,     color: C.purple },
                        ].map(link => (
                            <a key={link.href} href={link.href}
                                className="relative flex items-center gap-2.5 rounded-2xl border backdrop-blur-xl px-4 py-3 transition-colors"
                                style={{ background: C.panel, borderColor: C.border }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = `${link.color}66`}
                                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: `${link.color}1A` }}>
                                    <link.icon className="w-4 h-4" style={{ color: link.color }} />
                                </div>
                                <span className="text-xs font-medium" style={{ color: C.text }}>{link.label}</span>
                                {link.badge > 0 && (
                                    <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full font-medium"
                                        style={{ background: C.red, color: '#06090D', fontSize: 9 }}>
                                        {link.badge}
                                    </span>
                                )}
                            </a>
                        ))}
                    </div>
                </div>

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
                    .font-display { font-family: 'Space Grotesk', sans-serif; }
                    .font-mono { font-family: 'JetBrains Mono', monospace; }
                    @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-in { animation: fadeSlideUp 0.5s ease-out both; }
                    @keyframes gridDrift { from { background-position: 0 0; } to { background-position: 60px 60px; } }
                    .hud-grid { background-image: linear-gradient(rgba(139,124,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,124,246,0.05) 1px, transparent 1px); background-size: 34px 34px; animation: gridDrift 16s linear infinite; }
                    @media (prefers-reduced-motion: reduce) { .animate-in, .hud-grid { animation: none; } }
                `}</style>
            </div>
        </AdminLayout>
    )
}