import { useForm, usePage } from '@inertiajs/react'

export default function PayrollExcelExport({ payroll, employees }) {
    const { errors } = usePage().props
    const form = useForm({ first: { prepared: '', certified: '', approved: '' }, second: { prepared: '', certified: '', approved: '' } })
    return <section id="payroll-excel-export" className="rounded-2xl border border-border bg-panel p-5 space-y-4" aria-labelledby="excel-export-title">
        <h2 id="excel-export-title" className="font-semibold text-text">Management Excel export</h2>
        <p className="text-sm text-sub">Choose the uploaded signatures to print in the sign-off areas. Leave a selection blank for an unsigned area. Each cutoff uses its own signatories across all four office sheets.</p>
        <form action={`/admin/payroll/${payroll.id}/export`} method="get" className="space-y-4">
            {['first', 'second'].map(cutoff => <fieldset key={cutoff} className="grid gap-3 sm:grid-cols-3">
                <legend className="mb-2 text-sm font-semibold text-text">{cutoff === 'first' ? 'First cutoff' : 'Second cutoff'}</legend>
                {Object.entries({ prepared: 'Prepared by', certified: 'Certified Correct', approved: 'Approved by' }).map(([role, label]) => {
                    const error = errors?.[`signatories.${cutoff}.${role}`]
                    return <div key={role}><label htmlFor={`${cutoff}-${role}`} className="block text-sm text-sub mb-1">{label}</label>
                        <select id={`${cutoff}-${role}`} name={`signatories[${cutoff}][${role}]`} value={form.data[cutoff][role]} onChange={e => form.setData(cutoff, { ...form.data[cutoff], [role]: e.target.value })} className="w-full rounded-lg border border-border bg-field p-2 text-sm text-text">
                            <option value="">Unsigned</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name} ({employee.employee_id})</option>)}
                        </select>{error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
                    </div>
                })}
            </fieldset>)}
            {employees.length === 0 && <p className="text-sm text-sub">No signatures uploaded yet. Upload them from an employee’s profile.</p>}
            <button type="submit" className="rounded-lg bg-[#26215C] px-4 py-2 text-sm font-semibold text-white">Download Management Excel</button>
        </form>
    </section>
}
