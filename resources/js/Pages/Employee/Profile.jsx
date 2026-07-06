import { useState } from 'react'
import { useForm, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'

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

    const tabs = [
        { key: 'info',     label: 'Personal info'   },
        { key: 'gov',      label: 'Government IDs'  },
        { key: 'password', label: 'Change password' },
    ]

    return (
        <EmployeeLayout>
            <div className="p-6 max-w-2xl mx-auto">

                {/* Flash */}
                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-lg font-medium text-gray-900">My profile</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {employee.employee_id} · {employee.department} · {employee.position}
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
                    {tabs.map(tab => (
                        <button key={tab.key}
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

                {/* Personal info */}
                {activeTab === 'info' && (
                    <form onSubmit={submitInfo} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">First name</label>
                                <input type="text"
                                    value={infoForm.data.first_name}
                                    onChange={e => infoForm.setData('first_name', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                    required />
                                {infoForm.errors.first_name && <p className="mt-1 text-xs text-red-500">{infoForm.errors.first_name}</p>}
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Last name</label>
                                <input type="text"
                                    value={infoForm.data.last_name}
                                    onChange={e => infoForm.setData('last_name', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                    required />
                                {infoForm.errors.last_name && <p className="mt-1 text-xs text-red-500">{infoForm.errors.last_name}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Email</label>
                            <input type="email"
                                value={employee.email}
                                disabled
                                className="w-full px-3 py-2 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
                            <p className="mt-1 text-xs text-gray-400">Email cannot be changed. Contact your administrator.</p>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Phone number</label>
                            <input type="text"
                                value={infoForm.data.phone}
                                onChange={e => infoForm.setData('phone', e.target.value)}
                                placeholder="e.g. 09xx-xxx-xxxx"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Address</label>
                            <textarea
                                value={infoForm.data.address}
                                onChange={e => infoForm.setData('address', e.target.value)}
                                rows={3}
                                placeholder="Your home address"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 resize-none" />
                        </div>

                        <div className="pt-2">
                            <button type="submit"
                                disabled={infoForm.processing}
                                className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                                style={{ background: '#0F6E56' }}>
                                {infoForm.processing ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Government IDs */}
                {activeTab === 'gov' && (
                    <form onSubmit={submitGov} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        <p className="text-xs text-gray-400 mb-2">
                            These are kept confidential and used for payroll processing only.
                        </p>

                        {[
                            { key: 'sss_no',        label: 'SSS number',        placeholder: 'xx-xxxxxxx-x'   },
                            { key: 'philhealth_no', label: 'PhilHealth number',  placeholder: 'xx-xxxxxxxxx-x' },
                            { key: 'tin_no',        label: 'TIN number',         placeholder: 'xxx-xxx-xxx'    },
                            { key: 'pagibig_no',    label: 'Pag-IBIG number',    placeholder: 'xxxx-xxxx-xxxx' },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                                <input type="text"
                                    value={govForm.data[key]}
                                    onChange={e => govForm.setData(key, e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                                {govForm.errors[key] && <p className="mt-1 text-xs text-red-500">{govForm.errors[key]}</p>}
                            </div>
                        ))}

                        <div className="pt-2">
                            <button type="submit"
                                disabled={govForm.processing}
                                className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                                style={{ background: '#0F6E56' }}>
                                {govForm.processing ? 'Saving…' : 'Save IDs'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Change password */}
                {activeTab === 'password' && (
                    <form onSubmit={submitPass} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Current password</label>
                            <input type="password"
                                value={passForm.data.current_password}
                                onChange={e => passForm.setData('current_password', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                required />
                            {passForm.errors.current_password && <p className="mt-1 text-xs text-red-500">{passForm.errors.current_password}</p>}
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">New password</label>
                            <input type="password"
                                value={passForm.data.password}
                                onChange={e => passForm.setData('password', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                required />
                            {passForm.errors.password && <p className="mt-1 text-xs text-red-500">{passForm.errors.password}</p>}
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Confirm new password</label>
                            <input type="password"
                                value={passForm.data.password_confirmation}
                                onChange={e => passForm.setData('password_confirmation', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                required />
                        </div>

                        <div className="pt-2">
                            <button type="submit"
                                disabled={passForm.processing}
                                className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                                style={{ background: '#0F6E56' }}>
                                {passForm.processing ? 'Updating…' : 'Update password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </EmployeeLayout>
    )
}