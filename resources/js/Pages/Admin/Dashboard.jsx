import { useState } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
    ComposedChart, Area,
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

const STATUS_STYLES = {
    on_time:   { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: '#10B981', label: 'On time'   },
    late:      { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: '#F59E0B', label: 'Late'      },
    undertime: { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: '#3B82F6', label: 'Undertime' },
    half_day:  { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: '#8B5CF6', label: 'Half day'  },
    absent:    { bg: 'bg-red-50',     text: 'text-red-700',     dot: '#EF4444', label: 'Absent'    },
}

const ACTIVITY_COLORS = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✓' },
    red:     { bg: 'bg-red-100',     text: 'text-red-700',     icon: '✕' },
    blue:    { bg: 'bg-blue-100',    text: 'text-blue-700',    icon: '+' },
    amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   icon: '!' },
}

function ChartTooltip({ active, payload, label }) {
    if (! active || ! payload?.length) return null
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-40">
            <p className="text-xs font-medium text-gray-700 mb-2">{label}</p>
            {payload.map(p => (
                <div key={p.name} className="flex items-center justify-between gap-4 text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-gray-500">{p.name}</span>
                    </div>
                    <span className="font-medium text-gray-800">
                        {typeof p.value === 'number' && p.value > 999
                            ? '₱ ' + fmt(p.value)
                            : p.value + (p.name === 'Rate' ? '%' : '')}
                    </span>
                </div>
            ))}
        </div>
    )
}

function Section({ title, sub, children, action }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                </div>
                {action}
            </div>
            {children}
        </div>
    )
}

