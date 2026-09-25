import { Link, usePage, router } from '@inertiajs/react'
import useNotifications from '@/hooks/useNotifications'
import NotificationToast from '@/Components/NotificationToast'
import BottomNav from '@/Components/BottomNav'
import MobileHeader from '@/Components/MobileHeader'
import useTheme from '@/hooks/useTheme'
import pmpcLogo from '@images/pmpc_ems.png'

const navMain = [
    {
        label: 'Today',
        href: '/employee/dashboard',
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7.5" height="7.5" rx="2" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
            </svg>
        ),
    },
    {
        label: 'Attendance',
        href: '/employee/dtr',
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.8" />
                <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.8" d="M12 7.5v4.5l3 2" />
                <circle cx="12" cy="12" r="1.2" fill="currentColor" />
            </svg>
        ),
    },
    {
        label: 'My tasks',
        href: '/employee/planner',
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
                <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.8" d="M4.8 7l1 1 2-2" />
                <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.8" d="M12 7h9" />
                <rect x="3" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.8" d="M12 17h9" />
            </svg>
        ),
    },
    {
        label: 'Payslips',
        href: '/employee/payslips',
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="2.5" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
                <path strokeLinecap="round" stroke="currentColor" strokeWidth="1.8" d="M7 9h.01M17 15h.01M3 12h1.5M19.5 12H21" />
            </svg>
        ),
    },
]

const navAccount = [
    {
        label: 'Profile',
        href: '/employee/profile',
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="7.5" r="3.5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
                <path fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.5 3.13-6.5 7-6.5s7 3 7 6.5" />
            </svg>
        ),
    },
]

export default function EmployeeLayout({ children, title }) {
    const { auth, unread_notifications, dtr_today } = usePage().props
    const employee = auth?.employee
    const isSuperAdmin = employee?.role === 'super_admin'
    const currentUrl = window.location.pathname
    useTheme()

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
        <div className="employee-portal portal-shell flex min-h-screen bg-bg">
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {/* ── Desktop Sidebar ───────────────────────────────── */}
            <aside className="portal-sidebar employee-sidebar hidden md:flex w-56 lg:w-60 flex-shrink-0 flex-col sticky top-0 h-screen border-r border-white/15 select-none text-white">
                {/* Brand Header */}
                <div className="flex items-center gap-2.5 h-15 px-4 border-b border-white/15 bg-transparent">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white p-1 shadow-xs border border-white/30">
                        <img
                            src={pmpcLogo}
                            alt="PMPC"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                if (e.currentTarget.src !== window.location.origin + '/pmpc_ems.png') {
                                    e.currentTarget.src = '/pmpc_ems.png'
                                }
                            }}
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="font-heading font-bold text-xs text-white tracking-tight truncate">PMPC WorkForce</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                            <p className="text-[9px] text-emerald-100 font-bold tracking-wider uppercase">Employee Portal</p>
                        </div>
                    </div>
                </div>


                {/* Navigation Links */}
                <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Employee navigation">
                    <div>
                        <p className="text-[10px] font-bold text-white/80 px-3 mb-1.5 tracking-wider uppercase">
                            {isSuperAdmin ? 'Personal workspace' : 'My workday'}
                        </p>
                        <div className="space-y-0.5">
                            {visibleNavMain.map(item => (
                                <NavLink key={item.href} item={item} currentUrl={currentUrl} />
                            ))}

                            {!isSuperAdmin && (
                                <Link
                                    href="/employee/notifications"
                                    aria-current={currentUrl.startsWith('/employee/notifications') ? 'page' : undefined}
                                    className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                                        currentUrl.startsWith('/employee/notifications')
                                            ? 'employee-sidebar-active-pill bg-white text-[#0F6E56] font-bold shadow-xs'
                                            : 'text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-0.5'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <svg className={`w-[18px] h-[18px] shrink-0 transition-colors ${currentUrl.startsWith('/employee/notifications') ? 'text-[#0F6E56]' : 'text-white/70 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24">
                                            <path fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 0 1-3.46 0" />
                                        </svg>
                                        <span>Notifications</span>
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.25 rounded-full font-bold shadow-2xs ${
                                            currentUrl.startsWith('/employee/notifications')
                                                ? 'bg-rose-600 text-white'
                                                : 'bg-rose-500 text-white'
                                        }`}>
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
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-white/15 border border-white/20 hover:bg-white/25 transition-colors"
                            >
                                <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4m0 0l4-4m-4 4h11a4 4 0 0 1 4 4v2" />
                                </svg>
                                <span>Back to Admin Portal</span>
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <p className="text-[10px] font-bold text-white/80 px-3 mb-1.5 tracking-wider uppercase">
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
                <div className="p-3 border-t border-white/15 bg-transparent">
                    <div className="p-2.5 rounded-xl bg-black/20 border border-white/15 flex items-center justify-between gap-2.5 shadow-2xs hover:border-white/30 transition-all backdrop-blur-xs">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-white text-[#0F6E56] flex items-center justify-center font-heading font-bold text-xs flex-shrink-0 shadow-xs ring-2 ring-white/20">
                                {employee?.initials}
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-xs text-white truncate leading-tight">{employee?.full_name}</p>
                                <p className="text-[10px] text-emerald-200 truncate leading-tight font-mono mt-0.5">{employee?.employee_id}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            title="Sign out"
                            aria-label="Sign out"
                            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
                        >
                            <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 15l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main Content Area ─────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Desktop Header */}
                <header className="portal-header hidden md:flex h-13 items-center justify-between px-5 sm:px-6 border-b border-border/80 bg-panel/80 backdrop-blur-md sticky top-0 z-20 select-none">
                    <nav className="flex items-center gap-2 text-xs font-medium text-sub">
                        <span>PMPC WorkForce</span>
                        <span className="text-dim">/</span>
                        <span className="text-text font-semibold">{title || currentItem?.label || 'Portal'}</span>
                    </nav>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#0F6E56] text-white flex items-center justify-center font-heading font-semibold text-xs shadow-xs ring-2 ring-[#0F6E56]/15">
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
                <MobileHeader title={title} unreadCount={unreadCount} />

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
            aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                active
                    ? 'employee-sidebar-active-pill bg-white text-[#0F6E56] font-bold shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-0.5'
            }`}
        >
            <span className={`transition-colors ${active ? 'text-[#0F6E56]' : 'text-white/70 group-hover:text-white'}`}>
                {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
        </Link>
    )
}
