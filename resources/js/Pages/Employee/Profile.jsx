import { useState } from 'react'
import { useForm, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'
import EmployeePageHeader from '@/Components/EmployeePageHeader'
import Card, { CardContent, CardFooter } from '@/Components/UI/Card'
import Button from '@/Components/UI/Button'

function initials(first, last) {
    return `${(first || '?')[0] ?? ''}${(last || '')[0] ?? ''}`.toUpperCase()
}

const formatCurrency = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
})

const TABS = [
    {
        key: 'info',
        label: 'Personal Details',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
    {
        key: 'gov',
        label: 'Government Identifiers',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
    {
        key: 'password',
        label: 'Security & Password',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
        ),
    },
]

export default function Profile({ employee, govIds }) {
    const { flash } = usePage().props
    const [activeTab, setActiveTab] = useState('info')

    const infoForm = useForm({
        first_name: employee.first_name ?? '',
        last_name:  employee.last_name  ?? '',
        phone:      employee.phone      ?? '',
        address:    employee.address    ?? '',
    })

    const govForm = useForm({
        sss_no:        govIds?.sss_no        ?? '',
        philhealth_no: govIds?.philhealth_no ?? '',
        tin_no:        govIds?.tin_no        ?? '',
        pagibig_no:    govIds?.pagibig_no    ?? '',
    })

    const passForm = useForm({
        current_password:      '',
        password:              '',
        password_confirmation: '',
    })

    function submitInfo(e) {
        e.preventDefault()
        infoForm.patch('/employee/profile/info')
    }

    function submitGov(e) {
        e.preventDefault()
        govForm.patch('/employee/profile/gov-ids')
    }

    function submitPass(e) {
        e.preventDefault()
        passForm.patch('/employee/profile/password', {
            onSuccess: () => passForm.reset(),
        })
    }

    return (
        <EmployeeLayout title="My Profile">
            <div className="employee-page-shell max-w-5xl space-y-4">

                {flash?.success && (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}

                <EmployeePageHeader
                    eyebrow={`Employee ID ${employee.employee_id}`}
                    title={`${employee.first_name} ${employee.last_name}`}
                    description={`${employee.department || 'Department not assigned'} · ${employee.position || 'Position not assigned'}`}
                    badge="Active staff"
                    leading={(
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/25 bg-white/15 font-heading text-2xl font-bold text-white shadow-sm">
                            {initials(employee.first_name, employee.last_name)}
                        </div>
                    )}
                    action={(
                        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-left sm:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Daily rate</p>
                            <p className="mt-0.5 font-mono text-base font-bold text-white">{formatCurrency.format(Number(employee.daily_rate || 0))} / day</p>
                        </div>
                    )}
                />

                {/* Tab Navigation */}
                <div className="employee-toolbar flex gap-2 overflow-x-auto p-1.5 rounded-2xl border border-border" role="tablist" aria-label="Profile navigation">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            id={`profile-tab-${tab.key}`}
                            aria-controls={`profile-panel-${tab.key}`}
                            aria-selected={activeTab === tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`min-w-[10rem] flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                                activeTab === tab.key
                                    ? 'bg-panel text-emerald-700 dark:text-emerald-300 shadow-xs border border-border font-bold'
                                    : 'text-sub hover:text-text hover:bg-panel/40'
                            }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Personal Info Tab */}
                {activeTab === 'info' && (
                    <div id="profile-panel-info" role="tabpanel" aria-labelledby="profile-tab-info">
                        <Card
                            className="employee-workspace-card"
                            title="Personal Information"
                            description="Update your contact number, physical address, and basic directory details"
                        >
                            <form onSubmit={submitInfo}>
                                <CardContent className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="profile-first-name" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                            First Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            id="profile-first-name"
                                            type="text"
                                            value={infoForm.data.first_name}
                                            onChange={e => infoForm.setData('first_name', e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                            required
                                        />
                                        {infoForm.errors.first_name && <p className="mt-1.5 text-xs text-rose-500">{infoForm.errors.first_name}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="profile-last-name" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                            Last Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            id="profile-last-name"
                                            type="text"
                                            value={infoForm.data.last_name}
                                            onChange={e => infoForm.setData('last_name', e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                            required
                                        />
                                        {infoForm.errors.last_name && <p className="mt-1.5 text-xs text-rose-500">{infoForm.errors.last_name}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="profile-email" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                        Official Email Address
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="profile-email"
                                            type="email"
                                            value={employee.email}
                                            disabled
                                            className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field/60 text-dim cursor-not-allowed pr-10"
                                        />
                                        <svg className="w-4 h-4 text-dim absolute right-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <p className="text-[11px] text-dim mt-1">Official email is managed by your system administrator.</p>
                                </div>

                                <div>
                                    <label htmlFor="profile-phone" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                        Mobile Phone Number
                                    </label>
                                    <input
                                        id="profile-phone"
                                        type="text"
                                        value={infoForm.data.phone}
                                        onChange={e => infoForm.setData('phone', e.target.value)}
                                        placeholder="09xx-xxx-xxxx"
                                        className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="profile-address" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                        Residential Address
                                    </label>
                                    <textarea
                                        id="profile-address"
                                        value={infoForm.data.address}
                                        onChange={e => infoForm.setData('address', e.target.value)}
                                        rows={3}
                                        placeholder="Street, Barangay, City/Municipality..."
                                        className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                                    />
                                </div>

                                </CardContent>
                                <CardFooter className="justify-end">
                                    <Button variant="emerald" size="md" type="submit" loading={infoForm.processing}>
                                        Save Profile Changes
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                )}

                {/* Government IDs Tab */}
                {activeTab === 'gov' && (
                    <div id="profile-panel-gov" role="tabpanel" aria-labelledby="profile-tab-gov">
                        <Card
                            className="employee-workspace-card"
                            title="Government Statutory Numbers"
                            description="Mandatory Philippine statutory registration identifiers used for monthly Remittance returns"
                        >
                            <form onSubmit={submitGov}>
                                <CardContent className="space-y-5">
                                <div className="p-3.5 rounded-xl bg-field border border-border flex items-center gap-3 text-xs text-sub">
                                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>These statutory records are encrypted and utilized solely for SSS, PhilHealth, Pag-IBIG, and BIR compliance.</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="profile-sss" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                            SSS Identification Number
                                        </label>
                                        <input
                                            id="profile-sss"
                                            type="text"
                                            value={govForm.data.sss_no}
                                            onChange={e => govForm.setData('sss_no', e.target.value)}
                                            placeholder="xx-xxxxxxx-x"
                                            className="w-full px-3.5 py-2.5 text-sm font-medium font-mono border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        />
                                        {govForm.errors.sss_no && <p className="mt-1 text-xs text-rose-500">{govForm.errors.sss_no}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="profile-philhealth" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                            PhilHealth Pin
                                        </label>
                                        <input
                                            id="profile-philhealth"
                                            type="text"
                                            value={govForm.data.philhealth_no}
                                            onChange={e => govForm.setData('philhealth_no', e.target.value)}
                                            placeholder="xx-xxxxxxxxx-x"
                                            className="w-full px-3.5 py-2.5 text-sm font-medium font-mono border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        />
                                        {govForm.errors.philhealth_no && <p className="mt-1 text-xs text-rose-500">{govForm.errors.philhealth_no}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="profile-tin" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                            Tax Identification Number (TIN)
                                        </label>
                                        <input
                                            id="profile-tin"
                                            type="text"
                                            value={govForm.data.tin_no}
                                            onChange={e => govForm.setData('tin_no', e.target.value)}
                                            placeholder="xxx-xxx-xxx"
                                            className="w-full px-3.5 py-2.5 text-sm font-medium font-mono border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        />
                                        {govForm.errors.tin_no && <p className="mt-1 text-xs text-rose-500">{govForm.errors.tin_no}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="profile-pagibig" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                            Pag-IBIG / HDMF MID
                                        </label>
                                        <input
                                            id="profile-pagibig"
                                            type="text"
                                            value={govForm.data.pagibig_no}
                                            onChange={e => govForm.setData('pagibig_no', e.target.value)}
                                            placeholder="xxxx-xxxx-xxxx"
                                            className="w-full px-3.5 py-2.5 text-sm font-medium font-mono border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        />
                                        {govForm.errors.pagibig_no && <p className="mt-1 text-xs text-rose-500">{govForm.errors.pagibig_no}</p>}
                                    </div>
                                </div>

                                </CardContent>
                                <CardFooter className="justify-end">
                                    <Button variant="emerald" size="md" type="submit" loading={govForm.processing}>
                                        Save Statutory Identifiers
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                )}

                {/* Password Tab */}
                {activeTab === 'password' && (
                    <div id="profile-panel-password" role="tabpanel" aria-labelledby="profile-tab-password">
                        <Card
                            className="employee-workspace-card"
                            title="Account Security Credentials"
                            description="Ensure your portal credentials remain confidential with regular updates"
                        >
                            <form onSubmit={submitPass}>
                                <CardContent className="max-w-lg space-y-5">
                                <div>
                                    <label htmlFor="profile-current-password" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                        Current Password <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        id="profile-current-password"
                                        type="password"
                                        value={passForm.data.current_password}
                                        onChange={e => passForm.setData('current_password', e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                                        required
                                    />
                                    {passForm.errors.current_password && <p className="mt-1.5 text-xs text-rose-500">{passForm.errors.current_password}</p>}
                                </div>

                                <div>
                                    <label htmlFor="profile-password" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                        New Password <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        id="profile-password"
                                        type="password"
                                        value={passForm.data.password}
                                        onChange={e => passForm.setData('password', e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                                        required
                                    />
                                    {passForm.errors.password && <p className="mt-1.5 text-xs text-rose-500">{passForm.errors.password}</p>}
                                </div>

                                <div>
                                    <label htmlFor="profile-password-confirmation" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                        Confirm New Password <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        id="profile-password-confirmation"
                                        type="password"
                                        value={passForm.data.password_confirmation}
                                        onChange={e => passForm.setData('password_confirmation', e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                                        required
                                    />
                                    {passForm.errors.password_confirmation && <p className="mt-1.5 text-xs text-rose-500">{passForm.errors.password_confirmation}</p>}
                                </div>

                                </CardContent>
                                <CardFooter className="justify-end">
                                    <Button variant="emerald" size="md" type="submit" loading={passForm.processing}>
                                        Update Portal Password
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                )}

            </div>
        </EmployeeLayout>
    )
}
