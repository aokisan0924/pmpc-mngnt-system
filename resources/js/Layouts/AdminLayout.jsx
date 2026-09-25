import { useState, useEffect } from 'react'
import { Link, router, usePage, usePoll } from '@inertiajs/react'
import useTheme from '@/hooks/useTheme'
import pmpcLogo from '@images/pmpc_ems.png'

const navItems = [
    {
        label: 'Operations',
        href: '/admin/dashboard',
        section: 'Command center',
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
        label: 'My attendance',
        href: '/employee/dtr',
        section: 'Personal workspace',
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
        section: 'Personal workspace',
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
        label: 'Employees',
        href: '/admin/employees',
        section: 'People & attendance',
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="7.5" r="3.5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
                <path fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
                <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M16 3.8a3.5 3.5 0 0 1 0 6.4" />
                <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M17.5 14.5c2.3.6 4 2.3 4.5 5" />
            </svg>
        ),
    },
    {
        label: 'Attendance records',
        href: '/admin/dtr',
        section: 'People & attendance',
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="1.8" />
                <path d="M3 8.5h18" stroke="currentColor" strokeWidth="1.8" />
                <path d="M3 4c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2v4.5H3V4z" fill="currentColor" fillOpacity="0.25" />
                <path strokeLinecap="round" stroke="currentColor" strokeWidth="1.8" d="M8 2.5v2M16 2.5v2" />
                <circle cx="8" cy="13" r="1" fill="currentColor" />
                <circle cx="12" cy="13" r="1" fill="currentColor" />
                <circle cx="16" cy="13" r="1" fill="currentColor" />
                <circle cx="8" cy="17" r="1" fill="currentColor" />
                <circle cx="12" cy="17" r="1" fill="currentColor" />
                <circle cx="16" cy="17" r="1" fill="currentColor" />
            </svg>
        ),
    },
    {
        label: 'Attendance requests',
        href: '/admin/edit-requests',
        section: 'People & attendance',
        badge: true,
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <path fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" />
                <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.8" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
        ),
    },
    {
        label: 'Payroll runs',
        href: '/admin/payroll',
        section: 'Compensation & reports',
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
                <path strokeLinecap="round" stroke="currentColor" strokeWidth="1.8" d="M6 9.5v.01M18 14.5v.01" />
            </svg>
        ),
    },
    {
        label: 'Payroll analytics',
        href: '/admin/payroll/analytics',
        section: 'Compensation & reports',
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="12" width="4" height="8" rx="1.5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" />
                <rect x="10" y="7" width="4" height="13" rx="1.5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" />
                <rect x="17" y="3" width="4" height="17" rx="1.5" fill="currentColor" fillOpacity="0.28" stroke="currentColor" strokeWidth="1.8" />
                <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.8" d="M3 21h18" />
            </svg>
        ),
    },
    {
        label: '13th month pay',
        href: '/admin/thirteenth-month',
        section: 'Compensation & reports',
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="9" width="18" height="12" rx="2" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.8" />
                <path d="M3 9h18v3H3z" fill="currentColor" fillOpacity="0.25" />
                <line x1="12" y1="9" x2="12" y2="21" stroke="currentColor" strokeWidth="1.8" />
                <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.8" d="M12 9c-1.8 0-4-1.2-4-2.8 0-1.4 1.1-2.2 2.2-2.2 1.6 0 2.8 1.8 2.8 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.8" d="M12 9c1.8 0 4-1.2 4-2.8 0-1.4-1.1-2.2-2.2-2.2-1.6 0-2.8 1.8-2.8 5z" />
            </svg>
        ),
    },
    {
        label: 'DTR archives',
        href: '/admin/archives',
        section: 'Compensation & reports',
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="6" rx="2" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
                <path fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M5 10v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9" />
                <line x1="10" y1="15" x2="14" y2="15" strokeLinecap="round" stroke="currentColor" strokeWidth="1.8" />
                <line x1="10" y1="7" x2="14" y2="7" strokeLinecap="round" stroke="currentColor" strokeWidth="1.8" />
            </svg>
        ),
    },
    {
        label: 'Settings',
        href: '/admin/settings',
        section: 'Administration',
        icon: (
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3.2" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
                <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.8" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
        ),
    },
]

