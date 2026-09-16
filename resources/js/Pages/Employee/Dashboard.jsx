import EmployeeLayout from '@/Layouts/EmployeeLayout'
import { Link, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'

export default function Dashboard({ employee, summary, today, notifications = [] }) {
    const [now, setNow] = useState(new Date())
    const [navLoading, setNavLoading] = useState(false)

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        const offStart = router.on('start', () => setNavLoading(true))
        const offFinish = router.on('finish', () => setNavLoading(false))
        return () => {
            offStart()
            offFinish()
        }
    }, [])

    const hour = now.getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const dateStr = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

    const PUNCH_SLOTS = [
        { key: 'am_time_in', label: 'AM In', period: 'Morning Shift Start' },
        { key: 'am_time_out', label: 'AM Out', period: 'Lunch Break Start' },
        { key: 'pm_time_in', label: 'PM In', period: 'Lunch Break End' },
        { key: 'pm_time_out', label: 'PM Out', period: 'Evening Shift End' },
    ]

    // Determine current next expected punch index
    const completedPunches = PUNCH_SLOTS.filter(s => Boolean(today?.[s.key])).length
    const nextPunchIndex = completedPunches < 4 ? completedPunches : -1

    return (
        <EmployeeLayout title="Dashboard">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 page-enter">
                {/* ── Top Welcome Banner & Live Clock ───────────────── */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-sm relative overflow-hidden">
                    <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Asia/Manila Time
                            </span>
                            <span className="text-xs text-emerald-200/80">• Employee ID: {employee?.employee_id}</span>
                        </div>
                        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white tracking-tight">
                            {greeting}, {employee?.first_name}!
                        </h1>
                        <p className="text-sm text-emerald-100/90 mt-1 max-w-xl">
                            Ready for today? Review your 4-punch attendance timeline, monthly progress, and latest team updates.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/15 w-fit self-start md:self-auto">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                        <div>
                            <p className="font-heading font-bold text-xl sm:text-2xl tracking-tight text-white tnum leading-none">
                                {timeStr}
                            </p>
                            <p className="text-xs text-emerald-200/90 mt-1 leading-none">{dateStr}</p>
                        </div>
                    </div>
                </div>

                {/* ── Monthly Summary Metric Tiles ─────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Days Present"
                        value={summary?.days_present ?? 0}
                        subtitle="Recorded in current period"
                        accent="emerald"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Late Arrivals"
                        value={summary?.days_late ?? 0}
                        subtitle="Grace period monitored"
                        accent={summary?.days_late > 0 ? 'amber' : 'slate'}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Hours Rendered"
                        value={summary?.hours_rendered ? `${summary.hours_rendered}h` : '0h'}
                        subtitle="Standard 8 hrs / workday"
                        accent="indigo"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Pending Edits"
                        value={summary?.pending_edits ?? 0}
                        subtitle={summary?.pending_edits > 0 ? 'Awaiting HR review' : 'All clear'}
                        accent={summary?.pending_edits > 0 ? 'rose' : 'slate'}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                        }
                    />
                </div>

                {/* ── Today's Attendance Punch State Machine ───────── */}
                <Card>
                    <CardHeader>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle>Today's 4-Punch Attendance Flow</CardTitle>
                                {completedPunches === 4 ? (
                                    <Badge variant="on_time" dot>Day Complete</Badge>
                                ) : completedPunches > 0 ? (
                                    <Badge variant="amber" dot pulse>In Progress</Badge>
                                ) : (
                                    <Badge variant="draft">Awaiting Punch</Badge>
                                )}
                            </div>
                            <p className="text-xs text-sub mt-0.5">
                                Strict sequential locking: punches must follow AM In → AM Out → PM In → PM Out order.
                            </p>
                        </div>
                        <Link href="/employee/dtr">
                            <Button variant="outline" size="sm">
                                Open Full DTR →
                            </Button>
                        </Link>
                    </CardHeader>

                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {PUNCH_SLOTS.map((slot, index) => {
                                const rawVal = today?.[slot.key]
                                const isDone = Boolean(rawVal)
                                const isNext = index === nextPunchIndex
                                const isLocked = !isDone && !isNext

                                return (
                                    <div
                                        key={slot.key}
                                        className={`p-4 rounded-xl border transition-all duration-200 relative ${
                                            isDone
                                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                                : isNext
                                                ? 'bg-panel border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                                                : 'bg-field/40 border-border/70 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-sub uppercase tracking-wider">
                                                {slot.label}
                                            </span>
                                            {isDone ? (
                                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </span>
                                            ) : isNext ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-dim">Locked</span>
                                            )}
                                        </div>

                                        <p className="font-heading font-bold text-2xl text-text tnum">
                                            {isDone ? rawVal.slice(0, 5) : '--:--'}
                                        </p>
                                        <p className="text-[11px] text-sub mt-1 truncate">{slot.period}</p>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="text-xs text-sub">
                                {nextPunchIndex !== -1 ? (
                                    <span>
                                        Next expected action:{' '}
                                        <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                            {PUNCH_SLOTS[nextPunchIndex].label} ({PUNCH_SLOTS[nextPunchIndex].period})
                                        </strong>
                                    </span>
                                ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        ✓ All punches for today are recorded and verified.
                                    </span>
                                )}
                            </div>
                            <Link href="/employee/dtr">
                                <Button variant="emerald" size="md">
                                    {nextPunchIndex !== -1 ? `Punch ${PUNCH_SLOTS[nextPunchIndex].label}` : 'View Attendance History'}
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Lower Split: Notifications & Quick Access ─────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Notifications (2 cols) */}
                    <div className="lg:col-span-2">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle>Recent Alerts & Notifications</CardTitle>
                                {notifications.length > 0 && (
                                    <Link href="/employee/notifications" className="inline-flex h-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-2xs transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60">
                                        View all ({notifications.length}) →
                                    </Link>
                                )}
                            </CardHeader>
                            <CardContent>
                                {notifications.length > 0 ? (
                                    <div className="divide-y divide-border/60">
                                        {notifications.slice(0, 4).map(n => (
                                            <div key={n.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-semibold text-text">{n.title}</p>
                                                    <p className="text-xs text-sub leading-relaxed">{n.message}</p>
                                                    <p className="text-[11px] text-dim">{n.created_at}</p>
                                                </div>
                                                {n.link && (
                                                    <Link href={n.link} className="inline-flex h-8 flex-shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-2xs transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60">
                                                        Open →
                                                    </Link>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-sub flex items-center justify-center mx-auto mb-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium text-text">No pending alerts</p>
                                        <p className="text-xs text-sub mt-0.5">When HR approves your edit requests or sends an update, it will appear here.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Access Shortcuts (1 col) */}
                    <div>
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle>Quick Access</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2.5">
                                <Link
                                    href="/employee/dtr"
                                    className="flex items-center justify-between p-3 rounded-xl border border-border/80 hover:bg-field hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-text">Daily Time Record</p>
                                            <p className="text-[10px] text-sub">View logs & request edits</p>
                                        </div>
                                    </div>
                                    <span className="text-dim">→</span>
                                </Link>

                                <Link
                                    href="/employee/payslips"
                                    className="flex items-center justify-between p-3 rounded-xl border border-border/80 hover:bg-field hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-text">My Payslips</p>
                                            <p className="text-[10px] text-sub">Download PDF vouchers</p>
                                        </div>
                                    </div>
                                    <span className="text-dim">→</span>
                                </Link>

                                <Link
                                    href="/employee/planner"
                                    className="flex items-center justify-between p-3 rounded-xl border border-border/80 hover:bg-field hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-text">Personal Planner</p>
                                            <p className="text-[10px] text-sub">Manage tasks & deadlines</p>
                                        </div>
                                    </div>
                                    <span className="text-dim">→</span>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </EmployeeLayout>
    )
}
