import { Link, usePage, router } from '@inertiajs/react'

/* ---------- design tokens (shared Dark HUD system) ---------- */
export const C = {
    bg:      '#06090D',
    panel:   'rgba(14,20,27,0.72)',
    field:   'rgba(255,255,255,0.03)',
    border:  '#1F2C35',
    text:    '#E7F1EE',
    sub:     '#83979C',
    dim:     '#4C5C61',
    teal:    '#14F1B2',
    blue:    '#5AA9FF',
    amber:   '#FFC168',
    purple:  '#C29CFF',
    violet:  '#8B7CF6',
    red:     '#FF6B81',
}

const navItems = [
    { label: 'Dashboard',       href: '/admin/dashboard',     section: 'Overview'   },
    { label: 'Employees',       href: '/admin/employees',      section: 'Workforce'  },
    { label: 'DTR records',     href: '/admin/dtr',            section: 'Workforce'  },
    { label: 'Edit requests',   href: '/admin/edit-requests',  section: 'Workforce', badge: true },
    { label: 'Process payroll', href: '/admin/payroll',        section: 'Payroll'    },
    { label: 'Payroll analytics', href: '/admin/payroll/analytics', section: 'Payroll' },
    { label: 'DTR archives',    href: '/admin/archives',       section: 'Payroll'    },
    { label: 'Settings',        href: '/admin/settings',       section: 'System'     },
    { label: '13th month pay', href: '/admin/thirteenth-month', section: 'Payroll' },
    { label: 'My DTR',          href: '/employee/dtr',         section: 'Personal' },
    { label: 'My tasks',        href: '/employee/planner',     section: 'Personal' },
]

export default function AdminLayout({ children, pendingEditCount = 0 }) {
    const currentUrl = window.location.pathname
    const sections = [...new Set(navItems.map(i => i.section))]

    // Pick the single most specific nav item whose href matches the current
    // URL, so overlapping prefixes (e.g. /admin/payroll vs
    // /admin/payroll/analytics) don't both light up at once.
    const activeHref = navItems
        .filter(i => currentUrl === i.href || currentUrl.startsWith(i.href + '/'))
        .reduce((best, i) => (!best || i.href.length > best.length ? i.href : best), null)

    function logout() {
        router.post('/logout')
    }

    return (
        <div className="flex min-h-screen" style={{ background: C.bg }}>
            <aside className="w-52 flex-shrink-0 flex flex-col py-5 relative"
                style={{ background: 'linear-gradient(180deg, #0C0A1E 0%, #06090D 100%)', borderRight: `1px solid ${C.border}` }}>

                {/* Brand */}
                <div className="flex items-center gap-2 px-4 pb-4 mb-2"
                    style={{ borderBottom: `1px solid ${C.border}` }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center border"
                        style={{ background: 'rgba(139,124,246,0.14)', borderColor: 'rgba(139,124,246,0.3)' }}>
                        <svg className="w-4 h-4" style={{ color: C.violet }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                    </div>
                    <div>
                        <p className="font-display font-semibold" style={{ fontSize: 12, color: C.text }}>PMPC WorkForce</p>
                        <p className="font-mono" style={{ fontSize: 9, color: C.dim, letterSpacing: '.05em' }}>SUPER ADMIN</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 mt-2 overflow-y-auto">
                    {sections.map(section => (
                        <div key={section}>
                            <p className="font-mono" style={{ fontSize: 9, color: C.dim, padding: '10px 16px 4px', letterSpacing: '.12em', textTransform: 'uppercase' }}>
                                {section}
                            </p>
                            {navItems.filter(i => i.section === section).map(item => (
                                <AdminNavLink key={item.href} item={item} activeHref={activeHref}
                                    badge={item.badge && pendingEditCount > 0 ? pendingEditCount : null} />
                            ))}
                        </div>
                    ))}
                </nav>

                {/* User footer */}
                <div className="px-4 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono font-medium border"
                            style={{ background: 'rgba(139,124,246,0.12)', color: C.violet, borderColor: 'rgba(139,124,246,0.3)', fontSize: 11 }}>
                            SA
                        </div>
                        <div>
                            <p className="font-medium" style={{ fontSize: 11, color: C.text }}>Super Admin</p>
                            <p style={{ fontSize: 10, color: C.dim }}>PMPC Head Office</p>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors"
                        style={{ color: C.dim }}
                        onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.background = 'rgba(255,107,129,0.08)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = C.dim; e.currentTarget.style.background = 'transparent' }}>
                        Sign out
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0">
                {children}
            </main>
        </div>
    )
}

function AdminNavLink({ item, activeHref, badge }) {
    const active = item.href === activeHref
    return (
        <Link href={item.href}
            className="flex items-center justify-between px-4 py-2 text-xs transition-colors"
            style={{
                color: active ? C.text : C.sub,
                background: active ? 'rgba(139,124,246,0.10)' : 'transparent',
                borderLeft: active ? `2px solid ${C.violet}` : '2px solid transparent',
            }}>
            <span>{item.label}</span>
            {badge && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(255,107,129,0.15)', color: C.red, fontSize: 10 }}>
                    {badge}
                </span>
            )}
        </Link>
    )
}