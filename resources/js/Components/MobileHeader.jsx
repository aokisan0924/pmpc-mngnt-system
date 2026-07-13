import { useState } from 'react'
import { Link, router, usePage } from '@inertiajs/react'

const allNav = [
    { label: 'Dashboard',      href: '/employee/dashboard'      },
    { label: 'My DTR',         href: '/employee/dtr'            },
    { label: 'Task planner',   href: '/employee/planner'        },
    { label: 'My payslips',    href: '/employee/payslips'       },
    { label: 'Notifications',  href: '/employee/notifications'  },
    { label: 'My profile',     href: '/employee/profile'        },
]

export default function MobileHeader({ title, unreadCount = 0 }) {
    const { auth } = usePage().props
    const employee  = auth?.employee
    const [menuOpen, setMenuOpen] = useState(false)

    function logout() {
        router.post('/logout')
        setMenuOpen(false)
    }

    return (
        <>
            <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Brand */}
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: '#0F6E56' }}>
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 10-8 0 4 4 0 008 0z"/>
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-800 leading-tight">PMPC WorkForce</p>
                            {title && <p className="text-xs text-gray-400">{title}</p>}
                        </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                        {/* Notification bell */}
                        <Link href="/employee/notifications" className="relative p-1.5">
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center font-medium"
                                    style={{ background: '#FF4444', fontSize: 8 }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>

                        {/* Avatar / menu toggle */}
                        <button onClick={() => setMenuOpen(!menuOpen)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-medium text-xs"
                            style={{ background: '#0F6E56' }}>
                            {employee?.initials}
                        </button>
                    </div>
                </div>
            </header>

            {/* Slide-down menu */}
            {menuOpen && (
                <>
                    <div className="md:hidden fixed inset-0 z-20 bg-black/40"
                        onClick={() => setMenuOpen(false)} />
                    <div className="md:hidden fixed top-14 right-3 z-30 bg-white rounded-2xl shadow-xl border border-gray-100 w-56 overflow-hidden">
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-gray-100"
                            style={{ background: '#0F6E56' }}>
                            <p className="text-white text-sm font-medium">{employee?.full_name}</p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{employee?.employee_id}</p>
                        </div>

                        {/* Nav links */}
                        {allNav.map(item => (
                            <Link key={item.href} href={item.href}
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                                {item.label}
                            </Link>
                        ))}

                        {/* Sign out */}
                        <button onClick={logout}
                            className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 border-t border-gray-100">
                            Sign out
                        </button>
                    </div>
                </>
            )}
        </>
    )
}