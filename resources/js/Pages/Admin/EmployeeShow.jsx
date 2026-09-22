import { useState } from 'react'
import { useForm, usePage, Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Button from '@/Components/UI/Button'
import AdminPageHeader from '@/Components/AdminPageHeader'

const inputClass = "w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-panel text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors placeholder:text-dim"

/* ---------- icons ---------- */
const IconArrowLeft = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...p}>
        <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconUser = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 20c1-4 3.7-6 7-6s6 2 7 6" strokeLinecap="round" />
    </svg>
)
const IconWallet = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <rect x="3" y="6" width="18" height="13" rx="2.2" />
        <path d="M3 10h18" />
        <circle cx="16" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </svg>
)
const IconLock = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <rect x="5" y="10.5" width="14" height="10" rx="2" />
        <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
)

function initials(first, last) {
    return `${(first || '?')[0] ?? ''}${(last || '')[0] ?? ''}`.toUpperCase()
}

function fmt(num) {
    return Number(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

/* ---------- reusable field ---------- */
function Field({ label, error, required, children }) {
    return (
        <div>
            <label className="block text-xs font-medium text-sub mb-1.5">
                {label} {required && <span className="text-red">*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-red">{error}</p>}
        </div>
    )
}

export default function EmployeeShow({ employee, govIds }) {
    const { flash }               = usePage().props
    const [activeTab, setActiveTab] = useState('info')

    const infoForm = useForm({
        first_name:  employee.first_name  ?? '',
        last_name:   employee.last_name   ?? '',
        email:       employee.email       ?? '',
        phone:       employee.phone       ?? '',
        address:     employee.address     ?? '',
        department:  employee.department  ?? '',
        position:    employee.position    ?? '',
        date_hired:  employee.date_hired  ?? '',
        status:      employee.status      ?? 'active',
    })

    const compForm = useForm({
        daily_rate:                       employee.daily_rate                       ?? '0',
        transpo_allowance:                employee.transpo_allowance                ?? '0',
        rep_allowance:                    employee.rep_allowance                    ?? '0',
        quarterly_allowance:              employee.quarterly_allowance              ?? '0',
        sss_deduction:                    employee.sss_deduction                    ?? '0',
        philhealth_deduction:             employee.philhealth_deduction             ?? '0',
        pagibig_deduction:                employee.pagibig_deduction                ?? '0',
        tax_deduction:                    employee.tax_deduction                    ?? '0',
        loan_deduction:                   employee.loan_deduction                   ?? '0',
        capital_contribution_deduction:   employee.capital_contribution_deduction   ?? '0',
        cash_advance_deduction:           employee.cash_advance_deduction           ?? '0',
        rental_deduction:                 employee.rental_deduction                 ?? '0',
        savings_deduction:                employee.savings_deduction                ?? '0',
        other_deductions:                 employee.other_deductions                 ?? '0',
    })

    const passForm = useForm({
        password:              '',
        password_confirmation: '',
    })

    function submitInfo(e) {
        e.preventDefault()
        infoForm.patch(`/admin/employees/${employee.id}`)
    }

    function submitComp(e) {
        e.preventDefault()
        compForm.patch(`/admin/employees/${employee.id}/compensation`)
    }

    function submitPass(e) {
        e.preventDefault()
        passForm.patch(`/admin/employees/${employee.id}/password`, {
            onSuccess: () => passForm.reset(),
        })
    }

    // Live computation preview
    const dailyRate     = parseFloat(compForm.data.daily_rate) || 0
    const monthlyBasic  = dailyRate * 22
    const allowanceTotal = (parseFloat(compForm.data.transpo_allowance) || 0)
        + (parseFloat(compForm.data.rep_allowance) || 0)
        + (parseFloat(compForm.data.quarterly_allowance) || 0)
    const grossMonthly  = monthlyBasic + allowanceTotal
    const totalDed      = ['sss_deduction','philhealth_deduction','pagibig_deduction','tax_deduction',
                            'loan_deduction','capital_contribution_deduction','cash_advance_deduction','rental_deduction',
                            'savings_deduction','other_deductions']
                            .reduce((sum, k) => sum + (parseFloat(compForm.data[k]) || 0), 0)
    const netMonthly    = grossMonthly - totalDed

    const tabs = [
        { key: 'info',         label: 'Profile',        Icon: IconUser   },
        { key: 'compensation', label: 'Compensation',   Icon: IconWallet },
        { key: 'password',     label: 'Reset password', Icon: IconLock   },
    ]

    return (
        <AdminLayout>
            <div className="admin-page-shell max-w-4xl space-y-4 sm:space-y-5 page-enter">

                {flash?.success && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        {flash.success}
                    </div>
                )}

                <AdminPageHeader
                    eyebrow="Employee record"
                    title={employee.full_name}
                    description={`${employee.employee_id}${employee.department ? ` · ${employee.department}` : ''}`}
                    badge={employee.status}
                    leading={
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 font-heading text-sm font-bold text-white shadow-xs">
                            {employee.initials ?? initials(employee.first_name, employee.last_name)}
                        </div>
                    }
                    meta={
                        <Link href="/admin/employees" className="inline-flex items-center gap-1.5 font-medium text-indigo-100 transition-colors hover:text-white">
                            <IconArrowLeft className="h-3.5 w-3.5" /> Back to Employees
                        </Link>
                    }
                    action={
                        <a href={`/admin/employees/${employee.id}/dtr/print`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/20">
                            Print DTR
                        </a>
                    }
                />

                {/* Tabs */}
                <div
                    role="group"
                    aria-label="Employee profile sections"
                    className="flex gap-1 p-1 bg-field rounded-xl overflow-x-auto border border-border/70"
                >
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            aria-pressed={activeTab === tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm py-2 px-3 rounded-lg transition-all font-medium whitespace-nowrap ${
                                activeTab === tab.key
                                    ? 'bg-panel text-text shadow-2xs font-semibold'
                                    : 'text-sub hover:text-text'
                            }`}
                        >
                            <tab.Icon className={`w-4 h-4 ${activeTab === tab.key ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Profile tab */}
                {activeTab === 'info' && (
                    <form onSubmit={submitInfo}
                        className="bg-panel rounded-2xl border border-border shadow-sm p-5 sm:p-6 space-y-5">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="First name" required error={infoForm.errors.first_name}>
                                <input type="text" value={infoForm.data.first_name}
                                    onChange={e => infoForm.setData('first_name', e.target.value)}
                                    className={inputClass} required />
                            </Field>
                            <Field label="Last name" required error={infoForm.errors.last_name}>
                                <input type="text" value={infoForm.data.last_name}
                                    onChange={e => infoForm.setData('last_name', e.target.value)}
                                    className={inputClass} required />
                            </Field>
                        </div>

                        <Field label="Email" required error={infoForm.errors.email}>
                            <input type="email" value={infoForm.data.email}
                                onChange={e => infoForm.setData('email', e.target.value)}
                                className={inputClass} required />
                        </Field>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Department">
                                <input type="text" value={infoForm.data.department}
                                    onChange={e => infoForm.setData('department', e.target.value)}
                                    placeholder="e.g. Operations"
                                    className={inputClass} />
                            </Field>
                            <Field label="Position">
                                <input type="text" value={infoForm.data.position}
                                    onChange={e => infoForm.setData('position', e.target.value)}
                                    placeholder="e.g. Staff Accountant"
                                    className={inputClass} />
                            </Field>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Phone">
                                <input type="text" value={infoForm.data.phone}
                                    onChange={e => infoForm.setData('phone', e.target.value)}
                                    placeholder="09xx-xxx-xxxx"
                                    className={inputClass} />
                            </Field>
                            <Field label="Date hired">
                                <input type="date" value={infoForm.data.date_hired}
                                    onChange={e => infoForm.setData('date_hired', e.target.value)}
                                    className={inputClass} />
                            </Field>
                        </div>

                        <Field label="Address">
                            <textarea value={infoForm.data.address}
                                onChange={e => infoForm.setData('address', e.target.value)}
                                rows={2}
                                placeholder="Home address"
                                className={`${inputClass} resize-none`} />
                        </Field>

                        <Field label="Employment status">
                            <select value={infoForm.data.status}
                                onChange={e => infoForm.setData('status', e.target.value)}
                                className={`${inputClass} bg-panel`}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </Field>

                        <div className="pt-2 flex items-center gap-3">
                            <Button type="submit" variant="primary" size="md" loading={infoForm.processing}>
                                Save changes
                            </Button>
                            {infoForm.recentlySuccessful && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Saved</span>
                            )}
                        </div>
                    </form>
                )}

                {/* Compensation tab */}
                {activeTab === 'compensation' && (
                    <form onSubmit={submitComp}
                        className="bg-panel rounded-2xl border border-border shadow-sm p-5 sm:p-6 space-y-6">

                        {/* Live preview */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20">
                            <div>
                                <p className="text-[11px] text-dim mb-0.5">Monthly basic</p>
                                <p className="text-sm font-semibold text-text">₱ {fmt(monthlyBasic)}</p>
                                <p className="text-[10px] text-dim">rate × 22 days</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-dim mb-0.5">Allowances</p>
                                <p className="text-sm font-semibold text-text">₱ {fmt(allowanceTotal)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-dim mb-0.5">Total deductions</p>
                                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">₱ {fmt(totalDed)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-dim mb-0.5">Est. net / month</p>
                                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">₱ {fmt(netMonthly)}</p>
                            </div>
                        </div>

                        {/* Basic pay */}
                        <section>
                            <p className="text-xs font-semibold text-sub mb-3 uppercase tracking-wide">Basic pay</p>
                            <Field label="Daily rate (₱)" required>
                                <input type="number" value={compForm.data.daily_rate}
                                    onChange={e => compForm.setData('daily_rate', e.target.value)}
                                    min="0" step="0.01" placeholder="0.00"
                                    className={inputClass} required />
                            </Field>
                            <p className="mt-1.5 text-xs text-dim">
                                Basic pay per payroll = daily rate × actual days present
                            </p>
                        </section>

                        {/* Allowances */}
                        <section>
                            <p className="text-xs font-semibold text-sub mb-3 uppercase tracking-wide">Allowances (per payroll period)</p>
                            <div className="grid sm:grid-cols-3 gap-3">
                                {[
                                    { key: 'transpo_allowance',   label: 'Transportation (₱)' },
                                    { key: 'rep_allowance',        label: 'Representation (₱)' },
                                    { key: 'quarterly_allowance',  label: 'Quarterly (₱)'      },
                                ].map(({ key, label }) => (
                                    <Field key={key} label={label}>
                                        <input type="number" value={compForm.data[key]}
                                            onChange={e => compForm.setData(key, e.target.value)}
                                            min="0" step="0.01" placeholder="0.00"
                                            className={inputClass} />
                                    </Field>
                                ))}
                            </div>
                        </section>

                        {/* Government deductions */}
                        <section>
                            <p className="text-xs font-semibold text-sub mb-3 uppercase tracking-wide">Government deductions</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {[
                                    { key: 'sss_deduction',        label: 'SSS (₱)'        },
                                    { key: 'philhealth_deduction',  label: 'PhilHealth (₱)' },
                                    { key: 'pagibig_deduction',     label: 'Pag-IBIG (₱)'   },
                                    { key: 'tax_deduction',         label: 'W/H Tax (₱)'    },
                                ].map(({ key, label }) => (
                                    <Field key={key} label={label}>
                                        <input type="number" value={compForm.data[key]}
                                            onChange={e => compForm.setData(key, e.target.value)}
                                            min="0" step="0.01" placeholder="0.00"
                                            className={inputClass} />
                                    </Field>
                                ))}
                            </div>
                        </section>

                        {/* Other deductions */}
                        <section>
                            <p className="text-xs font-semibold text-sub mb-3 uppercase tracking-wide">Other deductions</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {[
                                    { key: 'loan_deduction',                  label: 'Loan (₱)'                 },
                                    { key: 'capital_contribution_deduction',  label: 'Capital contribution (₱)' },
                                    { key: 'cash_advance_deduction',          label: 'Cash advance (₱)'         },
                                    { key: 'rental_deduction',                label: 'Rental (₱)'               },
                                    { key: 'savings_deduction',               label: 'Savings (₱)'              },
                                    { key: 'other_deductions',                label: 'Other (₱)'                },
                                ].map(({ key, label }) => (
                                    <Field key={key} label={label}>
                                        <input type="number" value={compForm.data[key]}
                                            onChange={e => compForm.setData(key, e.target.value)}
                                            min="0" step="0.01" placeholder="0.00"
                                            className={inputClass} />
                                    </Field>
                                ))}
                            </div>
                        </section>

                        <div className="pt-2 flex items-center gap-3">
                            <Button type="submit" variant="primary" size="md" loading={compForm.processing}>
                                Save compensation
                            </Button>
                            {compForm.recentlySuccessful && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Saved</span>
                            )}
                        </div>
                    </form>
                )}

                {/* Reset password tab */}
                {activeTab === 'password' && (
                    <form onSubmit={submitPass}
                        className="bg-panel rounded-2xl border border-border shadow-sm p-5 sm:p-6 space-y-4">
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-field border border-border">
                            <IconLock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-dim" />
                            <p className="text-xs text-sub">
                                Set a new password for <span className="font-medium text-sub">{employee.full_name}</span>. They'll need to use it on their next sign-in.
                            </p>
                        </div>
                        <Field label="New password" required error={passForm.errors.password}>
                            <input type="password" value={passForm.data.password}
                                onChange={e => passForm.setData('password', e.target.value)}
                                className={inputClass} required />
                        </Field>
                        <Field label="Confirm new password" required>
                            <input type="password" value={passForm.data.password_confirmation}
                                onChange={e => passForm.setData('password_confirmation', e.target.value)}
                                className={inputClass} required />
                        </Field>
                        <div className="pt-2">
                            <Button type="submit" variant="primary" size="md" loading={passForm.processing}>
                                Reset password
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </AdminLayout>
    )
}
