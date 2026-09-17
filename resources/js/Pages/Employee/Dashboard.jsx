import EmployeeLayout from '@/Layouts/EmployeeLayout'
import { Link, router } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'

function formatPunchTime(timeString) {
    if (!timeString) return '--:--'
    const parts = timeString.split(':')
    if (parts.length < 2) return timeString
    const h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${String(h12).padStart(2, '0')}:${m} ${ampm}`
}

const PUNCH_SLOTS = [
    {
        key: 'am_time_in',
        stepNum: 1,
        label: 'AM In',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
        ),
    },
    {
        key: 'am_time_out',
        stepNum: 2,
        label: 'AM Out',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        key: 'pm_time_in',
        stepNum: 3,
        label: 'PM In',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v1.069m7.5 0c1.472.085 2.923.23 4.35.434m-11.85 0c-1.472.085-2.923.23-4.35.434" />
            </svg>
        ),
    },
    {
        key: 'pm_time_out',
        stepNum: 4,
        label: 'PM Out',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
        ),
    },
]

const ACTION_HUB_TABS = ['tasks', 'alerts']

const SOFT_EMERALD_ACTION_CLASS = 'inline-flex h-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-xs transition-all duration-150 hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60'

function LiveClock() {
    const [time, setTime] = useState(() => new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const formatOptions = { timeZone: 'Asia/Manila' }
    const timeStr = time.toLocaleTimeString('en-PH', { ...formatOptions, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const dateStr = time.toLocaleDateString('en-PH', { ...formatOptions, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

    return (
        <div
            aria-live="off"
            className="relative z-10 flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-lg border border-white/15 w-fit self-start md:self-auto shrink-0 shadow-xs"
        >
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#42AA8B] animate-pulse" aria-hidden="true" />
            <div>
                <p className="font-heading font-bold text-lg sm:text-xl tracking-tight text-white tnum leading-none">
                    {timeStr}
                </p>
                <p className="text-[11px] text-emerald-200/90 mt-0.5 leading-none">{dateStr}</p>
            </div>
        </div>
    )
}

export default function Dashboard({
    employee,
    summary,
    cutoff,
    today,
    recentNotifications = [],
    recentTasks = [],
    latestPayslip,
}) {
    const [punching, setPunching] = useState(false)
    const [togglingTaskId, setTogglingTaskId] = useState(null)
    const [punchFeedback, setPunchFeedback] = useState(null)
    const [activeTab, setActiveTab] = useState('tasks') // 'tasks' | 'alerts'
    const actionTabRefs = useRef({})

    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const firstName = employee?.first_name ? employee.first_name.trim() : 'Employee'

    // Determine current next expected punch index
    const completedPunches = PUNCH_SLOTS.filter(s => Boolean(today?.[s.key])).length
    const nextPunchIndex = completedPunches < 4 ? completedPunches : -1
    const nextSlot = nextPunchIndex !== -1 ? PUNCH_SLOTS[nextPunchIndex] : null

    // Direct 1-Tap Quick Punch Handler
    function handleQuickPunch() {
        if (punching || nextPunchIndex === -1 || !nextSlot) return
        const slotLabel = nextSlot.label
        const punchTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setPunching(true)
        setPunchFeedback(null)

        router.post('/employee/dtr/punch', {}, {
            preserveScroll: true,
            onSuccess: () => {
                setPunchFeedback({
                    type: 'success',
                    message: `Recorded ${slotLabel} successfully at ${punchTime}.`,
                })
                setTimeout(() => setPunchFeedback(null), 5000)
            },
            onError: (err) => {
                setPunchFeedback({
                    type: 'error',
                    message: err?.punch || 'Punch recording failed. Please try again.',
                })
                setTimeout(() => setPunchFeedback(null), 6000)
            },
            onFinish: () => {
                setPunching(false)
            },
        })
    }

    // Quick task status toggle
    function handleToggleTask(taskId) {
        if (togglingTaskId === taskId) return
        setTogglingTaskId(taskId)
        router.patch(`/employee/planner/${taskId}/toggle`, {}, {
            preserveScroll: true,
            onFinish: () => setTogglingTaskId(null),
        })
    }

    function handleActionTabKeyDown(event, currentTab) {
        const currentIndex = ACTION_HUB_TABS.indexOf(currentTab)
        let nextIndex

        switch (event.key) {
            case 'ArrowRight':
                nextIndex = (currentIndex + 1) % ACTION_HUB_TABS.length
                break
            case 'ArrowLeft':
                nextIndex = (currentIndex - 1 + ACTION_HUB_TABS.length) % ACTION_HUB_TABS.length
                break
            case 'Home':
                nextIndex = 0
                break
            case 'End':
                nextIndex = ACTION_HUB_TABS.length - 1
                break
            default:
                return
        }

        event.preventDefault()
        const nextTab = ACTION_HUB_TABS[nextIndex]
        setActiveTab(nextTab)
        actionTabRefs.current[nextTab]?.focus()
    }

    const alertsList = recentNotifications
    const pendingTasksCount = recentTasks.filter(t => t.status !== 'done').length

    return (
        <EmployeeLayout title="Dashboard">
            <div className="p-3.5 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-4 page-enter">
                {/* ── Welcome Banner & Live Clock ─────────────────── */}
                <div
                    role="region"
                    aria-label="Shift overview"
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#0A4739] via-[#0F6E56] to-[#07372C] text-white shadow-xs relative overflow-hidden select-none"
                >
                    <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 max-w-2xl">
                        {cutoff && (
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/15 text-white border border-white/20">
                                    <span className="font-semibold">{cutoff.label}</span>
                                    <span className="text-emerald-200">• {cutoff.days_remaining} {cutoff.days_remaining === 1 ? 'day' : 'days'} left</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400/25 text-emerald-100 border border-emerald-300/35 shadow-xs">
                                    <svg className="w-3 h-3 text-emerald-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Next Payday: <strong className="text-white">{cutoff.payday_label}</strong></span>
                                    {cutoff.is_payday_today && <span className="text-emerald-200 font-normal">(Today!)</span>}
                                </span>
                            </div>
                        )}
                        <h1 className="font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
                            {greeting}, {firstName}!
                        </h1>

                    </div>

                    {/* Live Ticking Clock */}
                    <LiveClock />
                </div>

                {/* ── Today's Attendance Punch State Machine & 1-Tap Punch (Top Priority) ── */}
                <Card className="overflow-hidden border border-border/80 shadow-xs">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-border/60 bg-field/30 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-sm sm:text-base">Today's 4-Punch Attendance Flow</CardTitle>
                            {summary?.pending_edits > 0 && (
                                <Badge variant="amber" size="sm">
                                    {summary.pending_edits} edit request{summary.pending_edits > 1 ? 's' : ''} pending
                                </Badge>
                            )}
                        </div>

                    </CardHeader>

                    <CardContent className="p-3.5 sm:p-4 space-y-3.5">
                        {/* Connected 4-step Timeline */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 relative select-none">
                            {PUNCH_SLOTS.map((slot, index) => {
                                const rawVal = today?.[slot.key]
                                const isDone = Boolean(rawVal)
                                const isNext = index === nextPunchIndex
                                const isLocked = !isDone && !isNext

                                return (
                                    <div
                                        key={slot.key}
                                        role="status"
                                        aria-label={`${slot.label}: ${isDone ? `Punched at ${rawVal}` : isNext ? 'Ready to punch' : 'Locked'}`}
                                        className={`p-3 rounded-lg border transition-all duration-200 relative flex flex-col justify-between ${
                                            isDone
                                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                                                : isNext
                                                ? 'bg-panel border-emerald-500 shadow-sm ring-1.5 ring-emerald-500/25'
                                                : 'bg-field/40 border-border/60 opacity-60'
                                        }`}
                                    >
                                        {/* Step Header */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                                    isDone
                                                        ? 'bg-emerald-600 text-white'
                                                        : isNext
                                                        ? 'bg-emerald-500 text-white animate-pulse'
                                                        : 'bg-slate-200 dark:bg-slate-700 text-sub'
                                                }`}>
                                                    {slot.stepNum}
                                                </span>
                                                <span className="text-[11px] font-semibold text-sub uppercase tracking-wider">
                                                    {slot.label}
                                                </span>
                                            </div>

                                            {isDone ? (
                                                <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </span>
                                            ) : isNext ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950 px-1.5 py-0.25 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                                    Next
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[9px] text-dim">
                                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                                    </svg>
                                                    Locked
                                                </span>
                                            )}
                                        </div>

                                        {/* Recorded Punch Time */}
                                        <div className="my-0.5">
                                            <p className="font-heading font-bold text-lg lg:text-xl text-text tnum tracking-tight">
                                                {isDone ? formatPunchTime(rawVal) : '--:--'}
                                            </p>

                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Interactive Punch Action & Feedback Banner */}
                        <div className="p-3 rounded-lg bg-field/60 dark:bg-slate-900/50 border border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            {punchFeedback && (
                                <div className="min-w-0">
                                    <p className={`text-xs font-semibold transition-opacity ${
                                        punchFeedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                        {punchFeedback.message}
                                    </p>
                                </div>
                            )}

                            {/* Attendance action */}
                            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
                                {nextSlot ? (
                                    <Button
                                        variant="emerald"
                                        size="md"
                                        onClick={handleQuickPunch}
                                        disabled={punching}
                                        aria-label={punching ? 'Recording punch...' : `Punch ${nextSlot.label}`}
                                        className="h-9 min-w-[140px] flex-1 px-4 text-xs font-semibold shadow-xs sm:flex-none"
                                    >
                                        {punching ? (
                                            <span className="inline-flex items-center gap-1.5">
                                                <svg className="animate-spin h-3.5 w-3.5 text-white" aria-hidden="true" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Recording...
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Punch {nextSlot.label}
                                            </span>
                                        )}
                                    </Button>
                                ) : (
                                    <Link href="/employee/dtr" className="flex-1 sm:flex-none">
                                        <Button variant="softEmerald" size="sm" className="h-9 w-full text-xs">
                                            View DTR History →
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Metric Cards with Contextual Progress Bars ───── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <StatCard
                        title="Late Arrivals"
                        value={summary?.days_late ?? 0}
                        accent={summary?.days_late > 0 ? 'amber' : 'slate'}
                        progress={{
                            value: Math.max(0, (summary?.days_present || 0) - (summary?.days_late || 0)),
                            max: Math.max(1, summary?.days_present || 1),
                            label: (summary?.days_present || 0) > 0
                                ? `${Math.max(0, (summary?.days_present || 0) - (summary?.days_late || 0))} of ${summary?.days_present} on time`
                                : 'On-time rate',
                            color: summary?.days_late > 0 ? 'bg-amber-500' : 'bg-emerald-500',
                        }}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Hours Rendered"
                        value={summary?.hours_rendered ? `${summary.hours_rendered}h` : '0h'}
                        accent="indigo"
                        progress={{
                            value: summary?.hours_rendered ?? 0,
                            max: summary?.cutoff_target_hours || 88,
                            label: 'Period rendered',
                            color: 'bg-emerald-500',
                        }}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Estimated Cutoff Pay"
                        value={summary?.daily_rate > 0
                            ? `₱${Number(summary?.accrued_basic || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '₱0.00'
                        }
                        accent="emerald"
                        progress={summary?.daily_rate > 0 ? {
                            value: summary?.accrued_basic ?? 0,
                            max: Math.max(1, summary?.projected_basic || 1),
                            label: 'Cutoff accrual',
                            color: 'bg-emerald-500',
                        } : undefined}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                </div>

                {/* ── Lower Split: Action Hub & Latest Payslip ───────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                    {/* Action Hub (Tasks & Notifications Tabs) */}
                    <div className="lg:col-span-2">
                        <Card className="h-full flex flex-col justify-between">
                            <div>
                                <CardHeader className="border-b border-border/60 px-4 py-2.5">
                                    <div className="flex items-center justify-between w-full">
                                        <div
                                            className="flex items-center gap-1.5 select-none"
                                            role="tablist"
                                            aria-label="Action Hub"
                                        >
                                            <button
                                                type="button"
                                                ref={element => { actionTabRefs.current.tasks = element }}
                                                id="action-hub-tab-tasks"
                                                role="tab"
                                                aria-selected={activeTab === 'tasks'}
                                                aria-controls="action-hub-panel"
                                                tabIndex={activeTab === 'tasks' ? 0 : -1}
                                                onClick={() => setActiveTab('tasks')}
                                                onKeyDown={event => handleActionTabKeyDown(event, 'tasks')}
                                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                                    activeTab === 'tasks'
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-2xs border border-emerald-200 dark:border-emerald-800'
                                                        : 'text-sub hover:text-text hover:bg-field'
                                                }`}
                                            >
                                                Priority Tasks ({pendingTasksCount})
                                            </button>
                                            <button
                                                type="button"
                                                ref={element => { actionTabRefs.current.alerts = element }}
                                                id="action-hub-tab-alerts"
                                                role="tab"
                                                aria-selected={activeTab === 'alerts'}
                                                aria-controls="action-hub-panel"
                                                tabIndex={activeTab === 'alerts' ? 0 : -1}
                                                onClick={() => setActiveTab('alerts')}
                                                onKeyDown={event => handleActionTabKeyDown(event, 'alerts')}
                                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                                    activeTab === 'alerts'
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-2xs border border-emerald-200 dark:border-emerald-800'
                                                        : 'text-sub hover:text-text hover:bg-field'
                                                }`}
                                            >
                                                Alerts & Notices ({alertsList.length})
                                            </button>
                                        </div>

                                    </div>
                                </CardHeader>

                                <CardContent
                                    className="p-3.5 sm:p-4"
                                    id="action-hub-panel"
                                    role="tabpanel"
                                    aria-labelledby={`action-hub-tab-${activeTab}`}
                                >
                                    {activeTab === 'tasks' ? (
                                        recentTasks.length > 0 ? (
                                            <div className="divide-y divide-border/60">
                                                {recentTasks.map(task => {
                                                    const isDone = task.status === 'done'
                                                    return (
                                                        <div key={task.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                                                            <div className="flex items-start gap-2.5 min-w-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleTask(task.id)}
                                                                    disabled={togglingTaskId === task.id}
                                                                    className={`mt-0.5 w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus:outline-none ${
                                                                        isDone
                                                                            ? 'bg-emerald-600 border-emerald-600 text-white'
                                                                            : 'border-border/90 hover:border-emerald-500 bg-field'
                                                                    }`}
                                                                    aria-label={`Mark task ${task.title} as ${isDone ? 'incomplete' : 'done'}`}
                                                                >
                                                                    {isDone && (
                                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                                <div className="min-w-0 space-y-0.5">
                                                                    <p className={`text-xs font-medium text-text truncate ${isDone ? 'line-through text-sub' : ''}`}>
                                                                        {task.title}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 text-[10px] text-dim">
                                                                        <span className={`font-medium ${task.is_overdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}>
                                                                            Due: {task.due_label}
                                                                        </span>
                                                                        {task.priority && (
                                                                            <span className={`px-1.5 py-0.25 rounded text-[9px] uppercase font-semibold ${
                                                                                task.priority === 'high'
                                                                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                                                                    : task.priority === 'medium'
                                                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                                            }`}>
                                                                                {task.priority}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <Link
                                                                href="/employee/planner"
                                                                className={`${SOFT_EMERALD_ACTION_CLASS} shrink-0 text-[11px]`}
                                                            >
                                                                View task
                                                            </Link>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-sub flex items-center justify-center mx-auto mb-1.5">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-xs font-medium text-text">No pending tasks</p>
                                                <Link href="/employee/planner" className="inline-block mt-2">
                                                    <Button variant="softEmerald" size="sm" className="h-8 text-xs">
                                                        Add a task in Planner →
                                                    </Button>
                                                </Link>
                                            </div>
                                        )
                                    ) : alertsList.length > 0 ? (
                                        <div className="divide-y divide-border/60">
                                            {alertsList.slice(0, 4).map(n => (
                                                <div key={n.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-semibold text-text">{n.title}</p>
                                                        <p className="text-xs text-sub leading-relaxed">{n.message}</p>
                                                        <p className="text-[10px] text-dim">{n.created_at}</p>
                                                    </div>
                                                    {n.link && (
                                                        <Link
                                                            href={n.link}
                                                            className={`${SOFT_EMERALD_ACTION_CLASS} flex-shrink-0`}
                                                        >
                                                            Open →
                                                        </Link>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-sub flex items-center justify-center mx-auto mb-1.5">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                                </svg>
                                            </div>
                                            <p className="text-xs font-medium text-text">No pending alerts</p>
                                        </div>
                                    )}
                                </CardContent>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Latest Payslip Voucher */}
                    <div className="space-y-3.5">
                        {/* Latest Payslip Voucher Card */}
                        <Card className="h-full border border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/40 via-panel to-panel dark:from-emerald-950/20 shadow-xs">
                            <CardHeader className="px-4 py-2.5 pb-2">
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                            </svg>
                                        </div>
                                        <CardTitle className="text-xs sm:text-sm">Latest Payslip</CardTitle>
                                    </div>
                                    {latestPayslip && (
                                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                            {latestPayslip.cutoff}
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-3.5 pt-0 space-y-2.5 flex flex-col">
                                {latestPayslip ? (
                                    <>
                                        <div>
                                            <p className="text-[11px] text-sub">{latestPayslip.month_label}</p>
                                            <p className="text-xl sm:text-2xl font-bold font-heading text-text tracking-tight tnum mt-0.5">
                                                ₱{latestPayslip.net_pay.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-[10px] text-dim mt-0.5">{latestPayslip.period_label}</p>
                                        </div>
                                        <div className="pt-2 border-t border-border/60">
                                            <Link href="/employee/payslips" className={SOFT_EMERALD_ACTION_CLASS}>
                                                View payslip →
                                            </Link>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-1 flex-col items-center justify-center text-center py-4">
                                        <p className="text-xs text-sub">No finalized payslip yet.</p>
                                        <Link href="/employee/payslips" className={`mt-3 ${SOFT_EMERALD_ACTION_CLASS}`}>
                                            Open Payslip Archive →
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

        </EmployeeLayout>
    )
}
