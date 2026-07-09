import { useForm } from '@inertiajs/react'

export default function EmployeeFormModal({ employee, onClose }) {
    const isEdit = !!employee

    const { data, setData, post, patch, processing, errors } = useForm({
        first_name:            employee?.first_name  ?? '',
        last_name:             employee?.last_name   ?? '',
        email:                 employee?.email       ?? '',
        password:              '',
        password_confirmation: '',
        department:            employee?.department  ?? '',
        position:              employee?.position    ?? '',
        phone:                 employee?.phone       ?? '',
        address:               employee?.address     ?? '',
        date_hired:            employee?.date_hired  ?? '',
        status:                employee?.status      ?? 'active',
    })

    function submit(e) {
        e.preventDefault()
        if (isEdit) {
            patch(`/admin/employees/${employee.id}`, {
                onSuccess: () => onClose(),
            })
        } else {
            post('/admin/employees', {
                onSuccess: () => onClose(),
            })
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">

                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-medium text-gray-900">
                        {isEdit ? 'Edit employee' : 'New employee'}
                    </h2>
                    <button onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">First name *</label>
                            <input type="text" value={data.first_name}
                                onChange={e => setData('first_name', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                required />
                            {errors.first_name && <p className="mt-1 text-xs text-red-500">{errors.first_name}</p>}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Last name *</label>
                            <input type="text" value={data.last_name}
                                onChange={e => setData('last_name', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                required />
                            {errors.last_name && <p className="mt-1 text-xs text-red-500">{errors.last_name}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Email *</label>
                        <input type="email" value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                            required />
                        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                    </div>

                    {!isEdit && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Password *</label>
                                <input type="password" value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                    required />
                                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Confirm password *</label>
                                <input type="password" value={data.password_confirmation}
                                    onChange={e => setData('password_confirmation', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                    required />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Department</label>
                            <input type="text" value={data.department}
                                onChange={e => setData('department', e.target.value)}
                                placeholder="e.g. Operations"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Position</label>
                            <input type="text" value={data.position}
                                onChange={e => setData('position', e.target.value)}
                                placeholder="e.g. Staff"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Phone</label>
                            <input type="text" value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                placeholder="09xx-xxx-xxxx"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Date hired</label>
                            <input type="date" value={data.date_hired}
                                onChange={e => setData('date_hired', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Address</label>
                        <textarea value={data.address}
                            onChange={e => setData('address', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 resize-none" />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Status</label>
                        <select value={data.status}
                            onChange={e => setData('status', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 bg-white">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={processing}
                            className="flex-1 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                            style={{ background: '#26215C' }}>
                            {processing ? 'Saving…' : isEdit ? 'Save changes' : 'Create employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}