import { Link, usePage, router } from '@inertiajs/react'

const navItems = [
    { label: 'Dashboard',       href: '/admin/dashboard',     section: 'Overview'   },
    { label: 'Employees',       href: '/admin/employees',      section: 'Workforce'  },
    { label: 'DTR records',     href: '/admin/dtr',            section: 'Workforce'  },
    { label: 'Edit requests',   href: '/admin/edit-requests',  section: 'Workforce', badge: true },
    { label: 'Process payroll', href: '/admin/payroll',        section: 'Payroll'    },
    { label: 'DTR archives',    href: '/admin/archives',       section: 'Payroll'    },
    { label: 'Settings',        href: '/admin/settings',       section: 'System'     },
]

export default function AdminLayout({ children, pendingEditCount = 0 }) {
    const currentUrl = window.location.pathname
    const sections = [...new Set(navItems.map(i => i.section))]

    function logout() {
        router.post('/logout')
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <aside className="w-48 flex-shrink-0 flex flex-col py-5"
                style={{ background: '#26215C' }}>

                {/* Brand */}
                <div className="flex items-center gap-2 px-4 pb-4 mb-2"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="w-7 h-7 rounded-md flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                    </div>
                    <div>
                        <p className="text-white font-medium" style={{ fontSize: 12 }}>PMPC WorkForce</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Super admin</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 mt-2">
                    {sections.map(section => (
                        <div key={section}>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '8px 16px 2px', letterSpacing: '.5px', textTransform: 'uppercase' }}>
                                {section}
                            </p>
                            {navItems.filter(i => i.section === section).map(item => (
                                <AdminNavLink key={item.href} item={item} currentUrl={currentUrl}
                                    badge={item.badge && pendingEditCount > 0 ? pendingEditCount : null} />
                            ))}
                        </div>
                    ))}
                </nav>

                {/* User footer */}
                <div className="px-4 pt-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-medium"
                            style={{ background: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                            SA
                        </div>
                        <div>
                            <p className="text-white font-medium" style={{ fontSize: 11 }}>Super Admin</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>PMPC Head Office</p>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full text-left px-2 py-1 rounded text-xs"
                        style={{ color: 'rgba(255,255,255,0.45)' }}>
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

function AdminNavLink({ item, currentUrl, badge }) {
    const active = currentUrl.startsWith(item.href)
    return (
        <Link href={item.href}
            className="flex items-center justify-between px-4 py-2 text-xs transition-colors"
            style={{
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderLeft: active ? '2px solid #AFA9EC' : '2px solid transparent',
            }}>
            <span>{item.label}</span>
            {badge && (
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>
                    {badge}
                </span>
            )}
        </Link>
    )
}