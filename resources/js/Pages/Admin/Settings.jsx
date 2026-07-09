import { useForm, usePage } from '@inertiajs/react'
import { useState } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'

const TABS = [
    { key: 'coop',       label: 'Cooperative info' },
    { key: 'shift',      label: 'Shift & attendance' },
    { key: 'payroll',    label: 'Payroll' },
    { key: 'signatories',label: 'Signatories' },
]

export default function Settings({ settings }) {
    const { flash }               = usePage().props
    const [activeTab, setActiveTab] = useState('coop')

    const { data, setData, post, processing, errors } = useForm({ ...settings })

    function submit(e) {
        e.preventDefault()
        post('/admin/settings')
    }

    return (
        <AdminLayout>
            <div className="p-6 max-w-2xl mx-auto">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        {flash.success}
                    </div>
                )}

                <div className="mb-6">
                    <h1 className="text-lg font-medium text-gray-900">System settings</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Configure cooperative info, shift times, and payroll defaults
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
                    {TABS.map(tab => (
                        <button key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 text-xs py-2 rounded-md transition-all ${
                                activeTab === tab.key
                                    ? 'bg-white text-gray-800 font-medium shadow-sm border border-gray-200'
                                    : 'text-gray-500'
                            }`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={submit}>

                    {/* Cooperative info */}
                    {activeTab === 'coop' && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                            <p className="text-xs text-gray-400">
                                This information appears on DTR prints and official documents.
                            </p>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Cooperative name <span className="text-red-400">*</span>
                                </label>
                                <input type="text"
                                    value={data.coop_name}
                                    onChange={e => setData('coop_name', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                    required />
                                {errors.coop_name && <p className="mt-1 text-xs text-red-500">{errors.coop_name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Address</label>
                                <textarea
                                    value={data.coop_address ?? ''}
                                    onChange={e => setData('coop_address', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 resize-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                                    <input type="email"
                                        value={data.coop_email ?? ''}
                                        onChange={e => setData('coop_email', e.target.value)}
                                        placeholder="coop@example.com"
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                                    {errors.coop_email && <p className="mt-1 text-xs text-red-500">{errors.coop_email}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Phone</label>
                                    <input type="text"
                                        value={data.coop_phone ?? ''}
                                        onChange={e => setData('coop_phone', e.target.value)}
                                        placeholder="09xx-xxx-xxxx"
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                                </div>
                            </div>

                            <SaveButton processing={processing} />
                        </div>
                    )}

                    {/* Shift & attendance */}
                    {activeTab === 'shift' && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">

                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-3 uppercase tracking-wide">
                                    Work shift
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Shift start <span className="text-red-400">*</span>
                                        </label>
                                        <input type="time"
                                            value={data.shift_start}
                                            onChange={e => setData('shift_start', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                            required />
                                        {errors.shift_start && <p className="mt-1 text-xs text-red-500">{errors.shift_start}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Shift end <span className="text-red-400">*</span>
                                        </label>
                                        <input type="time"
                                            value={data.shift_end}
                                            onChange={e => setData('shift_end', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                            required />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-3 uppercase tracking-wide">
                                    Lunch break
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Lunch start <span className="text-red-400">*</span>
                                        </label>
                                        <input type="time"
                                            value={data.lunch_start}
                                            onChange={e => setData('lunch_start', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                            required />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Lunch end <span className="text-red-400">*</span>
                                        </label>
                                        <input type="time"
                                            value={data.lunch_end}
                                            onChange={e => setData('lunch_end', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                            required />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-3 uppercase tracking-wide">
                                    Late policy
                                </p>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        Grace period (minutes) <span className="text-red-400">*</span>
                                    </label>
                                    <input type="number"
                                        value={data.late_grace_minutes}
                                        onChange={e => setData('late_grace_minutes', e.target.value)}
                                        min="0" max="60"
                                        className="w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                                    <p className="mt-1 text-xs text-gray-400">
                                        Employees clocking in within this many minutes after shift start are not marked late.
                                    </p>
                                    {errors.late_grace_minutes && <p className="mt-1 text-xs text-red-500">{errors.late_grace_minutes}</p>}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <p className="text-xs text-gray-400 mb-1">Current shift preview</p>
                                <p className="text-sm text-gray-700">
                                    <strong>{data.shift_start}</strong> – <strong>{data.lunch_start}</strong>
                                    <span className="text-gray-400 mx-2">lunch</span>
                                    <strong>{data.lunch_end}</strong> – <strong>{data.shift_end}</strong>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Late if clocking in after <strong>{
                                        (() => {
                                            try {
                                                const [h, m] = data.shift_start.split(':').map(Number)
                                                const grace = parseInt(data.late_grace_minutes) || 0
                                                const total = h * 60 + m + grace
                                                return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`
                                            } catch { return data.shift_start }
                                        })()
                                    }</strong>
                                </p>
                            </div>

                            <SaveButton processing={processing} />
                        </div>
                    )}

                    {/* Payroll */}
                    {activeTab === 'payroll' && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                            <p className="text-xs text-gray-400">
                                These values are used in payroll computations for all employees.
                            </p>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Working days per month <span className="text-red-400">*</span>
                                </label>
                                <input type="number"
                                    value={data.working_days_month}
                                    onChange={e => setData('working_days_month', e.target.value)}
                                    min="1" max="31"
                                    className="w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                    required />
                                {errors.working_days_month && <p className="mt-1 text-xs text-red-500">{errors.working_days_month}</p>}
                                <p className="mt-1 text-xs text-gray-400">
                                    Monthly basic pay = daily rate × this number. Standard is 22 days.
                                </p>
                            </div>

                            {/* Formula preview */}
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 space-y-1">
                                <p className="text-xs text-gray-400 mb-2">Payroll formula preview</p>
                                <p className="text-xs text-gray-600">Monthly basic = <strong>daily rate × {data.working_days_month} days</strong></p>
                                <p className="text-xs text-gray-600">Per cutoff gross = <strong>monthly gross ÷ 2</strong></p>
                                <p className="text-xs text-gray-600">Weekday OT = <strong>daily rate ÷ 8 × 125% × hours</strong></p>
                                <p className="text-xs text-gray-600">Weekend OT = <strong>daily rate ÷ 8 × 130% × hours</strong></p>
                            </div>

                            <SaveButton processing={processing} />
                        </div>
                    )}

                    {/* Signatories */}
                    {activeTab === 'signatories' && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
                            <p className="text-xs text-gray-400">
                                These names and roles appear as signature blocks on printed DTR documents.
                            </p>

                            {/* Employee signature (auto) */}
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <p className="text-xs text-gray-400 mb-1">Signatory 1 (auto)</p>
                                <p className="text-sm font-medium text-gray-700">Employee name</p>
                                <p className="text-xs text-gray-400">Automatically filled from the employee's profile</p>
                            </div>

                            {/* Signatory 2 */}
                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-3 uppercase tracking-wide">
                                    Signatory 2
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Name <span className="text-red-400">*</span>
                                        </label>
                                        <input type="text"
                                            value={data.signatory_1_name}
                                            onChange={e => setData('signatory_1_name', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                            required />
                                        {errors.signatory_1_name && <p className="mt-1 text-xs text-red-500">{errors.signatory_1_name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Role / title <span className="text-red-400">*</span>
                                        </label>
                                        <input type="text"
                                            value={data.signatory_1_role}
                                            onChange={e => setData('signatory_1_role', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                            required />
                                    </div>
                                </div>
                            </div>

                            {/* Signatory 3 */}
                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-3 uppercase tracking-wide">
                                    Signatory 3
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Name <span className="text-red-400">*</span>
                                        </label>
                                        <input type="text"
                                            value={data.signatory_2_name}
                                            onChange={e => setData('signatory_2_name', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                            required />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Role / title <span className="text-red-400">*</span>
                                        </label>
                                        <input type="text"
                                            value={data.signatory_2_role}
                                            onChange={e => setData('signatory_2_role', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                            required />
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                <p className="text-xs text-gray-400 mb-3">Signature block preview</p>
                                <div className="flex justify-between text-center">
                                    {[
                                        { name: 'Employee name',      role: 'Employee'             },
                                        { name: data.signatory_1_name, role: data.signatory_1_role },
                                        { name: data.signatory_2_name, role: data.signatory_2_role },
                                    ].map((sig, i) => (
                                        <div key={i} className="text-center w-1/3 px-2">
                                            <div className="border-t border-gray-400 mb-1 mt-6"></div>
                                            <p className="text-xs font-medium text-gray-700">{sig.name}</p>
                                            <p className="text-xs text-gray-400">{sig.role}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <SaveButton processing={processing} />
                        </div>
                    )}
                </form>
            </div>
        </AdminLayout>
    )
}

function SaveButton({ processing }) {
    return (
        <div className="pt-2">
            <button type="submit" disabled={processing}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                style={{ background: '#26215C' }}>
                {processing ? 'Saving…' : 'Save settings'}
            </button>
        </div>
    )
}