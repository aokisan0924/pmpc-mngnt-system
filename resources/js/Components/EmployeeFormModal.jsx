import { useEffect } from 'react'
import { useForm } from '@inertiajs/react'
import Button from '@/Components/UI/Button'

function Field({ id, label, required, error, children }) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-sub mb-1.5">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-rose-500 font-medium">{error}</p>}
        </div>
    )
}

const inputClass = "w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-field text-text placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"

export default function EmployeeFormModal({ employee, onClose }) {
    const isEdit = !!employee

    // Close on Escape key for keyboard accessibility
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

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
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-form-modal-title"
        >
            <div className="rounded-2xl shadow-xl border border-border bg-panel w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <h2 id="employee-form-modal-title" className="text-base font-bold font-heading text-text">
                        {isEdit ? 'Edit Employee Record' : 'Register New Employee'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sub hover:text-text hover:bg-field transition-colors"
                        aria-label="Close employee form"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field id="emp-first-name" label="First name" required error={errors.first_name}>
                            <input
                                id="emp-first-name"
                                type="text"
                                value={data.first_name}
                                onChange={e => setData('first_name', e.target.value)}
                                className={inputClass}
                                required
                            />
                        </Field>
                        <Field id="emp-last-name" label="Last name" required error={errors.last_name}>
                            <input
                                id="emp-last-name"
                                type="text"
                                value={data.last_name}
                                onChange={e => setData('last_name', e.target.value)}
                                className={inputClass}
                                required
                            />
                        </Field>
                    </div>

                    <Field id="emp-email" label="Email address" required error={errors.email}>
                        <input
                            id="emp-email"
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            className={inputClass}
                            required
                        />
                    </Field>

                    {!isEdit && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field id="emp-password" label="Password" required error={errors.password}>
                                <input
                                    id="emp-password"
                                    type="password"
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </Field>
                            <Field id="emp-password-confirmation" label="Confirm password" required>
                                <input
                                    id="emp-password-confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={e => setData('password_confirmation', e.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </Field>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field id="emp-department" label="Department">
                            <input
                                id="emp-department"
                                type="text"
                                value={data.department}
                                onChange={e => setData('department', e.target.value)}
                                placeholder="e.g. Operations"
                                className={inputClass}
                            />
                        </Field>
                        <Field id="emp-position" label="Position">
                            <input
                                id="emp-position"
                                type="text"
                                value={data.position}
                                onChange={e => setData('position', e.target.value)}
                                placeholder="e.g. Staff"
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field id="emp-phone" label="Phone number">
                            <input
                                id="emp-phone"
                                type="text"
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                placeholder="09xx-xxx-xxxx"
                                className={inputClass}
                            />
                        </Field>
                        <Field id="emp-date-hired" label="Date hired">
                            <input
                                id="emp-date-hired"
                                type="date"
                                value={data.date_hired}
                                onChange={e => setData('date_hired', e.target.value)}
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <Field id="emp-address" label="Residential Address">
                        <textarea
                            id="emp-address"
                            value={data.address}
                            onChange={e => setData('address', e.target.value)}
                            rows={2}
                            className={`${inputClass} resize-none`}
                        />
                    </Field>

                    <Field id="emp-status" label="Employment Status">
                        <select
                            id="emp-status"
                            value={data.status}
                            onChange={e => setData('status', e.target.value)}
                            className={inputClass}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </Field>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            loading={processing}
                            className="flex-1"
                        >
                            {isEdit ? 'Save Changes' : 'Create Account'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
