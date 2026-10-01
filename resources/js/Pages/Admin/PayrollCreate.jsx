import { useMemo } from 'react'
import { useForm, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Button from '@/Components/UI/Button'
import AdminPageHeader from '@/Components/AdminPageHeader'
import { calculateOfficeItem } from './officePayrollMath'

const fmt = value => Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const deductionFields = {
    sss_deduction: 'SSS', philhealth_deduction: 'PhilHealth', pagibig_deduction: 'Pag-IBIG',
    tax_deduction: 'Withholding tax', loan_deduction: 'Loan', capital_contribution_deduction: 'Capital contribution',
    cash_advance_deduction: 'Cash advance', rental_deduction: 'Rental', savings_deduction: 'Savings', other_deductions: 'Other deductions',
}

export default function PayrollCreate({ employees = [], period_from, period_to, period_label, cutoff, is_first, offices = {} }) {
    const { data, setData, post, processing, errors } = useForm({
        period_from, period_to, period_label, cutoff,
        items: employees.map(employee => ({ ...employee, employee_id: employee.id, employee_code: employee.employee_id })),
    })
    const items = useMemo(() => data.items.map(calculateOfficeItem), [data.items])
    const totals = items.reduce((result, item) => ({ gross: result.gross + item.gross_pay, deductions: result.deductions + item.total_deductions, net: result.net + item.net_pay }), { gross: 0, deductions: 0, net: 0 })
    const unreviewed = items.filter(item => !item.payroll_office || !item.deductions_reviewed).length

    function update(index, field, value) {
        setData('items', data.items.map((item, i) => {
            if (i !== index) return item
            const changes = field === 'payroll_office' ? { paid_days_basis: offices[value]?.days ?? 11, absence_days: 0 } : {}
            return { ...item, ...changes, [field]: value, deductions_reviewed: field === 'deductions_reviewed' ? value : false }
        }))
    }

    function input(index, field, label, options = {}) {
        const key = 'items.' + index + '.' + field
        return <label className="block text-xs text-sub" key={field}>{label}
            <input type="number" min="0" step="0.5" {...options} value={data.items[index][field]}
                onChange={event => update(index, field, event.target.value)}
                aria-label={label + ' for ' + items[index].full_name} aria-invalid={!!errors[key]}
                className="mt-1 w-full rounded-lg border border-border bg-field px-3 py-2 text-text" />
            {errors[key] && <span className="block mt-1 text-rose-700">{errors[key]}</span>}
        </label>
    }

    return <AdminLayout>
        <form onSubmit={event => { event.preventDefault(); post('/admin/payroll') }} className="admin-page-shell space-y-5 page-enter">
            <AdminPageHeader eyebrow="Payroll batch preparation" title={period_label}
                description="Choose each employee’s office, verify paid and absence days, and review the exact deductions for this cutoff."
                badge={is_first ? '1st cutoff' : '2nd cutoff'}
                meta={<Link href="/admin/payroll" className="font-medium text-indigo-100 hover:text-white">Back to Payroll Ledger</Link>}
                action={<Button type="submit" loading={processing} disabled={processing || items.length === 0 || unreviewed > 0} className="admin-header-primary">Save Payroll Batch</Button>} />
            <div className="admin-workspace-card rounded-xl border border-border bg-card p-4 text-sm text-sub space-y-2">
                <p>Basic pay = daily rate × (paid days − absence days). Main Office, Fort Magsaysay, and Cubao default to 11 paid days; General Merchandise defaults to 15. Adjust paid days for individual exceptions.</p>
                <p>DTR days are a reference only. Missing DTR records do not automatically deduct pay. Allowances are split in half. Weekday OT uses 125%; rest-day OT uses 130%.</p>
                <p>Deduction amounts are suggestions from employee profiles. Confirm actual cutoff amounts with payroll records, especially loans and cash advances. Enter verified tardiness deductions in pesos.</p>
                <p role="status" className="font-semibold text-text">{unreviewed} of {items.length} employees still need an office and review.</p>
            </div>
            {Object.entries(errors).filter(([key]) => !key.startsWith('items.')).map(([key, message]) => <p key={key} role="alert" className="text-sm text-rose-700">{message}</p>)}
            {items.map((item, index) => <section key={item.id} aria-labelledby={'employee-' + item.id} className="admin-workspace-card rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap justify-between gap-3">
                    <div><h2 id={'employee-' + item.id} className="font-semibold text-text">{item.full_name}</h2><p className="text-xs text-sub">{item.employee_code} · ₱{fmt(item.daily_rate)}/day · DTR recorded days: {item.dtr_days_present}</p></div>
                    <div className="text-right"><p className="text-xs text-sub">Net pay</p><p className={'text-xl font-bold tnum ' + (item.net_pay < 0 ? 'text-rose-700' : 'text-emerald-700')}>₱ {fmt(item.net_pay)}</p></div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <label className="text-xs text-sub">Payroll office
                        <select value={item.payroll_office} onChange={event => update(index, 'payroll_office', event.target.value)} aria-label={'Payroll office for ' + item.full_name} className="mt-1 w-full rounded-lg border border-border bg-field px-3 py-2 text-text">
                            <option value="">Select office</option>{Object.entries(offices).map(([key, office]) => <option key={key} value={key}>{office.label}</option>)}
                        </select>
                        {errors['items.' + index + '.payroll_office'] && <span className="block text-rose-700">{errors['items.' + index + '.payroll_office']}</span>}
                    </label>
                    {input(index, 'paid_days_basis', 'Paid days before absences', { max: 15 })}
                    {input(index, 'absence_days', 'Verified absence days', { max: item.paid_days_basis })}
                    {input(index, 'tardiness_deduction', 'Tardiness deduction (₱)', { step: '0.01' })}
                    {input(index, 'weekday_ot_hours', 'Weekday OT hours', { max: 999 })}
                    {input(index, 'weekend_ot_hours', 'Rest-day OT hours', { max: 999 })}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-sub">
                    <span>Basic: ₱{fmt(item.cutoff_basic)}</span><span>Transpo: ₱{fmt(item.cutoff_transpo)}</span><span>Representation: ₱{fmt(item.cutoff_rep)}</span><span>Quarterly allowance: ₱{fmt(item.cutoff_quarterly)}</span>
                    <span>OT: ₱{fmt(item.weekday_ot_pay + item.weekend_ot_pay)}</span><strong className="text-text">Gross: ₱{fmt(item.gross_pay)}</strong>
                </div>
                <fieldset><legend className="text-sm font-semibold text-text mb-3">Deductions for this cutoff</legend>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{Object.entries(deductionFields).map(([field, label]) => {
                        const key = 'items.' + index + '.deductions.' + field
                        return <label key={field} className="text-xs text-sub">{label} (₱)
                            <input type="number" min="0" max="99999999" step="0.01" value={data.items[index].deductions[field]}
                                onChange={event => update(index, 'deductions', { ...data.items[index].deductions, [field]: event.target.value })}
                                aria-label={label + ' for ' + item.full_name} aria-invalid={!!errors[key]}
                                className="mt-1 w-full rounded-lg border border-border bg-field px-3 py-2 text-text" />
                            {errors[key] && <span className="block text-rose-700">{errors[key]}</span>}
                        </label>
                    })}</div>
                </fieldset>
                <p className="text-sm font-semibold text-rose-700">Total deductions: ₱{fmt(item.total_deductions)}</p>
                <label className="flex items-start gap-2 text-sm text-text"><input type="checkbox" checked={item.deductions_reviewed} disabled={!item.payroll_office} onChange={event => update(index, 'deductions_reviewed', event.target.checked)} className="mt-1" />I reviewed this employee’s office, paid days, absences, overtime, and cutoff deductions.</label>
                {errors['items.' + index + '.deductions_reviewed'] && <p className="text-xs text-rose-700">{errors['items.' + index + '.deductions_reviewed']}</p>}
            </section>)}
            <div className="admin-workspace-card rounded-xl border border-border bg-card p-4 flex flex-wrap gap-5 text-sm font-semibold text-text tnum">
                <span>Gross: ₱{fmt(totals.gross)}</span><span>Deductions: ₱{fmt(totals.deductions)}</span><span>Net payout: ₱{fmt(totals.net)}</span>
            </div>
        </form>
    </AdminLayout>
}
