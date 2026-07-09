import EmployeeLayout from '@/Layouts/EmployeeLayout'
import { router, usePage } from '@inertiajs/react'
import { useEffect, useState } from 'react'

/* ---------- design tokens ---------- */
const C = {
    bg:        '#06090D',
    panel:     'rgba(14,20,27,0.72)',
    panelSolid:'#111922',
    border:    '#1F2C35',
    borderHi:  'rgba(20,241,178,0.28)',
    text:      '#E7F1EE',
    sub:       '#83979C',
    dim:       '#4C5C61',
    teal:      '#14F1B2',
    tealSolid: '#0F6E56',
    blue:      '#5AA9FF',
    amber:     '#FFC168',
    purple:    '#C29CFF',
}

/* ---------- tiny icon set ---------- */
const IconCalendar = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <rect x="3" y="5" width="18" height="16" rx="2.5" />
        <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
        <path d="M8.5 14.5l2 2 4-4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconAlarm = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 3L3 5M19 3l2 2" strokeLinecap="round" />
    </svg>
)
const IconBolt = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round" />
    </svg>
)
const IconPencil = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M4 20l1-4.2L15.6 5.2a1.6 1.6 0 0 1 2.3 0l1 1a1.6 1.6 0 0 1 0 2.3L8.2 19 4 20Z" strokeLinejoin="round" />
    </svg>
)
const IconSignal = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M4 16a11 11 0 0 1 16 0M7.5 12.2a6.5 6.5 0 0 1 9 0" strokeLinecap="round" />
        <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
    </svg>
)
const IconArrow = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

/* ---------- skeleton primitive ---------- */
const Skeleton = ({ className = '', style = {} }) => (
    <span className={`inline-block skeleton-shimmer rounded-md align-middle ${className}`} style={style} />
)

