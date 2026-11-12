import { useEffect } from 'react'
import { useForm } from '@inertiajs/react'
import Button from '@/Components/UI/Button'

const INPUT = 'w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all'
const LABEL = 'block text-xs font-semibold text-sub uppercase tracking-wider mb-1.5'

const todayInManila = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

/** Lets an admin mark one date as a holiday for everyone, from the dashboard. */
export default function MarkHolidayModal({ holidayTypes, onClose, onDone, preserveState = false }) {
    const { data, setData, post, processing, errors } = useForm({ date: todayInManila(), name: '', type: 'regular' })

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    function submit(event) {
        event.preventDefault()
        post('/admin/holidays', {
            preserveScroll: true,
            preserveState,
            onSuccess: () => { onDone(`${data.name} is marked as a holiday.`); onClose() },
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="mark-holiday-title">
            <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-panel p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 id="mark-holiday-title" className="font-display text-lg font-bold text-text">Mark a holiday</h2>
                <p className="mt-1 mb-4 text-sm text-sub">Nobody is marked absent on this day. It shows on every DTR and on the payroll form.</p>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label htmlFor="holiday-date" className={LABEL}>Date</label>
                        <input id="holiday-date" type="date" required value={data.date} onChange={e => setData('date', e.target.value)}
                            aria-invalid={!!errors.date} aria-describedby={errors.date ? 'holiday-date-error' : undefined} className={`${INPUT} font-mono`} />
                        {errors.date && <p id="holiday-date-error" className="mt-1 text-xs text-rose-500">{errors.date}</p>}
                    </div>
                    <div>
                        <label htmlFor="holiday-name" className={LABEL}>Name</label>
                        <input id="holiday-name" type="text" required maxLength={100} value={data.name} onChange={e => setData('name', e.target.value)}
                            placeholder="e.g. Bonifacio Day" aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? 'holiday-name-error' : undefined} className={INPUT} />
                        {errors.name && <p id="holiday-name-error" className="mt-1 text-xs text-rose-500">{errors.name}</p>}
                    </div>
                    <div>
                        <label htmlFor="holiday-type" className={LABEL}>Type</label>
                        <select id="holiday-type" value={data.type} onChange={e => setData('type', e.target.value)} className={INPUT}>
                            {Object.entries(holidayTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        {errors.type && <p className="mt-1 text-xs text-rose-500">{errors.type}</p>}
                    </div>
                    <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                        <Button variant="secondary" size="md" type="button" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" size="md" type="submit" disabled={processing}>{processing ? 'Saving…' : 'Mark holiday'}</Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
