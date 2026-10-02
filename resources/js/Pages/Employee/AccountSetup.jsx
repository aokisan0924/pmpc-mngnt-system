import { Link, useForm, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'
import AdminLayout from '@/Layouts/AdminLayout'
import EmployeePageHeader from '@/Components/EmployeePageHeader'
import AdminPageHeader from '@/Components/AdminPageHeader'
import EmployeeSignatureUpload from '@/Components/EmployeeSignatureUpload'
import Button from '@/Components/UI/Button'

const control = 'mt-2 min-h-[44px] w-full rounded-xl border border-border bg-field px-3 py-2 text-sm text-text'

export default function AccountSetup({ employee, submission, govIds, offices }) {
    const { auth, flash } = usePage().props
    const Layout = auth.employee.role === 'super_admin' ? AdminLayout : EmployeeLayout
    const Header = auth.employee.role === 'super_admin' ? AdminPageHeader : EmployeePageHeader
    const previous = submission?.status === 'rejected' ? submission.details : {}
    const form = useForm(Object.fromEntries([
        ...['first_name', 'middle_name', 'last_name', 'name_suffix', 'email', 'phone', 'address', 'payroll_office'].map(key => [key, previous[key] ?? employee[key] ?? '']),
        ...['sss_no', 'philhealth_no', 'tin_no', 'pagibig_no'].map(key => [key, previous[key] ?? govIds?.[key] ?? '']),
        ['employment_confirmed', false], ['employment_note', previous.employment_note ?? ''],
    ]))
    const locked = !!employee.setup_completed_at || submission?.status === 'pending'
    const field = (key, label, required = false, type = 'text') => <label key={key} className="block text-sm font-medium text-text">
        {label}{!required && <span className="ml-1 font-normal text-sub">(optional)</span>}
        <input type={type} required={required} value={form.data[key]} onChange={event => form.setData(key, event.target.value)} className={control} aria-invalid={!!form.errors[key]} />
        {form.errors[key] && <span role="alert" className="mt-1 block text-sm text-rose-700">{form.errors[key]}</span>}
    </label>
    return <Layout title="Account setup">
        <div className="employee-page-shell max-w-4xl space-y-5">
            <Header eyebrow="One-time confirmation" title="Complete your account setup" description="Confirm your name and office for HR verification. Keep using your current password and recording attendance." />
            {flash?.success && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{flash.success}</p>}
            {locked ? <section className="rounded-2xl border border-border bg-panel p-5 space-y-3">
                <h2 className="font-heading text-xl font-bold text-text">{employee.setup_completed_at ? 'Account setup verified' : 'Awaiting HR verification'}</h2>
                <p className="text-sm text-sub">{employee.setup_completed_at ? `Verified office: ${offices[employee.payroll_office]?.label}. Contact HR for name or office changes.` : `Submitted office: ${offices[submission.details.payroll_office]?.label}. HR will confirm your details before payroll uses this office.`}</p>
                <Link href="/employee/dtr" className="inline-flex min-h-[44px] items-center font-semibold text-[#0F6E56] underline">Continue to attendance</Link>
            </section> : <form onSubmit={event => { event.preventDefault(); form.post('/employee/setup') }} className="rounded-2xl border border-border bg-panel p-5 sm:p-6 space-y-6">
                {submission?.status === 'rejected' && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">HR requested corrections: {submission.review_note}</p>}
                {form.errors.setup && <p role="alert" className="text-sm text-rose-700">{form.errors.setup}</p>}
                <section aria-labelledby="identity-title">
                    <h2 id="identity-title" className="mb-4 font-heading text-lg font-bold text-text">Name & contact details</h2>
                    <p className="mb-4 text-sm text-sub">Employee ID: {employee.employee_id}. If your existing first name includes your middle name, separate it into the fields below.</p>
                    <div className="grid gap-4 sm:grid-cols-2">{field('first_name', 'First name', true)}{field('middle_name', 'Middle name')}{field('last_name', 'Last name', true)}{field('name_suffix', 'Suffix')}{field('email', 'Email', true, 'email')}{field('phone', 'Contact number', true, 'tel')}{field('address', 'Address')}</div>
                </section>
                <section aria-labelledby="office-title" className="border-t border-border pt-5">
                    <h2 id="office-title" className="mb-4 font-heading text-lg font-bold text-text">Office & employment record</h2>
                    <label className="block text-sm font-medium text-text">Payroll office<select required aria-invalid={!!form.errors.payroll_office} value={form.data.payroll_office} onChange={event => form.setData('payroll_office', event.target.value)} className={control}><option value="">Select your office</option>{Object.entries(offices).map(([key, office]) => <option key={key} value={key}>{office.label}</option>)}</select>{form.errors.payroll_office && <span role="alert" className="mt-1 block text-rose-700">{form.errors.payroll_office}</span>}</label>
                    <dl className="my-4 grid gap-4 text-sm sm:grid-cols-2">{[['Position', employee.position], ['Department', employee.department], ['Date hired', employee.date_hired], ['Employment status', employee.status]].map(([label, value]) => <div key={label}><dt className="text-sub">{label}</dt><dd className="mt-1 font-semibold text-text">{value || 'Not recorded'}</dd></div>)}</dl>
                    {field('employment_note', 'Corrections for HR')}
                    <label className="mt-4 flex min-h-[44px] items-start gap-3 text-sm text-text"><input type="checkbox" required checked={form.data.employment_confirmed} onChange={event => form.setData('employment_confirmed', event.target.checked)} className="mt-1 size-5 shrink-0 accent-[#0F6E56]" />I reviewed my employment record and noted any corrections for HR.</label>
                    {form.errors.employment_confirmed && <p role="alert" className="text-sm text-rose-700">{form.errors.employment_confirmed}</p>}
                </section>
                <details open={["sss_no", "philhealth_no", "tin_no", "pagibig_no"].some(key => form.errors[key]) || undefined} className="border-t border-border pt-4"><summary className="min-h-[44px] cursor-pointer text-sm font-semibold text-text">Government IDs (optional)</summary><div className="mt-3 grid gap-4 sm:grid-cols-2">{field('sss_no', 'SSS number')}{field('philhealth_no', 'PhilHealth number')}{field('pagibig_no', 'Pag-IBIG number')}{field('tin_no', 'TIN')}</div></details>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><p className="max-w-[45ch] text-sm text-sub">HR verifies your submission before applying name and office changes.</p><Button type="submit" variant="emerald" loading={form.processing} className="min-h-[44px]">Submit for HR verification</Button></div>
            </form>}
            <EmployeeSignatureUpload employee={employee} endpoint="/employee/setup/signature" optional />
        </div>
    </Layout>
}
