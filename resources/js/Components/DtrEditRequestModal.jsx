import { useEffect } from 'react'
import { useForm } from '@inertiajs/react'

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

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    function submit(e) {
        e.preventDefault()
        post(`/employee/dtr/${log.id}/edit-request`, {
            onSuccess: () => onClose(),
        })
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dtr-edit-modal-title"
        >
            <div className="rounded-2xl shadow-xl border border-border bg-panel w-full max-w-md p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                    <div>
                        <h2 id="dtr-edit-modal-title" className="text-base font-semibold font-display text-text">
                            Request time edit
                        </h2>
                        <p className="text-xs text-sub mt-0.5">{log.date_label}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-dim hover:text-text hover:bg-field transition-colors"
                        aria-label="Close time edit request dialog"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Server-side rejection note (e.g. outside 7-day window) */}
                {errors.edit && (
                    <div className="rounded-xl p-3 border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium">
                        {errors.edit}
                    </div>
                )}

                {/* Current recorded times */}
                <div className="rounded-xl p-3.5 border border-border bg-field/60">
                    <p className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-2">
                        Current recorded times
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                        {['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out'].map((slot) => (
                            <div key={slot}>
                                <p className="text-[10px] text-dim">{PUNCH_LABELS[slot]}</p>
                                <p className="text-xs font-mono font-semibold text-text mt-0.5">
                                    {log[slot] ? log[slot].slice(0, 5) : '—:—'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    {/* Corrected times */}
                    <div>
                        <p className="text-xs font-medium text-sub mb-2">Requested timestamps</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { slot: 'requested_am_time_in',  label: 'AM In'  },
                                { slot: 'requested_am_time_out', label: 'AM Out' },
                                { slot: 'requested_pm_time_in',  label: 'PM In'  },
                                { slot: 'requested_pm_time_out', label: 'PM Out' },
                            ].map(({ slot, label }) => (
                                <div key={slot}>
                                    <label htmlFor={`edit-slot-${slot}`} className="block text-xs font-medium text-sub mb-1">
                                        {label}
                                    </label>
                                    <input
                                        id={`edit-slot-${slot}`}
                                        type="time"
                                        value={data[slot]}
                                        onChange={e => setData(slot, e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-panel text-text outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label htmlFor="edit-request-reason" className="block text-xs font-medium text-sub mb-1">
                            Reason or Explanation <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            id="edit-request-reason"
                            value={data.reason}
                            onChange={e => setData('reason', e.target.value)}
                            rows={3}
                            placeholder="Explain why the timestamp needs correction…"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-panel text-text outline-none resize-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                            required
                        />
                        {errors.reason && (
                            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.reason}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/70">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-border bg-field text-sub hover:text-text hover:bg-hover transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-60 transition-all"
                        >
                            {processing ? 'Submitting…' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
