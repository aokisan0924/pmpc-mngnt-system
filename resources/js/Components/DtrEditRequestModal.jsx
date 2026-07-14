import { useForm } from '@inertiajs/react'

const C = {
    panel: 'rgba(14,20,27,0.96)', field: 'rgba(255,255,255,0.03)', border: '#1F2C35',
    text: '#E7F1EE', sub: '#83979C', dim: '#4C5C61', teal: '#14F1B2', red: '#FF6B81',
}

const PUNCH_LABELS = {
    am_time_in:  'AM In',
    am_time_out: 'AM Out',
    pm_time_in:  'PM In',
    pm_time_out: 'PM Out',
}

export default function DtrEditRequestModal({ log, onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        requested_am_time_in:  log.am_time_in?.slice(0, 5)  ?? '',
        requested_am_time_out: log.am_time_out?.slice(0, 5) ?? '',
        requested_pm_time_in:  log.pm_time_in?.slice(0, 5)  ?? '',
        requested_pm_time_out: log.pm_time_out?.slice(0, 5) ?? '',
        reason: '',
    })

    function submit(e) {
        e.preventDefault()
        post(`/employee/dtr/${log.id}/edit-request`, {
            onSuccess: () => onClose(),
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="rounded-2xl shadow-xl border backdrop-blur-xl w-full max-w-md p-6"
                style={{ background: C.panel, borderColor: C.border }}>

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-base font-medium font-display" style={{ color: C.text }}>Request time edit</h2>
                        <p className="text-sm mt-0.5" style={{ color: C.sub }}>{log.date_label}</p>
                    </div>
                    <button onClick={onClose}
                        className="text-xl leading-none transition-colors"
                        style={{ color: C.dim }}
                        onMouseEnter={e => e.currentTarget.style.color = C.text}
                        onMouseLeave={e => e.currentTarget.style.color = C.dim}>
                        ×
                    </button>
                </div>

                {/* Current times */}
                <div className="rounded-lg p-3 mb-4 border" style={{ background: C.field, borderColor: C.border }}>
                    <p className="text-xs mb-2" style={{ color: C.dim }}>Current recorded times</p>
                    <div className="grid grid-cols-4 gap-2">
                        {['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out'].map((slot) => (
                            <div key={slot}>
                                <p className="text-xs" style={{ color: C.dim }}>{PUNCH_LABELS[slot]}</p>
                                <p className="text-xs font-mono font-medium" style={{ color: C.sub }}>
                                    {log[slot] ? log[slot].slice(0, 5) : '—'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    {/* Corrected times */}
                    <div>
                        <p className="text-xs mb-2" style={{ color: C.sub }}>Corrected times</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { slot: 'requested_am_time_in',  label: 'AM In'  },
                                { slot: 'requested_am_time_out', label: 'AM Out' },
                                { slot: 'requested_pm_time_in',  label: 'PM In'  },
                                { slot: 'requested_pm_time_out', label: 'PM Out' },
                            ].map(({ slot, label }) => (
                                <div key={slot}>
                                    <label className="block text-xs mb-1" style={{ color: C.sub }}>{label}</label>
                                    <input
                                        type="time"
                                        value={data[slot]}
                                        onChange={e => setData(slot, e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none transition-colors modal-input"
                                        style={{ borderColor: C.border, color: C.text }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-xs mb-1" style={{ color: C.sub }}>
                            Reason <span style={{ color: C.red }}>*</span>
                        </label>
                        <textarea
                            value={data.reason}
                            onChange={e => setData('reason', e.target.value)}
                            rows={3}
                            placeholder="Explain why the time needs to be corrected…"
                            className="w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none transition-colors resize-none modal-input"
                            style={{ borderColor: C.border, color: C.text }}
                            required
                        />
                        {errors.reason && (
                            <p className="mt-1 text-xs" style={{ color: C.red }}>{errors.reason}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2 text-sm rounded-lg border transition-colors"
                            style={{ color: C.sub, borderColor: C.border, background: C.field }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={processing}
                            className="flex-1 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 transition-all hover:brightness-110"
                            style={{ background: C.teal, color: '#06090D', boxShadow: `0 0 20px -8px ${C.teal}` }}>
                            {processing ? 'Submitting…' : 'Submit request'}
                        </button>
                    </div>
                </form>

                <style>{`
                    .modal-input:focus { border-color: rgba(20,241,178,0.5) !important; box-shadow: 0 0 0 3px rgba(20,241,178,0.12); }
                    .modal-input::-webkit-calendar-picker-indicator { filter: invert(0.7); }
                `}</style>
            </div>
        </div>
    )
}