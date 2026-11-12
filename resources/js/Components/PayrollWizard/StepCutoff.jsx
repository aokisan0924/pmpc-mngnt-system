import { useState } from 'react'
import { router } from '@inertiajs/react'
import Button from '@/Components/UI/Button'

const control = 'min-h-[44px] w-full min-w-0 rounded-xl border border-border bg-field px-3 py-2 text-sm text-text'

export default function StepCutoff({ month, cutoff, period_from, period_to, period_title, holidays, draft_id, can_save, save_after, employees, errors = {} }) {
    const [end, setEnd] = useState(period_to)
    const unverified = employees.filter((employee) => !employee.office_verified)
    const changedDates = end !== period_to

    return (
        <section aria-labelledby="cutoff-title" className="space-y-4 rounded-2xl border border-border bg-panel p-5">
            <div>
                <p className="text-xs font-semibold text-[#26215C] dark:text-indigo-300">{cutoff === 'first' ? '1st cutoff' : '2nd cutoff'} · {month}</p>
                <h2 id="cutoff-title" className="mt-1 font-heading text-xl font-bold text-text">{period_title}</h2>
                <p className="mt-1 text-sm text-sub">
                    Weekends are skipped. {draft_id ? 'A draft for this cutoff already exists; your saved entries are loaded.' : 'No draft yet for this cutoff.'}
                </p>
            </div>
            {holidays.length > 0 && (
                <ul className="space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    {holidays.map((holiday) => (
                        <li key={holiday.date}><b>NWNP</b> · {holiday.label} — {holiday.name} (no work, no pay unless worked)</li>
                    ))}
                </ul>
            )}
            {!can_save && (
                <p className="rounded-xl bg-field p-3 text-sm text-sub" role="status">You can prepare everything now. Saving opens after {save_after}.</p>
            )}
            <form
                className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
                onSubmit={(event) => {
                    event.preventDefault()
                    router.get('/admin/payroll/create', { month, cutoff, period_to: end })
                }}
            >
                <p className="text-sm text-sub">Starts {new Date(`${period_from}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} (right after the previous cutoff). Typed entries reset if you change the end date.</p>
                <label className="block text-xs font-semibold text-sub">
                    End date
                    <input type="date" value={end} onInput={(event) => setEnd(event.currentTarget.value)} className={`${control} mt-2`} aria-invalid={!!errors.period_to} />
                    {errors.period_to && <span role="alert" className="mt-1 block text-rose-700">{errors.period_to}</span>}
                </label>
                <Button type="submit" variant="outline" disabled={!changedDates} className="min-h-[44px]">Use this end date</Button>
            </form>
            {unverified.length > 0 && (
                <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                    Verify the payroll office of {unverified.map((employee) => employee.full_name).join(', ')} before continuing.
                </p>
            )}
            <p className="text-sm text-sub">{employees.length} employees in this payroll.</p>
        </section>
    )
}
