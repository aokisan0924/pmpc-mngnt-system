import { Link, usePage } from '@inertiajs/react'

const C = {
    panel: 'rgba(14,20,27,0.92)', border: '#1F2C35', teal: '#14F1B2', dim: '#4C5C61', red: '#FF6B81',
}

const tabs = [
    {
        href:  '/employee/dashboard',
        label: 'Home',
        icon: (active) => (
            <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'}
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
        ),
    },
    {
        href:  '/employee/dtr',
        label: 'DTR',
        icon: (active) => (
            <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'}
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
        ),
    },
    {
        href:  '/employee/planner',
        label: 'Tasks',
        icon: (active) => (
            <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'}
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
        ),
    },
    {
        href:  '/employee/payslips',
        label: 'Payslips',
        icon: (active) => (
            <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'}
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
        ),
    },
    {
        href:  '/employee/notifications',
        label: 'Alerts',
        badge: true,
        icon: (active) => (
            <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'}
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
        ),
    },
]

const adminBackTab = {
    href:  '/admin/dashboard',
    label: 'Admin',
    icon: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
        </svg>
    ),
}

export default function BottomNav({ unreadCount = 0 }) {
    const currentUrl   = window.location.pathname
    const { auth }     = usePage().props
    const isSuperAdmin = auth?.employee?.role === 'super_admin'

    // A super admin only has access to DTR + Planner among employee
    // routes, so show just those plus a way back to the admin portal
    // instead of the full 5-tab employee bar.
    const visibleTabs = isSuperAdmin
        ? [...tabs.filter(t => t.href === '/employee/dtr' || t.href === '/employee/planner'), adminBackTab]
        : tabs

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden backdrop-blur-xl border-t"
            style={{ background: C.panel, borderColor: C.border, paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex">
                {visibleTabs.map(tab => {
                    const active = currentUrl.startsWith(tab.href)
                    return (
                        <Link key={tab.href} href={tab.href}
                            className="flex-1 flex flex-col items-center justify-center py-2 relative"
                            style={{ color: active ? C.teal : C.dim }}>

                            <div className="relative">
                                {tab.icon(active)}
                                {tab.badge && unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-medium"
                                        style={{ background: C.red, color: '#06090D', fontSize: 9 }}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </div>

                            <span className="mt-0.5 font-medium"
                                style={{ fontSize: 10, color: active ? C.teal : C.dim }}>
                                {tab.label}
                            </span>

                            {active && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                                    style={{ background: C.teal }} />
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}