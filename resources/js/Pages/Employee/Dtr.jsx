import { useEffect, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'
import DtrEditRequestModal from '@/Components/DtrEditRequestModal'

/* ---------- design tokens ---------- */
const C = {
    bg:        '#06090D',
    panel:     'rgba(14,20,27,0.72)',
    border:    '#1F2C35',
    text:      '#E7F1EE',
    sub:       '#83979C',
    dim:       '#4C5C61',
    teal:      '#14F1B2',
    blue:      '#5AA9FF',
    amber:     '#FFC168',
    purple:    '#C29CFF',
    red:       '#FF6B81',
}

const STATUS_STYLES = {
    on_time:   { color: C.teal,   label: 'On time'   },
    late:      { color: C.amber,  label: 'Late'      },
    undertime: { color: C.blue,   label: 'Undertime' },
    half_day:  { color: C.purple, label: 'Half day'  },
    absent:    { color: C.red,    label: 'Absent'    },
}

const PUNCH_LABELS = {
    am_time_in:  'AM In',
    am_time_out: 'AM Out',
    pm_time_in:  'PM In',
    pm_time_out: 'PM Out',
}
const SLOT_ORDER = ['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out']

const IconArrow = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconCheck = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...p}>
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconChevronLeft = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
        <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconChevronRight = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

/* ---------- skeleton primitive ---------- */
const Skeleton = ({ className = '', style = {} }) => (
    <span className={`inline-block skeleton-shimmer rounded-md align-middle ${className}`} style={style} />
)