export default function AdminLayout({ children, pendingEditCount = 0 }) {
    const page = usePage()
    const { auth } = page.props
    const employee = auth?.employee
    useTheme()
    const [drawerOpen, setDrawerOpen] = useState(false)
    const canViewRequests = employee?.can_view_dtr_requests ?? true
    const adminNavItems = navItems.filter(item => {
        if (item.href === '/admin/edit-requests' && !canViewRequests) {
            return false
        }
        return true
    })
    const sections = [...new Set(adminNavItems.map(i => i.section))]

    // Close mobile drawer on Escape key press for keyboard accessibility
    useEffect(() => {
        if (!drawerOpen) return
        function handleKeyDown(e) {
            if (e.key === 'Escape') setDrawerOpen(false)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [drawerOpen])

    // Silent background poll every 15s to keep pending edit count badge fresh across the admin portal
    usePoll(15000, {
        only: ['pendingEditCount', 'pendingCount'],
        preserveScroll: true,
        preserveState: true,
    })

    const activeItem = adminNavItems
        .filter(i => currentUrl === i.href || currentUrl.startsWith(i.href + '/'))
        .reduce((best, i) => (!best || i.href.length > best.href.length ? i : best), null) ?? navItems[0]

    function logout() {
        router.post('/logout')
    }

    return (
        <div className="admin-portal portal-shell flex min-h-screen bg-bg">
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {/* ── Mobile Top Bar ───────────────────────────────── */}
            <div className="portal-header md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 h-13 border-b border-border bg-panel/95 backdrop-blur-md">
                <button
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Open menu"
                    className="w-9 h-9 -ml-2 rounded-lg flex items-center justify-center text-sub hover:text-text hover:bg-field transition-colors"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                        <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                </button>
                <div className="min-w-0 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Admin</p>
                    <p className="text-sm font-heading font-semibold text-text truncate">{activeItem?.label}</p>
                </div>
                <div className="w-9 -mr-2" aria-hidden="true" />
            </div>

            {/* ── Mobile Drawer Backdrop ────────────────────────── */}
            {drawerOpen && (
                <div className="md:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Admin navigation">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => setDrawerOpen(false)} />
                    <SidebarContent
                        navItems={adminNavItems}
                        sections={sections}
                        activeHref={activeItem?.href}
                        pendingEditCount={pendingEditCount}
                        onLogout={logout}
                        employee={employee}
                        onNavigate={() => setDrawerOpen(false)}
                        className="relative w-72 max-w-[85vw] shadow-2xl animate-in-left"
                    />
                </div>
            )}

            {/* ── Desktop Sidebar ───────────────────────────────── */}
            <aside className="hidden md:flex w-56 lg:w-60 flex-shrink-0 flex-col sticky top-0 h-screen select-none">
                <SidebarContent
                    navItems={adminNavItems}
                    sections={sections}
                    activeHref={activeItem?.href}
                    pendingEditCount={pendingEditCount}
                    onLogout={logout}
                    employee={employee}
                    className="h-full"
                />
            </aside>

            {/* ── Main Content Area with Contextual Top Bar ────── */}
            <div className="flex-1 flex flex-col min-w-0 pt-13 md:pt-0">
                {/* Desktop Sticky Header */}
                <header className="portal-header hidden md:flex h-13 items-center justify-between px-5 sm:px-6 border-b border-border/80 bg-panel/80 backdrop-blur-md sticky top-0 z-20 select-none">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-xs font-medium text-sub">
                        <Link href="/admin/dashboard" className="hover:text-text transition-colors">Admin</Link>
                        <span className="text-dim">/</span>
                        <span className="text-dim">{activeItem?.section}</span>
                        <span className="text-dim">/</span>
                        <span className="text-text font-semibold">{activeItem?.label}</span>
                    </nav>

                    {/* Right Tools: Notification counter, Profile pill */}
                    <div className="flex items-center gap-3">
                        {canViewRequests && pendingEditCount > 0 && (
                            <Link
                                href="/admin/edit-requests"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 hover:bg-amber-100 transition-colors shadow-2xs"
                            >
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                {pendingEditCount} Pending Request{pendingEditCount > 1 ? 's' : ''}
                            </Link>
                        )}
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#26215C] text-white flex items-center justify-center font-heading font-semibold text-xs shadow-xs ring-2 ring-[#26215C]/15">
                                {employee?.initials ?? 'SA'}
                            </div>
                            <div className="hidden lg:block text-left">
                                <p className="text-xs font-semibold text-text leading-tight">{employee?.full_name ?? 'Super Admin'}</p>
                                <p className="text-[10px] text-sub leading-tight">{employee?.position ?? 'HR Administrator'}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main id="main-content" tabIndex="-1" className="flex-1 bg-bg outline-none">
                    {children}
                </main>
            </div>

            <style>{`
                @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                .animate-in-left { animation: slideInLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </div>
    )
}

function SidebarContent({ navItems, sections, activeHref, pendingEditCount, onLogout, onNavigate, className = '', employee }) {
    return (
        <div className={`portal-sidebar admin-sidebar flex flex-col border-r border-white/15 bg-[#26215C] text-white select-none ${className}`}>
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
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse" />
                        <p className="text-[9px] text-indigo-200 font-bold tracking-wider uppercase">Admin Portal</p>
                    </div>
                </div>
            </div>

            {/* Navigation List */}
            <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Admin navigation">
                {sections.map(section => (
                    <div key={section}>
                        <p className="text-[10px] font-bold text-white/80 px-3 mb-1.5 tracking-wider uppercase">
                            {section}
                        </p>
                        <div className="space-y-0.5">
                            {navItems.filter(i => i.section === section).map(item => {
                                const active = item.href === activeHref
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={onNavigate}
                                        aria-current={active ? 'page' : undefined}
                                        className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                                            active
                                                ? 'admin-sidebar-active-pill bg-white text-[#26215C] font-bold shadow-xs'
                                                : 'text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-0.5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className={`transition-colors ${active ? 'text-[#26215C]' : 'text-white/70 group-hover:text-white'}`}>
                                                {item.icon}
                                            </span>
                                            <span className="truncate">{item.label}</span>
                                        </div>
                                        {item.badge && pendingEditCount > 0 && (
                                            <span className={`text-[10px] px-1.5 py-0.25 rounded-full font-bold shadow-2xs ${
                                                active
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-amber-400 text-[#26215C]'
                                            }`}>
                                                {pendingEditCount > 99 ? '99+' : pendingEditCount}
                                            </span>
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User Footer Profile */}
            <div className="p-3 border-t border-white/15 bg-transparent">
                <div className="p-2.5 rounded-xl bg-black/20 border border-white/15 flex items-center justify-between gap-2.5 shadow-2xs hover:border-white/30 transition-all backdrop-blur-xs">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white text-[#26215C] flex items-center justify-center font-heading font-bold text-xs flex-shrink-0 shadow-xs ring-2 ring-white/20">
                            {employee?.initials ?? 'SA'}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-xs text-white truncate leading-tight">{employee?.full_name ?? 'Super Admin'}</p>
                            <p className="text-[10px] text-indigo-200 truncate leading-tight font-mono mt-0.5">{employee?.employee_id ?? 'ADM-0001'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
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
        </div>
    )
}
