import { useEffect, useState } from 'react'
import { router, useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import AdminPageHeader from '@/Components/AdminPageHeader'
import ConfirmModal from '@/Components/ConfirmModal'
import CardMenu from '@/Components/CardMenu'
import Button from '@/Components/UI/Button'
import { toast } from '@/Components/FeedbackToaster'

const INPUT = 'w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all'
const LABEL = 'block text-xs font-semibold text-sub uppercase tracking-wider mb-1.5'
const PRIMARY_LINK = 'rounded-lg border border-[#26215C] px-3 text-xs font-bold text-[#26215C] hover:bg-indigo-50 dark:border-indigo-300 dark:text-indigo-200 dark:hover:bg-indigo-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'

const money = v => `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function statusText(o) {
    if (o.status === 'paid') return { text: `Paid ${o.paid_label}`, className: 'text-emerald-700 dark:text-emerald-400 font-semibold' }
    if (o.status === 'overdue') return { text: `Overdue ${-o.days} ${o.days === -1 ? 'day' : 'days'}`, className: 'text-rose-700 dark:text-rose-400 font-bold' }
    if (o.days === 0) return { text: 'Due today', className: 'text-amber-700 dark:text-amber-400 font-semibold' }
    if (o.days === 1) return { text: 'Due tomorrow', className: 'text-text font-semibold' }
    if (o.status === 'soon') return { text: `Due in ${o.days} days`, className: 'text-text' }
    return { text: 'Upcoming', className: 'text-sub' }
}

/** A small centred dialog. Escape and the backdrop close it. */
function Modal({ title, onClose, children }) {
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
            <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-panel p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="mb-4 font-display text-lg font-bold text-text">{title}</h2>
                {children}
            </div>
        </div>
    )
}

function Actions({ onClose, processing, label }) {
    return (
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button variant="secondary" size="md" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="md" type="submit" disabled={processing}>{processing ? 'Saving…' : label}</Button>
        </div>
    )
}

function PayModal({ occurrence, today, onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        paid_at: today,
        paid_amount: occurrence.amount ?? '',
        paid_note: '',
    })

    return (
        <Modal title={`Mark paid: ${occurrence.title}`} onClose={onClose}>
            <form onSubmit={e => { e.preventDefault(); post(`/admin/dues/occurrences/${occurrence.id}/pay`, { preserveScroll: true, onSuccess: onClose }) }} className="space-y-4">
                <div>
                    <label htmlFor="pay-date" className={LABEL}>Date paid</label>
                    <input id="pay-date" type="date" required value={data.paid_at} onChange={e => setData('paid_at', e.target.value)} className={`${INPUT} font-mono`} />
                    {errors.paid_at && <p className="mt-1 text-xs text-rose-500">{errors.paid_at}</p>}
                </div>
                <div>
                    <label htmlFor="pay-amount" className={LABEL}>Amount paid (₱)</label>
                    <input id="pay-amount" type="number" step="0.01" min="0" inputMode="decimal" value={data.paid_amount} onChange={e => setData('paid_amount', e.target.value)} className={INPUT} placeholder="Leave empty if unknown" />
                    {errors.paid_amount && <p className="mt-1 text-xs text-rose-500">{errors.paid_amount}</p>}
                </div>
                <div>
                    <label htmlFor="pay-note" className={LABEL}>Note (optional)</label>
                    <input id="pay-note" type="text" maxLength={200} value={data.paid_note} onChange={e => setData('paid_note', e.target.value)} className={INPUT} placeholder="Receipt no., who paid…" />
                </div>
                <Actions onClose={onClose} processing={processing} label="Mark paid" />
            </form>
        </Modal>
    )
}

function AmountModal({ occurrence, onClose }) {
    const { data, setData, patch, processing, errors } = useForm({ amount: occurrence.amount ?? '' })

    return (
        <Modal title={`Amount for ${occurrence.due_label}: ${occurrence.title}`} onClose={onClose}>
            <form onSubmit={e => { e.preventDefault(); patch(`/admin/dues/occurrences/${occurrence.id}`, { preserveScroll: true, onSuccess: onClose }) }}>
                <label htmlFor="amount-input" className={LABEL}>Amount due (₱)</label>
                <input id="amount-input" type="number" step="0.01" min="0" inputMode="decimal" autoFocus value={data.amount} onChange={e => setData('amount', e.target.value)} className={INPUT} />
                {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount}</p>}
                <p className="mt-2 text-xs text-sub">Only this month. To change it for every month, edit the due under "Manage dues".</p>
                <Actions onClose={onClose} processing={processing} label="Save" />
            </form>
        </Modal>
    )
}

function DueFormModal({ due, offices, onClose }) {
    const { data, setData, post, patch, processing, errors } = useForm({
        title: due?.title ?? '',
        notes: due?.notes ?? '',
        office: due?.office ?? '',
        amount: due?.amount ?? '',
        frequency: due?.frequency ?? 'monthly',
        day_of_month: due?.day_of_month ?? '',
        last_day_of_month: due?.last_day_of_month ?? false,
        due_on: due?.due_on ?? '',
    })

    function submit(e) {
        e.preventDefault()
        const options = { preserveScroll: true, onSuccess: onClose }
        if (due) patch(`/admin/dues/${due.id}`, options)
        else post('/admin/dues', options)
    }

    return (
        <Modal title={due ? 'Edit due' : 'New due'} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label htmlFor="due-title" className={LABEL}>What is it? <span className="text-rose-500">*</span></label>
                    <input id="due-title" type="text" required autoFocus maxLength={200} value={data.title} onChange={e => setData('title', e.target.value)} className={INPUT} placeholder="Electric bill, loan payment…" />
                    {errors.title && <p className="mt-1 text-xs text-rose-500">{errors.title}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="due-amount" className={LABEL}>Usual amount (₱)</label>
                        <input id="due-amount" type="number" step="0.01" min="0" inputMode="decimal" value={data.amount} onChange={e => setData('amount', e.target.value)} className={INPUT} placeholder="Optional" />
                        {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount}</p>}
                    </div>
                    <div>
                        <label htmlFor="due-office" className={LABEL}>Office</label>
                        <select id="due-office" value={data.office} onChange={e => setData('office', e.target.value)} className={INPUT}>
                            <option value="">Not specific</option>
                            {offices.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                        </select>
                    </div>
                </div>
                <fieldset className="space-y-3 rounded-xl border border-border p-3">
                    <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-sub">When</legend>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {[['monthly', 'Every month'], ['once', 'One time']].map(([value, label]) => (
                            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text">
                                <input type="radio" name="due-frequency" value={value} checked={data.frequency === value} onChange={() => setData('frequency', value)} className="h-4 w-4 accent-[#26215C]" />
                                {label}
                            </label>
                        ))}
                    </div>
                    {data.frequency === 'monthly' ? (
                        <div className="grid grid-cols-2 items-end gap-3">
                            <div>
                                <label htmlFor="due-day" className={LABEL}>Day of the month</label>
                                <input id="due-day" type="number" min="1" max="31" disabled={data.last_day_of_month} required={!data.last_day_of_month} value={data.day_of_month} onChange={e => setData('day_of_month', e.target.value)} className={INPUT} />
                                {errors.day_of_month && <p className="mt-1 text-xs text-rose-500">{errors.day_of_month}</p>}
                            </div>
                            <label className="flex items-center gap-2 pb-2.5 text-sm font-medium text-text">
                                <input type="checkbox" checked={data.last_day_of_month} onChange={e => setData('last_day_of_month', e.target.checked)} className="h-4 w-4 rounded border-border accent-[#26215C]" />
                                Last day
                            </label>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="due-on" className={LABEL}>Due date</label>
                            <input id="due-on" type="date" required value={data.due_on} onChange={e => setData('due_on', e.target.value)} className={`${INPUT} font-mono`} />
                            {errors.due_on && <p className="mt-1 text-xs text-rose-500">{errors.due_on}</p>}
                        </div>
                    )}
                </fieldset>
                <div>
                    <label htmlFor="due-notes" className={LABEL}>Notes (optional)</label>
                    <textarea id="due-notes" rows={2} maxLength={1000} value={data.notes} onChange={e => setData('notes', e.target.value)} className={INPUT} />
                </div>
                <Actions onClose={onClose} processing={processing} label={due ? 'Save changes' : 'Add due'} />
            </form>
        </Modal>
    )
}

function Stat({ label, value, note, noteClass = 'text-sub', valueClass = 'text-text' }) {
    return (
        <div className="min-w-0 rounded-2xl border border-border bg-panel px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-sub">{label}</p>
            <p className={`font-heading text-xl font-extrabold tnum sm:text-2xl ${valueClass}`}>{value}</p>
            <p className={`text-xs ${noteClass}`}>{note}</p>
        </div>
    )
}

export default function Dues({ month, monthLabel, prevMonth, nextMonth, today, occurrences = [], summary = {}, dues = [], offices = [] }) {
    const [payFor, setPayFor] = useState(null)
    const [amountFor, setAmountFor] = useState(null)
    const [formFor, setFormFor] = useState(undefined) // undefined: closed, null: new, object: edit
    const [toDelete, setToDelete] = useState(null)
    // One-click changes offer Undo in the confirmation message instead of a confirm dialog.
    function unpay(o) {
        const restore = { paid_at: o.paid_at, paid_amount: o.paid_amount, paid_note: o.paid_note }
        router.delete(`/admin/dues/occurrences/${o.id}/pay`, {
            preserveScroll: true,
            onSuccess: () => toast({
                title: 'Payment removed.',
                body: `${o.title} is unpaid again.`,
                action: { label: 'Undo', onClick: () => router.post(`/admin/dues/occurrences/${o.id}/pay`, restore, { preserveScroll: true }) },
            }),
        })
    }

    function toggleDue(d) {
        const toggle = () => router.post(`/admin/dues/${d.id}/toggle`, {}, { preserveScroll: true })
        router.post(`/admin/dues/${d.id}/toggle`, {}, {
            preserveScroll: true,
            onSuccess: () => toast({
                title: d.active ? 'Due stopped. Its lines so far stay.' : 'Due resumed.',
                body: d.title,
                action: { label: 'Undo', onClick: toggle },
            }),
        })
    }

    const goTo = m => router.get('/admin/dues', { month: m }, { preserveScroll: true, preserveState: true, replace: true })

    return (
        <AdminLayout>
            <div className="admin-page-shell space-y-3 sm:space-y-4 page-enter">

                <AdminPageHeader
                    title="Dues"
                    action={
                        <button type="button" onClick={() => setFormFor(null)} className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-[#26215C] shadow-md transition-all hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-sm">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            <span>New due</span>
                        </button>
                    }
                />

                <section aria-label="Dues summary" className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                    <Stat label="Due this month" value={money(summary.total ?? 0)} note={`${summary.count ?? 0} ${summary.count === 1 ? 'due' : 'dues'}`} />
                    <Stat label="Paid" value={money(summary.paid ?? 0)} note={`${summary.paidCount ?? 0} of ${summary.count ?? 0}`} valueClass="text-emerald-700 dark:text-emerald-400" />
                    <Stat
                        label="Still to pay"
                        value={money(summary.remaining ?? 0)}
                        valueClass={summary.overdue > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-text'}
                        note={[summary.overdue > 0 ? `${summary.overdue} overdue` : null, summary.noAmount > 0 ? `${summary.noAmount} with no amount` : null].filter(Boolean).join(' · ') || 'Nothing outstanding'}
                        noteClass={summary.overdue > 0 ? 'text-rose-700 dark:text-rose-400 font-semibold' : 'text-sub'}
                    />
                </section>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-xl border border-border bg-field p-1">
                        <button type="button" onClick={() => goTo(prevMonth)} aria-label="Previous month" className="h-[36px] w-[36px] rounded-lg text-sub hover:bg-panel hover:text-text focus-visible:outline-2 focus-visible:outline-indigo-600">‹</button>
                        <span className="min-w-36 text-center font-heading text-sm font-bold text-text">{monthLabel}</span>
                        <button type="button" onClick={() => goTo(nextMonth)} aria-label="Next month" className="h-[36px] w-[36px] rounded-lg text-sub hover:bg-panel hover:text-text focus-visible:outline-2 focus-visible:outline-indigo-600">›</button>
                    </div>
                    <button type="button" onClick={() => goTo(today.slice(0, 7))} className="h-[36px] rounded-xl border border-border bg-field px-3 text-xs font-bold text-[#26215C] hover:bg-hover focus-visible:outline-2 focus-visible:outline-indigo-600 dark:text-indigo-200">This month</button>
                </div>

                <section aria-label={`Dues for ${monthLabel}`} className="overflow-hidden rounded-2xl border border-border bg-panel">
                    <div className="hidden grid-cols-[1.8fr_.7fr_1fr_1fr_1fr] gap-3 border-b border-border bg-field px-4 py-2 text-xs font-bold uppercase tracking-wider text-sub md:grid">
                        <span>Due</span><span>Date</span><span>Amount</span><span>Status</span><span className="text-right">Action</span>
                    </div>
                    {occurrences.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-sub">Nothing due in {monthLabel}. Add a due with "New due".</p>
                    )}
                    <ul>
                        {occurrences.map(o => {
                            const st = statusText(o)
                            const paid = o.status === 'paid'
                            return (
                                <li key={o.id} className="relative grid grid-cols-2 items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3 last:border-b-0 focus-within:z-30 md:grid-cols-[1.8fr_.7fr_1fr_1fr_1fr]">
                                    <div className="col-span-2 min-w-0 md:col-span-1">
                                        <p className={`break-words text-sm font-semibold ${paid ? 'text-sub' : 'text-text'}`}>{o.title}</p>
                                        {(o.office_label || o.notes) && <p className="line-clamp-1 text-xs text-sub">{[o.office_label, o.notes].filter(Boolean).join(' · ')}</p>}
                                    </div>
                                    <span className={`text-sm tnum ${o.status === 'overdue' ? 'font-bold text-rose-700 dark:text-rose-400' : 'text-text'}`}>{o.due_label}</span>
                                    <span className="text-sm tnum text-text">
                                        {paid
                                            ? money(o.paid_amount ?? o.amount ?? 0)
                                            : o.amount !== null
                                                ? money(o.amount)
                                                : <button type="button" onClick={() => setAmountFor(o)} className="text-xs font-semibold text-[#26215C] underline dark:text-indigo-200">Add amount</button>}
                                    </span>
                                    <span className={`text-sm ${st.className}`}>{st.text}{paid && o.paid_note ? <span className="block text-xs font-normal text-sub">{o.paid_note}</span> : null}</span>
                                    <div className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
                                        {!paid && <button type="button" onClick={() => setPayFor(o)} className={`h-[36px] ${PRIMARY_LINK}`}>Mark paid</button>}
                                        <CardMenu
                                            label={`More actions for ${o.title}`}
                                            focusRing="focus-visible:outline-indigo-600"
                                            items={paid
                                                ? [{ label: 'Undo payment', onClick: () => unpay(o) }]
                                                : [{ label: 'Edit amount', onClick: () => setAmountFor(o) }]}
                                        />
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </section>

                <details className="rounded-2xl border border-border bg-panel">
                    <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-text focus-visible:outline-2 focus-visible:outline-indigo-600">Manage dues ({dues.length})</summary>
                    <ul className="border-t border-border">
                        {dues.length === 0 && <li className="px-4 py-4 text-sm text-sub">No dues yet.</li>}
                        {dues.map(d => (
                            <li key={d.id} className="relative flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 focus-within:z-30">
                                <div className="min-w-0 flex-1">
                                    <p className={`break-words text-sm font-semibold ${d.active ? 'text-text' : 'text-sub line-through'}`}>{d.title}</p>
                                    <p className="text-xs text-sub">{[d.schedule, d.amount !== null ? money(d.amount) : 'no usual amount', d.office_label, d.active ? null : 'stopped'].filter(Boolean).join(' · ')}</p>
                                </div>
                                <CardMenu
                                    label={`Manage ${d.title}`}
                                    focusRing="focus-visible:outline-indigo-600"
                                    items={[
                                        { label: 'Edit', onClick: () => setFormFor(d) },
                                        { label: d.active ? 'Stop' : 'Resume', onClick: () => toggleDue(d) },
                                        { label: 'Delete', onClick: () => setToDelete(d), danger: true },
                                    ]}
                                />
                            </li>
                        ))}
                    </ul>
                </details>
            </div>

            {payFor && <PayModal occurrence={payFor} today={today} onClose={() => setPayFor(null)} />}
            {amountFor && <AmountModal occurrence={amountFor} onClose={() => setAmountFor(null)} />}
            {formFor !== undefined && <DueFormModal due={formFor} offices={offices} onClose={() => setFormFor(undefined)} />}
            <ConfirmModal
                open={Boolean(toDelete)}
                title="Delete this due?"
                message={toDelete ? `"${toDelete.title}" and every month's line with its payments will be deleted. This cannot be undone.` : ''}
                confirmLabel="Delete"
                confirmStyle="danger"
                onConfirm={() => router.delete(`/admin/dues/${toDelete.id}`, { preserveScroll: true, onFinish: () => setToDelete(null) })}
                onCancel={() => setToDelete(null)}
            />
        </AdminLayout>
    )
}
