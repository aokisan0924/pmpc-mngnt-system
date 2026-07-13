import { useEffect, useState } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'

/* ---------- design tokens (matches Dashboard / Dtr / Planner / Notifications) ---------- */
const C = {
    bg:        '#06090D',
    panel:     'rgba(14,20,27,0.72)',
    field:     'rgba(255,255,255,0.03)',
    fieldOff:  'rgba(255,255,255,0.015)',
    border:    '#1F2C35',
    text:      '#E7F1EE',
    sub:       '#83979C',
    dim:       '#4C5C61',
    teal:      '#14F1B2',
    blue:      '#5AA9FF',
    red:       '#FF6B81',
}

const inputClass = "w-full px-3 py-2.5 text-sm rounded-lg border bg-transparent outline-none transition-colors"

const IconLock = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <rect x="5" y="10.5" width="14" height="10" rx="2" />
        <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
)

function initials(first, last) {
    return `${(first || '?')[0] ?? ''}${(last || '')[0] ?? ''}`.toUpperCase()
}

export default function Profile({ employee, govIds }) {
    const { flash } = usePage().props
    const [activeTab, setActiveTab] = useState('info')
    const [loading, setLoading] = useState(false)

    // Any in-flight Inertia visit (saving info, gov IDs, or password) is tracked here
    useEffect(() => {
        const stop = router.on('start', () => setLoading(true))
        const finish = router.on('finish', () => setLoading(false))
        return () => { stop(); finish() }
    }, [])

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
        <EmployeeLayout title="My profile">
            <div className="relative min-h-screen overflow-hidden hud-grid" style={{ background: C.bg }}>
                {/* top nav progress indicator — matches Dashboard / Notifications */}
                {loading && (
                    <div className="fixed top-0 left-0 right-0 h-0.5 z-50 overflow-hidden" style={{ background: 'rgba(20,241,178,0.12)' }}>
                        <div className="h-full w-1/3 progress-sweep" style={{ background: C.teal }} />
                    </div>
                )}

                {/* ambient glow — same palette/positioning as Dashboard */}
                <div className="pointer-events-none absolute -top-40 -left-32 w-96 h-[28rem] rounded-full blur-[120px] opacity-20"
                    style={{ background: C.teal }} />
                <div className="pointer-events-none absolute top-1/3 -right-40 w-[24rem] h-96 rounded-full blur-[130px] opacity-10"
                    style={{ background: C.blue }} />

                <div className="relative p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">

                    {/* Flash */}
                    {flash?.success && (
                        <div className="mb-4 px-4 py-3 rounded-xl border text-sm animate-in"
                            style={{ background: 'rgba(20,241,178,0.08)', borderColor: 'rgba(20,241,178,0.3)', color: C.teal }}>
                            {flash.success}
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6 animate-in">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-display text-lg font-semibold shrink-0 border"
                            style={{ background: 'rgba(20,241,178,0.1)', color: C.teal, borderColor: 'rgba(20,241,178,0.3)', boxShadow: `0 0 24px -8px ${C.teal}` }}>
                            {initials(employee.first_name, employee.last_name)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-[0.2em] font-mono mb-1" style={{ color: C.teal }}>My Profile</p>
                            <h1 className="font-display text-xl sm:text-2xl font-semibold truncate" style={{ color: C.text }}>
                                {employee.first_name} {employee.last_name}
                            </h1>
                            <p className="text-sm mt-0.5 font-mono truncate" style={{ color: C.sub }}>
                                {employee.employee_id} · {employee.department} · {employee.position}
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="overflow-x-auto mb-6">
                        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg min-w-max md:min-w-0">
                            {tabs.map(tab => (
                                <button key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex-1 text-xs py-2 px-3 rounded-md transition-all whitespace-nowrap ${
                                        activeTab === tab.key
                                            ? 'bg-white text-gray-800 font-medium shadow-sm border border-gray-200'
                                            : 'text-gray-500'
                                    }`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Personal info */}
                    {activeTab === 'info' && (
                        <form onSubmit={submitInfo} className="relative rounded-2xl border backdrop-blur-xl p-5 space-y-4 animate-in"
                            style={{ background: C.panel, borderColor: C.border, opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                            {loading && (
                                <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px]" style={{ color: C.teal }}>
                                    <span className="w-3 h-3 rounded-full animate-spin" style={{ border: `2px solid ${C.teal}55`, borderTopColor: C.teal }} />
                                    Saving…
                                </div>
                            )}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs mb-1.5" style={{ color: C.sub }}>First name</label>
                                    <input type="text"
                                        value={infoForm.data.first_name}
                                        onChange={e => infoForm.setData('first_name', e.target.value)}
                                        className={inputClass}
                                        style={{ borderColor: C.border, color: C.text }}
                                        required />
                                    {infoForm.errors.first_name && <p className="mt-1 text-xs" style={{ color: C.red }}>{infoForm.errors.first_name}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs mb-1.5" style={{ color: C.sub }}>Last name</label>
                                    <input type="text"
                                        value={infoForm.data.last_name}
                                        onChange={e => infoForm.setData('last_name', e.target.value)}
                                        className={inputClass}
                                        style={{ borderColor: C.border, color: C.text }}
                                        required />
                                    {infoForm.errors.last_name && <p className="mt-1 text-xs" style={{ color: C.red }}>{infoForm.errors.last_name}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: C.sub }}>Email</label>
                                <div className="relative">
                                    <input type="email"
                                        value={employee.email}
                                        disabled
                                        className={`${inputClass} cursor-not-allowed pr-9`}
                                        style={{ borderColor: C.border, color: C.dim, background: C.fieldOff }} />
                                    <IconLock className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.dim }} />
                                </div>
                                <p className="mt-1 text-xs" style={{ color: C.dim }}>Email cannot be changed. Contact your administrator.</p>
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: C.sub }}>Phone number</label>
                                <input type="text"
                                    value={infoForm.data.phone}
                                    onChange={e => infoForm.setData('phone', e.target.value)}
                                    placeholder="e.g. 09xx-xxx-xxxx"
                                    className={inputClass}
                                    style={{ borderColor: C.border, color: C.text }} />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: C.sub }}>Address</label>
                                <textarea
                                    value={infoForm.data.address}
                                    onChange={e => infoForm.setData('address', e.target.value)}
                                    rows={3}
                                    placeholder="Your home address"
                                    className={`${inputClass} resize-none`}
                                    style={{ borderColor: C.border, color: C.text }} />
                            </div>

                            <div className="pt-2">
                                <button type="submit"
                                        disabled={infoForm.processing}
                                        className="px-5 py-2.5 text-sm font-semibold text-black rounded-lg disabled:opacity-60 transition-all hover:brightness-110"
                                        style={{ background: C.teal, boxShadow: `0 0 24px -8px ${C.teal}` }}>
                                    {infoForm.processing ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Government IDs */}
                    {activeTab === 'gov' && (
                        <form onSubmit={submitGov} className="relative rounded-2xl border backdrop-blur-xl p-5 space-y-4 animate-in"
                            style={{ background: C.panel, borderColor: C.border, opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                            {loading && (
                                <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px]" style={{ color: C.teal }}>
                                    <span className="w-3 h-3 rounded-full animate-spin" style={{ border: `2px solid ${C.teal}55`, borderTopColor: C.teal }} />
                                    Saving…
                                </div>
                            )}
                            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border" style={{ borderColor: C.border, background: C.fieldOff }}>
                                <IconLock className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: C.dim }} />
                                <p className="text-xs" style={{ color: C.dim }}>
                                    These are kept confidential and used for payroll processing only.
                                </p>
                            </div>

                            {[
                                { key: 'sss_no',        label: 'SSS number',        placeholder: 'xx-xxxxxxx-x'   },
                                { key: 'philhealth_no', label: 'PhilHealth number', placeholder: 'xx-xxxxxxxxx-x' },
                                { key: 'tin_no',        label: 'TIN number',        placeholder: 'xxx-xxx-xxx'    },
                                { key: 'pagibig_no',    label: 'Pag-IBIG number',   placeholder: 'xxxx-xxxx-xxxx' },
                            ].map(({ key, label, placeholder }) => (
                                <div key={key}>
                                    <label className="block text-xs mb-1.5" style={{ color: C.sub }}>{label}</label>
                                    <input type="text"
                                        value={govForm.data[key]}
                                        onChange={e => govForm.setData(key, e.target.value)}
                                        placeholder={placeholder}
                                        className={`${inputClass} font-mono`}
                                        style={{ borderColor: C.border, color: C.text }} />
                                    {govForm.errors[key] && <p className="mt-1 text-xs" style={{ color: C.red }}>{govForm.errors[key]}</p>}
                                </div>
                            ))}

                            <div className="pt-2">
                                <button type="submit"
                                        disabled={govForm.processing}
                                        className="px-5 py-2.5 text-sm font-semibold text-black rounded-lg disabled:opacity-60 transition-all hover:brightness-110"
                                        style={{ background: C.teal, boxShadow: `0 0 24px -8px ${C.teal}` }}>
                                    {govForm.processing ? 'Saving…' : 'Save IDs'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Change password */}
                    {activeTab === 'password' && (
                        <form onSubmit={submitPass} className="relative rounded-2xl border backdrop-blur-xl p-5 space-y-4 animate-in"
                            style={{ background: C.panel, borderColor: C.border, opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                            {loading && (
                                <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px]" style={{ color: C.teal }}>
                                    <span className="w-3 h-3 rounded-full animate-spin" style={{ border: `2px solid ${C.teal}55`, borderTopColor: C.teal }} />
                                    Updating…
                                </div>
                            )}
                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: C.sub }}>Current password</label>
                                <input type="password"
                                    value={passForm.data.current_password}
                                    onChange={e => passForm.setData('current_password', e.target.value)}
                                    className={inputClass}
                                    style={{ borderColor: C.border, color: C.text }}
                                    required />
                                {passForm.errors.current_password && <p className="mt-1 text-xs" style={{ color: C.red }}>{passForm.errors.current_password}</p>}
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: C.sub }}>New password</label>
                                <input type="password"
                                    value={passForm.data.password}
                                    onChange={e => passForm.setData('password', e.target.value)}
                                    className={inputClass}
                                    style={{ borderColor: C.border, color: C.text }}
                                    required />
                                {passForm.errors.password && <p className="mt-1 text-xs" style={{ color: C.red }}>{passForm.errors.password}</p>}
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: C.sub }}>Confirm new password</label>
                                <input type="password"
                                    value={passForm.data.password_confirmation}
                                    onChange={e => passForm.setData('password_confirmation', e.target.value)}
                                    className={inputClass}
                                    style={{ borderColor: C.border, color: C.text }}
                                    required />
                            </div>

                            <div className="pt-2">
                                <button type="submit"
                                        disabled={passForm.processing}
                                        className="px-5 py-2.5 text-sm font-semibold text-black rounded-lg disabled:opacity-60 transition-all hover:brightness-110"
                                        style={{ background: C.teal, boxShadow: `0 0 24px -8px ${C.teal}` }}>
                                    {passForm.processing ? 'Updating…' : 'Update password'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
                    .font-display { font-family: 'Space Grotesk', sans-serif; }
                    .font-mono { font-family: 'JetBrains Mono', monospace; }
                    input, textarea, select { font-family: 'Inter', sans-serif; }
                    input:focus, textarea:focus { border-color: rgba(20,241,178,0.5) !important; box-shadow: 0 0 0 3px rgba(20,241,178,0.12); }
                    @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-in { animation: fadeSlideUp 0.5s ease-out both; }
                    @keyframes gridDrift { from { background-position: 0 0; } to { background-position: 60px 60px; } }
                    .hud-grid { background-image: linear-gradient(rgba(20,241,178,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,241,178,0.05) 1px, transparent 1px); background-size: 34px 34px; animation: gridDrift 16s linear infinite; }
                    @keyframes progressSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
                    .progress-sweep { animation: progressSweep 1.1s ease-in-out infinite; }
                    @media (prefers-reduced-motion: reduce) { .animate-in, .hud-grid, .progress-sweep { animation: none; } }
                `}</style>
            </div>
        </EmployeeLayout>
    )
}