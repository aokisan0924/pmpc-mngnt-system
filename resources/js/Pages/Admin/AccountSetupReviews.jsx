import { useForm, usePage, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import AdminPageHeader from '@/Components/AdminPageHeader'
import Button from '@/Components/UI/Button'

function Review({ submission, offices }) {
    const form = useForm({ decision: 'approved', review_note: '' })
    const proposed = submission.details
    const employee = submission.employee
    return <section className="rounded-2xl border border-border bg-panel p-5 space-y-4">
        <div><h2 className="font-heading text-lg font-bold text-text">{employee.full_name || `${employee.first_name} ${employee.last_name}`}</h2><p className="text-sm text-sub">{employee.employee_id} · Current position: {employee.position || 'Not recorded'}</p></div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">{[['Proposed full name', [proposed.first_name, proposed.middle_name, proposed.last_name, proposed.name_suffix].filter(Boolean).join(' ')], ['Proposed office', offices[proposed.payroll_office]?.label], ['Email', proposed.email], ['Contact number', proposed.phone], ['Address', proposed.address], ['Employment corrections', proposed.employment_note]].map(([label, value]) => <div key={label}><dt className="text-sub">{label}</dt><dd className="mt-1 break-words font-medium text-text">{value || 'None supplied'}</dd></div>)}</dl>
        <details><summary className="min-h-[44px] cursor-pointer text-sm font-semibold text-text">Optional government IDs</summary><dl className="grid gap-3 text-sm sm:grid-cols-2">{[['SSS', 'sss_no'], ['PhilHealth', 'philhealth_no'], ['Pag-IBIG', 'pagibig_no'], ['TIN', 'tin_no']].map(([label, key]) => <div key={key}><dt className="text-sub">{label}</dt><dd className="text-text">{proposed[key] || 'Not supplied'}</dd></div>)}</dl></details>
        <Link href={`/admin/employees/${employee.id}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#26215C] underline">Open employment record</Link>
        <form onSubmit={event => { event.preventDefault(); form.patch(`/admin/account-setups/${submission.id}`, { preserveScroll: true }) }} className="space-y-3 border-t border-border pt-4">
            <label className="block text-sm text-text">Decision<select value={form.data.decision} onChange={event => form.setData('decision', event.target.value)} className="mt-2 min-h-[44px] w-full rounded-xl border border-border bg-field px-3"><option value="approved">Approve identity and office</option><option value="rejected">Return for corrections</option></select></label>
            <label className="block text-sm text-text">HR note {form.data.decision === 'rejected' ? '(required)' : '(optional)'}<textarea value={form.data.review_note} onChange={event => form.setData('review_note', event.target.value)} required={form.data.decision === 'rejected'} className="mt-2 min-h-24 w-full rounded-xl border border-border bg-field p-3" /></label>
            {Object.entries(form.errors).map(([key, message]) => <p key={key} role="alert" className="text-sm text-rose-700">{message}</p>)}
            <Button type="submit" loading={form.processing} className="min-h-[44px] bg-[#26215C] hover:bg-[#201B4D]">Record HR decision</Button>
        </form>
    </section>
}

export default function AccountSetupReviews({ submissions, offices }) {
    const { flash } = usePage().props
    return <AdminLayout><div className="admin-page-shell space-y-5">
        <AdminPageHeader eyebrow="People operations" title="Account setup verification" description="Check employee identity and office before payroll uses the assignment." />
        {flash?.success && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{flash.success}</p>}
        <p className="text-sm text-sub">{submissions.length} pending submissions. Check employment corrections in the employee record before approving.</p>
        {submissions.map(submission => <Review key={submission.id} submission={submission} offices={offices} />)}
        {!submissions.length && <p className="rounded-2xl border border-border bg-panel p-8 text-sm text-sub">No account setups awaiting verification. Employees who have not submitted yet can use Complete setup after signing in.</p>}
    </div></AdminLayout>
}
