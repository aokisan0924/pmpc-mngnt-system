import { Fragment, useMemo, useState } from 'react'
import { useForm, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Button from '@/Components/UI/Button'
import AdminPageHeader from '@/Components/AdminPageHeader'
import PayrollSummary from '@/Components/PayrollSummary'
import { calculateOfficeItem } from './officePayrollMath'

const fmt = (value) =>
    Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const deductionFields = {
    sss_deduction: 'SSS',
    philhealth_deduction: 'PhilHealth',
    pagibig_deduction: 'Pag-IBIG',
    tax_deduction: 'Withholding tax',
    loan_deduction: 'Loan',
    capital_contribution_deduction: 'Capital contribution',
    cash_advance_deduction: 'Cash advance',
    rental_deduction: 'Rental',
    savings_deduction: 'Savings',
    other_deductions: 'Other deductions',
}
// Only the values that change each cutoff are editable in the row.
const rowFields = [
    ['paid_days_basis', 'Paid days', { max: 15, step: '0.5' }],
    ['absence_days', 'Absent', { step: '0.5' }],
    ['weekday_ot_hours', 'Weekday OT hrs', { max: 999, step: '0.5' }],
    ['weekend_ot_hours', 'Rest-day OT hrs', { max: 999, step: '0.5' }],
    ['holiday_pay', 'Holiday pay ₱', { step: '0.01' }],
    ['tardiness_minutes', 'Late mins', { max: 9999, step: '0.5' }],
]
const cell = 'min-h-[44px] w-24 rounded-lg border border-border bg-field px-2 py-1.5 text-right text-sm text-text tnum'
const dtrDiffers = (item) =>
    Math.abs(Number(item.paid_days_basis) - Number(item.absence_days) - Number(item.dtr_days_present)) >= 0.005

export default function PayrollCreate({
    employees = [],
    period_from,
    period_to,
    period_label,
    cutoff,
    is_first,
    offices = {},
    holidays = [],
}) {
    const { data, setData, post, processing, errors } = useForm({
        period_from,
        period_to,
        period_label,
        cutoff,
        batch_reviewed: true, // the review dialog is the confirmation
        items: employees.map((employee) => ({
            ...employee,
            employee_id: employee.id,
            employee_code: employee.employee_id,
        })),
    })
    const [open, setOpen] = useState(null)
    const [reviewing, setReviewing] = useState(false)
    const items = useMemo(() => data.items.map(calculateOfficeItem), [data.items])
    const sum = (list) =>
        list.reduce(
            (total, item) => ({
                gross: total.gross + item.gross_pay,
                deductions: total.deductions + item.total_deductions,
                net: total.net + item.net_pay,
            }),
            { gross: 0, deductions: 0, net: 0 },
        )
    const totals = sum(items)
    const unverified = items.filter((item) => !item.office_verified).length
    const groups = Object.keys(offices)
        .concat('')
        .map((office) => [office, items.map((item, index) => ({ item, index })).filter(({ item }) => (item.office_verified ? item.payroll_office : '') === office)])
        .filter(([, rows]) => rows.length)

    function update(index, field, value) {
        setData('items', data.items.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)))
    }
    function updateDeduction(index, field, value) {
        update(index, 'deductions', { ...data.items[index].deductions, [field]: value })
    }
    function rowErrors(index) {
        return Object.entries(errors).filter(([key]) => key.startsWith(`items.${index}.`))
    }
    function submit(event) {
        event.preventDefault()
        if (!items.length || unverified || processing) return
        setReviewing(true)
    }
    // Nothing is written until this runs; discarding from the review just leaves the page.
    function save() {
        post('/admin/payroll', {
            preserveScroll: true,
            onError: (validation) => {
                setReviewing(false)
                const first = Object.keys(validation).find((key) => /^items\.\d+\./.test(key))
                if (first) {
                    const index = Number(first.split('.')[1])
                    if (first.includes('.deductions.') || first.includes('dtr_reconciliation_note')) setOpen(index)
                    document.getElementById(`payroll-row-${index}`)?.scrollIntoView({ block: 'center' })
                }
            },
        })
    }
    function numberInput(index, field, label, options, value, onChange) {
        const key = `items.${index}.${field}`
        return (
            <input
                type="number"
                min="0"
                {...options}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-label={`${label} for ${items[index].full_name}`}
                aria-invalid={!!errors[key]}
                className={`${cell} ${errors[key] ? 'border-rose-500' : ''}`}
            />
        )
    }

    return (
        <AdminLayout>
            <form onSubmit={submit} className="admin-page-shell space-y-5 page-enter">
                <AdminPageHeader
                    eyebrow="Payroll input"
                    title={period_label}
                    description="Enter this cutoff's absences, overtime and adjustments in one table. Pay recalculates as you type."
                    badge={is_first ? '1st cutoff' : '2nd cutoff'}
                    meta={
                        <Link href="/admin/payroll" className="inline-flex min-h-[44px] items-center font-medium text-indigo-100 hover:text-white">
                            Back to payroll
                        </Link>
                    }
                />
                {unverified > 0 && (
                    <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        {unverified} {unverified === 1 ? 'employee needs' : 'employees need'} an HR-verified office before this batch can be saved.{' '}
                        <Link href="/admin/account-setups" className="font-semibold underline">Review account setups</Link>
                    </p>
                )}
                <PayrollSummary {...totals} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-field px-4 py-3 text-sm text-sub">
                    <strong className="text-text">Holidays this cutoff:</strong>
                    {holidays.length ? holidays.map((holiday) => (
                        <span key={holiday.date}>{holiday.date} · {holiday.name} ({holiday.type})</span>
                    )) : <span>None recorded</span>}
                </div>
                <details className="rounded-xl border border-border bg-field px-4 py-3 text-sm text-sub">
                    <summary className="min-h-[44px] cursor-pointer font-semibold text-text">How pay is calculated</summary>
                    <ul className="mt-2 max-w-[70ch] list-disc space-y-1 pl-5 leading-relaxed">
                        <li>Basic pay = daily rate × (paid days − absent days). Paid days start at the office default (11; 15 for General Merchandise).</li>
                        <li>Allowances are half the monthly amount. Weekday overtime is daily rate ÷ 8 × 125%; rest-day overtime × 130%.</li>
                        <li>Holiday pay is typed in pesos. Late minutes are deducted at daily rate ÷ 8 ÷ 60 per minute. Deductions start from employee profiles; open Details to change them.</li>
                        <li>DTR days are shown for reference only and never block saving.</li>
                    </ul>
                </details>
                {Object.entries(errors)
                    .filter(([key]) => !key.startsWith('items.'))
                    .map(([key, message]) => (
                        <p key={key} role="alert" className="text-sm text-rose-700">{message}</p>
                    ))}

                <div className="overflow-x-auto rounded-2xl border border-border bg-panel">
                    <table className="w-full min-w-[1100px] text-sm">
                        <thead className="bg-field text-xs text-sub">
                            <tr>
                                <th scope="col" className="sticky left-0 z-10 bg-field px-4 py-3 text-left font-semibold">Employee</th>
                                {rowFields.map(([field, label]) => (
                                    <th key={field} scope="col" className="px-2 py-3 text-right font-semibold">{label}</th>
                                ))}
                                <th scope="col" className="px-2 py-3 text-right font-semibold">Deductions ₱</th>
                                <th scope="col" className="px-2 py-3 text-right font-semibold">Gross</th>
                                <th scope="col" className="px-4 py-3 text-right font-semibold">Net</th>
                            </tr>
                        </thead>
                        {groups.map(([office, rows]) => {
                            const subtotal = sum(rows.map(({ item }) => item))
                            return (
                                <tbody key={office || 'none'} className="divide-y divide-border border-t border-border">
                                    <tr className="bg-indigo-50/60">
                                        <th scope="rowgroup" colSpan={10} className="sticky left-0 px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-[#26215C]">
                                            {offices[office]?.label || 'Office needed'}
                                        </th>
                                    </tr>
                                    {rows.map(({ item, index }) => (
                                        <Fragment key={item.id}>
                                            <tr id={`payroll-row-${index}`} className="align-top">
                                                <th scope="row" className="sticky left-0 z-10 min-w-[200px] bg-panel px-4 py-3 text-left font-normal">
                                                    <span className="block font-semibold text-text">{item.full_name}</span>
                                                    <span className="block text-xs text-sub">₱{fmt(item.daily_rate)}/day · DTR {item.dtr_days_present} days</span>
                                                    {dtrDiffers(item) && (
                                                        <a
                                                            href={`/admin/dtr/${item.id}?month=${period_from.slice(0, 7)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Open this employee's DTR for the cutoff month"
                                                            className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900 underline-offset-2 hover:underline"
                                                        >
                                                            DTR differs{item.dtr_reconciliation_note ? ` · ${item.dtr_reconciliation_note}` : ''} ↗
                                                        </a>
                                                    )}
                                                </th>
                                                {rowFields.map(([field, label, options]) => (
                                                    <td key={field} className="px-2 py-3 text-right">
                                                        {numberInput(index, field, label, field === 'absence_days' ? { ...options, max: item.paid_days_basis } : options, data.items[index][field], (value) => update(index, field, value))}
                                                        {field === 'tardiness_minutes' && Number(item.tardiness_minutes) > 0 && (
                                                            <span className="mt-1 block text-[11px] text-rose-700 tnum">−₱{fmt(item.tardiness_deduction)}</span>
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="px-2 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpen(open === index ? null : index)}
                                                        aria-expanded={open === index}
                                                        aria-controls={`payroll-details-${index}`}
                                                        className="min-h-[44px] rounded-lg border border-border px-3 text-sm font-semibold text-rose-700 tnum hover:bg-field"
                                                    >
                                                        {fmt(item.total_deductions)} <span className="text-xs text-sub">{open === index ? '▲' : 'Details ▼'}</span>
                                                    </button>
                                                </td>
                                                <td className="px-2 py-3 text-right tnum text-text">{fmt(item.gross_pay)}</td>
                                                <td className="px-4 py-3 text-right font-semibold tnum text-[#26215C]">{fmt(item.net_pay)}</td>
                                            </tr>
                                            {rowErrors(index).length > 0 && (
                                                <tr>
                                                    <td colSpan={10} role="alert" className="px-4 pb-3 text-xs text-rose-700">
                                                        {rowErrors(index).map(([key, message]) => <p key={key}>{message}</p>)}
                                                    </td>
                                                </tr>
                                            )}
                                            {open === index && (
                                                <tr id={`payroll-details-${index}`} className="bg-field/60">
                                                    <td colSpan={10} className="px-4 py-4">
                                                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                                            {Object.entries(deductionFields).map(([field, label]) => (
                                                                <label key={field} className="text-xs font-medium text-sub">
                                                                    {label}
                                                                    <span className="mt-1 block">
                                                                        {numberInput(index, `deductions.${field}`, label, { step: '0.01', max: 99999999 }, data.items[index].deductions[field], (value) => updateDeduction(index, field, value))}
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                        <label className="mt-3 block max-w-xl text-xs font-medium text-sub">
                                                            DTR note (optional)
                                                            <input
                                                                type="text"
                                                                maxLength={500}
                                                                value={data.items[index].dtr_reconciliation_note || ''}
                                                                onChange={(event) => update(index, 'dtr_reconciliation_note', event.target.value)}
                                                                className="mt-1 min-h-[44px] w-full rounded-lg border border-border bg-panel px-3 text-sm text-text"
                                                            />
                                                        </label>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                    <tr className="bg-field/40 text-xs font-semibold text-sub">
                                        <th scope="row" colSpan={7} className="sticky left-0 bg-field/40 px-4 py-2 text-left">
                                            {offices[office]?.label || 'Office needed'} subtotal
                                        </th>
                                        <td className="px-2 py-2 text-right tnum text-rose-700">{fmt(subtotal.deductions)}</td>
                                        <td className="px-2 py-2 text-right tnum">{fmt(subtotal.gross)}</td>
                                        <td className="px-4 py-2 text-right tnum text-[#26215C]">{fmt(subtotal.net)}</td>
                                    </tr>
                                </tbody>
                            )
                        })}
                    </table>
                    {!items.length && <p className="p-4 text-sm text-sub">No active staff available for this batch.</p>}
                </div>

                <div className="sticky bottom-3 z-20 rounded-2xl border border-border bg-panel p-4 shadow-[0_8px_30px_-12px_rgba(38,33,92,0.18)]">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                            <div><dt className="text-xs text-sub">Gross</dt><dd className="font-semibold tnum text-text">₱{fmt(totals.gross)}</dd></div>
                            <div><dt className="text-xs text-sub">Deductions</dt><dd className="font-semibold tnum text-rose-700">₱{fmt(totals.deductions)}</dd></div>
                            <div><dt className="text-xs text-sub">Net payout</dt><dd className="font-heading text-lg font-bold tnum text-[#26215C]">₱{fmt(totals.net)}</dd></div>
                        </dl>
                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                type="submit"
                                loading={processing}
                                disabled={!items.length || unverified > 0 || processing}
                                className="min-h-[44px] bg-[#26215C] hover:bg-[#201B4D]"
                            >
                                Review payroll
                            </Button>
                        </div>
                    </div>
                    {errors.batch_reviewed && <p role="alert" className="mt-2 text-sm text-rose-700">{errors.batch_reviewed}</p>}
                </div>
            </form>
            {reviewing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="review-title">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !processing && setReviewing(false)} />
                    <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-border bg-panel p-6 shadow-2xl">
                        <h2 id="review-title" className="font-heading text-lg font-bold text-text">Save this payroll?</h2>
                        <p className="text-sm text-sub">{period_label} · {items.length} employees</p>
                        <p className="mt-5 text-xs text-sub">Net payout</p>
                        <p className="font-heading text-3xl font-bold tnum text-[#26215C]">₱{fmt(totals.net)}</p>
                        <p className="mt-1 text-sm text-sub tnum">Gross ₱{fmt(totals.gross)} · Deductions ₱{fmt(totals.deductions)}</p>
                        <details className="mt-4 min-h-0 overflow-auto text-sm">
                            <summary className="min-h-[44px] cursor-pointer font-semibold text-text">See each employee</summary>
                            <ul className="divide-y divide-border">
                                {items.map((item, index) => (
                                    <li key={data.items[index].employee_id} className="flex justify-between gap-3 py-2">
                                        <span className="text-text">{item.full_name}</span>
                                        <span className="font-semibold tnum">₱{fmt(item.net_pay)}</span>
                                    </li>
                                ))}
                            </ul>
                        </details>
                        <Button type="button" loading={processing} disabled={processing} onClick={save} className="mt-5 min-h-[44px] w-full bg-[#26215C] hover:bg-[#201B4D]">
                            Save as draft
                        </Button>
                        <div className="mt-2 flex justify-between">
                            <button type="button" disabled={processing} onClick={() => setReviewing(false)} className="min-h-[44px] px-2 text-sm font-medium text-sub hover:text-text">
                                Keep editing
                            </button>
                            <Link href="/admin/payroll" className="inline-flex min-h-[44px] items-center px-2 text-sm font-medium text-rose-700 hover:underline">
                                Discard
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