export default function Dashboard({ employee, summary, today, notifications  }) {
    const [now, setNow] = useState(new Date())
    const [navLoading, setNavLoading] = useState(false)

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    // Track in-flight Inertia visits so panels can show a skeleton instead of stale/placeholder data
    useEffect(() => {
        const offStart  = router.on('start',  () => setNavLoading(true))
        const offFinish = router.on('finish', () => setNavLoading(false))
        return () => { offStart(); offFinish() }
    }, [])

    // No summary/today passed in yet — show skeleton rather than a permanent "—"
    const statsLoading = !summary || navLoading
    const attendanceLoading = !today || navLoading

    const hour = now.getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const dateStr = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })

    const stats = [
        { label: 'Days present',  value: summary?.days_present,                        sub: 'this month',        Icon: IconCalendar, accent: C.teal },
        { label: 'Days late',     value: summary?.days_late,                           sub: 'this month',        Icon: IconAlarm,    accent: C.amber },
        { label: 'Hours rendered',value: summary ? `${summary.hours_rendered}h` : null, sub: 'of ~176h expected', Icon: IconBolt,     accent: C.blue },
        { label: 'Edit requests', value: summary?.pending_edits,                        sub: 'pending approval',  Icon: IconPencil,   accent: C.purple },
    ]

    const PUNCH_SLOTS = [
        { key: 'am_time_in',  label: 'AM In'  },
        { key: 'am_time_out', label: 'AM Out' },
        { key: 'pm_time_in',  label: 'PM In'  },
        { key: 'pm_time_out', label: 'PM Out' },
    ]

    return (
        <EmployeeLayout>
            <div className="relative min-h-screen overflow-hidden hud-grid" style={{ background: C.bg }}>
                {/* top nav progress indicator */}
                {navLoading && (
                    <div className="fixed top-0 left-0 right-0 h-0.5 z-50 overflow-hidden" style={{ background: 'rgba(20,241,178,0.12)' }}>
                        <div className="h-full w-1/3 progress-sweep" style={{ background: C.teal }} />
                    </div>
                )}
                {/* ambient glow */}
                <div className="pointer-events-none absolute -top-40 -left-32 w-96 h-[28rem] rounded-full blur-[120px] opacity-20"
                    style={{ background: C.teal }} />
                <div className="pointer-events-none absolute top-1/3 -right-40 w-[24rem] h-96 rounded-full blur-[130px] opacity-10"
                    style={{ background: C.blue }} />

                <div className="relative p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 animate-in">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] font-mono mb-1" style={{ color: C.teal }}>
                                Employee Console
                            </p>
                            <h1 className="font-display text-xl sm:text-2xl font-semibold" style={{ color: C.text }}>
                                {greeting}, {employee?.first_name ?? 'there'}
                            </h1>
                            <p className="text-sm mt-0.5" style={{ color: C.sub }}>Here's your summary for today.</p>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 border backdrop-blur-xl w-fit" style={{ background: C.panel, borderColor: C.border }}>
                            <span className="w-2 h-2 rounded-full pulse-ring" style={{ background: C.teal }} />
                            <div className="leading-tight">
                                <p className="font-mono text-base sm:text-lg tabular-nums" style={{ color: C.text }}>{timeStr}</p>
                                <p className="text-[11px]" style={{ color: C.dim }}>{dateStr}</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        {stats.map((stat, i) => (
                            <div key={stat.label} className="relative rounded-2xl border backdrop-blur-xl p-4 overflow-hidden animate-in transition-transform hover:-translate-y-0.5"
                                 style={{ background: C.panel, borderColor: C.border, animationDelay: `${i * 70}ms` }}>
                                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: stat.accent, opacity: 0.6 }} />
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs" style={{ color: C.sub }}>{stat.label}</p>
                                    <stat.Icon className="w-4 h-4" style={{ color: stat.accent }} />
                                </div>
                                {statsLoading ? (
                                    <Skeleton className="h-7 w-14" />
                                ) : (
                                    <p className="font-mono text-2xl font-medium" style={{ color: C.text }}>{stat.value}</p>
                                )}
                                <p className="text-[11px] mt-1" style={{ color: C.dim }}>{stat.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Panels */}
                    <div className="grid lg:grid-cols-2 gap-4">
                        <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-5 animate-in" style={{ background: C.panel, borderColor: C.border, animationDelay: '280ms' }}>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium font-display" style={{ color: C.text }}>Today's attendance</p>
                                <a href="/employee/dtr" className="group inline-flex items-center gap-1 text-xs font-medium" style={{ color: C.teal }}>
                                    View full DTR
                                    <IconArrow className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                                </a>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {PUNCH_SLOTS.map(({ key, label }) => {
                                    const value = today?.[key]
                                    const done = Boolean(value)
                                    return (
                                        <div key={key} className="rounded-xl p-3 border flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', borderColor: C.border }}>
                                            <div className="min-w-0">
                                                <p className="text-[11px] mb-0.5" style={{ color: C.dim }}>{label}</p>
                                                {attendanceLoading ? (
                                                    <Skeleton className="h-4 w-11" />
                                                ) : (
                                                    <p className="font-mono text-sm" style={{ color: done ? C.text : C.dim }}>
                                                        {done ? value.slice(0, 5) : '—:—'}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: done ? C.teal : C.dim }} />
                                        </div>
                                    )
                                })}
                            </div>
                            <a href="/employee/dtr" className="flex items-center justify-center gap-1.5 w-full py-2.5 text-sm font-medium rounded-xl text-black transition-all hover:brightness-110" style={{ background: C.teal, boxShadow: `0 0 24px -6px ${C.teal}` }}>
                                Go to DTR
                                <IconArrow className="w-3.5 h-3.5" />
                            </a>
                        </div>

                        <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-5 animate-in"
                            style={{ background: C.panel, borderColor: C.border, animationDelay: '350ms' }}>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium font-display" style={{ color: C.text }}>
                                    Notifications
                                </p>
                                {notifications?.length > 0 && (
                                    <a href="/employee/notifications"
                                        className="text-xs"
                                        style={{ color: C.teal }}>
                                        View all →
                                    </a>
                                )}
                            </div>

                            {notifications?.length > 0 ? (
                                <div className="space-y-2">
                                    {notifications.map(n => (
                                        <div key={n.id}
                                            className="rounded-xl p-3 border"
                                            style={{ background: 'rgba(255,255,255,0.03)', borderColor: C.border }}>
                                            <p className="text-xs font-medium mb-0.5" style={{ color: C.text }}>
                                                {n.title}
                                            </p>
                                            <p className="text-xs leading-relaxed" style={{ color: C.sub }}>
                                                {n.message}
                                            </p>
                                            <div className="flex items-center justify-between mt-1.5">
                                                <span className="text-xs" style={{ color: C.dim }}>{n.created_at}</span>
                                                {n.link && (
                                                    <a href={n.link} className="text-xs" style={{ color: C.teal }}>
                                                        View →
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center py-8 rounded-xl border border-dashed"
                                    style={{ borderColor: C.border }}>
                                    <IconSignal className="w-6 h-6 mb-2" style={{ color: C.dim }} />
                                    <p className="text-sm" style={{ color: C.sub }}>All quiet for now.</p>
                                    <p className="text-xs mt-0.5" style={{ color: C.dim }}>
                                        New updates will show up here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
                    .font-display { font-family: 'Space Grotesk', sans-serif; }
                    .font-mono { font-family: 'JetBrains Mono', monospace; }
                    @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-in { animation: fadeSlideUp 0.5s ease-out both; }
                    @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(20,241,178,0.35);} 50% { box-shadow: 0 0 0 6px rgba(20,241,178,0);} }
                    .pulse-ring { animation: pulseGlow 2.2s ease-out infinite; }
                    @keyframes gridDrift { from { background-position: 0 0; } to { background-position: 60px 60px; } }
                    .hud-grid { background-image: linear-gradient(rgba(20,241,178,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,241,178,0.05) 1px, transparent 1px); background-size: 34px 34px; animation: gridDrift 16s linear infinite; }
                    .skeleton-shimmer { background: linear-gradient(90deg, rgba(255,255,255,0.045) 25%, rgba(255,255,255,0.11) 37%, rgba(255,255,255,0.045) 63%); background-size: 400% 100%; animation: skeletonShimmer 1.6s ease-in-out infinite; }
                    @keyframes skeletonShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
                    @keyframes progressSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
                    .progress-sweep { animation: progressSweep 1.1s ease-in-out infinite; }
                    @media (prefers-reduced-motion: reduce) { .animate-in, .pulse-ring, .hud-grid, .skeleton-shimmer, .progress-sweep { animation: none; } .skeleton-shimmer { opacity: 0.6; } }
                `}</style>
            </div>
        </EmployeeLayout>
    )
}