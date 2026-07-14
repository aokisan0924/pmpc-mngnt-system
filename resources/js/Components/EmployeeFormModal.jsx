import { useForm } from '@inertiajs/react'

const C = {
    panel: 'rgba(14,20,27,0.96)', field: 'rgba(255,255,255,0.03)', border: '#1F2C35',
    text: '#E7F1EE', sub: '#83979C', dim: '#4C5C61', violet: '#8B7CF6', red: '#FF6B81',
}

function Field({ label, required, error, children }) {
    return (
        <div>
            <label className="block text-xs mb-1" style={{ color: C.sub }}>
                {label} {required && <span style={{ color: C.red }}>*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs" style={{ color: C.red }}>{error}</p>}
        </div>
    )
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border bg-transparent outline-none transition-colors modal-input"
const inputStyle = { borderColor: C.border, color: C.text }

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="rounded-2xl shadow-xl border backdrop-blur-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
                style={{ background: C.panel, borderColor: C.border }}>

                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-medium font-display" style={{ color: C.text }}>
                        {isEdit ? 'Edit employee' : 'New employee'}
                    </h2>
                    <button onClick={onClose}
                        className="text-2xl leading-none transition-colors"
                        style={{ color: C.dim }}
                        onMouseEnter={e => e.currentTarget.style.color = C.text}
                        onMouseLeave={e => e.currentTarget.style.color = C.dim}>×</button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="First name" required error={errors.first_name}>
                            <input type="text" value={data.first_name}
                                onChange={e => setData('first_name', e.target.value)}
                                className={inputClass} style={inputStyle} required />
                        </Field>
                        <Field label="Last name" required error={errors.last_name}>
                            <input type="text" value={data.last_name}
                                onChange={e => setData('last_name', e.target.value)}
                                className={inputClass} style={inputStyle} required />
                        </Field>
                    </div>

                    <Field label="Email" required error={errors.email}>
                        <input type="email" value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            className={inputClass} style={inputStyle} required />
                    </Field>

                    {!isEdit && (
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Password" required error={errors.password}>
                                <input type="password" value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    className={inputClass} style={inputStyle} required />
                            </Field>
                            <Field label="Confirm password" required>
                                <input type="password" value={data.password_confirmation}
                                    onChange={e => setData('password_confirmation', e.target.value)}
                                    className={inputClass} style={inputStyle} required />
                            </Field>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Department">
                            <input type="text" value={data.department}
                                onChange={e => setData('department', e.target.value)}
                                placeholder="e.g. Operations"
                                className={inputClass} style={inputStyle} />
                        </Field>
                        <Field label="Position">
                            <input type="text" value={data.position}
                                onChange={e => setData('position', e.target.value)}
                                placeholder="e.g. Staff"
                                className={inputClass} style={inputStyle} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Phone">
                            <input type="text" value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                placeholder="09xx-xxx-xxxx"
                                className={inputClass} style={inputStyle} />
                        </Field>
                        <Field label="Date hired">
                            <input type="date" value={data.date_hired}
                                onChange={e => setData('date_hired', e.target.value)}
                                className={`${inputClass} modal-date`} style={inputStyle} />
                        </Field>
                    </div>

                    <Field label="Address">
                        <textarea value={data.address}
                            onChange={e => setData('address', e.target.value)}
                            rows={2}
                            className={`${inputClass} resize-none`} style={inputStyle} />
                    </Field>

                    <Field label="Status">
                        <select value={data.status}
                            onChange={e => setData('status', e.target.value)}
                            className={`${inputClass} modal-select`} style={inputStyle}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </Field>

                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2 text-sm rounded-lg border transition-colors"
                            style={{ color: C.sub, borderColor: C.border, background: C.field }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={processing}
                            className="flex-1 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 transition-all hover:brightness-110"
                            style={{ background: C.violet, color: '#0A0714', boxShadow: `0 0 20px -8px ${C.violet}` }}>
                            {processing ? 'Saving…' : isEdit ? 'Save changes' : 'Create employee'}
                        </button>
                    </div>
                </form>

                <style>{`
                    .modal-input:focus { border-color: rgba(139,124,246,0.5) !important; box-shadow: 0 0 0 3px rgba(139,124,246,0.12); }
                    .modal-date::-webkit-calendar-picker-indicator { filter: invert(0.7); }
                    .modal-select option { background: #0C1218; color: #E7F1EE; }
                `}</style>
            </div>
        </div>
    )
}