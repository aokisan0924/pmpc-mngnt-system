import { useForm } from '@inertiajs/react'
import Button from '@/Components/UI/Button'

export default function PayrollOfficeAssignment({ employee, offices, history }) {
    const form = useForm({ payroll_office: employee.payroll_office || '', review_note: '' })
    return <section className="rounded-2xl border border-border bg-panel p-5 space-y-4">
        <h2 className="font-heading text-lg font-bold text-text">Verified payroll office</h2>
        <p className="text-sm text-sub">{employee.setup_completed_at ? `${offices[employee.payroll_office]?.label || 'Not assigned'} · HR verified. Office transfers apply to new payrolls only.` : 'Account setup needs HR approval before payroll can use an office.'}</p>
        {employee.setup_completed_at && <form onSubmit={event => { event.preventDefault(); form.patch(`/admin/employees/${employee.id}/payroll-office`, { preserveScroll: true, onSuccess: () => form.reset('review_note') }) }} className="grid items-end gap-4 sm:grid-cols-2">
            <label className="text-sm text-text">Office<select value={form.data.payroll_office} onChange={event => form.setData('payroll_office', event.target.value)} className="mt-2 min-h-[44px] w-full rounded-xl border border-border bg-field px-3">{Object.entries(offices).map(([key, office]) => <option key={key} value={key}>{office.label}</option>)}</select></label>
            <label className="text-sm text-text">Reason for transfer<input required value={form.data.review_note} onChange={event => form.setData('review_note', event.target.value)} className="mt-2 min-h-[44px] w-full rounded-xl border border-border bg-field px-3" /></label>
            {Object.entries(form.errors).map(([key, message]) => <p key={key} role="alert" className="text-sm text-rose-700">{message}</p>)}
            <Button type="submit" loading={form.processing} className="min-h-[44px] bg-[#26215C] hover:bg-[#201B4D]">Update verified office</Button>
        </form>}
        {!!history.length && <details><summary className="min-h-[44px] cursor-pointer text-sm font-semibold text-text">Setup & office review history</summary><ul className="divide-y divide-border text-sm text-sub">{history.map(entry => <li key={entry.id} className="py-3">{entry.status} · {offices[entry.details.payroll_office]?.label || 'Office not supplied'} · {entry.review_note || 'No review note'}{entry.reviewed_by && ` / Reviewed by employee #${entry.reviewed_by}`}{entry.reviewed_at && ` · ${new Date(entry.reviewed_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}`}</li>)}</ul></details>}
    </section>
}
