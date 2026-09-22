import { useForm, usePage } from '@inertiajs/react'
import { useState } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'
import AdminPageHeader from '@/Components/AdminPageHeader'

const TABS = [
    {
        key: 'coop',
        label: 'Cooperative Profile',
        desc: 'Official organization identity and letterhead details',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
    },
    {
        key: 'shift',
        label: 'Shift & Attendance',
        desc: 'Work hours, lunch breaks, and grace period thresholds',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        key: 'payroll',
        label: 'Payroll Parameters',
        desc: 'Working days per month and overtime computation baselines',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        key: 'signatories',
        label: 'DTR Signatories',
        desc: 'Authorized administrative signatories for printed timesheets',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
        ),
    },
]

export default function Settings({ settings }) {
    const { flash } = usePage().props
    const [activeTab, setActiveTab] = useState('coop')

    const { data, setData, post, processing, errors } = useForm({ ...settings })

    function submit(e) {
        e.preventDefault()
        post('/admin/settings')
    }

    return (
        <AdminLayout>
            <div className="admin-page-shell max-w-5xl space-y-4 sm:space-y-5 page-enter">

                {flash?.success && (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}

                <AdminPageHeader
                    eyebrow="System administration"
                    title="System Settings"
                    description="Configure cooperative identity, work schedules, payroll parameters, and official DTR signatories."
                    badge="Admin configuration"
                />

                {/* Tabs */}
                <div
                    role="group"
                    aria-label="Settings categories"
                    className="admin-toolbar grid grid-cols-2 gap-1.5 p-1.5 sm:grid-cols-4"
                >
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            aria-pressed={activeTab === tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                                activeTab === tab.key
                                    ? 'bg-panel text-indigo-600 dark:text-indigo-400 shadow-xs border border-border'
                                    : 'text-sub hover:text-text hover:bg-panel/40'
                            }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <form onSubmit={submit}>

                    {/* Cooperative info */}
                    {activeTab === 'coop' && (
                        <SettingsCard
                            title="Cooperative Organization Profile"
                            description="Official legal name, address, and contact details used on formal certificates and DTR headers"
                        >
                            <div className="space-y-5">
                                <div>
                                    <label htmlFor="settings-coop-name" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                        Cooperative Legal Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        id="settings-coop-name"
                                        type="text"
                                        value={data.coop_name}
                                        onChange={e => setData('coop_name', e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        required
                                    />
                                    {errors.coop_name && <p className="mt-1.5 text-xs text-rose-500">{errors.coop_name}</p>}
                                </div>

                                <div>
                                    <label htmlFor="settings-coop-address" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                        Physical Address
                                    </label>
                                    <textarea
                                        id="settings-coop-address"
                                        value={data.coop_address ?? ''}
                                        onChange={e => setData('coop_address', e.target.value)}
                                        rows={2}
                                        className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="settings-coop-email" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                            Official Email Address
                                        </label>
                                        <input
                                            id="settings-coop-email"
                                            type="email"
                                            value={data.coop_email ?? ''}
                                            onChange={e => setData('coop_email', e.target.value)}
                                            placeholder="coop@example.com"
                                            className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        />
                                        {errors.coop_email && <p className="mt-1.5 text-xs text-rose-500">{errors.coop_email}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="settings-coop-phone" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                            Contact Phone / Hotline
                                        </label>
                                        <input
                                            id="settings-coop-phone"
                                            type="text"
                                            value={data.coop_phone ?? ''}
                                            onChange={e => setData('coop_phone', e.target.value)}
                                            placeholder="09xx-xxx-xxxx"
                                            className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border flex justify-end">
                                    <Button variant="primary" size="md" type="submit" loading={processing} className="w-full sm:w-auto">
                                        Save Organization Profile
                                    </Button>
                                </div>
                            </div>
                        </SettingsCard>
                    )}

                    {/* Shift & attendance */}
                    {activeTab === 'shift' && (
                        <SettingsCard
                            title="Shift Hours & Punctuality Policy"
                            description="Standard operational work hours, designated lunch break interval, and tardiness grace periods"
                        >
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
                                        Standard Working Shift
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="settings-shift-start" className="block text-xs text-sub mb-1.5 font-medium">
                                                Shift Start (AM In) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                id="settings-shift-start"
                                                type="time"
                                                value={data.shift_start}
                                                onChange={e => setData('shift_start', e.target.value)}
                                                className="w-full px-3.5 py-2 text-sm font-semibold border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                                                required
                                            />
                                            {errors.shift_start && <p className="mt-1 text-xs text-rose-500">{errors.shift_start}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="settings-shift-end" className="block text-xs text-sub mb-1.5 font-medium">
                                                Shift End (PM Out) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                id="settings-shift-end"
                                                type="time"
                                                value={data.shift_end}
                                                onChange={e => setData('shift_end', e.target.value)}
                                                className="w-full px-3.5 py-2 text-sm font-semibold border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
                                        Lunch Break Window
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="settings-lunch-start" className="block text-xs text-sub mb-1.5 font-medium">
                                                Lunch Start (AM Out) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                id="settings-lunch-start"
                                                type="time"
                                                value={data.lunch_start}
                                                onChange={e => setData('lunch_start', e.target.value)}
                                                className="w-full px-3.5 py-2 text-sm font-semibold border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="settings-lunch-end" className="block text-xs text-sub mb-1.5 font-medium">
                                                Lunch End (PM In) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                id="settings-lunch-end"
                                                type="time"
                                                value={data.lunch_end}
                                                onChange={e => setData('lunch_end', e.target.value)}
                                                className="w-full px-3.5 py-2 text-sm font-semibold border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
                                        Punctuality & Grace Buffer
                                    </p>
                                    <div>
                                        <label htmlFor="settings-late-grace-minutes" className="block text-xs text-sub mb-1.5 font-medium">
                                            Grace Period Allowance (Minutes) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            id="settings-late-grace-minutes"
                                            type="number"
                                            value={data.late_grace_minutes}
                                            onChange={e => setData('late_grace_minutes', e.target.value)}
                                            min="0"
                                            max="60"
                                            className="w-48 px-3.5 py-2 text-sm font-semibold border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                                        />
                                        <p className="mt-1.5 text-xs text-dim">
                                            Personnel punching in within this grace threshold after shift start will not incur a tardiness deduction.
                                        </p>
                                        {errors.late_grace_minutes && <p className="mt-1 text-xs text-rose-500">{errors.late_grace_minutes}</p>}
                                    </div>
                                </div>

                                {/* Preview Card */}
                                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="indigo" size="sm">Active Schedule Preview</Badge>
                                    </div>
                                    <p className="text-sm font-mono font-medium text-text">
                                        {data.shift_start} – {data.lunch_start} (AM) <span className="text-dim">| Lunch |</span> {data.lunch_end} – {data.shift_end} (PM)
                                    </p>
                                    <p className="text-xs text-sub">
                                        Late mark triggered if clocking in after:{' '}
                                        <strong className="text-rose-500 font-mono">
                                            {(() => {
                                                try {
                                                    const [h, m] = data.shift_start.split(':').map(Number)
                                                    const grace = parseInt(data.late_grace_minutes) || 0
                                                    const total = h * 60 + m + grace
                                                    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
                                                } catch { return data.shift_start }
                                            })()}
                                        </strong>
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-border flex justify-end">
                                    <Button variant="primary" size="md" type="submit" loading={processing} className="w-full sm:w-auto">
                                        Save Shift Schedule
                                    </Button>
                                </div>
                            </div>
                        </SettingsCard>
                    )}

                    {/* Payroll */}
                    {activeTab === 'payroll' && (
                        <SettingsCard
                            title="Payroll & Working Days Formula"
                            description="Baseline working day constants used to derive daily rates, cutoffs, and statutory overtime coefficients"
                        >
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="settings-working-days-month" className="block text-xs font-semibold text-sub uppercase tracking-wider mb-2">
                                        Working Days Per Month (Constant) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        id="settings-working-days-month"
                                        type="number"
                                        value={data.working_days_month}
                                        onChange={e => setData('working_days_month', e.target.value)}
                                        min="1"
                                        max="31"
                                        className="w-48 px-3.5 py-2 text-sm font-semibold border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                                        required
                                    />
                                    {errors.working_days_month && <p className="mt-1.5 text-xs text-rose-500">{errors.working_days_month}</p>}
                                    <p className="mt-1.5 text-xs text-dim">
                                        Formula: Monthly Basic Pay = Daily Rate × {data.working_days_month} Days. Standard labor factor is 22 days.
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl border border-border bg-field/60 space-y-2.5">
                                    <p className="text-xs font-semibold text-sub uppercase tracking-wider">Payroll Multipliers Summary</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div className="p-2.5 rounded-lg bg-panel border border-border">
                                            <span className="text-dim block">Cutoff Base Pay:</span>
                                            <strong className="text-text font-mono">Monthly Gross ÷ 2</strong>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-panel border border-border">
                                            <span className="text-dim block">Weekday Overtime:</span>
                                            <strong className="text-text font-mono">Hourly Rate × 125%</strong>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-panel border border-border">
                                            <span className="text-dim block">Weekend / Rest Day OT:</span>
                                            <strong className="text-text font-mono">Hourly Rate × 130%</strong>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-panel border border-border">
                                            <span className="text-dim block">Hourly Base:</span>
                                            <strong className="text-text font-mono">Daily Rate ÷ 8 Hours</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border flex justify-end">
                                    <Button variant="primary" size="md" type="submit" loading={processing} className="w-full sm:w-auto">
                                        Save Payroll Parameters
                                    </Button>
                                </div>
                            </div>
                        </SettingsCard>
                    )}

                    {/* Signatories */}
                    {activeTab === 'signatories' && (
                        <SettingsCard
                            title="Official Document Signatories"
                            description="Designated organizational authorities printed at the bottom of Daily Time Records and certification docs"
                        >
                            <div className="space-y-6">
                                <div className="p-3.5 rounded-xl bg-field/70 border border-border flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-dim uppercase tracking-wider">Signatory 1 (Automated)</p>
                                        <p className="text-sm font-semibold text-text mt-0.5">Employee Name & Signature</p>
                                    </div>
                                    <Badge variant="slate" size="sm">System Dynamic</Badge>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
                                        Signatory 2 (Department Head / Supervisor)
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="settings-signatory-1-name" className="block text-xs text-sub mb-1.5 font-medium">
                                                Full Name <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                id="settings-signatory-1-name"
                                                type="text"
                                                value={data.signatory_1_name}
                                                onChange={e => setData('signatory_1_name', e.target.value)}
                                                className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                required
                                            />
                                            {errors.signatory_1_name && <p className="mt-1 text-xs text-rose-500">{errors.signatory_1_name}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="settings-signatory-1-role" className="block text-xs text-sub mb-1.5 font-medium">
                                                Designation / Position Title <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                id="settings-signatory-1-role"
                                                type="text"
                                                value={data.signatory_1_role}
                                                onChange={e => setData('signatory_1_role', e.target.value)}
                                                className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
                                        Signatory 3 (General Manager / HR Executive)
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="settings-signatory-2-name" className="block text-xs text-sub mb-1.5 font-medium">
                                                Full Name <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                id="settings-signatory-2-name"
                                                type="text"
                                                value={data.signatory_2_name}
                                                onChange={e => setData('signatory_2_name', e.target.value)}
                                                className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="settings-signatory-2-role" className="block text-xs text-sub mb-1.5 font-medium">
                                                Designation / Position Title <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                id="settings-signatory-2-role"
                                                type="text"
                                                value={data.signatory_2_role}
                                                onChange={e => setData('signatory_2_role', e.target.value)}
                                                className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Signature Block Preview */}
                                <div className="p-5 rounded-xl border border-border bg-field/60">
                                    <p className="text-xs font-semibold text-sub uppercase tracking-wider mb-6 text-center">
                                        Printed Timesheet Signature Layout
                                    </p>
                                    <div className="grid grid-cols-1 gap-5 text-center sm:grid-cols-3 sm:gap-6">
                                        <div className="px-2">
                                            <div className="border-t border-text/40 pt-2 mb-1" />
                                            <p className="text-xs font-semibold text-text">Employee Signature</p>
                                            <p className="text-[11px] text-dim">Employee</p>
                                        </div>
                                        <div className="px-2">
                                            <div className="border-t border-text/40 pt-2 mb-1" />
                                            <p className="text-xs font-semibold text-text">{data.signatory_1_name || 'Signatory 1'}</p>
                                            <p className="text-[11px] text-dim">{data.signatory_1_role || 'Title'}</p>
                                        </div>
                                        <div className="px-2">
                                            <div className="border-t border-text/40 pt-2 mb-1" />
                                            <p className="text-xs font-semibold text-text">{data.signatory_2_name || 'Signatory 2'}</p>
                                            <p className="text-[11px] text-dim">{data.signatory_2_role || 'Title'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border flex justify-end">
                                    <Button variant="primary" size="md" type="submit" loading={processing} className="w-full sm:w-auto">
                                        Save Signatories
                                    </Button>
                                </div>
                            </div>
                        </SettingsCard>
                    )}

                </form>
            </div>
        </AdminLayout>
    )
}

function SettingsCard({ title, description, children }) {
    return (
        <Card className="overflow-hidden">
            <CardHeader>
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">{children}</CardContent>
        </Card>
    )
}
