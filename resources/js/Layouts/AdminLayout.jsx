import { useState } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import ThemeToggle from '@/Components/ThemeToggle'
import useTheme from '@/hooks/useTheme'

const navItems = [
    {
        label: 'Dashboard',
        href: '/admin/dashboard',
        section: 'Overview',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
        ),
    },
    {
        label: 'Employees',
        href: '/admin/employees',
        section: 'Workforce',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
        ),
    },
    {
        label: 'DTR records',
        href: '/admin/dtr',
        section: 'Workforce',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        label: 'Edit requests',
        href: '/admin/edit-requests',
        section: 'Workforce',
        badge: true,
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
        ),
    },
    {
        label: 'Process payroll',
        href: '/admin/payroll',
        section: 'Payroll',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
        ),
    },
    {
        label: 'Payroll analytics',
        href: '/admin/payroll/analytics',
        section: 'Payroll',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
        ),
    },
    {
        label: '13th month pay',
        href: '/admin/thirteenth-month',
        section: 'Payroll',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
        ),
    },
    {
        label: 'DTR archives',
        href: '/admin/archives',
        section: 'Payroll',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
        ),
    },
    {
        label: 'Settings',
        href: '/admin/settings',
        section: 'System',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        label: 'My DTR',
        href: '/employee/dtr',
        section: 'Personal',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
        ),
    },
    {
        label: 'My tasks',
        href: '/employee/planner',
        section: 'Personal',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
]

export default function AdminLayout({ children, pendingEditCount = 0 }) {
    const page = usePage()
    const { auth } = page.props
    const employee = auth?.employee
    const { isDark, toggleTheme } = useTheme()
    const [drawerOpen, setDrawerOpen] = useState(false)
    const currentUrl = new URL(page.url, 'http://localhost').pathname
    const sections = [...new Set(navItems.map(i => i.section))]

    const activeItem = navItems
        .filter(i => currentUrl === i.href || currentUrl.startsWith(i.href + '/'))
        .reduce((best, i) => (!best || i.href.length > best.href.length ? i : best), null) ?? navItems[0]

    function logout() {
        router.post('/logout')
    }

    return (
        <div className="admin-portal flex min-h-screen bg-bg">
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {/* ── Mobile Top Bar ───────────────────────────────── */}
            <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 h-16 border-b border-border bg-panel/95 backdrop-blur-md">
                <button
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Open menu"
                    className="w-10 h-10 -ml-2 rounded-lg flex items-center justify-center text-sub hover:text-text hover:bg-field transition-colors"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                        <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                </button>
                <div className="min-w-0 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Admin</p>
                    <p className="text-sm font-heading font-semibold text-text truncate">{activeItem?.label}</p>
                </div>
                <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            </div>

            {/* ── Mobile Drawer Backdrop ────────────────────────── */}
            {drawerOpen && (
                <div className="md:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Admin navigation">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => setDrawerOpen(false)} />
                    <SidebarContent
                        navItems={navItems}
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
            <aside className="hidden md:flex w-64 flex-shrink-0 flex-col sticky top-0 h-screen">
                <SidebarContent
                    navItems={navItems}
                    sections={sections}
                    activeHref={activeItem?.href}
                    pendingEditCount={pendingEditCount}
                    onLogout={logout}
                    employee={employee}
                    className="h-full"
                />
            </aside>

            {/* ── Main Content Area with Contextual Top Bar ────── */}
            <div className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0">
                {/* Desktop Sticky Header */}
                <header className="hidden md:flex h-16 items-center justify-between px-8 border-b border-border/80 bg-panel/80 backdrop-blur-md sticky top-0 z-20">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-xs font-medium text-sub">
                        <Link href="/admin/dashboard" className="hover:text-text transition-colors">Admin</Link>
                        <span className="text-dim">/</span>
                        <span className="text-dim">{activeItem?.section}</span>
                        <span className="text-dim">/</span>
                        <span className="text-text font-semibold">{activeItem?.label}</span>
                    </nav>

                    {/* Right Tools: Notification counter, ThemeToggle, Profile pill */}
                    <div className="flex items-center gap-3">
                        {pendingEditCount > 0 && (
                            <Link
                                href="/admin/edit-requests"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 hover:bg-amber-100 transition-colors"
                            >
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                {pendingEditCount} Pending Request{pendingEditCount > 1 ? 's' : ''}
                            </Link>
                        )}
                        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                        <div className="h-5 w-px bg-border mx-1" />
                        <div className="flex items-center gap-2.5 pl-1">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-heading font-semibold text-xs shadow-xs">
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
        <div className={`flex flex-col border-r border-border bg-panel ${className}`}>
            {/* Brand Header */}
            <div className="flex items-center gap-3 h-16 px-5 border-b border-border/80">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white dark:bg-slate-900 p-1 border border-border/80 shadow-2xs">
                    <img src="/pmpc_ems.png" alt="PMPC" className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0">
                    <p className="font-heading font-bold text-sm text-text tracking-tight truncate">PMPC WorkForce</p>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold tracking-wider uppercase">Admin Portal</p>
                    </div>
                </div>
            </div>

            {/* Navigation List */}
            <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Admin navigation">
                {sections.map(section => (
                    <div key={section}>
                        <p className="text-[10px] font-bold text-dim px-3 mb-1.5 tracking-wider uppercase">
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
                                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ${
                                            active
                                                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs dark:bg-indigo-950/50 dark:text-indigo-300'
                                                : 'text-sub hover:bg-field hover:text-text'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className={active ? 'text-indigo-600 dark:text-indigo-400' : 'text-dim'}>
                                                {item.icon}
                                            </span>
                                            <span className="truncate">{item.label}</span>
                                        </div>
                                        {item.badge && pendingEditCount > 0 && (
                                            <span className="text-[10px] px-1.5 py-0.25 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                {pendingEditCount}
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
            <div className="p-3 border-t border-border/80">
                <div className="p-2 rounded-xl bg-field/60 border border-border/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-heading font-semibold text-xs flex-shrink-0">
                            {employee?.initials ?? 'SA'}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-xs text-text truncate">{employee?.full_name ?? 'Super Admin'}</p>
                            <p className="text-[10px] text-sub truncate">{employee?.employee_id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        title="Sign out"
                        className="p-1.5 rounded-lg text-sub hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
