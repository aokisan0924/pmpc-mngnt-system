import { Link, usePage, router } from '@inertiajs/react'
import useNotifications from '@/hooks/useNotifications'
import NotificationToast from '@/Components/NotificationToast'
import BottomNav from '@/Components/BottomNav'
import MobileHeader from '@/Components/MobileHeader'
import ThemeToggle from '@/Components/ThemeToggle'
import useTheme from '@/hooks/useTheme'

const navMain = [
    {
        label: 'Dashboard',
        href: '/employee/dashboard',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
        ),
    },
    {
        label: 'My DTR',
        href: '/employee/dtr',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        label: 'Task planner',
        href: '/employee/planner',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        label: 'My payslips',
        href: '/employee/payslips',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
        ),
    },
]

const navAccount = [
    {
        label: 'My profile',
        href: '/employee/profile',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
]

export default function EmployeeLayout({ children, title }) {
    const { auth, unread_notifications } = usePage().props
    const employee = auth?.employee
    const isSuperAdmin = employee?.role === 'super_admin'
    const currentUrl = window.location.pathname
    const { isDark, toggleTheme } = useTheme()

    const visibleNavMain = isSuperAdmin
        ? navMain.filter(i => i.href === '/employee/dtr' || i.href === '/employee/planner')
        : navMain
    const visibleNavAccount = isSuperAdmin ? [] : navAccount

    const { unreadCount, liveNotifications, dismissToast } =
        useNotifications(employee?.id, unread_notifications ?? 0)

    function logout() {
        router.post('/logout')
    }

    const currentItem = [...navMain, ...navAccount].find(i => currentUrl.startsWith(i.href))

    return (
        <div className="employee-portal flex min-h-screen bg-bg">
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {/* ── Desktop Sidebar ───────────────────────────────── */}
            <aside className="hidden md:flex w-64 flex-shrink-0 flex-col sticky top-0 h-screen border-r border-border/80 bg-panel">
                {/* Brand Header */}
                <div className="flex items-center gap-3 h-16 px-5 border-b border-border/80">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white dark:bg-slate-900 p-1 border border-border/80 shadow-2xs">
                        <img src="/pmpc_ems.png" alt="PMPC" className="w-full h-full object-contain" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-heading font-bold text-sm text-text tracking-tight truncate">PMPC WorkForce</p>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider uppercase">Employee Portal</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Employee navigation">
                    <div>
                        <p className="text-[10px] font-bold text-dim px-3 mb-1.5 tracking-wider uppercase">
                            {isSuperAdmin ? 'Personal' : 'Main Menu'}
                        </p>
                        <div className="space-y-0.5">
                            {visibleNavMain.map(item => (
                                <NavLink key={item.href} item={item} currentUrl={currentUrl} />
                            ))}

                            {!isSuperAdmin && (
                                <Link
                                    href="/employee/notifications"
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                                        currentUrl.startsWith('/employee/notifications')
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold shadow-2xs'
                                            : 'text-sub hover:text-text hover:bg-field'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                        </svg>
                                        <span>Notifications</span>
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.25 rounded-full font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </Link>
                            )}
                        </div>
                    </div>

                    {isSuperAdmin ? (
                        <div className="pt-2">
                            <Link
                                href="/admin/dashboard"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 hover:bg-indigo-100 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                                <span>Back to Admin Portal</span>
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <p className="text-[10px] font-bold text-dim px-3 mb-1.5 tracking-wider uppercase">
                                Account
                            </p>
                            <div className="space-y-0.5">
                                {visibleNavAccount.map(item => (
                                    <NavLink key={item.href} item={item} currentUrl={currentUrl} />
                                ))}
                            </div>
                        </div>
                    )}
                </nav>

                {/* User Footer */}
                <div className="p-3 border-t border-border/80">
                    <div className="p-2 rounded-xl bg-field/60 border border-border/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-heading font-semibold text-xs flex-shrink-0">
                                {employee?.initials}
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-xs text-text truncate">{employee?.full_name}</p>
                                <p className="text-[10px] text-sub truncate">{employee?.employee_id}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            title="Sign out"
                            className="p-1.5 rounded-lg text-sub hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main Content Area ─────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Desktop Header */}
                <header className="hidden md:flex h-16 items-center justify-between px-8 border-b border-border/80 bg-panel/80 backdrop-blur-md sticky top-0 z-20">
                    <nav className="flex items-center gap-2 text-xs font-medium text-sub">
                        <span>PMPC WorkForce</span>
                        <span className="text-dim">/</span>
                        <span className="text-text font-semibold">{title || currentItem?.label || 'Portal'}</span>
                    </nav>
                    <div className="flex items-center gap-3">
                        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                        <div className="h-5 w-px bg-border mx-1" />
                        <div className="flex items-center gap-2.5 pl-1">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center font-heading font-semibold text-xs shadow-xs">
                                {employee?.initials}
                            </div>
                            <div className="hidden lg:block text-left">
                                <p className="text-xs font-semibold text-text leading-tight">{employee?.full_name}</p>
                                <p className="text-[10px] text-sub leading-tight">{employee?.position ?? 'Cooperative Employee'}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Mobile Header */}
                <MobileHeader title={title} unreadCount={unreadCount} isDark={isDark} onToggleTheme={toggleTheme} />

                {/* Page Content */}
                <main id="main-content" tabIndex="-1" className="flex-1 pb-20 md:pb-0 bg-bg outline-none">
                    {children}
                </main>
            </div>

            {/* ── Mobile Bottom Navigation ──────────────────────── */}
            <BottomNav unreadCount={unreadCount} />

            {/* ── Real-Time Toast Notifications ─────────────────── */}
            <NotificationToast
                notifications={liveNotifications}
                onDismiss={dismissToast}
            />
        </div>
    )
}

function NavLink({ item, currentUrl }) {
    const active = currentUrl.startsWith(item.href)
    return (
        <Link
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                active
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold shadow-2xs'
                    : 'text-sub hover:text-text hover:bg-field'
            }`}
        >
            <span className={active ? 'text-emerald-600 dark:text-emerald-400' : 'text-dim'}>
                {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
        </Link>
    )
}
