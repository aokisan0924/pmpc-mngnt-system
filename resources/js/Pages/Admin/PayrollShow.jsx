import { useState } from 'react'
import { useForm, usePage, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Button from '@/Components/UI/Button'
import ConfirmModal from '@/Components/ConfirmModal'
import AdminPageHeader from '@/Components/AdminPageHeader'
import PayrollExcelExport from '@/Components/PayrollExcelExport'
import PayrollSummary from '@/Components/PayrollSummary'

const fmt = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0))
const earnings = {
    cutoff_basic: 'Basic pay after absences',
    cutoff_transpo: 'Transportation',
    cutoff_rep: 'Representation',
    cutoff_quarterly: 'Quarterly allowance',
    weekday_ot_pay: 'Weekday overtime',
    weekend_ot_pay: 'Rest-day overtime',
}
const deductions = {
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
    tardiness_deduction: 'Tardiness',
}

export default function PayrollShow({ payroll, items = [], signatureEmployees = [] }) {
    const { flash, errors } = usePage().props
    const form = useForm({})
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [office, setOffice] = useState('all')
    const offices = [...new Set(items.map((item) => item.payroll_office_label).filter(Boolean))]
    const visible = items.filter(
        (item) =>
            `${item.full_name} ${item.employee_id}`.toLowerCase().includes(search.toLowerCase()) &&
            (office === 'all' || item.payroll_office_label === office),
    )
    return (
        <AdminLayout>
            <div className="admin-page-shell space-y-5 page-enter">
                {flash?.success && (
                    <p
                        role="status"
                        className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                    >
                        {flash.success}
                    </p>
                )}
                {Object.entries(errors || {})
                    .filter(([key]) => !key.startsWith('signatories.'))
                    .map(([key, message]) => (
                        <p role="alert" key={key} className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
                            {message}
                        </p>
                    ))}
                <AdminPageHeader
                    eyebrow="Saved payroll batch"
                    title={payroll.period_label}
                    description={`${payroll.period_from} to ${payroll.period_to}`}
                    badge={`${payroll.cutoff_label} · ${payroll.status}`}
                    meta={
                        <Link
                            href="/admin/payroll"
                            className="inline-flex min-h-[44px] items-center font-medium text-indigo-100 hover:text-white"
                        >
                            Back to payroll
                        </Link>
                    }
                    action={
                        payroll.status === 'draft' && (
                            <Button
                                disabled={form.processing}
                                onClick={() => setConfirmOpen(true)}
                                className="admin-header-primary min-h-[44px]"
                            >
                                Finalize payroll batch
                            </Button>
                        )
                    }
                />
                <PayrollSummary
                    gross={payroll.total_gross}
                    deductions={payroll.total_deductions}
                    net={payroll.total_net}
                >
                    <p className="mt-4 border-t border-border pt-3 text-sm text-sub">
                        {items.length} employee records ·{' '}
                        {payroll.status === 'draft'
                            ? 'Draft: review the employee breakdown before finalizing.'
                            : 'Finalized: payroll figures are locked.'}
                    </p>
                </PayrollSummary>
                <section
                    aria-labelledby="breakdown-title"
                    className="overflow-hidden rounded-2xl border border-border bg-panel"
                >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
                        <div>
                            <h2 id="breakdown-title" className="font-heading text-xl font-bold text-text">
                                Employee breakdown
                            </h2>
                            <p className="mt-1 text-xs text-sub">
                                Open an employee to inspect earnings and deductions.
                            </p>
                        </div>
                        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
                            <label className="text-xs text-sub">
                                Search employees
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Name or ID"
                                    className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-field px-3 text-sm text-text"
                                />
                            </label>
                            <label className="text-xs text-sub">
                                Payroll office
                                <select
                                    value={office}
                                    onChange={(event) => setOffice(event.target.value)}
                                    className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-field px-3 text-sm text-text"
                                >
                                    <option value="all">All offices</option>
                                    {offices.map((label) => (
                                        <option key={label}>{label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>
                    <div className="divide-y divide-border">
                        {visible.map((item) => (
                            <details key={item.id} className="group">
                                <summary className="grid cursor-pointer list-none items-center gap-4 px-5 py-4 hover:bg-field md:grid-cols-[minmax(200px,1.4fr)_2fr_auto]">
                                    <div>
                                        <h3 className="text-sm font-semibold text-text">{item.full_name}</h3>
                                        <p className="mt-1 text-xs text-sub">
                                            {item.employee_id} ·{' '}
                                            {item.payroll_office_label || item.position || 'Employee'}
                                        </p>
                                        <p className="mt-1 text-xs text-sub">
                                            {item.payroll_office
                                                ? `${item.paid_days_basis} paid days − ${item.absence_days} absent`
                                                : `${item.days_present} attendance days`}
                                        </p>
                                    </div>
                                    <dl className="grid grid-cols-3 gap-3 text-xs">
                                        {[
                                            ['Gross', item.gross_pay],
                                            ['Deductions', item.total_deductions],
                                            ['Net pay', item.net_pay],
                                        ].map(([label, amount]) => (
                                            <div key={label}>
                                                <dt className="text-sub">{label}</dt>
                                                <dd
                                                    className={`mt-1 break-words font-semibold tnum ${Number(amount) < 0 ? 'text-rose-700' : 'text-text'}`}
                                                >
                                                    {fmt(amount)}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                    <span className="text-xs font-semibold text-[#26215C]">
                                        <span className="group-open:hidden">View details +</span>
                                        <span className="hidden group-open:inline">Close details −</span>
                                    </span>
                                </summary>
                                <div className="grid gap-6 border-t border-border bg-field/60 p-5 md:grid-cols-2">
                                    {[
                                        ['Earnings', earnings],
                                        ['Deductions', deductions],
                                    ].map(([title, fields]) => (
                                        <section key={title}>
                                            <h4 className="mb-3 text-sm font-semibold text-text">{title}</h4>
                                            <dl className="divide-y divide-border text-xs">
                                                {Object.entries(fields).map(([field, label]) => (
                                                    <div key={field} className="flex justify-between gap-3 py-2">
                                                        <dt className="text-sub">{label}</dt>
                                                        <dd className="font-medium text-text tnum">
                                                            {fmt(item[field])}
                                                        </dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        </section>
                                    ))}
                                    {(Number(item.weekday_ot_hours) > 0 || Number(item.weekend_ot_hours) > 0) && (
                                        <p className="text-xs text-sub md:col-span-2">
                                            Overtime recorded: {item.weekday_ot_hours} weekday hours ·{' '}
                                            {item.weekend_ot_hours} rest-day hours
                                        </p>
                                    )}
                                </div>
                            </details>
                        ))}
                    </div>
                    {!visible.length && (
                        <p className="p-8 text-center text-sm text-sub">No employees match these filters.</p>
                    )}
                </section>
                <section aria-labelledby="downloads-title" className="rounded-2xl border border-border bg-panel p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 id="downloads-title" className="font-heading text-lg font-bold text-text">
                                Reports & downloads
                            </h2>
                            <p className="mt-1 text-xs text-sub">
                                Download payslips or choose signatories for the management workbook.
                            </p>
                        </div>
                        <a
                            href={`/admin/payslips/download-all?month=${payroll.month_key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[44px] items-center rounded-xl border border-border px-4 text-sm font-semibold text-[#26215C] hover:bg-field"
                        >
                            Download all payslips
                        </a>
                    </div>
                    <details
                        open={Object.keys(errors || {}).some((key) => key.startsWith('signatories.')) || undefined}
                        className="mt-5 border-t border-border pt-4"
                    >
                        <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-text">
                            Management Excel · signatories & export
                        </summary>
                        <PayrollExcelExport payroll={payroll} employees={signatureEmployees} />
                    </details>
                </section>
                {payroll.status === 'draft' && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                        <p className="text-xs text-sub">Discarding removes this draft and its employee calculations.</p>
                        <Button
                            variant="outline"
                            disabled={form.processing}
                            onClick={() => setDeleteOpen(true)}
                            className="min-h-[44px] text-rose-700"
                        >
                            Discard draft
                        </Button>
                    </div>
                )}
            </div>
            <ConfirmModal
                open={confirmOpen}
                title="Finalize payroll batch?"
                message={`This locks the ${payroll.period_label} batch. Finalized payroll cannot be edited or deleted. Verify all employee figures and deductions before continuing.`}
                confirmLabel="Finalize batch"
                cancelLabel="Keep reviewing"
                confirmStyle="primary"
                processing={form.processing}
                onConfirm={() =>
                    form.post(`/admin/payroll/${payroll.id}/finalize`, { onFinish: () => setConfirmOpen(false) })
                }
                onCancel={() => setConfirmOpen(false)}
            />
            <ConfirmModal
                open={deleteOpen}
                title="Discard draft payroll batch?"
                message={`Remove the draft for ${payroll.period_label} and its employee calculations? You can prepare a new batch afterward.`}
                confirmLabel="Discard draft"
                cancelLabel="Keep draft"
                confirmStyle="danger"
                processing={form.processing}
                onConfirm={() => form.delete(`/admin/payroll/${payroll.id}`, { onFinish: () => setDeleteOpen(false) })}
                onCancel={() => setDeleteOpen(false)}
            />
        </AdminLayout>
    )
}
