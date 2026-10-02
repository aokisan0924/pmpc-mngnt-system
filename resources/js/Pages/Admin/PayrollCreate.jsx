import { useMemo, useState, useRef } from 'react'
import { useForm, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Button from '@/Components/UI/Button'
import AdminPageHeader from '@/Components/AdminPageHeader'
import PayrollSummary from '@/Components/PayrollSummary'
import { calculateOfficeItem } from './officePayrollMath'

const fmt = (value) =>
    Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const deductionGroups = [
    [
        'Statutory contributions',
        {
            sss_deduction: 'SSS',
            philhealth_deduction: 'PhilHealth',
            pagibig_deduction: 'Pag-IBIG',
            tax_deduction: 'Withholding tax',
        },
    ],
    [
        'Cooperative & other deductions',
        {
            loan_deduction: 'Loan',
            capital_contribution_deduction: 'Capital contribution',
            cash_advance_deduction: 'Cash advance',
            rental_deduction: 'Rental',
            savings_deduction: 'Savings',
            other_deductions: 'Other deductions',
        },
    ],
]
const control = 'mt-1 min-h-[44px] w-full min-w-0 rounded-xl border border-border bg-field px-3 py-2 text-sm text-text'
const ready = (item) => item.office_verified && !!item.payroll_office && item.deductions_reviewed

export default function PayrollCreate({
    employees = [],
    period_from,
    period_to,
    period_label,
    cutoff,
    is_first,
    offices = {},
}) {
    const { data, setData, post, processing, errors } = useForm({
        period_from,
        period_to,
        period_label,
        cutoff,
        items: employees.map((employee) => ({
            ...employee,
            employee_id: employee.id,
            employee_code: employee.employee_id,
        })),
    })
    const [selected, setSelected] = useState(employees[0]?.id)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [step, setStep] = useState(0)
    const editor = useRef(null)
    const items = useMemo(() => data.items.map(calculateOfficeItem), [data.items])
    const totals = items.reduce(
        (sum, item) => ({
            gross: sum.gross + item.gross_pay,
            deductions: sum.deductions + item.total_deductions,
            net: sum.net + item.net_pay,
        }),
        { gross: 0, deductions: 0, net: 0 },
    )
    const unreviewed = items.filter((item) => !ready(item)).length
    const visible = items.filter(
        (item) =>
            `${item.full_name} ${item.employee_code} ${offices[item.payroll_office]?.label || ''}`
                .toLowerCase()
                .includes(search.toLowerCase()) &&
            (filter === 'all' || !ready(item)),
    )
    const index = items.findIndex((item) => item.id === selected)
    const item = items[index]

    function selectEmployee(id) {
        setSelected(id)
        setStep(0)
        editor.current?.focus()
    }
    function update(field, value) {
        setData(
            'items',
            data.items.map((entry, i) =>
                i !== index
                    ? entry
                    : {
                          ...entry,
                          ...(field === 'payroll_office'
                              ? { paid_days_basis: offices[value]?.days ?? 11, absence_days: 0 }
                              : {}),
                          [field]: value,
                          deductions_reviewed: field === 'deductions_reviewed' ? value : false,
                      },
            ),
        )
    }
    function input(field, label, options = {}, deduction = false) {
        const key = `items.${index}.${deduction ? 'deductions.' : ''}${field}`
        return (
            <label className="block min-w-0 text-xs font-medium text-sub" key={field}>
                {label}
                <input
                    type="number"
                    min="0"
                    step={deduction ? '0.01' : '0.5'}
                    {...options}
                    value={deduction ? data.items[index].deductions[field] : data.items[index][field]}
                    onChange={(event) =>
                        update(
                            deduction ? 'deductions' : field,
                            deduction
                                ? { ...data.items[index].deductions, [field]: event.target.value }
                                : event.target.value,
                        )
                    }
                    aria-label={`${label} for ${item.full_name}`}
                    aria-invalid={!!errors[key]}
                    aria-describedby={errors[key] ? `${field}-error` : undefined}
                    className={control}
                />
                {errors[key] && (
                    <span id={`${field}-error`} className="mt-1 block text-rose-700">
                        {errors[key]}
                    </span>
                )}
            </label>
        )
    }
    function submit(event) {
        event.preventDefault()
        if (unreviewed || !items.length || processing) return
        post('/admin/payroll', {
            onError: (validation) => {
                const first = Object.keys(validation).find((key) => /^items\.\d+\./.test(key))
                if (first) {
                    selectEmployee(data.items[Number(first.split('.')[1])].id)
                    setStep(first.includes('.deductions.') || first.includes('tardiness') || first.includes('deductions_reviewed') ? 2 : first.includes('_ot_') ? 1 : 0)
                }
            },
        })
    }

    return (
        <AdminLayout>
            <form onSubmit={submit} className="admin-page-shell space-y-5 page-enter">
                <AdminPageHeader
                    eyebrow="Prepare · Review · Save"
                    title={period_label}
                    description="Review one employee at a time. Save the batch when every employee is ready."
                    badge={is_first ? '1st cutoff' : '2nd cutoff'}
                    meta={
                        <Link
                            href="/admin/payroll"
                            className="inline-flex min-h-[44px] items-center font-medium text-indigo-100 hover:text-white"
                        >
                            Back to payroll
                        </Link>
                    }
                />
                {items.some((entry) => !entry.office_verified) && (
                    <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        {items.filter((entry) => !entry.office_verified).length} employees need HR office verification. No employees are removed from this batch.
                        {' '}<Link href="/admin/account-setups" className="underline font-semibold">Review account setups</Link>
                    </p>
                )}
                <PayrollSummary {...totals}>
                    <p role="status" className="mt-4 border-t border-border pt-3 text-sm text-sub">
                        <strong className="text-text">
                            {items.length - unreviewed} of {items.length} reviewed
                        </strong>{' '}
                        · {unreviewed ? `${unreviewed} remaining` : 'Ready to save'}
                    </p>
                </PayrollSummary>
                <details className="rounded-xl border border-border bg-field px-4 py-3 text-sm text-sub">
                    <summary className="min-h-[44px] cursor-pointer font-semibold text-text">
                        Payroll basis & review guidance
                    </summary>
                    <div className="mt-3 max-w-[65ch] space-y-2 leading-relaxed">
                        <p>
                            Basic pay = daily rate × (paid days − verified absence days). Fort Magsaysay and
                            Cubao Satelite Office default to 11 paid days; General Merchandise defaults to 15. Adjust paid days for
                            individual exceptions.
                        </p>
                        <p>
                            DTR attendance is a reference only. Missing punches do not automatically deduct pay.
                            Allowances are split in half. Weekday overtime uses 125%; rest-day overtime uses 130%.
                        </p>
                        <p>
                            Deductions are suggestions from employee profiles. Verify actual cutoff amounts, especially
                            loans and cash advances. Enter tardiness deductions in pesos.
                        </p>
                    </div>
                </details>
                {Object.entries(errors)
                    .filter(([key]) => !key.startsWith('items.'))
                    .map(([key, message]) => (
                        <p key={key} role="alert" className="text-sm text-rose-700">
                            {message}
                        </p>
                    ))}
                <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <aside
                        aria-label="Employee review queue"
                        className="rounded-2xl border border-border bg-panel lg:sticky lg:top-5"
                    >
                        <div className="space-y-3 border-b border-border p-4">
                            <h2 className="font-heading font-bold text-text">Employee queue</h2>
                            <label className="block text-xs text-sub">
                                Search employees
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Name, ID or office"
                                    className={control}
                                />
                            </label>
                            <label className="block text-xs text-sub">
                                Review status
                                <select
                                    value={filter}
                                    onChange={(event) => setFilter(event.target.value)}
                                    className={control}
                                >
                                    <option value="all">All employees ({items.length})</option>
                                    <option value="pending">Needs review ({unreviewed})</option>
                                </select>
                            </label>
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-border lg:max-h-[60vh]">
                            {visible.map((entry) => (
                                <button
                                    type="button"
                                    key={entry.id}
                                    aria-pressed={entry.id === selected}
                                    onClick={() => selectEmployee(entry.id)}
                                    className={`w-full px-4 py-3 text-left ${entry.id === selected ? 'bg-indigo-50 text-[#26215C]' : 'text-text hover:bg-field'}`}
                                >
                                    <span className="block text-sm font-semibold">{entry.full_name}</span>
                                    <span className="mt-1 block text-xs text-sub">
                                        {entry.employee_code} ·{' '}
                                        {offices[entry.payroll_office]?.label || 'Office needed'}
                                    </span>
                                    <span
                                        className={`mt-2 inline-block text-xs font-semibold ${ready(entry) ? 'text-emerald-700' : 'text-amber-800'}`}
                                    >
                                        {ready(entry) ? 'Reviewed' : 'Needs review'}
                                    </span>
                                    {Object.keys(errors).some((key) =>
                                        key.startsWith(`items.${items.indexOf(entry)}.`),
                                    ) && <span className="ml-2 text-xs text-rose-700">Check errors</span>}
                                </button>
                            ))}
                            {!visible.length && (
                                <p className="p-4 text-sm text-sub">
                                    {items.length
                                        ? 'No employees match these filters.'
                                        : 'No active staff available for this batch.'}
                                </p>
                            )}
                        </div>
                    </aside>
                    {item && (
                        <section
                            ref={editor}
                            tabIndex={-1}
                            aria-labelledby="employee-review-title"
                            className="min-w-0 rounded-2xl border border-border bg-panel"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
                                <div>
                                    <p className="text-xs font-semibold text-sub">
                                        Employee {index + 1} of {items.length}
                                    </p>
                                    <h2
                                        id="employee-review-title"
                                        className="mt-1 font-heading text-xl font-bold text-text"
                                    >
                                        {item.full_name}
                                    </h2>
                                    <p className="mt-1 text-sm text-sub">
                                        {item.employee_code} · ₱{fmt(item.daily_rate)} / day
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-sub">Net pay</p>
                                    <p
                                        className={`font-heading text-2xl font-bold tnum ${item.net_pay < 0 ? 'text-rose-700' : 'text-[#26215C]'}`}
                                    >
                                        ₱{fmt(item.net_pay)}
                                    </p>
                                </div>
                            </div>
                            <div className="px-5">
                                <nav aria-label="Employee review steps" className="grid grid-cols-3 gap-2 border-b border-border py-4">
                                    {['Pay basis', 'Earnings', 'Deductions'].map((label, number) => (
                                        <button key={label} type="button" aria-current={step === number ? 'step' : undefined}
                                            onClick={() => setStep(number)}
                                            className={`min-h-[44px] rounded-xl px-2 py-3 text-sm font-semibold ${step === number ? 'bg-[#26215C] text-white' : 'bg-field text-sub hover:text-text'}`}>
                                            <span className="mr-1">{number + 1}.</span> {label}
                                        </button>
                                    ))}
                                </nav>
                                {Object.entries(errors).filter(([key]) => key.startsWith(`items.${index}.`)).length >
                                    0 && (
                                    <div role="alert" className="py-4 text-sm text-rose-700">
                                        {Object.entries(errors)
                                            .filter(([key]) => key.startsWith(`items.${index}.`))
                                            .map(([key, message]) => (
                                                <p key={key}>{message}</p>
                                            ))}
                                    </div>
                                )}
                                <fieldset hidden={step !== 0} className="py-5">
                                    <legend className="float-left mb-4 w-full text-sm font-bold text-text">
                                        01 · Office & attendance basis
                                    </legend>
                                    <div className="clear-both grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        <div className="text-xs font-medium text-sub">
                                            Payroll office
                                            <div className={`${control} flex items-center`}>
                                                {offices[item.payroll_office]?.label || 'Awaiting HR office verification'}
                                            </div>
                                            <p className="mt-2 text-xs text-sub">From the HR-verified employee record.</p>
                                        </div>
                                        {input('paid_days_basis', 'Paid days before absences', { max: 15 })}
                                        {input('absence_days', 'Verified absence days', { max: item.paid_days_basis })}
                                    </div>
                                    <p className="mt-3 text-xs leading-relaxed text-sub">
                                        DTR recorded: <strong>{item.dtr_days_present} days</strong>. Pay basis after
                                        absences: <strong>{item.days_present} days</strong>.
                                    </p>
                                </fieldset>
                                <fieldset hidden={step !== 1} className="py-5">
                                    <legend className="float-left mb-4 w-full text-sm font-bold text-text">
                                        02 · Overtime & earnings
                                    </legend>
                                    <div className="clear-both grid gap-4 sm:grid-cols-2">
                                        {input('weekday_ot_hours', 'Weekday OT hours', { max: 999 })}
                                        {input('weekend_ot_hours', 'Rest-day OT hours', { max: 999 })}
                                    </div>
                                    <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-xs sm:grid-cols-3">
                                        {[
                                            ['Basic pay', item.cutoff_basic],
                                            ['Transportation', item.cutoff_transpo],
                                            ['Representation', item.cutoff_rep],
                                            ['Quarterly allowance', item.cutoff_quarterly],
                                            ['Overtime pay', item.weekday_ot_pay + item.weekend_ot_pay],
                                            ['Gross pay', item.gross_pay],
                                        ].map(([label, value]) => (
                                            <div key={label}>
                                                <dt className="text-sub">{label}</dt>
                                                <dd className="mt-1 font-semibold text-text tnum">₱{fmt(value)}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </fieldset>
                                <div hidden={step !== 2} className="space-y-5 py-5">
                                    <h3 className="text-sm font-bold text-text">03 · Cutoff deductions</h3>
                                    {deductionGroups.map(([title, fields]) => (
                                        <fieldset key={title}>
                                            <legend className="mb-3 text-xs font-semibold text-sub">{title}</legend>
                                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                                {Object.entries(fields).map(([field, label]) =>
                                                    input(field, `${label} (₱)`, { max: 99999999 }, true),
                                                )}
                                            </div>
                                        </fieldset>
                                    ))}
                                    <div className="grid items-end gap-4 sm:grid-cols-2">
                                        {input('tardiness_deduction', 'Tardiness deduction (₱)', { step: '0.01' })}
                                        <p className="py-2 text-sm text-sub">
                                            Total deductions{' '}
                                            <strong className="ml-2 text-rose-700 tnum">
                                                ₱{fmt(item.total_deductions)}
                                            </strong>
                                        </p>
                                    </div>
                                </div>
                                {step < 2 && (
                                    <div className="flex items-center justify-between gap-3 border-t border-border py-4">
                                        <p className="text-xs text-sub">Step {step + 1} of 3 · Review each section before confirming.</p>
                                        <Button onClick={() => setStep(step + 1)} className="min-h-[44px] bg-[#26215C] hover:bg-[#201B4D]">
                                            Continue to {step === 0 ? 'earnings' : 'deductions'}
                                        </Button>
                                    </div>
                                )}
                                <div hidden={step !== 2} className="border-t border-border py-5">
                                    <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm leading-relaxed text-text">
                                        <input
                                            type="checkbox"
                                            checked={item.deductions_reviewed}
                                            disabled={!item.office_verified || !item.payroll_office || processing}
                                            onChange={(event) => update('deductions_reviewed', event.target.checked)}
                                            className="mt-1 size-5 shrink-0 accent-[#26215C]"
                                        />
                                        I reviewed the office, paid days, absences, overtime, and deductions for{' '}
                                        {item.full_name}.
                                    </label>
                                    {!item.payroll_office && (
                                        <p className="mt-2 text-xs text-amber-800">
                                            Complete account setup and HR office verification before including this employee in payroll.
                                        </p>
                                    )}
                                    <div className="mt-4 flex flex-wrap justify-between gap-3">
                                        <Button
                                            variant="outline"
                                            disabled={index === 0}
                                            className="min-h-[44px]"
                                            onClick={() => selectEmployee(items[index - 1].id)}
                                        >
                                            Previous employee
                                        </Button>
                                        <Button
                                            variant="outline"
                                            disabled={index === items.length - 1}
                                            className="min-h-[44px]"
                                            onClick={() => selectEmployee(items[index + 1].id)}
                                        >
                                            Next employee
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
                <div className="sticky bottom-3 z-20 rounded-2xl border border-border bg-panel p-4 shadow-[0_8px_30px_-12px_rgba(38,33,92,0.18)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs text-sub">Batch net payout</p>
                            <p className="font-heading text-xl font-bold text-[#26215C] tnum">₱{fmt(totals.net)}</p>
                            <p className="text-xs text-sub">
                                {unreviewed ? `${unreviewed} employees still need review` : 'All employees reviewed'}
                            </p>
                        </div>
                        <Button
                            type="submit"
                            loading={processing}
                            disabled={!items.length || unreviewed > 0}
                            className="min-h-[44px] bg-[#26215C] hover:bg-[#201B4D]"
                        >
                            Save payroll batch
                        </Button>
                    </div>
                </div>
            </form>
        </AdminLayout>
    )
}
