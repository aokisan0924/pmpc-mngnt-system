import { useEffect, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'

/* ---------- design tokens — resolve to CSS variables from app.css ---------- */
const C = {
    bg:       'var(--color-bg)',
    panel:    'var(--color-panel)',
    border:   'var(--color-border)',
    borderHi: 'color-mix(in srgb, var(--color-teal) 28%, transparent)',
    text:     'var(--color-text)',
    sub:      'var(--color-sub)',
    dim:      'var(--color-dim)',
    teal:     'var(--color-teal)',
    blue:     'var(--color-blue)',
    amber:    'var(--color-amber)',
    purple:   'var(--color-purple)',
    red:      'var(--color-red)',
}

const TYPE_STYLES = {
    dtr_edit_approved: { color: C.teal, bg: 'color-mix(in srgb, var(--color-teal) 10%, transparent)', border: 'color-mix(in srgb, var(--color-teal) 22%, transparent)' },
    dtr_edit_declined: { color: C.red,  bg: 'color-mix(in srgb, var(--color-red) 8%, transparent)',   border: 'color-mix(in srgb, var(--color-red) 20%, transparent)'  },
    default:           { color: C.blue, bg: 'color-mix(in srgb, var(--color-blue) 8%, transparent)',  border: 'color-mix(in srgb, var(--color-blue) 20%, transparent)' },
}

/* ---------- icons ---------- */
const IconCheck = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
        <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconX = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
)
const IconInfo = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5.5M12 8v.01" strokeLinecap="round" />
    </svg>
)
const IconBell = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M6 10a6 6 0 1 1 12 0c0 4.2 1.2 6 2 6.8H4c.8-.8 2-2.6 2-6.8Z" strokeLinejoin="round" />
        <path d="M9.5 20.5a2.6 2.6 0 0 0 5 0" strokeLinecap="round" />
    </svg>
)
const IconTrash = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconArrowRight = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconCheckDouble = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...p}>
        <path d="M2.5 12.5l4 4L14 8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 12.5l4 4L21.5 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconLayers = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M12 3l8.5 4.6L12 12.2 3.5 7.6 12 3Z" strokeLinejoin="round" />
        <path d="M3.5 12.4L12 17l8.5-4.6M3.5 17L12 21.6 20.5 17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

function typeIcon(type) {
    if (type === 'dtr_edit_approved') return IconCheck
    if (type === 'dtr_edit_declined') return IconX
    return IconInfo
}

