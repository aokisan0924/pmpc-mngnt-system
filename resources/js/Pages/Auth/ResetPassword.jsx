import { useState } from 'react'
import { useForm, usePage } from '@inertiajs/react'

function CoopMark({ className = 'w-5 h-5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="15" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="14.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    )
}

function EyeIcon({ off, className = 'w-4 h-4' }) {
    return off ? (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M9.9 5.1A10.4 10.4 0 0112 5c5 0 9 3.5 10 7-.4 1.3-1.1 2.5-2 3.6M6.2 6.6C4.3 7.9 2.9 9.7 2 12c1 3.5 5 7 10 7 1.4 0 2.7-.3 3.9-.7" />
        </svg>
    ) : (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12c1-3.5 5-7 10-7s9 3.5 10 7c-1 3.5-5 7-10 7s-9-3.5-10-7z" />
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export default function ResetPassword({ email, token }) {
    const { errors } = usePage().props
    const [showPassword, setShowPassword] = useState(false)

    const { data, setData, post, processing } = useForm({
        token,
        email: email ?? '',
        password: '',
        password_confirmation: '',
    })

    function submit(e) {
        e.preventDefault()
        post('/reset-password')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F6F4EF] px-4 py-8 sm:py-12">
            <div className="w-full max-w-4xl rounded-2xl sm:rounded-[28px] overflow-hidden shadow-xl border border-black/5 bg-white flex flex-col md:flex-row">

                <div
                    className="relative md:w-64 flex-shrink-0 flex flex-row md:flex-col items-center md:items-stretch justify-between md:justify-between gap-4 md:gap-0 px-5 py-4 md:p-7 overflow-hidden"
                    style={{ background: 'linear-gradient(160deg, #0F6E56 0%, #0B5344 100%)' }}
                >
                    <svg
                        className="pointer-events-none absolute -right-10 -bottom-10 w-40 h-40 md:w-56 md:h-56 opacity-[0.08]"
                        viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                    >
                        <circle cx="9" cy="9" r="5.5" stroke="white" strokeWidth="0.6" />
                        <circle cx="15" cy="9" r="5.5" stroke="white" strokeWidth="0.6" />
                        <circle cx="12" cy="14.5" r="5.5" stroke="white" strokeWidth="0.6" />
                    </svg>

                    <div className="flex items-center gap-2.5 md:mb-8 relative">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.15)' }}>
                            <CoopMark className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-white text-sm md:text-xs font-semibold leading-tight">PMPC EMS</p>
                            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>People&apos;s Multi-Purpose Cooperative</p>
                        </div>
                    </div>

                    <p className="hidden md:block relative" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 1.5 }}>
                        Employee Management System v2.0<br />
                        People&apos;s Multi-Purpose Cooperative
                    </p>
                </div>

                <div className="flex-1 flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-8 md:px-10 md:py-10 bg-gray-50">
                    <h1 className="text-xl sm:text-lg font-semibold text-gray-900 mb-1">Set a new password</h1>
                    <p className="text-sm text-gray-500 mb-6">Choose a new password for your account.</p>

                    <form onSubmit={submit} className="space-y-4" noValidate>
                        <div>
                            <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
                            <input id="email" type="email"
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                                className="w-full px-3 py-2.5 sm:py-2 text-sm rounded-lg border border-gray-300 bg-white transition-shadow focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/40 focus:border-[#0F6E56]"
                                autoComplete="username"
                                required />
                            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-1">New password</label>
                            <div className="relative">
                                <input id="password" type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    placeholder="At least 8 characters"
                                    className="w-full px-3 py-2.5 sm:py-2 pr-10 text-sm rounded-lg border border-gray-300 bg-white transition-shadow focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/40 focus:border-[#0F6E56]"
                                    autoComplete="new-password"
                                    aria-invalid={Boolean(errors.password)}
                                    required />
                                <button type="button"
                                    onClick={() => setShowPassword(s => !s)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:text-[#0F6E56]">
                                    <EyeIcon off={showPassword} />
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                        </div>

                        <div>
                            <label htmlFor="password_confirmation" className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
                            <input id="password_confirmation" type={showPassword ? 'text' : 'password'}
                                value={data.password_confirmation}
                                onChange={e => setData('password_confirmation', e.target.value)}
                                className="w-full px-3 py-2.5 sm:py-2 text-sm rounded-lg border border-gray-300 bg-white transition-shadow focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/40 focus:border-[#0F6E56]"
                                autoComplete="new-password"
                                required />
                        </div>

                        <button type="submit" disabled={processing}
                            className="w-full py-3 sm:py-2.5 text-sm font-medium text-white rounded-lg transition-opacity disabled:opacity-60 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F6E56]"
                            style={{ background: '#0F6E56' }}>
                            {processing ? 'Resetting…' : 'Reset password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}