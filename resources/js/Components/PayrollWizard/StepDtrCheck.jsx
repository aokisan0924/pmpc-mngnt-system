import { usePage } from '@inertiajs/react'
import Button from '@/Components/UI/Button'

const dateLabel = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: '2-digit' })
const choiceClass = (active) => `min-h-[44px] rounded-xl border px-3 text-sm font-semibold ${active ? 'border-[#26215C] bg-[#26215C] text-white' : 'border-border bg-field text-text hover:border-slate-400'}`

export default function StepDtrCheck({ problems, typedFor, setTyped, onRefresh, errors = {}, employees }) {
    // Only admins can open the DTR pages; payroll processors type hours or ask an admin to fix the DTR.
    const canFixDtr = usePage().props.auth?.employee?.role === 'super_admin'
    function choose(employeeId, date, value) {
        const current = { ...(typedFor(employeeId)?.day_resolutions ?? {}) }
        if (value === null) delete current[date]
        else current[date] = value
        setTyped(employeeId, 'day_resolutions', current)
    }

    return (
        <section aria-labelledby="dtr-title" className="space-y-4 rounded-2xl border border-border bg-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 id="dtr-title" className="font-heading text-xl font-bold text-text">DTR check</h2>
                    <p className="mt-1 text-sm text-sub">Days with missing punches. Pick one option for each before going on.</p>
                </div>
                <Button variant="outline" onClick={onRefresh} className="min-h-[44px]">Refresh DTR</Button>
            </div>
            {problems.length === 0 && <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">✓ All DTR days are complete.</p>}
            <ul className="space-y-3">
                {problems.map(({ employee, day }) => {
                    const choice = typedFor(employee.id)?.day_resolutions?.[day.date]
                    const index = employees.findIndex((entry) => entry.id === employee.id)
                    const error = errors[`items.${index}.day_resolutions`] || errors[`items.${index}.day_resolutions.${day.date}.note`]
                    return (
                        <li key={`${employee.id}-${day.date}`} className="rounded-xl border border-border p-4">
                            <p className="text-sm font-semibold text-text">{employee.full_name} · {dateLabel(day.date)} · missing punches</p>
                            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Choice for ${employee.full_name} on ${day.date}`}>
                                {canFixDtr && <a href={`/admin/dtr/${employee.id}?month=${day.date.slice(0, 7)}`} target="_blank" rel="noreferrer" onClick={() => choose(employee.id, day.date, null)} className={`${choiceClass(false)} inline-flex items-center`}>
                                    Fix DTR ↗
                                </a>}
                                <button type="button" aria-pressed={choice?.type === 'hours'} onClick={() => choose(employee.id, day.date, { type: 'hours', hours: choice?.hours ?? '', note: choice?.note ?? '' })} className={choiceClass(choice?.type === 'hours')}>
                                    Type hours
                                </button>
                                <button type="button" aria-pressed={choice?.type === 'zero'} onClick={() => choose(employee.id, day.date, { type: 'zero' })} className={choiceClass(choice?.type === 'zero')}>
                                    Count as 0 hours
                                </button>
                            </div>
                            {choice?.type === 'hours' && (
                                <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
                                    <label className="text-xs font-semibold text-sub">
                                        Hours
                                        <input type="number" min="0" max={day.shift_hours} step="0.25" value={choice.hours} onChange={(event) => choose(employee.id, day.date, { ...choice, hours: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-field px-3 text-sm text-text" />
                                    </label>
                                    <label className="text-xs font-semibold text-sub">
                                        Note (required)
                                        <input type="text" maxLength={500} value={choice.note} onChange={(event) => choose(employee.id, day.date, { ...choice, note: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-field px-3 text-sm text-text" />
                                    </label>
                                    <p className="text-xs text-sub sm:col-span-2">Typed hours are saved on this payroll only. The DTR (and 13th month pay) still sees the day as missing.</p>
                                </div>
                            )}
                            {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
                        </li>
                    )
                })}
            </ul>
            <p className="text-xs text-sub">After fixing a DTR in the other tab, press Refresh DTR. Your typed entries are kept.</p>
        </section>
    )
}
