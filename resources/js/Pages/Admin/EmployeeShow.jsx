import { useState } from 'react'
import { useForm, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

const BRAND = '#26215C'
const inputClass = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#26215C]/15 focus:border-[#26215C] transition-colors placeholder:text-slate-400"

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
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
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
            <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">

                {flash?.success && (
                    <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                        <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        {flash.success}
                    </div>
                )}

                {/* Breadcrumb */}
                <a href="/admin/employees" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-4">
                    <IconArrowLeft className="w-4 h-4" /> Employees
                </a>

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                            style={{ background: BRAND }}>
                            {employee.initials ?? initials(employee.first_name, employee.last_name)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg font-semibold text-slate-900 truncate">{employee.full_name}</p>
                            <p className="text-xs text-slate-400 font-mono truncate">
                                {employee.employee_id} {employee.department && `· ${employee.department}`}
                            </p>
                        </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium w-fit ${
                        employee.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-600'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${employee.status === 'active' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        {employee.status}
                    </span>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 overflow-x-auto">
                    {tabs.map(tab => (
                        <button key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm py-2.5 px-3 rounded-lg transition-all font-medium whitespace-nowrap ${
                                activeTab === tab.key
                                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}>
                            <tab.Icon className="w-4 h-4" style={{ color: activeTab === tab.key ? BRAND : undefined }} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <a href={`/admin/employees/${employee.id}/dtr/print`}
                    target="_blank"
                    className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    Print DTR ↓
                </a>

                {/* Profile tab */}
                {activeTab === 'info' && (
                    <form onSubmit={submitInfo}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
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
                                    className={`${inputClass}`} style={{ colorScheme: 'light' }} />
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
                                className={`${inputClass} bg-white`}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </Field>

                        <div className="pt-2 flex items-center gap-3">
                            <button type="submit" disabled={infoForm.processing}
                                className="px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow-md hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                style={{ background: BRAND }}>
                                {infoForm.processing ? 'Saving…' : 'Save changes'}
                            </button>
                            {infoForm.recentlySuccessful && (
                                <span className="text-xs text-emerald-600 font-medium">Saved</span>
                            )}
                        </div>
                    </form>
                )}

                {/* Compensation tab */}
                {activeTab === 'compensation' && (
                    <form onSubmit={submitComp}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">

                        {/* Live preview */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border" style={{ background: '#F8F9FD', borderColor: '#E5E4F5' }}>
                            <div>
                                <p className="text-[11px] text-slate-400 mb-0.5">Monthly basic</p>
                                <p className="text-sm font-semibold text-slate-800">₱ {fmt(monthlyBasic)}</p>
                                <p className="text-[10px] text-slate-400">rate × 22 days</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-400 mb-0.5">Allowances</p>
                                <p className="text-sm font-semibold text-slate-800">₱ {fmt(allowanceTotal)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-400 mb-0.5">Total deductions</p>
                                <p className="text-sm font-semibold text-red-600">₱ {fmt(totalDed)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-400 mb-0.5">Est. net / month</p>
                                <p className="text-sm font-semibold text-emerald-700">₱ {fmt(netMonthly)}</p>
                            </div>
                        </div>

                        {/* Basic pay */}
                        <section>
                            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Basic pay</p>
                            <Field label="Daily rate (₱)" required>
                                <input type="number" value={compForm.data.daily_rate}
                                    onChange={e => compForm.setData('daily_rate', e.target.value)}
                                    min="0" step="0.01" placeholder="0.00"
                                    className={inputClass} required />
                            </Field>
                            <p className="mt-1.5 text-xs text-slate-400">
                                Basic pay per payroll = daily rate × actual days present
                            </p>
                        </section>

                        {/* Allowances */}
                        <section>
                            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Allowances (per payroll period)</p>
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
                            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Government deductions</p>
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
                            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Other deductions</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {[
                                    { key: 'loan_deduction',          label: 'Loan (₱)'          },
                                    { key: 'cc_deduction',             label: 'CC / Credit (₱)'   },
                                    { key: 'cash_advance_deduction',   label: 'Cash advance (₱)'  },
                                    { key: 'rental_deduction',         label: 'Rental (₱)'        },
                                    { key: 'savings_deduction',        label: 'Savings (₱)'       },
                                    { key: 'share_capital_deduction',  label: 'Share capital (₱)' },
                                    { key: 'other_deductions',         label: 'Other (₱)'         },
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
                                className="px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow-md hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                style={{ background: BRAND }}>
                                {compForm.processing ? 'Saving…' : 'Save compensation'}
                            </button>
                            {compForm.recentlySuccessful && (
                                <span className="text-xs text-emerald-600 font-medium">Saved</span>
                            )}
                        </div>
                    </form>
                )}

                {/* Reset password tab */}
                {activeTab === 'password' && (
                    <form onSubmit={submitPass}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <IconLock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                            <p className="text-xs text-slate-500">
                                Set a new password for <span className="font-medium text-slate-700">{employee.full_name}</span>. They'll need to use it on their next sign-in.
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
                                className="px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow-md hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                style={{ background: BRAND }}>
                                {passForm.processing ? 'Updating…' : 'Reset password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AdminLayout>
    )
}