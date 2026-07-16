import { useState } from 'react'
import { useForm, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

const inputClass = "w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-panel text-text focus:outline-none focus:ring-2 focus:ring-violet/20 focus:border-violet transition-colors placeholder:text-dim"

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
        daily_rate:               employee.daily_rate               ?? '0',
        transpo_allowance:        employee.transpo_allowance        ?? '0',
        rep_allowance:            employee.rep_allowance            ?? '0',
        quarterly_allowance:      employee.quarterly_allowance      ?? '0',
        sss_deduction:            employee.sss_deduction            ?? '0',
        philhealth_deduction:     employee.philhealth_deduction     ?? '0',
        pagibig_deduction:        employee.pagibig_deduction        ?? '0',
        tax_deduction:            employee.tax_deduction            ?? '0',
        loan_deduction:           employee.loan_deduction           ?? '0',
        cc_deduction:             employee.cc_deduction             ?? '0',
        cash_advance_deduction:   employee.cash_advance_deduction   ?? '0',
        rental_deduction:         employee.rental_deduction         ?? '0',
        savings_deduction:        employee.savings_deduction        ?? '0',
        share_capital_deduction:  employee.share_capital_deduction  ?? '0',
        other_deductions:         employee.other_deductions         ?? '0',
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
                            'loan_deduction','cc_deduction','cash_advance_deduction','rental_deduction',
                            'savings_deduction','share_capital_deduction','other_deductions']
                            .reduce((sum, k) => sum + (parseFloat(compForm.data[k]) || 0), 0)
    const netMonthly    = grossMonthly - totalDed

    const tabs = [
        { key: 'info',         label: 'Profile',        Icon: IconUser   },
        { key: 'compensation', label: 'Compensation',   Icon: IconWallet },
        { key: 'password',     label: 'Reset password', Icon: IconLock   },
    ]

    return (
        <AdminLayout>
            <div className="min-h-screen bg-bg">
            <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">

                {flash?.success && (
                    <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-teal/10 border border-teal/25 text-teal text-sm">
                        <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0" />
                        {flash.success}
                    </div>
                )}

                {/* Breadcrumb */}
                <a href="/admin/employees" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-text transition-colors mb-4">
                    <IconArrowLeft className="w-4 h-4" /> Employees
                </a>

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-semibold flex-shrink-0 bg-violet/15 text-violet">
                            {employee.initials ?? initials(employee.first_name, employee.last_name)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg font-semibold text-text truncate">{employee.full_name}</p>
                            <p className="text-xs text-dim font-mono truncate">
                                {employee.employee_id} {employee.department && `· ${employee.department}`}
                            </p>
                        </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium w-fit ${
                        employee.status === 'active'
                            ? 'bg-teal/10 text-teal'
                            : 'bg-red/10 text-red'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${employee.status === 'active' ? 'bg-teal' : 'bg-red'}`} />
                        {employee.status}
                    </span>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-field rounded-xl mb-6 overflow-x-auto">
                    {tabs.map(tab => (
                        <button key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm py-2.5 px-3 rounded-lg transition-all font-medium whitespace-nowrap ${
                                activeTab === tab.key
                                    ? 'bg-panel text-text shadow-sm ring-1 ring-border'
                                    : 'text-sub hover:text-text'
                            }`}>
                            <tab.Icon className={`w-4 h-4 ${activeTab === tab.key ? 'text-violet' : ''}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex justify-end mb-4">
                    <a href={`/admin/employees/${employee.id}/dtr/print`}
                        target="_blank"
                        className="text-xs px-3 py-1.5 rounded-lg border border-border text-sub hover:bg-hover transition-colors">
                        Print DTR ↓
                    </a>
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
                            <button type="submit" disabled={infoForm.processing}
                                className="px-5 py-2.5 text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all bg-violet text-bg">
                                {infoForm.processing ? 'Saving…' : 'Save changes'}
                            </button>
                            {infoForm.recentlySuccessful && (
                                <span className="text-xs text-teal font-medium">Saved</span>
                            )}
                        </div>
                    </form>
                )}

                {/* Compensation tab */}
                {activeTab === 'compensation' && (
                    <form onSubmit={submitComp}
                        className="bg-panel rounded-2xl border border-border shadow-sm p-5 sm:p-6 space-y-6">

                        {/* Live preview */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border" style={{ background: 'color-mix(in srgb, var(--color-violet) 6%, transparent)', borderColor: 'color-mix(in srgb, var(--color-violet) 15%, transparent)' }}>
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
                                <p className="text-sm font-semibold text-red">₱ {fmt(totalDed)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-dim mb-0.5">Est. net / month</p>
                                <p className="text-sm font-semibold text-teal">₱ {fmt(netMonthly)}</p>
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
                            <button type="submit" disabled={compForm.processing}
                                className="px-5 py-2.5 text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all bg-violet text-bg">
                                {compForm.processing ? 'Saving…' : 'Save compensation'}
                            </button>
                            {compForm.recentlySuccessful && (
                                <span className="text-xs text-teal font-medium">Saved</span>
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
                            <button type="submit" disabled={passForm.processing}
                                className="px-5 py-2.5 text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all bg-violet text-bg">
                                {passForm.processing ? 'Updating…' : 'Reset password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
            </div>
        </AdminLayout>
    )
}