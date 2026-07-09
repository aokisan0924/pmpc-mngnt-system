import AdminLayout from '@/Layouts/AdminLayout'
import { useEffect, useState } from 'react'

/* ---------- design tokens ---------- */
const C = {
    bg:        '#06090D',
    panel:     'rgba(14,20,27,0.72)',
    border:    '#1F2C35',
    text:      '#E7F1EE',
    sub:       '#83979C',
    dim:       '#4C5C61',
    teal:      '#14F1B2',
    violet:    '#8B7CF6',
    amber:     '#FFC168',
}

/* ---------- tiny icon set ---------- */
const IconUsers = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
        <path d="M16 4.3a3.2 3.2 0 0 1 0 6.2M21 20c0-2.8-2-5.1-4.6-5.8" strokeLinecap="round" />
    </svg>
)
const IconCheckCircle = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.3l2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconAlarm = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 3L3 5M19 3l2 2" strokeLinecap="round" />
    </svg>
)
const IconPencil = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M4 20l1-4.2L15.6 5.2a1.6 1.6 0 0 1 2.3 0l1 1a1.6 1.6 0 0 1 0 2.3L8.2 19 4 20Z" strokeLinejoin="round" />
    </svg>
)
const IconInbox = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M3 12.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 12.5h5.2l1.3 2.5h4.9l1.3-2.5H21L17.8 5.4A2 2 0 0 0 16 4.3H8a2 2 0 0 0-1.8 1.1L3 12.5Z" strokeLinejoin="round" />
    </svg>
)
const IconPulse = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M3 12h4l2-6 4 12 2-8 2 4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconArrow = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export default function Dashboard({ stats }) {
    const [now, setNow] = useState(new Date())
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    const hour = now.getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const dateStr = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })

    const cards = [
        { label: 'Total employees', value: stats?.total_employees ?? '—', sub: `${stats?.active_employees ?? '—'} active`, Icon: IconUsers,       accent: C.teal },
        { label: 'Present today',   value: '—',                           sub: 'loading…',                                  Icon: IconCheckCircle, accent: C.teal },
        { label: 'Late today',      value: '—',                           sub: 'loading…',                                  Icon: IconAlarm,       accent: C.amber },
        { label: 'Pending edits',   value: '—',                           sub: 'needs review',                              Icon: IconPencil,      accent: C.violet },
    ]

    return (
        <AdminLayout>
            <div className="relative min-h-screen overflow-hidden hud-grid" style={{ background: C.bg }}>
                <div className="pointer-events-none absolute -top-40 -left-32 w-[28rem] h-[28rem] rounded-full blur-[120px] opacity-15"
                    style={{ background: C.violet }} />
                <div className="pointer-events-none absolute top-1/3 -right-40 w-[24rem] h-[24rem] rounded-full blur-[130px] opacity-10"
                    style={{ background: C.teal }} />

                <div className="relative p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 animate-in">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] font-mono mb-1" style={{ color: C.violet }}>
                                Admin Console
                            </p>
                            <h1 className="font-display text-xl sm:text-2xl font-semibold" style={{ color: C.text }}>
                                {greeting}, Admin
                            </h1>
                            <p className="text-sm mt-0.5" style={{ color: C.sub }}>Here's today's workforce overview.</p>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 border backdrop-blur-xl w-fit"
                            style={{ background: C.panel, borderColor: C.border }}>
                            <span className="w-2 h-2 rounded-full pulse-ring" style={{ background: C.violet }} />
                            <div className="leading-tight">
                                <p className="font-mono text-base sm:text-lg tabular-nums" style={{ color: C.text }}>{timeStr}</p>
                                <p className="text-[11px]" style={{ color: C.dim }}>{dateStr}</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        {cards.map((stat, i) => (
                            <div key={stat.label}
                                className="relative rounded-2xl border backdrop-blur-xl p-4 overflow-hidden animate-in transition-transform hover:-translate-y-0.5"
                                 style={{ background: C.panel, borderColor: C.border, animationDelay: `${i * 70}ms` }}>
                                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: stat.accent, opacity: 0.6 }} />
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs" style={{ color: C.sub }}>{stat.label}</p>
                                    <stat.Icon className="w-4 h-4" style={{ color: stat.accent }} />
                                </div>
                                <p className="font-mono text-2xl font-medium" style={{ color: C.text }}>{stat.value}</p>
                                <p className="text-[11px] mt-1" style={{ color: C.dim }}>{stat.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Panels */}
                    <div className="grid lg:grid-cols-2 gap-4">
                        <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-5 animate-in"
                            style={{ background: C.panel, borderColor: C.border, animationDelay: '280ms' }}>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium font-display" style={{ color: C.text }}>DTR edit requests</p>
                                <a href="/admin/edit-requests" className="group inline-flex items-center gap-1 text-xs font-medium" style={{ color: C.violet }}>
                                    View all
                                    <IconArrow className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                                </a>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center py-8 rounded-xl border border-dashed"
                                style={{ borderColor: C.border }}>
                                <IconInbox className="w-6 h-6 mb-2" style={{ color: C.dim }} />
                                <p className="text-sm" style={{ color: C.sub }}>No pending requests.</p>
                            </div>
                        </div>

                        <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-5 animate-in"
                            style={{ background: C.panel, borderColor: C.border, animationDelay: '350ms' }}>
                            <p className="text-sm font-medium font-display mb-4" style={{ color: C.text }}>Today's attendance snapshot</p>
                            <div className="flex flex-col items-center justify-center text-center py-8 rounded-xl border border-dashed"
                                style={{ borderColor: C.border }}>
                                <IconPulse className="w-6 h-6 mb-2" style={{ color: C.dim }} />
                                <p className="text-sm" style={{ color: C.sub }}>DTR data loads after first punch.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
                    .font-display { font-family: 'Space Grotesk', sans-serif; }
                    .font-mono { font-family: 'JetBrains Mono', monospace; }
                    @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-in { animation: fadeSlideUp 0.5s ease-out both; }
                    @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(139,124,246,0.35);} 50% { box-shadow: 0 0 0 6px rgba(139,124,246,0);} }
                    .pulse-ring { animation: pulseGlow 2.2s ease-out infinite; }
                    @keyframes gridDrift { from { background-position: 0 0; } to { background-position: 60px 60px; } }
                    .hud-grid { background-image: linear-gradient(rgba(139,124,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,124,246,0.05) 1px, transparent 1px); background-size: 34px 34px; animation: gridDrift 16s linear infinite; }
                    @media (prefers-reduced-motion: reduce) { .animate-in, .pulse-ring, .hud-grid { animation: none; } }
                `}</style>
            </div>
        </AdminLayout>
    )
}