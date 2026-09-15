import { useState } from 'react'
import { Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
    ComposedChart, Area,
} from 'recharts'

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

function fmtShort(num) {
    if (num >= 1_000_000) return '₱' + (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000) return '₱' + (num / 1_000).toFixed(1) + 'K'
    return '₱' + Math.round(num)
}

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-panel border border-border shadow-md rounded-xl p-3 min-w-40 text-xs">
            <p className="font-heading font-semibold text-text mb-2 border-b border-border/70 pb-1">{label}</p>
            {payload.map(p => (
                <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-sub">{p.name}</span>
                    </div>
                    <span className="font-semibold text-text tnum">
                        {typeof p.value === 'number' && p.value > 999
                            ? '₱ ' + fmt(p.value)
                            : p.value + (p.name === 'Rate' ? '%' : '')}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default function Dashboard({
    stats,
    today_snapshot = [],
    monthly_attendance = [],
    department_attendance = [],
    payroll_trend = [],
    headcount_breakdown = [],
    recent_activity = [],
}) {
    const [snapshotFilter, setSnapshotFilter] = useState('all')

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    const filteredSnapshot = snapshotFilter === 'all'
        ? today_snapshot
        : today_snapshot.filter(e => e.status === snapshotFilter)

    const statusCounts = today_snapshot.reduce((acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1
        return acc
    }, {})

    const donutData = [
        { name: 'Present', value: stats.present_today || 0, color: '#10B981' },
        { name: 'Late', value: stats.late_today || 0, color: '#F59E0B' },
        { name: 'Absent', value: Math.max(0, stats.absent_today || 0), color: '#F43F5E' },
    ].filter(d => d.value > 0)

    const axisTick = { fontSize: 11, fill: '#64748B' }
    const gridColor = 'rgba(148, 163, 184, 0.15)'

    return (
        <AdminLayout pendingEditCount={stats.pending_edits}>
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 page-enter">
                {/* ── Top Header & Latest Payroll Snapshot ─────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="indigo" dot>Administrator Hub</Badge>
                            <span className="text-xs text-sub">• {dateStr}</span>
                        </div>
                        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text tracking-tight">
                            Workforce & Operations
                        </h1>
                        <p className="text-xs sm:text-sm text-sub mt-0.5">
                            Cooperative attendance, cutoff milestones, and payroll expenditures.
                        </p>
                    </div>

                    {stats.latest_payroll && (
                        <div className="bg-panel border border-border/80 rounded-xl px-4 py-3 shadow-xs flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-sub uppercase tracking-wider">Latest Finalized Payroll</p>
                                <p className="text-xs font-semibold text-text">{stats.latest_payroll.period_label}</p>
                                <p className="text-sm font-heading font-bold text-indigo-600 dark:text-indigo-400 tnum">
                                    ₱ {fmt(stats.latest_payroll.total_net)} <span className="text-[11px] font-normal text-sub">net</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── KPI Stat Cards ────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Workforce"
                        value={stats.total_employees}
                        subtitle={`${stats.active_employees} active members`}
                        accent="indigo"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Present Today"
                        value={stats.present_today}
                        subtitle={stats.active_employees > 0 ? `${Math.round((stats.present_today / stats.active_employees) * 100)}% turnout` : 'No active'}
                        accent="emerald"
                        trend={stats.active_employees > 0 ? `${Math.round((stats.present_today / stats.active_employees) * 100)}%` : null}
                        trendDirection="up"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Late Today"
                        value={stats.late_today}
                        subtitle="Arrived after shift grace"
                        accent={stats.late_today > 0 ? 'amber' : 'slate'}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Pending DTR Edits"
                        value={stats.pending_edits}
                        subtitle={stats.pending_edits > 0 ? 'Requires admin action' : 'All requests resolved'}
                        accent={stats.pending_edits > 0 ? 'rose' : 'slate'}
                        trend={stats.pending_edits > 0 ? 'Review' : null}
                        trendDirection={stats.pending_edits > 0 ? 'down' : 'neutral'}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                        }
                    />
                </div>

                {/* ── Row 1: Today's Snapshot + Real-Time Turnout ──── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Today's Attendance Snapshot (2 cols) */}
                    <div className="lg:col-span-2">
                        <Card className="h-full flex flex-col justify-between">
                            <CardHeader className="flex-wrap">
                                <div>
                                    <CardTitle>Today's Attendance Snapshot</CardTitle>
                                    <p className="text-xs text-sub mt-0.5">
                                        {stats.present_today} Present • {stats.late_today} Late • {Math.max(0, stats.absent_today)} Absent
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 bg-field p-1 rounded-lg border border-border/70">
                                    {[
                                        { key: 'all', label: 'All' },
                                        { key: 'on_time', label: 'On Time' },
                                        { key: 'late', label: 'Late' },
                                        { key: 'absent', label: 'Absent' },
                                    ].map(f => (
                                        <button
                                            key={f.key}
                                            onClick={() => setSnapshotFilter(f.key)}
                                            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                                                snapshotFilter === f.key
                                                    ? 'bg-panel text-text shadow-2xs font-semibold'
                                                    : 'text-sub hover:text-text'
                                            }`}
                                        >
                                            {f.label} {statusCounts[f.key] ? `(${statusCounts[f.key]})` : ''}
                                        </button>
                                    ))}
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 p-0">
                                <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
                                    {filteredSnapshot.map(emp => (
                                        <div key={emp.id} className="p-3.5 px-5 flex items-center justify-between gap-3 hover:bg-field/50 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-heading font-semibold text-xs flex-shrink-0">
                                                    {emp.initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-text truncate">{emp.full_name}</p>
                                                    <p className="text-[11px] text-sub truncate">{emp.department}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                <div className="hidden sm:flex items-center gap-2 text-xs font-mono tnum text-sub">
                                                    <span>{emp.am_time_in?.slice(0, 5) ?? '--:--'}</span>
                                                    <span className="text-dim">/</span>
                                                    <span>{emp.pm_time_out?.slice(0, 5) ?? '--:--'}</span>
                                                </div>
                                                <Badge variant={emp.status} size="sm">
                                                    {emp.status?.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}

                                    {filteredSnapshot.length === 0 && (
                                        <div className="text-center py-10 text-xs text-sub">
                                            No employee records matching this filter.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Donut Turnout Chart (1 col) */}
                    <div>
                        <Card className="h-full flex flex-col justify-between">
                            <CardHeader>
                                <CardTitle>Today's Turnout Ratio</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {donutData.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={170}>
                                            <PieChart>
                                                <Pie
                                                    data={donutData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={48}
                                                    outerRadius={75}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    startAngle={90}
                                                    endAngle={-270}
                                                >
                                                    {donutData.map(entry => (
                                                        <Cell key={entry.name} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<ChartTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>

                                        <div className="space-y-2 mt-3 pt-3 border-t border-border/70">
                                            {donutData.map(d => (
                                                <div key={d.name} className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                                                        <span className="text-sub font-medium">{d.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 tnum">
                                                        <span className="font-semibold text-text">{d.value}</span>
                                                        <span className="text-dim">
                                                            ({stats.active_employees > 0
                                                                ? Math.round((d.value / stats.active_employees) * 100)
                                                                : 0}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-12 text-center text-xs text-sub">
                                        No attendance logged yet today.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* ── Row 2: 6-Month Attendance Trends (Recharts Area) ── */}
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Attendance Performance Trends</CardTitle>
                            <p className="text-xs text-sub mt-0.5">Overall attendance rate % and turnout over the last 6 months</p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {monthly_attendance.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <ComposedChart data={monthly_attendance} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                    <XAxis dataKey="month_short" tick={axisTick} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="rate" domain={[0, 100]} tickFormatter={v => v + '%'} tick={axisTick} tickLine={false} axisLine={false} width={40} />
                                    <YAxis yAxisId="count" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={30} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" />
                                    <Bar yAxisId="count" dataKey="present" name="Present Count" fill="#10B981" radius={[4, 4, 0, 0]} fillOpacity={0.3} stackId="a" />
                                    <Bar yAxisId="count" dataKey="late" name="Late Count" fill="#F59E0B" radius={[0, 0, 0, 0]} fillOpacity={0.4} stackId="a" />
                                    <Area yAxisId="rate" type="monotone" dataKey="rate" name="Turnout Rate (%)" stroke="#4F46E5" strokeWidth={2.5} fill="url(#rateGradient)" dot={{ r: 3, fill: '#4F46E5' }} activeDot={{ r: 5 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="py-12 text-center text-xs text-sub">No monthly data accumulated yet.</div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Row 3: Department Breakdown & Payroll Cost Trend ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Department Attendance */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Department Attendance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {department_attendance.length > 0 ? (
                                <div className="space-y-4">
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={department_attendance} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                            <XAxis dataKey="department" tick={axisTick} tickLine={false} axisLine={false} />
                                            <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar dataKey="present" name="Present" fill="#10B981" stackId="a" />
                                            <Bar dataKey="late" name="Late" fill="#F59E0B" stackId="a" />
                                            <Bar dataKey="absent" name="Absent" fill="#F43F5E" radius={[3, 3, 0, 0]} stackId="a" />
                                        </BarChart>
                                    </ResponsiveContainer>

                                    <div className="border border-border/80 rounded-xl overflow-hidden overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-field/70 border-b border-border/80">
                                                    <th className="text-left px-3 py-2 font-semibold text-sub">Department</th>
                                                    <th className="text-center px-2 py-2 font-semibold text-sub">Staff</th>
                                                    <th className="text-center px-2 py-2 font-semibold text-emerald-600">Present</th>
                                                    <th className="text-center px-2 py-2 font-semibold text-amber-600">Late</th>
                                                    <th className="text-center px-2 py-2 font-semibold text-rose-600">Absent</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60 tnum">
                                                {department_attendance.map(d => (
                                                    <tr key={d.department} className="hover:bg-field/40">
                                                        <td className="px-3 py-2 font-medium text-text truncate max-w-28">{d.department}</td>
                                                        <td className="px-2 py-2 text-center text-sub">{d.headcount}</td>
                                                        <td className="px-2 py-2 text-center font-semibold text-emerald-600">{d.present}</td>
                                                        <td className="px-2 py-2 text-center text-amber-600">{d.late}</td>
                                                        <td className="px-2 py-2 text-center text-rose-600">{d.absent}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-xs text-sub">No department data recorded.</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payroll Expenditure Trend */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Payroll Expenditure Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {payroll_trend.length > 0 ? (
                                <div className="space-y-4">
                                    <ResponsiveContainer width="100%" height={180}>
                                        <ComposedChart data={payroll_trend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                            <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
                                            <YAxis tickFormatter={fmtShort} tick={axisTick} tickLine={false} axisLine={false} width={45} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
                                            <Area type="monotone" dataKey="total_gross" name="Gross Pay" fill="#4F46E5" stroke="#4F46E5" fillOpacity={0.1} />
                                            <Line type="monotone" dataKey="total_net" name="Net Pay" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} />
                                            <Line type="monotone" dataKey="total_deductions" name="Deductions" stroke="#F43F5E" strokeWidth={1.5} strokeDasharray="3 3" />
                                        </ComposedChart>
                                    </ResponsiveContainer>

                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Avg Gross', value: fmtShort(payroll_trend.reduce((s, r) => s + r.total_gross, 0) / payroll_trend.length), color: 'text-text' },
                                            { label: 'Avg Deductions', value: fmtShort(payroll_trend.reduce((s, r) => s + r.total_deductions, 0) / payroll_trend.length), color: 'text-rose-600' },
                                            { label: 'Avg Net Pay', value: fmtShort(payroll_trend.reduce((s, r) => s + r.total_net, 0) / payroll_trend.length), color: 'text-emerald-600' },
                                        ].map(s => (
                                            <div key={s.label} className="p-2.5 rounded-lg border border-border/80 bg-field/40 text-center">
                                                <p className="text-[10px] text-sub uppercase font-medium">{s.label}</p>
                                                <p className={`text-sm font-heading font-bold mt-0.5 tnum ${s.color}`}>{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-xs text-sub">No finalized payrolls yet.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Quick Admin Shortcuts ─────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Link
                        href="/admin/payroll"
                        className="p-4 rounded-xl border border-border/80 bg-panel hover:border-indigo-400 hover:shadow-xs transition-all flex items-center gap-3"
                    >
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate">Process Payroll</p>
                            <p className="text-[10px] text-sub">Draft & finalize runs</p>
                        </div>
                    </Link>

                    <Link
                        href="/admin/edit-requests"
                        className="p-4 rounded-xl border border-border/80 bg-panel hover:border-amber-400 hover:shadow-xs transition-all flex items-center justify-between gap-3 relative"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-text truncate">Edit Requests</p>
                                <p className="text-[10px] text-sub">Punch dispute approvals</p>
                            </div>
                        </div>
                        {stats.pending_edits > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                    </Link>

                    <Link
                        href="/admin/employees"
                        className="p-4 rounded-xl border border-border/80 bg-panel hover:border-emerald-400 hover:shadow-xs transition-all flex items-center gap-3"
                    >
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate">Employees</p>
                            <p className="text-[10px] text-sub">Directory & profiles</p>
                        </div>
                    </Link>

                    <Link
                        href="/admin/payroll/analytics"
                        className="p-4 rounded-xl border border-border/80 bg-panel hover:border-purple-400 hover:shadow-xs transition-all flex items-center gap-3"
                    >
                        <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate">Analytics</p>
                            <p className="text-[10px] text-sub">KPI cost breakdowns</p>
                        </div>
                    </Link>
                </div>
            </div>
        </AdminLayout>
    )
}