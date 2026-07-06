import { Link, usePage, router } from '@inertiajs/react'

const navItems = [
    { label: 'Dashboard',       href: '/employee/dashboard' },
    { label: 'My DTR',          href: '/employee/dtr'       },
    { label: 'Task planner',    href: '/employee/planner'   },
    { label: 'My profile',      href: '/employee/profile'   },
    { label: 'Government IDs',  href: '/employee/gov-ids'   },
    { label: 'Change password', href: '/employee/password'  },
]

export default function EmployeeLayout({ children }) {
    const { auth } = usePage().props
    const employee = auth?.employee
    const currentUrl = window.location.pathname

    function logout() {
        router.post('/logout')
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <aside className="w-48 flex-shrink-0 flex flex-col py-5"
                style={{ background: '#0F6E56' }}>

                {/* Brand */}
                <div className="flex items-center gap-2 px-4 pb-4 mb-2"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="w-7 h-7 rounded-md flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 10-8 0 4 4 0 008 0z"/>
                        </svg>
                    </div>
                    <div>
                        <p className="text-white font-medium" style={{ fontSize: 12 }}>PMPC WorkForce</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Employee portal</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 mt-2">
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '4px 16px 2px', letterSpacing: '.5px', textTransform: 'uppercase' }}>
                        Main
                    </p>
                    {navItems.slice(0, 3).map(item => (
                        <NavLink key={item.href} item={item} currentUrl={currentUrl} />
                    ))}
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '10px 16px 2px', letterSpacing: '.5px', textTransform: 'uppercase' }}>
                        Account
                    </p>
                    {navItems.slice(3).map(item => (
                        <NavLink key={item.href} item={item} currentUrl={currentUrl} />
                    ))}
                </nav>

                {/* User footer */}
                <div className="px-4 pt-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-medium"
                            style={{ background: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                            {employee?.initials}
                        </div>
                        <div>
                            <p className="text-white font-medium" style={{ fontSize: 11 }}>{employee?.full_name}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{employee?.employee_id}</p>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full text-left px-2 py-1 rounded text-xs"
                        style={{ color: 'rgba(255,255,255,0.5)' }}>
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

function NavLink({ item, currentUrl }) {
    const active = currentUrl.startsWith(item.href)
    return (
        <Link href={item.href}
            className="flex items-center gap-2 px-4 py-2 text-xs transition-colors"
            style={{
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderLeft: active ? '2px solid #9FE1CB' : '2px solid transparent',
            }}>
            {item.label}
        </Link>
    )
}