export default function Notifications({ notifications }) {
    const { flash } = usePage().props
    const [loading, setLoading] = useState(false)
    const [removingId, setRemovingId] = useState(null)

    // Track in-flight Inertia visits (mark-all-read, delete) to drive the shared nav-progress indicator
    useEffect(() => {
        const offStart  = router.on('start',  () => setLoading(true))
        const offFinish = router.on('finish', () => { setLoading(false); setRemovingId(null) })
        return () => { offStart(); offFinish() }
    }, [])

    function markAllRead() {
        if (loading) return
        router.post('/employee/notifications/read-all')
    }

    function deleteNotification(id) {
        if (loading) return
        setRemovingId(id)
        router.delete(`/employee/notifications/${id}`, {
            preserveScroll: true,
        })
    }

    const unread   = notifications.filter(n => !n.is_read)
    const approved = notifications.filter(n => n.type === 'dtr_edit_approved')
    const declined = notifications.filter(n => n.type === 'dtr_edit_declined')

    const stats = [
        { label: 'Unread',   value: unread.length,           Icon: IconBell,        accent: C.blue   },
        { label: 'Approved', value: approved.length,         Icon: IconCheck,       accent: C.teal   },
        { label: 'Declined', value: declined.length,         Icon: IconX,           accent: C.red    },
        { label: 'Total',    value: notifications.length,    Icon: IconLayers,      accent: C.purple },
    ]

    return (
        <EmployeeLayout title="Notifications">
            <div className="relative min-h-screen overflow-hidden hud-grid" style={{ background: C.bg }}>
                {/* top nav progress indicator */}
                {loading && (
                    <div className="fixed top-0 left-0 right-0 h-0.5 z-50 overflow-hidden" style={{ background: 'color-mix(in srgb, var(--color-teal) 12%, transparent)' }}>
                        <div className="h-full w-1/3 progress-sweep" style={{ background: C.teal }} />
                    </div>
                )}

                {/* ambient glow — same palette/positioning as Dashboard */}
                <div className="pointer-events-none absolute -top-40 -left-32 w-96 h-[28rem] rounded-full blur-[120px] opacity-20"
                    style={{ background: C.teal }} />
                <div className="pointer-events-none absolute top-1/3 -right-40 w-[24rem] h-96 rounded-full blur-[130px] opacity-10"
                    style={{ background: C.blue }} />

                <div className="p-4 md:p-6 max-w-2xl mx-auto">

                    {flash?.success && (
                        <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl border animate-in"
                            style={{ background: 'color-mix(in srgb, var(--color-teal) 8%, transparent)', borderColor: C.borderHi, color: C.teal }}>
                            <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.teal }} />
                            <span className="text-sm">{flash.success}</span>
                        </div>
                    )}

                    {/* Header — mirrors Dashboard's eyebrow + title + subtitle structure */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 animate-in">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] font-mono mb-1" style={{ color: C.teal }}>
                                Notification Center
                            </p>
                            <h1 className="font-display text-xl sm:text-2xl font-semibold" style={{ color: C.text }}>
                                {unread.length > 0 ? `${unread.length} unread update${unread.length === 1 ? '' : 's'}` : "You're all caught up"}
                            </h1>
                            <p className="text-sm mt-0.5" style={{ color: C.sub }}>Stay on top of your DTR edit request reviews.</p>
                        </div>

                        {unread.length > 0 && (
                            <button onClick={markAllRead}
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-1.5 text-xs px-3.5 py-2.5 rounded-xl border backdrop-blur-xl transition-colors hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
                                style={{ borderColor: C.border, color: C.sub, background: C.panel }}>
                                <IconCheckDouble className="w-3.5 h-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Stats — same card treatment as Dashboard's stat grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        {stats.map((stat, i) => (
                            <div key={stat.label} className="relative rounded-2xl border backdrop-blur-xl p-4 overflow-hidden animate-in transition-transform hover:-translate-y-0.5"
                                 style={{ background: C.panel, borderColor: C.border, animationDelay: `${i * 70}ms` }}>
                                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: stat.accent, opacity: 0.6 }} />
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs" style={{ color: C.sub }}>{stat.label}</p>
                                    <stat.Icon className="w-4 h-4" style={{ color: stat.accent }} />
                                </div>
                                <p className="font-mono text-2xl font-medium" style={{ color: C.text }}>{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Notification list */}
                    <div className="space-y-2.5">
                        {notifications.map((notif, i) => {
                            const style = TYPE_STYLES[notif.type] ?? TYPE_STYLES.default
                            const Icon = typeIcon(notif.type)
                            const isRemoving = removingId === notif.id

                            return (
                                <div key={notif.id}
                                    className="relative rounded-2xl border backdrop-blur-xl p-4 transition-all animate-in"
                                    style={{
                                        background: notif.is_read ? C.panel : style.bg,
                                        borderColor: notif.is_read ? C.border : style.border,
                                        opacity: isRemoving ? 0.4 : 1,
                                        animationDelay: `${Math.min(i, 8) * 45}ms`,
                                    }}>

                                    {/* Unread dot */}
                                    {!notif.is_read && (
                                        <span className="absolute top-4 right-4 w-2 h-2 rounded-full pulse-ring"
                                            style={{ background: style.color }} />
                                    )}

                                    <div className="flex items-start gap-3 pr-6">
                                        {/* Icon */}
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                                            style={{
                                                background: notif.is_read ? 'var(--color-field)' : style.bg,
                                                borderColor: notif.is_read ? C.border : style.border,
                                                color: notif.is_read ? C.dim : style.color,
                                            }}>
                                            <Icon className="w-4 h-4" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium" style={{ color: notif.is_read ? C.sub : C.text }}>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: C.dim }}>
                                                {notif.message}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2.5">
                                                <span className="text-[11px] font-mono" style={{ color: C.dim }}>{notif.created_at}</span>
                                                {notif.link && (
                                                    <a href={notif.link}
                                                        className="group inline-flex items-center gap-1 text-xs font-medium transition-colors hover:brightness-125"
                                                        style={{ color: C.teal }}>
                                                        View <IconArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => deleteNotification(notif.id)}
                                                    disabled={loading}
                                                    aria-label="Delete notification"
                                                    className="ml-auto p-1 rounded-md transition-colors hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
                                                    style={{ color: C.dim }}>
                                                    <IconTrash className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {notifications.length === 0 && (
                            <div className="rounded-2xl border backdrop-blur-xl px-5 py-16 text-center animate-in"
                                style={{ background: C.panel, borderColor: C.border }}>
                                <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3 border"
                                    style={{ background: 'var(--color-field)', borderColor: C.border, color: C.dim }}>
                                    <IconBell className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-medium" style={{ color: C.text }}>No notifications yet</p>
                                <p className="text-xs mt-1" style={{ color: C.dim }}>
                                    You'll be notified here when your DTR edit requests are reviewed.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
                    .font-display { font-family: 'Space Grotesk', sans-serif; }
                    .font-mono { font-family: 'JetBrains Mono', monospace; }
                    @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-in { animation: fadeSlideUp 0.5s ease-out both; }
                    @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-teal) 35%, transparent);} 50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-teal) 0%, transparent);} }
                    .pulse-ring { animation: pulseGlow 2.2s ease-out infinite; }
                    @keyframes gridDrift { from { background-position: 0 0; } to { background-position: 60px 60px; } }
                    .hud-grid { background-image: linear-gradient(color-mix(in srgb, var(--color-teal) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-teal) 5%, transparent) 1px, transparent 1px); background-size: 34px 34px; animation: gridDrift 16s linear infinite; }
                    .skeleton-shimmer { background: linear-gradient(90deg, color-mix(in srgb, var(--color-text) 8%, transparent) 25%, color-mix(in srgb, var(--color-text) 16%, transparent) 37%, color-mix(in srgb, var(--color-text) 8%, transparent) 63%); background-size: 400% 100%; animation: skeletonShimmer 1.6s ease-in-out infinite; }
                    @keyframes skeletonShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
                    @keyframes progressSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
                    .progress-sweep { animation: progressSweep 1.1s ease-in-out infinite; }
                    @media (prefers-reduced-motion: reduce) { .animate-in, .pulse-ring, .hud-grid, .skeleton-shimmer, .progress-sweep { animation: none; } .skeleton-shimmer { opacity: 0.6; } }
                `}</style>
            </div>
        </EmployeeLayout>
    )
}