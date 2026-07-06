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

    function submit(e) {
        e.preventDefault()
        post(`/employee/dtr/${log.id}/edit-request`, {
            onSuccess: () => onClose(),
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-base font-medium text-gray-900">Request time edit</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{log.date_label}</p>
                    </div>
                    <button onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                        ×
                    </button>
                </div>

                {/* Current times */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">Current recorded times</p>
                    <div className="grid grid-cols-4 gap-2">
                        {['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out'].map((slot) => (
                            <div key={slot}>
                                <p className="text-xs text-gray-400">{PUNCH_LABELS[slot]}</p>
                                <p className="text-xs font-medium text-gray-700">
                                    {log[slot] ? log[slot].slice(0, 5) : '—'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    {/* Corrected times */}
                    <div>
                        <p className="text-xs text-gray-500 mb-2">Corrected times</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { slot: 'requested_am_time_in',  label: 'AM In'  },
                                { slot: 'requested_am_time_out', label: 'AM Out' },
                                { slot: 'requested_pm_time_in',  label: 'PM In'  },
                                { slot: 'requested_pm_time_out', label: 'PM Out' },
                            ].map(({ slot, label }) => (
                                <div key={slot}>
                                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                                    <input
                                        type="time"
                                        value={data[slot]}
                                        onChange={e => setData(slot, e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">
                            Reason <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={data.reason}
                            onChange={e => setData('reason', e.target.value)}
                            rows={3}
                            placeholder="Explain why the time needs to be corrected…"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 resize-none"
                            required
                        />
                        {errors.reason && (
                            <p className="mt-1 text-xs text-red-500">{errors.reason}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={processing}
                            className="flex-1 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 transition-opacity"
                            style={{ background: '#0F6E56' }}>
                            {processing ? 'Submitting…' : 'Submit request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}