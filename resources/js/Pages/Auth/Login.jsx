import { useState } from 'react'
import { useForm, usePage } from '@inertiajs/react'
import ThemeToggle from '@/Components/ThemeToggle'
import useTheme from '@/hooks/useTheme'

function EyeIcon({ off }) {
    return off ? (
        <svg className="w-5 h-5 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M9.9 5.1A10.4 10.4 0 0112 5c5 0 9 3.5 10 7-.4 1.3-1.1 2.5-2 3.6M6.2 6.6C4.3 7.9 2.9 9.7 2 12c1 3.5 5 7 10 7 1.4 0 2.7-.3 3.9-.7" />
        </svg>
    ) : (
        <svg className="w-5 h-5 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
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

    const hasErrors = Boolean(errors.login || errors.password)

    function submit(event) {
        event.preventDefault()
        post('/login')
    }

    function checkCapsLock(event) {
        if (event.getModifierState) {
            setCapsLockActive(event.getModifierState('CapsLock'))
        }
    }

    function handleLoginBlur() {
        if (data.login) {
            setData('login', data.login.trim())
        }
    }

    return (
        <main className="login-portal min-h-screen bg-bg lg:grid lg:grid-cols-[minmax(340px,44%)_1fr]">
            {/* ── Left Hero Section: Ambient Brand Pillar ── */}
            <section
                className="relative overflow-hidden bg-[#0F6E56] text-white px-6 py-8 sm:px-10 lg:px-14 lg:py-12 lg:min-h-screen flex flex-col border-b lg:border-b-0 lg:border-r border-black/15 dark:border-white/10 transition-colors"
                style={{
                    backgroundImage: 'radial-gradient(ellipse 90% 70% at 20% 20%, rgba(20, 138, 108, 0.45), transparent 75%), radial-gradient(ellipse 70% 60% at 85% 85%, rgba(6, 46, 36, 0.65), transparent)'
                }}
                aria-label="About PMPC WorkForce"
            >
                <div className="absolute inset-0 opacity-[0.08] swiss-grid pointer-events-none" aria-hidden="true" />

                {/* Top Brand Identity with Authentic Emblem */}
                <div className="relative flex items-center gap-3.5 border-b border-white/20 pb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white p-1.5 shadow-sm border border-white/30 shrink-0">
                        <img src="/pmpc_ems.png" alt="People's Multi-Purpose Cooperative" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <p className="text-base font-semibold tracking-tight leading-snug">PMPC WorkForce</p>
                        <p className="text-xs text-white/80">People&apos;s Multi-Purpose Cooperative</p>
                    </div>
                </div>

                {/* Brand Hero Message */}
                <div className="relative flex-1 flex flex-col justify-center py-10 lg:py-16">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70 mb-4">Employee management system</p>
                    <h1 className="font-display text-[clamp(2.6rem,6vw,6.6rem)] leading-[0.88] font-bold tracking-[-0.07em] max-w-2xl">Work,<br />clearly.</h1>
                    <p className="mt-6 text-sm sm:text-base leading-relaxed text-white/85 max-w-md">Attendance, employee records, payroll, and personal tasks in one cooperative workspace.</p>
                </div>

                {/* Feature Grid */}
                <div className="relative hidden sm:grid grid-cols-2 border-t border-l border-white/20">
                    {FEATURES.map(([label, icon]) => (
                        <div key={label} className="flex items-center gap-3 px-4 py-3 border-r border-b border-white/20 text-xs text-white/90">
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{icon}</svg>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Right Form Section with Elevated Card Container ── */}
            <section className="relative flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12 bg-bg">
                {/* Ambient Radial Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,110,86,0.06),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(38,33,92,0.04),transparent_50%)] pointer-events-none" aria-hidden="true" />

                {/* Top Theme Switcher */}
                <div className="absolute top-5 right-5 flex items-center">
                    <ThemeToggle isDark={isDark} onToggle={toggleTheme} className="rounded-lg shadow-2xs" />
                </div>

                {/* Elevated Form Card Container */}
                <div className={`w-full max-w-md page-enter ${hasErrors ? 'animate-shake' : ''}`}>
                    <div className="relative rounded-2xl border border-border/80 bg-panel/95 backdrop-blur-md p-7 sm:p-9 shadow-xl shadow-slate-900/5 dark:shadow-black/25">
                        {/* Compact Mobile Brand Header */}
                        <div className="lg:hidden flex items-center gap-3 pb-6 border-b border-border/60 mb-6">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white p-1 border border-border/60 shadow-2xs shrink-0">
                                <img src="/pmpc_ems.png" alt="PMPC" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-text tracking-tight">PMPC WorkForce</h2>
                                <p className="text-xs text-sub">People&apos;s Multi-Purpose Cooperative</p>
                            </div>
                        </div>

                        <div className="mb-7">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0F6E56] dark:text-emerald-400 mb-2">Secure access</p>
                            <h2 className="font-display text-2xl sm:text-3xl font-bold text-text tracking-tight">Sign in</h2>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">Use your employee ID or email. We&apos;ll open the correct portal for your account.</p>
                        </div>

                        <form onSubmit={submit} className="space-y-5" noValidate>
                            {/* Employee ID or Email Input */}
                            <div>
                                <label htmlFor="login" className="block text-sm font-medium text-text mb-2">Employee ID or email</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.364a4.125 4.125 0 00-6.338 0" />
                                        </svg>
                                    </span>
                                    <input
                                        id="login"
                                        type="text"
                                        value={data.login}
                                        onChange={(event) => setData('login', event.target.value)}
                                        onBlur={handleLoginBlur}
                                        placeholder="Enter your employee ID or email"
                                        className={`w-full min-h-12 pl-10 ${data.login ? 'pr-10' : 'pr-4'} py-3 text-sm rounded-lg border border-border bg-field/40 dark:bg-field/70 text-text transition-all focus:outline-none focus:border-[#0F6E56] dark:focus:border-emerald-400 focus:ring-2 focus:ring-[#0F6E56]/20 dark:focus:ring-emerald-400/20 shadow-2xs`}
                                        autoComplete="username"
                                        aria-invalid={Boolean(errors.login)}
                                        aria-describedby={errors.login ? 'login-error' : 'login-help'}
                                        autoFocus
                                        required
                                    />
                                    {/* Quick-Clear Button */}
                                    {data.login && (
                                        <button
                                            type="button"
                                            onClick={() => setData('login', '')}
                                            aria-label="Clear employee ID or email"
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-text dark:text-slate-500 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                {errors.login ? (
                                    <p id="login-error" className="mt-2 text-xs text-red font-medium" role="alert">{errors.login}</p>
                                ) : (
                                    <p id="login-help" className="mt-2 text-xs text-slate-500 dark:text-slate-400">e.g. EMP-0001 or name@pmpc.coop</p>
                                )}
                            </div>

                            {/* Password Input */}
                            <div>
                                <div className="flex items-center justify-between gap-4 mb-2">
                                    <label htmlFor="password" className="text-sm font-medium text-text">Password</label>
                                    <a href="/forgot-password" className="text-xs font-medium text-[#0F6E56] dark:text-emerald-400 hover:underline">Forgot password?</a>
                                </div>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
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
                                        className="w-full min-h-12 pl-10 pr-12 py-3 text-sm rounded-lg border border-border bg-field/40 dark:bg-field/70 text-text transition-all focus:outline-none focus:border-[#0F6E56] dark:focus:border-emerald-400 focus:ring-2 focus:ring-[#0F6E56]/20 dark:focus:ring-emerald-400/20 shadow-2xs"
                                        autoComplete="current-password"
                                        aria-invalid={Boolean(errors.password)}
                                        aria-describedby={errors.password ? 'password-error' : undefined}
                                        required
                                    />
                                    {/* Accessible Toggle Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((visible) => !visible)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        aria-pressed={showPassword}
                                        className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-slate-400 hover:text-[#0F6E56] dark:text-slate-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                                    >
                                        <EyeIcon off={showPassword} />
                                    </button>
                                </div>
                                <span className="sr-only" aria-live="polite">
                                    {showPassword ? 'Password is now visible' : 'Password is now hidden'}
                                </span>

                                {/* Accessible Caps Lock Warning Indicator */}
                                {capsLockActive && (
                                    <div
                                        role="status"
                                        aria-live="polite"
                                        className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium"
                                    >
                                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span>Caps Lock is on</span>
                                    </div>
                                )}

                                {errors.password && <p id="password-error" className="mt-2 text-xs text-red font-medium" role="alert">{errors.password}</p>}
                            </div>

                            {/* Custom Accessible Checkbox */}
                            <label className="flex items-center gap-3 text-sm text-sub cursor-pointer select-none group w-fit">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        id="remember"
                                        checked={data.remember}
                                        onChange={(event) => setData('remember', event.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-4.5 h-4.5 rounded border border-border bg-field text-white transition-all flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-[#0F6E56]/40 peer-checked:bg-[#0F6E56] peer-checked:border-[#0F6E56] group-hover:border-[#0F6E56]/60 shadow-2xs">
                                        <svg
                                            className={`w-3 h-3 text-white transition-transform duration-150 ${data.remember ? 'scale-100' : 'scale-0'}`}
                                            viewBox="0 0 20 20"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                        >
                                            <polyline points="4 11 8 15 16 6" />
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-text transition-colors">
                                    Remember me on this device
                                </span>
                            </label>

                            {/* Submit Button with Interactive Loading State */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full min-h-12 px-5 py-3 rounded-lg bg-[#0F6E56] hover:bg-[#0C5946] active:bg-[#0A4739] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70 shadow-sm hover:shadow-md cursor-pointer"
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

                        <div className="mt-8 pt-5 border-t border-border/70 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Need assistance?</span>
                            <span className="font-medium text-[#0F6E56] dark:text-emerald-400">Contact HR Admin</span>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}
