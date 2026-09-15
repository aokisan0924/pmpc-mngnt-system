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

export default function ForgotPassword() {
    const { errors, status } = usePage().props

    const { data, setData, post, processing } = useForm({
        email: '',
    })

    function submit(e) {
        e.preventDefault()
        post('/forgot-password')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-8 sm:py-12 swiss-grid">
            <div className="w-full max-w-4xl overflow-hidden shadow-xl border border-border bg-panel flex flex-col md:flex-row">

                <div
                    className="relative md:w-64 flex-shrink-0 flex flex-row md:flex-col items-center md:items-stretch justify-between md:justify-between gap-4 md:gap-0 px-5 py-4 md:p-7 overflow-hidden"
                    style={{ background: 'var(--color-brand)' }}
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

                <div className="flex-1 flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-8 md:px-10 md:py-10 bg-bg">
                    <h1 className="text-xl sm:text-2xl font-bold text-text mb-1">Forgot your password?</h1>
                    <p className="text-sm text-sub mb-6">
                        Enter the email address on your account and we'll send you a link to reset it.
                    </p>

                    {status && (
                        <div className="mb-5 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-4" noValidate>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-text mb-2">Email address</label>
                            <input id="email" type="email"
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 text-sm border border-border bg-panel text-text focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                                autoComplete="email"
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? 'email-error' : undefined}
                                required autoFocus />
                            {errors.email && <p id="email-error" className="mt-1 text-xs text-red-600">{errors.email}</p>}
                        </div>

                        <button type="submit" disabled={processing}
                            className="w-full py-3 text-sm font-semibold text-white bg-brand transition-opacity disabled:opacity-60 hover:opacity-90">
                            {processing ? 'Sending link…' : 'Send reset link'}
                        </button>
                    </form>

                    <p className="mt-6 pt-4 border-t border-border text-xs text-dim text-center">
                        Remembered it? <a href="/login" className="font-medium hover:underline text-brand">Back to sign in</a>
                    </p>
                </div>
            </div>
        </div>
    )
}
