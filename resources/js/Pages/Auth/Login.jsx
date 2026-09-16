import { useState } from 'react'
import { useForm, usePage } from '@inertiajs/react'
import ThemeToggle from '@/Components/ThemeToggle'
import useTheme from '@/hooks/useTheme'

function CoopMark({ className = 'w-6 h-6' }) {
    return (
        <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="20" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="16" cy="20" r="7" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    )
}

function EyeIcon({ off }) {
    return off ? (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M9.9 5.1A10.4 10.4 0 0112 5c5 0 9 3.5 10 7-.4 1.3-1.1 2.5-2 3.6M6.2 6.6C4.3 7.9 2.9 9.7 2 12c1 3.5 5 7 10 7 1.4 0 2.7-.3 3.9-.7" />
        </svg>
    ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12c1-3.5 5-7 10-7s9 3.5 10 7c-1 3.5-5 7-10 7s-9-3.5-10-7z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}

const FEATURES = [
    ['Daily time record', <path key="dtr" strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />],
    ['Tasks and schedules', <path key="tasks" strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12h14V7a2 2 0 00-2-2h-2M9 5a3 3 0 006 0M8 13l2 2 5-5" />],
    ['Payroll and payslips', <path key="pay" strokeLinecap="round" strokeLinejoin="round" d="M7 3h10a2 2 0 012 2v16l-3-2-4 2-4-2-3 2V5a2 2 0 012-2zm2 6h6m-6 4h6" />],
    ['Employee records', <path key="records" strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2m6.5-10a4 4 0 100-8 4 4 0 000 8zm7-1 2 2 4-4" />],
]

export default function Login() {
    const { errors } = usePage().props
    const { isDark, toggleTheme } = useTheme()
    const [showPassword, setShowPassword] = useState(false)
    const [capsLockActive, setCapsLockActive] = useState(false)
    const { data, setData, post, processing } = useForm({ login: '', password: '', remember: false })

    function submit(event) {
        event.preventDefault()
        post('/login')
    }

    function checkCapsLock(event) {
        if (event.getModifierState) {
            setCapsLockActive(event.getModifierState('CapsLock'))
        }
    }

    return (
        <main className="login-portal min-h-screen bg-bg lg:grid lg:grid-cols-[minmax(320px,44%)_1fr]">
            {/* ── Left Hero Section: Ambient Depth Brand Pillar ── */}
            <section
                className="relative overflow-hidden bg-[#0F6E56] text-white px-6 py-7 sm:px-10 lg:px-14 lg:py-12 lg:min-h-screen flex flex-col border-b lg:border-b-0 lg:border-r border-black/15 dark:border-white/10 transition-colors"
                style={{
                    backgroundImage: 'radial-gradient(ellipse 90% 70% at 20% 20%, rgba(20, 138, 108, 0.45), transparent 75%), radial-gradient(ellipse 70% 60% at 85% 85%, rgba(6, 46, 36, 0.65), transparent)'
                }}
                aria-label="About PMPC WorkForce"
            >
                <div className="absolute inset-0 opacity-[0.08] swiss-grid pointer-events-none" aria-hidden="true" />

                <div className="relative flex items-center gap-3 border-b border-white/20 pb-6">
                    <div className="w-11 h-11 border border-white/40 rounded-lg flex items-center justify-center bg-white/5 backdrop-blur-xs">
                        <CoopMark />
                    </div>
                    <div>
                        <p className="text-base font-semibold tracking-tight">PMPC WorkForce</p>
                        <p className="text-xs text-white/75">People&apos;s Multi-Purpose Cooperative</p>
                    </div>
                </div>

                <div className="relative flex-1 flex flex-col justify-center py-10 lg:py-16">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70 mb-4">Employee management system</p>
                    <h1 className="font-display text-[clamp(2.6rem,6vw,6.6rem)] leading-[0.88] font-bold tracking-[-0.07em] max-w-2xl">Work,<br />clearly.</h1>
                    <p className="mt-6 text-sm sm:text-base leading-relaxed text-white/80 max-w-md">Attendance, employee records, payroll, and personal tasks in one cooperative workspace.</p>
                </div>

                <div className="relative hidden sm:grid grid-cols-2 border-t border-l border-white/20">
                    {FEATURES.map(([label, icon]) => (
                        <div key={label} className="flex items-center gap-3 px-4 py-3 border-r border-b border-white/20 text-xs text-white/85">
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{icon}</svg>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Right Form Section ── */}
            <section className="relative flex items-center justify-center px-6 py-12 sm:px-12 lg:px-16">
                {/* Top Utility Bar */}
                <div className="absolute top-5 right-5 flex items-center">
                    <ThemeToggle isDark={isDark} onToggle={toggleTheme} className="rounded-lg shadow-2xs" />
                </div>

                <div className="w-full max-w-md page-enter">
                    <div className="mb-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0F6E56] dark:text-emerald-400 mb-3">Secure access</p>
                        <h2 className="font-display text-3xl sm:text-4xl font-bold text-text tracking-tight">Sign in</h2>
                        <p className="text-sm text-sub mt-2 leading-relaxed">Use your employee ID or email. We&apos;ll open the correct portal for your account.</p>
                    </div>

                    <form onSubmit={submit} className="space-y-5" noValidate>
                        <div>
                            <label htmlFor="login" className="block text-sm font-medium text-text mb-2">Employee ID or email</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dim">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.364a4.125 4.125 0 00-6.338 0" />
                                    </svg>
                                </span>
                                <input
                                    id="login"
                                    type="text"
                                    value={data.login}
                                    onChange={(event) => setData('login', event.target.value)}
                                    placeholder="Enter your employee ID or email"
                                    className="w-full min-h-12 pl-10 pr-4 py-3 text-sm rounded-lg border border-border bg-panel text-text transition-all focus:outline-none focus:border-[#0F6E56] dark:focus:border-emerald-400 focus:ring-2 focus:ring-[#0F6E56]/20 dark:focus:ring-emerald-400/20 shadow-2xs"
                                    autoComplete="username"
                                    aria-invalid={Boolean(errors.login)}
                                    aria-describedby={errors.login ? 'login-error' : 'login-help'}
                                    autoFocus
                                    required
                                />
                            </div>
                            {errors.login ? (
                                <p id="login-error" className="mt-2 text-xs text-red" role="alert">{errors.login}</p>
                            ) : (
                                <p id="login-help" className="mt-2 text-xs text-dim">e.g. EMP-0001 or name@pmpc.coop</p>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-4 mb-2">
                                <label htmlFor="password" className="text-sm font-medium text-text">Password</label>
                                <a href="/forgot-password" className="text-xs font-medium text-[#0F6E56] dark:text-emerald-400 hover:underline">Forgot password?</a>
                            </div>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dim">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                </span>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(event) => setData('password', event.target.value)}
                                    onKeyDown={checkCapsLock}
                                    onKeyUp={checkCapsLock}
                                    onBlur={() => setCapsLockActive(false)}
                                    placeholder="Enter your password"
                                    className="w-full min-h-12 pl-10 pr-12 py-3 text-sm rounded-lg border border-border bg-panel text-text transition-all focus:outline-none focus:border-[#0F6E56] dark:focus:border-emerald-400 focus:ring-2 focus:ring-[#0F6E56]/20 dark:focus:ring-emerald-400/20 shadow-2xs"
                                    autoComplete="current-password"
                                    aria-invalid={Boolean(errors.password)}
                                    aria-describedby={errors.password ? 'password-error' : undefined}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((visible) => !visible)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    aria-pressed={showPassword}
                                    className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-dim hover:text-[#0F6E56] dark:hover:text-emerald-400 transition-colors"
                                >
                                    <EyeIcon off={showPassword} />
                                </button>
                            </div>

                            {/* Caps Lock Warning Indicator */}
                            {capsLockActive && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span className="font-medium">Caps Lock is on</span>
                                </div>
                            )}

                            {errors.password && <p id="password-error" className="mt-2 text-xs text-red" role="alert">{errors.password}</p>}
                        </div>

                        <label className="flex items-center gap-3 min-h-11 text-sm text-sub cursor-pointer select-none w-fit">
                            <input
                                type="checkbox"
                                checked={data.remember}
                                onChange={(event) => setData('remember', event.target.checked)}
                                className="w-4 h-4 rounded border-border text-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 transition-all"
                            />
                            Remember me on this device
                        </label>

                        {/* Submit Button with Interactive Loading State */}
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full min-h-12 px-5 py-3 rounded-lg bg-[#0F6E56] hover:bg-[#0C5946] active:bg-[#0A4739] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70 shadow-xs cursor-pointer"
                        >
                            {processing ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                    <span>Signing in…</span>
                                </>
                            ) : (
                                <span>Sign in</span>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 pt-5 border-t border-border text-xs text-dim">Having trouble signing in? Contact your HR administrator.</p>
                </div>
            </section>
        </main>
    )
}
