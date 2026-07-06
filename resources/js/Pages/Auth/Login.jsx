import { useState } from 'react'
import { useForm, usePage } from '@inertiajs/react'

export default function Login() {
    const { errors } = usePage().props
    const [activeTab, setActiveTab] = useState('employee')

    const { data, setData, post, processing } = useForm({
        login: '',
        password: '',
        remember: false,
    })

    function submit(e) {
        e.preventDefault()
        post('/login')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="flex w-full max-w-3xl rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">

                {/* Left panel */}
                <div className="w-56 flex-shrink-0 flex flex-col justify-between p-6"
                    style={{ background: '#0F6E56' }}>
                    <div>
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 10-8 0 4 4 0 008 0z"/>
                                </svg>
                            </div>
                            <div>
                                <p className="text-white text-xs font-medium leading-tight">PMPC WorkForce</p>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>People's Cooperative</p>
                            </div>
                        </div>

                        {[
                            { icon: '⏱', label: 'Daily time record' },
                            { icon: '📅', label: 'Task planner' },
                            { icon: '💰', label: 'Payroll' },
                            { icon: '👤', label: 'Employee profile' },
                        ].map((item) => (
                            <div key={item.label}
                                className="flex items-center gap-2 px-2 py-2 rounded-lg mb-0.5"
                                style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, lineHeight: 1.5 }}>
                        PMPC WorkForce v1.0<br />
                        People's Multi-Purpose Cooperative
                    </p>
                </div>

                {/* Right panel */}
                <div className="flex-1 flex flex-col justify-center p-10 bg-gray-50">
                    <h1 className="text-lg font-medium text-gray-900 mb-1">Welcome back</h1>
                    <p className="text-sm text-gray-500 mb-6">Sign in to your account to continue</p>

                    {/* Role tabs */}
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
                        {['employee', 'super_admin'].map((tab) => (
                            <button key={tab} type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
                                    activeTab === tab
                                        ? 'bg-white text-gray-800 font-medium shadow-sm border border-gray-200'
                                        : 'text-gray-500'
                                }`}>
                                {tab === 'employee' ? 'Employee' : 'Super admin'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">
                                {activeTab === 'employee' ? 'Employee ID or email' : 'Admin username'}
                            </label>
                            <input type="text"
                                value={data.login}
                                onChange={e => setData('login', e.target.value)}
                                placeholder={activeTab === 'employee' ? 'e.g. EMP-0042' : 'Admin username'}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:border-transparent"
                                autoComplete="username"
                                required />
                            {errors.login && <p className="mt-1 text-xs text-red-600">{errors.login}</p>}
                        </div>

                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Password</label>
                            <input type="password"
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                placeholder="Enter your password"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:border-transparent"
                                autoComplete="current-password"
                                required />
                            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                <input type="checkbox"
                                    checked={data.remember}
                                    onChange={e => setData('remember', e.target.checked)}
                                    className="rounded" />
                                Remember me
                            </label>
                            <a href="#" className="text-xs" style={{ color: '#0F6E56' }}>Forgot password?</a>
                        </div>

                        <button type="submit" disabled={processing}
                            className="w-full py-2.5 text-sm font-medium text-white rounded-lg transition-opacity disabled:opacity-60"
                            style={{ background: '#0F6E56' }}>
                            {processing ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>

                    <p className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
                        Having trouble signing in? Contact your HR administrator.
                    </p>
                </div>
            </div>
        </div>
    )
}