import { useForm, usePage } from '@inertiajs/react'

export default function PayrollExcelExport({ payroll, employees }) {
    const { errors } = usePage().props
    const form = useForm({
        first: { prepared: '', certified: '', approved: '' },
        second: { prepared: '', certified: '', approved: '' },
    })
    return (
        <section id="payroll-excel-export" className="pt-4 space-y-4" aria-labelledby="excel-export-title">
            <h3 id="excel-export-title" className="font-semibold text-text">
                Management Excel export
            </h3>
            <p className="text-sm text-sub">
                Choose who prepared, certified and approved each cutoff. Only their names print in the sign-off areas;
                signature pictures are never added to the export. Leave a selection blank for an empty area.
            </p>
            <form action={`/admin/payroll/${payroll.id}/export`} method="get" className="space-y-4">
                {['first', 'second'].map((cutoff) => (
                    <fieldset key={cutoff} className="grid gap-3 sm:grid-cols-3">
                        <legend className="mb-2 text-sm font-semibold text-text">
                            {cutoff === 'first' ? 'First cutoff' : 'Second cutoff'}
                        </legend>
                        {Object.entries({
                            prepared: 'Prepared by',
                            certified: 'Certified Correct',
                            approved: 'Approved by',
                        }).map(([role, label]) => {
                            const error = errors?.[`signatories.${cutoff}.${role}`]
                            return (
                                <div key={role}>
                                    <label htmlFor={`${cutoff}-${role}`} className="block text-sm text-sub mb-1">
                                        {label}
                                    </label>
                                    <select
                                        id={`${cutoff}-${role}`}
                                        name={`signatories[${cutoff}][${role}]`}
                                        value={form.data[cutoff][role]}
                                        onChange={(e) =>
                                            form.setData(cutoff, { ...form.data[cutoff], [role]: e.target.value })
                                        }
                                        className="min-h-[44px] w-full rounded-xl border border-border bg-field p-2 text-sm text-text"
                                    >
                                        <option value="">Unsigned</option>
                                        {employees.map((employee) => (
                                            <option key={employee.id} value={employee.id}>
                                                {employee.name} ({employee.employee_id})
                                            </option>
                                        ))}
                                    </select>
                                    {error && (
                                        <p role="alert" className="mt-1 text-xs text-rose-600">
                                            {error}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </fieldset>
                ))}
                <button
                    type="submit"
                    className="min-h-[44px] rounded-xl bg-[#26215C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#201B4D]"
                >
                    Download Management Excel
                </button>
            </form>
        </section>
    )
}
