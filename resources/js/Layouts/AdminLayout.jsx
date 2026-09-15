import { useState } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import ThemeToggle from '@/Components/ThemeToggle'
import useTheme from '@/hooks/useTheme'

const navItems = [
    { label: 'Dashboard',       href: '/admin/dashboard',        section: 'Overview'  },
    { label: 'Employees',       href: '/admin/employees',        section: 'Workforce' },
    { label: 'DTR records',     href: '/admin/dtr',              section: 'Workforce' },
    { label: 'Edit requests',   href: '/admin/edit-requests',    section: 'Workforce', badge: true },
    { label: 'Process payroll', href: '/admin/payroll',          section: 'Payroll'   },
    { label: 'Payroll analytics', href: '/admin/payroll/analytics', section: 'Payroll' },
    { label: 'DTR archives',    href: '/admin/archives',         section: 'Payroll'   },
    { label: 'Settings',        href: '/admin/settings',         section: 'System'    },
    { label: '13th month pay',  href: '/admin/thirteenth-month', section: 'Payroll'   },
    { label: 'My DTR',          href: '/employee/dtr',           section: 'Personal'  },
    { label: 'My tasks',        href: '/employee/planner',       section: 'Personal'  },
]

export default function AdminLayout({ children, pendingEditCount = 0 }) {
    const { auth } = usePage().props
    const employee = auth?.employee
    const { isDark, toggleTheme } = useTheme()
    const [drawerOpen, setDrawerOpen] = useState(false)
    const currentUrl = window.location.pathname
    const sections = [...new Set(navItems.map(i => i.section))]

    // Pick the single most specific nav item whose href matches the current
    // URL, so overlapping prefixes (e.g. /admin/payroll vs
    // /admin/payroll/analytics) don't both light up at once.
    const activeHref = navItems
        .filter(i => currentUrl === i.href || currentUrl.startsWith(i.href + '/'))
        .reduce((best, i) => (!best || i.href.length > best.length ? i.href : best), null)

    const activeLabel = navItems.find(i => i.href === activeHref)?.label ?? 'Dashboard'

    function logout() {
        router.post('/logout')
    }

    return (
        <div className="flex min-h-screen bg-bg">
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {/* ── Mobile top bar (hidden md:up) ─────────────────── */}
            <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 h-16 border-b border-border bg-panel">
                <button onClick={() => setDrawerOpen(true)} aria-label="Open menu"
                    className="w-9 h-9 -ml-2 flex items-center justify-center text-sub">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                        <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                </button>
                <div className="min-w-0 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand">Admin</p>
                    <p className="text-sm font-semibold text-text truncate">{activeLabel}</p>
                </div>
                <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            </div>

            {/* ── Mobile drawer + backdrop ───────────────────────── */}
            {drawerOpen && (
                <div className="md:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Admin navigation">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
                    <SidebarContent
                        navItems={navItems} sections={sections} activeHref={activeHref}
                        pendingEditCount={pendingEditCount} onLogout={logout}
                        employee={employee}
                        onNavigate={() => setDrawerOpen(false)}
                        className="relative w-64 max-w-[80vw] animate-in-left"
                    />
                </div>
            )}

            {/* ── Desktop sidebar (md:up) ────────────────────────── */}
            <aside className="hidden md:flex w-64 flex-shrink-0 flex-col sticky top-0 h-screen">
                <SidebarContent
                    navItems={navItems} sections={sections} activeHref={activeHref}
                    pendingEditCount={pendingEditCount} onLogout={logout}
                    employee={employee}
                    headerExtra={<ThemeToggle isDark={isDark} onToggle={toggleTheme} />}
                    className="h-full"
                />
            </aside>

            <main id="main-content" tabIndex="-1" className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0 bg-bg">
                {children}
            </main>

            <style>{`
                @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                .animate-in-left { animation: slideInLeft 0.22s ease-out; }
            `}</style>
        </div>
    )
}

function SidebarContent({ navItems, sections, activeHref, pendingEditCount, onLogout, onNavigate, className = '', headerExtra, employee }) {
    return (
        <div className={`flex flex-col border-r border-border bg-panel ${className}`}>
            {/* Brand */}
            <div className="flex items-center justify-between gap-3 min-h-20 px-5 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 bg-brand text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 32 32" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                            <circle cx="12" cy="12" r="7" /><circle cx="20" cy="12" r="7" /><circle cx="16" cy="20" r="7" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-text truncate">PMPC WorkForce</p>
                        <p className="text-[10px] text-brand font-semibold tracking-[.1em] uppercase">Admin portal</p>
                    </div>
                </div>
                {headerExtra}
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 overflow-y-auto" aria-label="Admin navigation">
                {sections.map(section => (
                    <div key={section}>
                        <p className="text-[10px] font-semibold text-dim px-5 pt-3 pb-1.5 tracking-[.12em] uppercase">
                            {section}
                        </p>
                        {navItems.filter(i => i.section === section).map(item => (
                            <AdminNavLink key={item.href} item={item} activeHref={activeHref}
                                onNavigate={onNavigate}
                                badge={item.badge && pendingEditCount > 0 ? pendingEditCount : null} />
                        ))}
                    </div>
                ))}
            </nav>

            {/* User footer */}
            <div className="px-5 py-4 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold border text-xs bg-brand/10 text-brand border-brand/30">
                        {employee?.initials ?? 'SA'}
                    </div>
                    <div>
                        <p className="font-semibold text-xs text-text truncate max-w-32">{employee?.full_name ?? 'Super Admin'}</p>
                        <p className="text-[10px] text-dim">{employee?.employee_id}</p>
                    </div>
                </div>
                <button onClick={onLogout}
                    className="w-full min-h-10 text-left px-3 py-2 text-xs font-medium text-sub border border-border transition-colors hover:text-red hover:border-red/40">
                    Sign out
                </button>
            </div>
        </div>
    )
}

function AdminNavLink({ item, activeHref, badge, onNavigate }) {
    const active = item.href === activeHref
    return (
        <Link href={item.href} onClick={onNavigate}
            className={`flex items-center justify-between min-h-10 mx-3 px-3 py-2 text-xs font-medium transition-colors border-l-2 ${
                active
                    ? 'text-brand bg-brand/10 border-l-brand'
                    : 'text-sub border-l-transparent hover:text-text hover:bg-field'
            }`}>
            <span>{item.label}</span>
            {badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red/15 text-red">
                    {badge}
                </span>
            )}
        </Link>
    )
}