export default function Dtr({ logs, today, summary, month, next_punch }) {
    const { flash } = usePage().props
    const [editTarget, setEditTarget] = useState(null)
    const [punching, setPunching]     = useState(false)
    const [now, setNow] = useState(new Date())
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    // Any in-flight Inertia visit (month change, punch, edit request) shows skeletons below
    useEffect(() => {
        const stop = router.on('start', () => setLoading(true))
        const finish = router.on('finish', () => setLoading(false))
        return () => { stop(); finish() }
    }, [])

    function handlePunch() {
        setPunching(true)
        router.post('/employee/dtr/punch', {}, {
            onFinish: () => setPunching(false),
        })
    }

    function handleMonthChange(dir) {
        if (loading) return
        const d = new Date(month + '-01')
        d.setMonth(d.getMonth() + dir)
        const newMonth = d.toISOString().slice(0, 7)
        router.get('/employee/dtr', { month: newMonth }, { preserveState: true })
    }

    const nextLabel = next_punch ? PUNCH_LABELS[next_punch] : null
    const nextIndex = next_punch ? SLOT_ORDER.indexOf(next_punch) : SLOT_ORDER.length
    const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    const stats = [
        { label: 'Days present',  value: summary.days_present, accent: C.teal },
        { label: 'Days late',     value: summary.days_late, accent: C.amber },
        { label: 'Hours rendered',value: `${summary.hours_rendered}h`, accent: C.blue },
        { label: 'Pending edits', value: summary.pending_edits, accent: C.purple },
    ]

    return (
        <EmployeeLayout>
            <div className="relative min-h-screen overflow-hidden hud-grid" style={{ background: C.bg }}>
                <div className="pointer-events-none absolute -top-40 -left-32 w-[28rem] h-[28rem] rounded-full blur-[120px] opacity-20"
                    style={{ background: C.teal }} />

                <div className="relative p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

                    {/* Flash */}
                    {flash?.success && (
                        <div className="mb-4 px-4 py-3 rounded-xl border text-sm animate-in"
                            style={{ background: 'rgba(20,241,178,0.08)', borderColor: 'rgba(20,241,178,0.3)', color: C.teal }}>
                            {flash.success}
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex flex-col gap-1 mb-6 animate-in">
                        <p className="text-[11px] uppercase tracking-[0.2em] font-mono" style={{ color: C.teal }}>
                            Time &amp; Attendance
                        </p>
                        <h1 className="font-display text-xl sm:text-2xl font-semibold" style={{ color: C.text }}>
                            Daily time record
                        </h1>
                        <p className="text-sm" style={{ color: C.sub }}>Track your daily attendance</p>
                    </div>

                    {/* Hero: live clock + punch stepper */}
                    <div className="relative rounded-2xl border backdrop-blur-xl p-5 sm:p-6 mb-5 overflow-hidden animate-in"
                        style={{ background: C.panel, borderColor: C.border, animationDelay: '80ms' }}>

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div>
                                <p className="text-xs mb-1" style={{ color: C.dim }}>
                                    {now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                                <p className="font-mono text-4xl sm:text-5xl tabular-nums tracking-tight" style={{ color: C.text }}>
                                    {timeStr}
                                </p>
                            </div>

                            {nextLabel ? (
                                <button
                                    onClick={handlePunch}
                                    disabled={punching || loading}
                                    className="px-6 py-3.5 rounded-xl text-sm font-semibold text-black disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:brightness-110 pulse-ring w-full lg:w-auto"
                                    style={{ background: C.teal, boxShadow: `0 0 30px -6px ${C.teal}` }}>
                                    {punching ? 'Recording…' : `Clock ${nextLabel}`}
                                </button>
                            ) : (
                                <span className="px-5 py-3 rounded-xl text-sm border text-center"
                                    style={{ borderColor: C.border, color: C.sub }}>
                                    All punches complete for today
                                </span>
                            )}
                        </div>

                        {/* stepper */}
                        <div className="mt-7 flex items-center">
                            {SLOT_ORDER.map((slot, i) => {
                                const done = Boolean(today[slot])
                                const isNext = slot === next_punch
                                const isLast = i === SLOT_ORDER.length - 1
                                const nodeColor = done ? C.teal : isNext ? C.amber : C.dim
                                return (
                                    <div key={slot} className="flex items-center flex-1 last:flex-none">
                                        <div className="flex flex-col items-center gap-2 min-w-[64px]">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isNext ? 'pulse-ring' : ''}`}
                                                style={{
                                                    borderColor: nodeColor,
                                                    background: done ? 'rgba(20,241,178,0.12)' : 'transparent',
                                                    color: nodeColor,
                                                }}>
                                                {done ? <IconCheck className="w-4 h-4" /> : <span className="text-[11px] font-mono">{i + 1}</span>}
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[11px] font-medium" style={{ color: done ? C.text : isNext ? C.amber : C.dim }}>
                                                    {PUNCH_LABELS[slot]}
                                                </p>
                                                <p className="text-[10px] font-mono" style={{ color: C.dim }}>
                                                    {done ? today[slot].slice(0, 5) : isNext ? 'up next' : '—'}
                                                </p>
                                            </div>
                                        </div>
                                        {!isLast && (
                                            <div className="flex-1 h-[2px] mx-1 sm:mx-2 rounded-full"
                                                style={{ background: done ? C.teal : C.border, opacity: done ? 0.6 : 1 }} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Summary stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                        {stats.map((s, i) => (
                            <div key={s.label} className="relative rounded-2xl border backdrop-blur-xl p-3.5 overflow-hidden animate-in"
                                 style={{ background: C.panel, borderColor: C.border, animationDelay: `${160 + i * 60}ms` }}>
                                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: s.accent, opacity: 0.6 }} />
                                <p className="text-xs mb-1" style={{ color: C.sub }}>{s.label}</p>
                                {loading ? (
                                    <Skeleton className="h-6 w-12" />
                                ) : (
                                    <p className="font-mono text-xl font-medium" style={{ color: C.text }}>{s.value}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Month navigator */}
                    <div className="flex items-center justify-between mb-3 rounded-xl border px-2 py-1.5"
                        style={{ borderColor: C.border, background: C.panel }}>
                        <button onClick={() => handleMonthChange(-1)}
                                disabled={loading}
                                aria-label="Previous month"
                                className="flex items-center gap-1 text-sm px-2 py-1.5 rounded-lg transition-colors hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ color: C.sub }}>
                            <IconChevronLeft className="w-4 h-4" /> Prev
                        </button>
                        <p className="text-sm font-medium font-display" style={{ color: C.text }}>
                            {new Date(month + '-01').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                        </p>
                        <button onClick={() => handleMonthChange(1)}
                                disabled={loading}
                                aria-label="Next month"
                                className="flex items-center gap-1 text-sm px-2 py-1.5 rounded-lg transition-colors hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ color: C.sub }}>
                            Next <IconChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Month navigator */}
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={() => handleMonthChange(-1)}
                            className="text-sm text-gray-500 hover:text-gray-800 px-2 py-1">
                            ← Prev
                        </button>
                        <p className="text-sm font-medium text-gray-700">
                            {new Date(month + '-02').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-2">
                            <a href={`/employee/dtr/print?month=${month}`}
                                target="_blank"
                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                                Print DTR ↓
                            </a>
                            <button onClick={() => handleMonthChange(1)}
                                className="text-sm text-gray-500 hover:text-gray-800 px-2 py-1">
                                Next →
                            </button>
                        </div>
                    </div>

                    {/* DTR log table */}
                    <div className="rounded-2xl border backdrop-blur-xl overflow-hidden animate-in" style={{ background: C.panel, borderColor: C.border }}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[640px]">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: C.border }}>
                                        <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: C.dim }}>Date</th>
                                        {SLOT_ORDER.map(slot => (
                                            <th key={slot} className="text-center px-3 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: C.dim }}>
                                                {PUNCH_LABELS[slot]}
                                            </th>
                                        ))}
                                        <th className="text-center px-3 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: C.dim }}>Hours</th>
                                        <th className="text-center px-3 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: C.dim }}>Status</th>
                                        <th className="text-center px-3 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: C.dim }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && Array.from({ length: Math.max(logs.length, 5) }).map((_, i) => (
                                        <tr key={`skeleton-${i}`} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                            <td className="px-4 py-3"><Skeleton className="h-3.5 w-16" /></td>
                                            {SLOT_ORDER.map(slot => (
                                                <td key={slot} className="px-3 py-3 text-center"><Skeleton className="h-3.5 w-10" /></td>
                                            ))}
                                            <td className="px-3 py-3 text-center"><Skeleton className="h-3.5 w-8" /></td>
                                            <td className="px-3 py-3 text-center"><Skeleton className="h-5 w-16 rounded-full" /></td>
                                            <td className="px-3 py-3 text-center"><Skeleton className="h-3.5 w-14" /></td>
                                        </tr>
                                    ))}
                                    {!loading && logs.map((log) => {
                                        const style = STATUS_STYLES[log.status] ?? STATUS_STYLES.absent
                                        return (
                                            <tr key={log.id} className="border-b transition-colors hover:bg-white/[0.03]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                <td className="px-4 py-3 text-xs" style={{ color: C.sub }}>{log.date_label}</td>
                                                {SLOT_ORDER.map((slot) => (
                                                    <td key={slot} className="px-3 py-3 text-center text-xs font-mono">
                                                        {log[slot]
                                                            ? <span style={{ color: C.text }}>{log[slot].slice(0, 5)}</span>
                                                            : <span style={{ color: C.dim }}>—</span>}
                                                    </td>
                                                ))}
                                                <td className="px-3 py-3 text-center text-xs font-mono" style={{ color: C.sub }}>
                                                    {log.hours_rendered ? `${log.hours_rendered}h` : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <span className="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium border"
                                                        style={{
                                                            color: log.has_pending_edit ? C.amber : style.color,
                                                            borderColor: log.has_pending_edit ? 'rgba(255,193,104,0.35)' : `${style.color}55`,
                                                            background: log.has_pending_edit ? 'rgba(255,193,104,0.08)' : `${style.color}14`,
                                                        }}>
                                                        {log.has_pending_edit ? 'Pending edit' : style.label}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    {!log.has_pending_edit && (
                                                        <button
                                                            onClick={() => setEditTarget(log)}
                                                            className="text-xs hover:underline"
                                                            style={{ color: C.teal }}>
                                                            Request edit
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {!loading && logs.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: C.dim }}>
                                                No DTR records for this month.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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
                    @media (prefers-reduced-motion: reduce) { .animate-in, .pulse-ring, .hud-grid, .skeleton-shimmer { animation: none; } .skeleton-shimmer { opacity: 0.6; } }
                `}</style>
            </div>

            {editTarget && (
                <DtrEditRequestModal
                    log={editTarget}
                    onClose={() => setEditTarget(null)}
                />
            )}
        </EmployeeLayout>
    )
}