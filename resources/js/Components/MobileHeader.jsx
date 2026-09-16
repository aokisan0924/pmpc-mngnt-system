import { useState } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import ThemeToggle from '@/Components/ThemeToggle'

const allNav = [
    { label: 'Dashboard',      href: '/employee/dashboard'      },
    { label: 'My DTR',         href: '/employee/dtr'            },
    { label: 'Task planner',   href: '/employee/planner'        },
    { label: 'My payslips',    href: '/employee/payslips'       },
    { label: 'Notifications',  href: '/employee/notifications'  },
    { label: 'My profile',     href: '/employee/profile'        },
]

export default function MobileHeader({ title, unreadCount = 0, isDark, onToggleTheme }) {
    const { auth } = usePage().props
    const employee  = auth?.employee
    const isSuperAdmin = employee?.role === 'super_admin'
    const [menuOpen, setMenuOpen] = useState(false)

    const visibleNav = isSuperAdmin
        ? allNav.filter(i => i.href === '/employee/dtr' || i.href === '/employee/planner')
        : allNav

    function logout() {
        router.post('/logout')
        setMenuOpen(false)
    }

    return (
        <>
            <header className="md:hidden sticky top-0 z-30 border-b border-border bg-panel px-4 py-3 select-none">
                <div className="flex items-center justify-between">
                    {/* Brand */}
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white dark:bg-slate-900 p-1 border border-border/80 shadow-2xs">
                            <img src="/pmpc_ems.png" alt="PMPC" className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold leading-tight text-text truncate">PMPC WorkForce</p>
                            {title && <p className="text-xs text-dim truncate">{title}</p>}
                        </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {onToggleTheme && (
                            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
                        )}

                        {/* Notification bell */}
                        {!isSuperAdmin && (
                        <Link href="/employee/notifications" className="relative p-1.5 text-sub">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center font-medium text-[8px] bg-red"
                                    style={{ color: 'var(--color-bg)' }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>
                        )}

                        {/* Avatar / menu toggle */}
                        <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Open account menu" aria-expanded={menuOpen}
                            className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs border flex-shrink-0 bg-brand/10 text-brand border-brand/30">
                            {employee?.initials}
                        </button>
                    </div>
                </div>
            </header>

            {/* Slide-down menu */}
            {menuOpen && (
                <>
                    <div className="md:hidden fixed inset-0 z-20 bg-black/60"
                        onClick={() => setMenuOpen(false)} />
                    <div className="md:hidden fixed top-16 right-3 z-30 shadow-xl border border-border w-64 overflow-hidden bg-panel" role="dialog" aria-label="Account menu">
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-border bg-teal/10">
                            <p className="text-sm font-medium text-text">{employee?.full_name}</p>
                            <p className="text-xs text-teal">{employee?.employee_id}</p>
                        </div>

                        {/* Nav links */}
                        {visibleNav.map(item => (
                            <Link key={item.href} href={item.href}
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center px-4 py-3 text-sm text-sub border-b border-border last:border-0 transition-colors hover:bg-hover">
                                {item.label}
                            </Link>
                        ))}

                        {isSuperAdmin && (
                            <Link href="/admin/dashboard"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center px-4 py-3 text-sm text-teal border-b border-border transition-colors hover:bg-hover">
                                ← Back to admin
                            </Link>
                        )}

                        {/* Sign out */}
                        <button onClick={logout}
                            className="w-full text-left px-4 py-3 text-sm text-red border-t border-border transition-colors hover:bg-red/10">
                            Sign out
                        </button>
                    </div>
                </>
            )}
        </>
    )
}
