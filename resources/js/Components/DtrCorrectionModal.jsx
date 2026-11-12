import { useForm } from '@inertiajs/react'
import Button from '@/Components/UI/Button'

const SLOTS = [['am_time_in', 'AM in'], ['am_time_out', 'AM out'], ['pm_time_in', 'PM in'], ['pm_time_out', 'PM out']]
const TWO_PUNCH = [['am_time_in', 'Time In'], ['pm_time_out', 'Time Out']]
const timesOf = (day) => Object.fromEntries(SLOTS.map(([slot]) => [slot, (day?.[slot] || '').slice(0, 5)]))
const label = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })

/**
 * HR's final DTR check: correct or add one day's punches for an employee.
 * With `days` (date => punches) and `minDate`/`maxDate`, HR picks the date in the form itself.
 */
export default function DtrCorrectionModal({ employee, date, days = null, minDate, maxDate, onClose }) {
    const form = useForm({ date: date ?? '', ...timesOf(days?.[date]), reason: '' })
    const slots = employee.two_punch ? TWO_PUNCH : SLOTS
    const hasEntry = !!days?.[form.data.date] && SLOTS.some(([slot]) => days[form.data.date][slot])

    function pickDate(value) {
        form.clearErrors()
        form.setData({ ...form.data, date: value, ...timesOf(days?.[value]) })
    }
    function save(event) {
        event.preventDefault()
        form.post(`/admin/dtr/${employee.id}/corrections`, { preserveScroll: true, onSuccess: onClose })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="dtr-correction-title">
            <form onSubmit={save} className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-panel p-5 shadow-xl">
                <div>
                    <h2 id="dtr-correction-title" className="font-heading text-lg font-bold text-text">
                        {form.data.date ? `${hasEntry ? 'Correct' : 'Add entry for'} ${label(form.data.date)}` : 'Correct a day'}
                    </h2>
                    <p className="text-sm text-sub">{employee.full_name}. Hours and status are recalculated with the normal attendance rules. The employee is not notified.</p>
                </div>
                {minDate && (
                    <label className="block text-xs font-medium text-sub">
                        Day
                        <input
                            type="date"
                            required
                            min={minDate}
                            max={maxDate}
                            value={form.data.date}
                            onChange={(event) => pickDate(event.target.value)}
                            aria-invalid={!!form.errors.date}
                            className="mt-1 min-h-[44px] w-full rounded-lg border border-border bg-field px-3 text-sm text-text"
                        />
                    </label>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {slots.map(([slot, text]) => (
                        <label key={slot} className="text-xs font-medium text-sub">
                            {text}
                            <input
                                type="time"
                                value={form.data[slot]}
                                onChange={(event) => form.setData(slot, event.target.value)}
                                aria-invalid={!!form.errors[slot]}
                                className="mt-1 min-h-[44px] w-full rounded-lg border border-border bg-field px-2 text-sm text-text"
                            />
                            {form.errors[slot] && <span className="mt-1 block text-rose-700">{form.errors[slot]}</span>}
                        </label>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => form.setData({ ...form.data, am_time_in: '', am_time_out: '', pm_time_in: '', pm_time_out: '' })}
                    className="min-h-[44px] rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                    Mark absent (clear all punches)
                </button>
                <label className="block text-xs font-medium text-sub">
                    Reason (required)
                    <input
                        type="text"
                        required
                        maxLength={500}
                        value={form.data.reason}
                        onChange={(event) => form.setData('reason', event.target.value)}
                        placeholder="e.g. Final DTR check: forgot to punch out"
                        aria-invalid={!!form.errors.reason}
                        className="mt-1 min-h-[44px] w-full rounded-lg border border-border bg-field px-3 text-sm text-text"
                    />
                    {form.errors.reason && <span className="mt-1 block text-rose-700">{form.errors.reason}</span>}
                </label>
                {form.errors.date && <p role="alert" className="text-sm text-rose-700">{form.errors.date}</p>}
                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" disabled={form.processing} onClick={onClose} className="min-h-[44px]">Cancel</Button>
                    <Button type="submit" loading={form.processing} disabled={form.processing || !form.data.date || !form.data.reason.trim()} className="min-h-[44px] bg-[#26215C] hover:bg-[#201B4D]">Save correction</Button>
                </div>
            </form>
        </div>
    )
}
