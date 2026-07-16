import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
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

            {/* ── Mobile top bar (hidden md:up) ─────────────────── */}
            <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 h-14 border-b border-border bg-panel/95 backdrop-blur">
                <button onClick={() => setDrawerOpen(true)} aria-label="Open menu"
                    className="w-9 h-9 -ml-2 flex items-center justify-center text-sub">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                        <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                </button>
                <p className="text-sm font-medium text-text truncate">{activeLabel}</p>
                <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            </div>

            {/* ── Mobile drawer + backdrop ───────────────────────── */}
            {drawerOpen && (
                <div className="md:hidden fixed inset-0 z-40 flex">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
                    <SidebarContent
                        navItems={navItems} sections={sections} activeHref={activeHref}
                        pendingEditCount={pendingEditCount} onLogout={logout}
                        onNavigate={() => setDrawerOpen(false)}
                        className="relative w-64 max-w-[80vw] animate-in-left"
                    />
                </div>
            )}

            {/* ── Desktop sidebar (md:up) ────────────────────────── */}
            <aside className="hidden md:flex w-56 flex-shrink-0 flex-col sticky top-0 h-screen">
                <SidebarContent
                    navItems={navItems} sections={sections} activeHref={activeHref}
                    pendingEditCount={pendingEditCount} onLogout={logout}
                    headerExtra={<ThemeToggle isDark={isDark} onToggle={toggleTheme} />}
                    className="h-full"
                />
            </aside>

            <main className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0 bg-bg">
                {children}
            </main>

            <style>{`
                @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                .animate-in-left { animation: slideInLeft 0.22s ease-out; }
            `}</style>
        </div>
    )
}

function SidebarContent({ navItems, sections, activeHref, pendingEditCount, onLogout, onNavigate, className = '', headerExtra }) {
    return (
        <div className={`flex flex-col py-5 border-r border-border bg-panel ${className}`}>
            {/* Brand */}
            <div className="flex items-center justify-between gap-2 px-4 pb-4 mb-2 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0 bg-violet/10 border-violet/30">
                        <svg className="w-4 h-4 text-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <p className="font-display font-semibold text-[12px] text-text truncate">PMPC WorkForce</p>
                        <p className="font-mono text-[9px] text-dim tracking-[.12em]">SUPER ADMIN</p>
                    </div>
                </div>
                {headerExtra}
            </div>

            {/* Nav */}
            <nav className="flex-1 mt-2 overflow-y-auto">
                {sections.map(section => (
                    <div key={section}>
                        <p className="font-mono text-[9px] text-dim px-4 pt-2.5 pb-1 tracking-[.12em] uppercase">
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
            <div className="px-4 pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono font-medium border text-[11px] bg-violet/10 text-violet border-violet/30">
                        SA
                    </div>
                    <div>
                        <p className="font-medium text-[11px] text-text">Super Admin</p>
                        <p className="text-[10px] text-dim">PMPC Head Office</p>
                    </div>
                </div>
                <button onClick={onLogout}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-dim transition-colors hover:text-red hover:bg-red/10">
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
            className={`flex items-center justify-between px-4 py-2.5 md:py-2 text-xs transition-colors border-l-2 ${
                active
                    ? 'text-text bg-violet/10 border-l-violet'
                    : 'text-sub border-l-transparent hover:text-text'
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