function KpiCard({ label, value, sub, accent, icon, alert }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
            <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-gray-500 leading-tight">{label}</p>
                <span className="text-lg leading-none">{icon}</span>
            </div>
            <p className="text-2xl font-medium text-gray-900 mb-0.5">{value}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
            {alert && (
                <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
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
        { name: 'Present',  value: stats.present_today,               color: '#10B981' },
        { name: 'Late',     value: stats.late_today,                   color: '#F59E0B' },
        { name: 'Absent',   value: Math.max(0, stats.absent_today),    color: '#EF4444' },
    ].filter(d => d.value > 0)

    return (
        <AdminLayout pendingEditCount={stats.pending_edits}>
            <div className="p-6 max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h1 className="text-lg font-medium text-gray-900">Dashboard</h1>
                        <p className="text-sm text-gray-400 mt-0.5">{dateStr}</p>
                    </div>
                    {stats.latest_payroll && (
                        <div className="text-right">
                            <p className="text-xs text-gray-400">Latest payroll</p>
                            <p className="text-sm font-medium text-gray-700">{stats.latest_payroll.period_label}</p>
                            <p className="text-xs text-emerald-600 font-medium">₱ {fmt(stats.latest_payroll.total_net)} net</p>
                        </div>
                    )}
                </div>

                {/* ── KPI cards ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <KpiCard
                        label="Total employees"
                        value={stats.total_employees}
                        sub={`${stats.active_employees} active`}
                        accent="#26215C"
                        icon="👥"
                    />
                    <KpiCard
                        label="Present today"
                        value={stats.present_today}
                        sub={`of ${stats.active_employees} active`}
                        accent="#10B981"
                        icon="✅"
                    />
                    <KpiCard
                        label="Late today"
                        value={stats.late_today}
                        sub="as of now"
                        accent="#F59E0B"
                        icon="⏰"
                        alert={stats.late_today > 0 ? `${stats.late_today} need attention` : null}
                    />
                    <KpiCard
                        label="Pending DTR edits"
                        value={stats.pending_edits}
                        sub="awaiting review"
                        accent="#EF4444"
                        icon="📝"
                        alert={stats.pending_edits > 0 ? 'Action needed' : null}
                    />
                </div>

                {/* ── Row 1: Today snapshot + Donut ─────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

                    {/* Today snapshot — 2/3 width */}
                    <div className="lg:col-span-2">
                        <Section
                            title="Today's attendance"
                            sub={`${stats.present_today} present · ${stats.late_today} late · ${Math.max(0, stats.absent_today)} absent`}
                            action={
                                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                                    {['all', 'on_time', 'late', 'absent'].map(f => (
                                        <button key={f} onClick={() => setSnapshotFilter(f)}
                                            className={`px-2 py-1 text-xs rounded-md capitalize transition-all ${
                                                snapshotFilter === f
                                                    ? 'bg-white text-gray-800 font-medium shadow-sm border border-gray-200'
                                                    : 'text-gray-500'
                                            }`}>
                                            {f === 'all' ? `All (${today_snapshot.length})` : (
                                                STATUS_STYLES[f]?.label + (statusCounts[f] ? ` (${statusCounts[f]})` : '')
                                            )}
                                        </button>
                                    ))}
                                </div>
                            }>
                            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                                {filteredSnapshot.map(emp => {
                                    const style = STATUS_STYLES[emp.status] ?? STATUS_STYLES.absent
                                    return (
                                        <div key={emp.id}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                                                style={{ background: '#26215C' }}>
                                                {emp.initials}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-800 truncate">{emp.full_name}</p>
                                                <p className="text-xs text-gray-400">{emp.department}</p>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                {/* Punch times */}
                                                <div className="hidden sm:flex gap-2 text-xs font-mono text-gray-500">
                                                    <span>{emp.am_time_in?.slice(0,5) ?? '—'}</span>
                                                    <span className="text-gray-300">|</span>
                                                    <span>{emp.pm_time_out?.slice(0,5) ?? '—'}</span>
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                                                    {style.label}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                                {filteredSnapshot.length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-6">No employees found.</p>
                                )}
                            </div>
                        </Section>
                    </div>

                    {/* Donut chart — 1/3 width */}
                    <div>
                        <Section title="Today at a glance" sub="Present · Late · Absent">
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
                                            <Tooltip formatter={(value, name) => [value + ' employees', name]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-2 mt-2">
                                        {donutData.map(d => (
                                            <div key={d.name} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                                                    <span className="text-gray-600">{d.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-800">{d.value}</span>
                                                    <span className="text-gray-400">
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
                                    <p className="text-xs text-gray-400">No attendance recorded yet today.</p>
                                </div>
                            )}
                        </Section>
                    </div>
                </div>

                {/* ── Row 2: Monthly attendance trend ───────────────── */}
                <div className="mb-5">
                    <Section
                        title="Monthly attendance trend"
                        sub="Attendance rate % over the last 6 months">
                        {monthly_attendance.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <ComposedChart data={monthly_attendance}
                                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                    <XAxis dataKey="month_short"
                                        tick={{ fontSize: 11, fill: '#9CA3AF' }}
                                        tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="rate" domain={[0, 100]}
                                        tickFormatter={v => v + '%'}
                                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        tickLine={false} axisLine={false} width={40} />
                                    <YAxis yAxisId="count" orientation="right"
                                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        tickLine={false} axisLine={false} width={32} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                                        iconType="circle" iconSize={8} />
                                    <Bar yAxisId="count" dataKey="present"
                                        name="Present" fill="#0F6E56"
                                        radius={[3, 3, 0, 0]} fillOpacity={0.15}
                                        stackId="a" />
                                    <Bar yAxisId="count" dataKey="late"
                                        name="Late" fill="#F59E0B"
                                        radius={[0, 0, 0, 0]} fillOpacity={0.3}
                                        stackId="a" />
                                    <Line yAxisId="rate" type="monotone" dataKey="rate"
                                        name="Rate" stroke="#0F6E56"
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: '#0F6E56', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="py-10 text-center">
                                <p className="text-xs text-gray-400">No attendance data yet.</p>
                            </div>
                        )}
                    </Section>
                </div>

                {/* ── Row 3: Department attendance + Payroll trend ──── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

                    {/* Department attendance */}
                    <Section
                        title="Department attendance"
                        sub={`This month — ${new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}`}>
                        {department_attendance.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={department_attendance}
                                        margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                                        <XAxis dataKey="department"
                                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            tickLine={false} axisLine={false} width={28} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                                            iconType="circle" iconSize={7} />
                                        <Bar dataKey="present" name="Present"
                                            stackId="a" fill="#0F6E56"
                                            radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="late" name="Late"
                                            stackId="a" fill="#F59E0B"
                                            radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="absent" name="Absent"
                                            stackId="a" fill="#FEE2E2"
                                            radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>

                                {/* Department mini table */}
                                <div className="mt-3 border border-gray-100 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="text-left px-3 py-2 text-gray-400 font-medium">Dept</th>
                                                <th className="text-center px-2 py-2 text-gray-400 font-medium">Staff</th>
                                                <th className="text-center px-2 py-2 text-gray-400 font-medium text-emerald-600">Present</th>
                                                <th className="text-center px-2 py-2 text-gray-400 font-medium text-amber-600">Late</th>
                                                <th className="text-center px-2 py-2 text-gray-400 font-medium text-red-500">Absent</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {department_attendance.map(d => (
                                                <tr key={d.department} className="border-b border-gray-50">
                                                    <td className="px-3 py-2 font-medium text-gray-700 truncate max-w-24">{d.department}</td>
                                                    <td className="px-2 py-2 text-center text-gray-500">{d.headcount}</td>
                                                    <td className="px-2 py-2 text-center text-emerald-600 font-medium">{d.present}</td>
                                                    <td className="px-2 py-2 text-center text-amber-600">{d.late}</td>
                                                    <td className="px-2 py-2 text-center text-red-500">{d.absent}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="py-10 text-center">
                                <p className="text-xs text-gray-400">No department data yet.</p>
                            </div>
                        )}
                    </Section>

                    {/* Payroll trend */}
                    <Section
                        title="Payroll cost trend"
                        sub="Last 6 months — finalized payrolls only">
                        {payroll_trend.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <ComposedChart data={payroll_trend}
                                        margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                        <XAxis dataKey="month"
                                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            tickLine={false} axisLine={false} />
                                        <YAxis tickFormatter={fmtShort}
                                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            tickLine={false} axisLine={false} width={48} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                                            iconType="circle" iconSize={7} />
                                        <Area type="monotone" dataKey="total_gross"
                                            name="Gross" fill="#E6F7F1"
                                            stroke="#0F6E56" strokeWidth={1.5}
                                            fillOpacity={0.4} />
                                        <Line type="monotone" dataKey="total_net"
                                            name="Net pay" stroke="#10B981"
                                            strokeWidth={2.5}
                                            dot={{ r: 3, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} />
                                        <Line type="monotone" dataKey="total_deductions"
                                            name="Deductions" stroke="#EF4444"
                                            strokeWidth={1.5} strokeDasharray="4 3"
                                            dot={{ r: 2, fill: '#EF4444' }} />
                                    </ComposedChart>
                                </ResponsiveContainer>

                                {/* Payroll mini summary */}
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Avg gross',  value: fmtShort(payroll_trend.reduce((s,r) => s + r.total_gross, 0) / payroll_trend.length), color: 'text-gray-800' },
                                        { label: 'Avg deductions', value: fmtShort(payroll_trend.reduce((s,r) => s + r.total_deductions, 0) / payroll_trend.length), color: 'text-red-600' },
                                        { label: 'Avg net pay', value: fmtShort(payroll_trend.reduce((s,r) => s + r.total_net, 0) / payroll_trend.length), color: 'text-emerald-600' },
                                    ].map(s => (
                                        <div key={s.label} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                                            <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
                                            <p className={`text-sm font-medium ${s.color}`}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="py-10 text-center">
                                <p className="text-xs text-gray-400">No finalized payrolls yet.</p>
                            </div>
                        )}
                    </Section>
                </div>

                {/* ── Row 4: Recent activity ─────────────────────────── */}
                <div className="mb-5">
                    <Section
                        title="Recent activity"
                        sub="Latest actions across the system"
                        action={
                            <a href="/admin/edit-requests"
                                className="text-xs font-medium"
                                style={{ color: '#26215C' }}>
                                View all →
                            </a>
                        }>
                        {recent_activity.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {recent_activity.map((act, i) => {
                                    const style = ACTIVITY_COLORS[act.color] ?? ACTIVITY_COLORS.blue
                                    return (
                                        <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${style.bg} ${style.text}`}>
                                                {style.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-700 leading-snug">{act.message}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{act.time}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 text-center py-6">No recent activity.</p>
                        )}
                    </Section>
                </div>

                {/* ── Quick links ────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Process payroll',    href: '/admin/payroll',         icon: '💰', color: '#0F6E56' },
                        { label: 'DTR edit requests',  href: '/admin/edit-requests',   icon: '📝', color: '#26215C', badge: stats.pending_edits },
                        { label: 'Add employee',       href: '/admin/employees',        icon: '👤', color: '#378ADD' },
                        { label: 'Payroll analytics',  href: '/admin/payroll/analytics',icon: '📊', color: '#8B5CF6' },
                    ].map(link => (
                        <a key={link.href} href={link.href}
                            className="relative flex items-center gap-2.5 bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-gray-300 transition-colors">
                            <span className="text-xl">{link.icon}</span>
                            <span className="text-xs font-medium text-gray-700">{link.label}</span>
                            {link.badge > 0 && (
                                <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full bg-red-500 text-white font-medium"
                                    style={{ fontSize: 9 }}>
                                    {link.badge}
                                </span>
                            )}
                        </a>
                    ))}
                </div>
            </div>
        </AdminLayout>
    )
}