import { useEffect, useState } from 'react'
import { useForm } from '@inertiajs/react'

const PUNCH_LABELS = {
    am_time_in:  'AM In',
    am_time_out: 'AM Out',
    pm_time_in:  'PM In',
    pm_time_out: 'PM Out',
}

export default function DtrEditRequestModal({ log, availableLogs = [], onClose }) {
    const [selectedLogId, setSelectedLogId] = useState(log?.id)
    const currentLog = (availableLogs && availableLogs.length > 0)
        ? (availableLogs.find((l) => l.id === Number(selectedLogId)) || log)
        : log

    const { data, setData, post, processing, errors, reset } = useForm({
        requested_am_time_in:  currentLog?.am_time_in?.slice(0, 5)  ?? '',
        requested_am_time_out: currentLog?.am_time_out?.slice(0, 5) ?? '',
        requested_pm_time_in:  currentLog?.pm_time_in?.slice(0, 5)  ?? '',
        requested_pm_time_out: currentLog?.pm_time_out?.slice(0, 5) ?? '',
        reason: '',
    })

    function handleSelectDate(newId) {
        setSelectedLogId(newId)
        const target = availableLogs.find((l) => l.id === Number(newId))
        if (target) {
            setData((prev) => ({
                ...prev,
                requested_am_time_in:  target.am_time_in?.slice(0, 5)  ?? '',
                requested_am_time_out: target.am_time_out?.slice(0, 5) ?? '',
                requested_pm_time_in:  target.pm_time_in?.slice(0, 5)  ?? '',
                requested_pm_time_out: target.pm_time_out?.slice(0, 5) ?? '',
            }))
        }
    }

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
        if (currentLog?.has_pending_edit) return

        post(`/employee/dtr/${currentLog.id}/edit-request`, {
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
            <div className="rounded-2xl shadow-xl border border-border bg-panel w-full max-w-md p-5 sm:p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                    <div>
                        <h2 id="dtr-edit-modal-title" className="text-base font-semibold font-display text-text">
                            Request Time Edit
                        </h2>
                        {(!availableLogs || availableLogs.length <= 1) && (
                            <p className="text-xs text-sub mt-0.5">{currentLog?.date_label}</p>
                        )}
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

                {/* Optional Date Picker (when multiple recent logs available) */}
                {availableLogs && availableLogs.length > 1 && (
                    <div className="space-y-1.5">
                        <label htmlFor="edit-date-select" className="block text-[11px] font-semibold text-sub uppercase tracking-wider">
                            Attendance Date
                        </label>
                        <select
                            id="edit-date-select"
                            value={selectedLogId}
                            onChange={(e) => handleSelectDate(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-field/60 text-text font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
                        >
                            {availableLogs.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.date_label} {item.has_pending_edit ? '(Pending Review)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Pending Edit Warning */}
                {currentLog?.has_pending_edit && (
                    <div className="rounded-xl p-3 border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>An adjustment request for this date is currently pending review by HR/Admin.</span>
                    </div>
                )}

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
                                    {currentLog?.[slot] ? currentLog[slot].slice(0, 5) : '—:—'}
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
                            disabled={processing || currentLog?.has_pending_edit}
                            className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {processing ? 'Submitting…' : currentLog?.has_pending_edit ? 'Request Pending' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
