import { useState } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

/* ---------- design tokens ---------- */
const C = {
    bg:        '#06090D',
    panel:     'rgba(14,20,27,0.72)',
    field:     'rgba(255,255,255,0.03)',
    border:    '#1F2C35',
    text:      '#E7F1EE',
    sub:       '#83979C',
    dim:       '#4C5C61',
    teal:      '#14F1B2',
    violet:    '#8B7CF6',
    red:       '#FF6B81',
}

const STATUS_STYLES = {
    pending:  { color: C.violet, label: 'Pending'  },
    approved: { color: C.teal,   label: 'Approved' },
    declined: { color: C.red,    label: 'Declined' },
}

const PUNCH_ROWS = [
    ['AM In',  'am_time_in'],
    ['AM Out', 'am_time_out'],
    ['PM In',  'pm_time_in'],
    ['PM Out', 'pm_time_out'],
]

const IconInbox = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M3 12.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 12.5h5.2l1.3 2.5h4.9l1.3-2.5H21L17.8 5.4A2 2 0 0 0 16 4.3H8a2 2 0 0 0-1.8 1.1L3 12.5Z" strokeLinejoin="round" />
    </svg>
)

export default function DtrEditRequests({ requests, pendingCount }) {
    const { flash } = usePage().props
    const [filter, setFilter]         = useState('pending')
    const [activeId, setActiveId]     = useState(null)
    const [adminNote, setAdminNote]   = useState('')
    const [processing, setProcessing] = useState(false)

    const filtered = filter === 'all'
        ? requests
        : requests.filter(r => r.status === filter)

    function resolve(id, action) {
        setProcessing(true)
        router.post(`/admin/edit-requests/${id}/${action}`, { admin_note: adminNote }, {
            onSuccess: () => {
                setActiveId(null)
                setAdminNote('')
                setProcessing(false)
            },
            onError: () => setProcessing(false),
        })
    }

    return (
        <AdminLayout pendingEditCount={pendingCount}>
            <div className="relative min-h-screen overflow-hidden hud-grid" style={{ background: C.bg }}>
                <div className="pointer-events-none absolute -top-40 -left-32 w-[28rem] h-[28rem] rounded-full blur-[120px] opacity-15"
                    style={{ background: C.violet }} />

                <div className="relative p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">

                    {/* Flash */}
                    {flash?.success && (
                        <div className="mb-4 px-4 py-3 rounded-xl border text-sm animate-in"
                            style={{ background: 'rgba(20,241,178,0.08)', borderColor: 'rgba(20,241,178,0.3)', color: C.teal }}>
                            {flash.success}
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-in">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] font-mono mb-1" style={{ color: C.violet }}>
                                Attendance Review
                            </p>
                            <h1 className="font-display text-xl sm:text-2xl font-semibold" style={{ color: C.text }}>
                                DTR edit requests
                            </h1>
                            <p className="text-sm mt-0.5" style={{ color: C.sub }}>
                                {pendingCount} pending review
                            </p>
                        </div>

                        {/* Filter tabs */}
                        <div className="flex gap-1 p-1 rounded-xl border overflow-x-auto" style={{ background: C.panel, borderColor: C.border }}>
                            {['pending', 'approved', 'declined', 'all'].map((f) => (
                                <button key={f}
                                        onClick={() => setFilter(f)}
                                        className="px-3 py-1.5 text-xs rounded-lg capitalize transition-all font-medium whitespace-nowrap"
                                        style={filter === f
                                            ? { background: 'rgba(139,124,246,0.14)', color: C.violet, boxShadow: 'inset 0 0 0 1px rgba(139,124,246,0.35)' }
                                            : { color: C.dim }}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Requests list */}
                    <div className="space-y-3">
                        {filtered.map((req, i) => {
                            const style     = STATUS_STYLES[req.status]
                            const isOpen    = activeId === req.id
                            const isPending = req.status === 'pending'

                            return (
                                <div key={req.id}
                                    className="rounded-2xl border backdrop-blur-xl overflow-hidden animate-in"
                                     style={{ background: C.panel, borderColor: C.border, animationDelay: `${i * 40}ms` }}>

                                    {/* Request header */}
                                    <div className="flex items-center justify-between px-4 sm:px-5 py-4 gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold flex-shrink-0 border font-mono"
                                                style={{ background: 'rgba(139,124,246,0.12)', color: C.violet, borderColor: 'rgba(139,124,246,0.3)' }}>
                                                {req.employee_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate" style={{ color: C.text }}>{req.employee_name}</p>
                                                <p className="text-xs font-mono truncate" style={{ color: C.dim }}>{req.employee_id} · {req.date}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium border"
                                                style={{ color: style.color, borderColor: `${style.color}55`, background: `${style.color}14` }}>
                                                {style.label}
                                            </span>
                                            <button
                                                onClick={() => setActiveId(isOpen ? null : req.id)}
                                                className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                                                style={isPending
                                                    ? { borderColor: C.border, color: C.sub }
                                                    : { borderColor: 'transparent', color: C.dim }}>
                                                {isPending ? (isOpen ? 'Close' : 'Review') : (isOpen ? 'Hide' : 'View')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded detail */}
                                    {isOpen && (
                                        <div className="px-4 sm:px-5 pb-5 border-t pt-4" style={{ borderColor: C.border }}>

                                            {/* Times comparison */}
                                            <div className="grid sm:grid-cols-2 gap-3 mb-4">
                                                <div className="rounded-xl p-3 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: C.border }}>
                                                    <p className="text-xs mb-2" style={{ color: C.dim }}>Original times</p>
                                                    <div className="grid grid-cols-2 gap-y-2">
                                                        {PUNCH_ROWS.map(([label, key]) => (
                                                            <div key={label}>
                                                                <p className="text-[11px]" style={{ color: C.dim }}>{label}</p>
                                                                <p className="text-xs font-mono font-medium" style={{ color: C.sub }}>
                                                                    {req[`original_${key}`] ? req[`original_${key}`].slice(0, 5) : '—'}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="rounded-xl p-3 border" style={{ background: 'rgba(20,241,178,0.06)', borderColor: 'rgba(20,241,178,0.25)' }}>
                                                    <p className="text-xs mb-2" style={{ color: C.teal }}>Requested times</p>
                                                    <div className="grid grid-cols-2 gap-y-2">
                                                        {PUNCH_ROWS.map(([label, key]) => (
                                                            <div key={label}>
                                                                <p className="text-[11px]" style={{ color: 'rgba(20,241,178,0.7)' }}>{label}</p>
                                                                <p className="text-xs font-mono font-medium" style={{ color: C.teal }}>
                                                                    {req[`requested_${key}`] ? req[`requested_${key}`].slice(0, 5) : '—'}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reason */}
                                            <div className="rounded-xl p-3 border mb-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: C.border }}>
                                                <p className="text-xs mb-1" style={{ color: C.dim }}>Reason</p>
                                                <p className="text-sm italic" style={{ color: C.sub }}>"{req.reason}"</p>
                                            </div>

                                            {/* Admin note + actions */}
                                            {isPending && (
                                                <>
                                                    <div className="mb-3">
                                                        <label className="block text-xs mb-1.5" style={{ color: C.sub }}>
                                                            Admin note (optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={adminNote}
                                                            onChange={e => setAdminNote(e.target.value)}
                                                            placeholder="Add a note for the employee…"
                                                            className="w-full px-3 py-2.5 text-sm rounded-lg border bg-transparent outline-none transition-colors"
                                                            style={{ borderColor: C.border, color: C.text }}
                                                        />
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => resolve(req.id, 'approve')}
                                                            disabled={processing}
                                                            className="flex-1 py-2.5 text-sm font-semibold text-black rounded-lg disabled:opacity-60 transition-all hover:brightness-110"
                                                            style={{ background: C.teal, boxShadow: `0 0 20px -8px ${C.teal}` }}>
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => resolve(req.id, 'decline')}
                                                            disabled={processing}
                                                            className="flex-1 py-2.5 text-sm font-medium rounded-lg border disabled:opacity-60 transition-colors"
                                                            style={{ color: C.red, borderColor: 'rgba(255,107,129,0.35)', background: 'rgba(255,107,129,0.08)' }}>
                                                            Decline
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            {/* Resolved state */}
                                            {!isPending && req.admin_note && (
                                                <div className="rounded-xl p-3 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: C.border }}>
                                                    <p className="text-xs mb-1" style={{ color: C.dim }}>Admin note</p>
                                                    <p className="text-sm" style={{ color: C.sub }}>{req.admin_note}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {filtered.length === 0 && (
                            <div className="rounded-2xl border backdrop-blur-xl px-5 py-14 text-center animate-in"
                                style={{ background: C.panel, borderColor: C.border }}>
                                <IconInbox className="w-6 h-6 mx-auto mb-2" style={{ color: C.dim }} />
                                <p className="text-sm" style={{ color: C.sub }}>
                                    No {filter === 'all' ? '' : filter} requests found.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
                    .font-display { font-family: 'Space Grotesk', sans-serif; }
                    .font-mono { font-family: 'JetBrains Mono', monospace; }
                    input { font-family: 'Inter', sans-serif; }
                    input:focus { border-color: rgba(139,124,246,0.5) !important; box-shadow: 0 0 0 3px rgba(139,124,246,0.12); }
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