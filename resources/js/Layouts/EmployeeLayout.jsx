import { Link, usePage, router } from '@inertiajs/react'
import useNotifications from '@/hooks/useNotifications'
import NotificationToast from '@/Components/NotificationToast'
import BottomNav from '@/Components/BottomNav'
import MobileHeader from '@/Components/MobileHeader'

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

const navMain = [
    { label: 'Dashboard',    href: '/employee/dashboard' },
    { label: 'My DTR',       href: '/employee/dtr'       },
    { label: 'Task planner', href: '/employee/planner'   },
    { label: 'My payslips',  href: '/employee/payslips'  },
]

const navAccount = [
    { label: 'My profile', href: '/employee/profile' },
]

export default function EmployeeLayout({ children, title }) {
    const { auth, unread_notifications } = usePage().props
    const employee    = auth?.employee
    const isSuperAdmin = employee?.role === 'super_admin'
    const currentUrl  = window.location.pathname

    // A super admin is also an employee, but only DTR + Planner are
    // shared routes for them — Dashboard/Payslips/Notifications/Profile
    // stay employee-only, so don't show nav links that would just bounce
    // them back to the admin portal.
    const visibleNavMain = isSuperAdmin
        ? navMain.filter(i => i.href === '/employee/dtr' || i.href === '/employee/planner')
        : navMain
    const visibleNavAccount = isSuperAdmin ? [] : navAccount

    const { unreadCount, liveNotifications, dismissToast } =
        useNotifications(employee?.id, unread_notifications ?? 0)

    function logout() {
        router.post('/logout')
    }

    return (
        <div className="flex min-h-screen" style={{ background: C.bg }}>

            {/* ── Desktop sidebar (hidden on mobile) ─────────── */}
            <aside className="hidden md:flex w-52 flex-shrink-0 flex-col py-5"
                style={{ background: 'linear-gradient(180deg, #08120F 0%, #06090D 100%)', borderRight: `1px solid ${C.border}` }}>

                {/* Brand */}
                <div className="flex items-center gap-2 px-4 pb-4 mb-2"
                    style={{ borderBottom: `1px solid ${C.border}` }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center border"
                        style={{ background: 'rgba(20,241,178,0.12)', borderColor: 'rgba(20,241,178,0.3)' }}>
                        <svg className="w-4 h-4" style={{ color: C.teal }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 10-8 0 4 4 0 008 0z"/>
                        </svg>
                    </div>
                    <div>
                        <p className="font-display font-semibold" style={{ fontSize: 12, color: C.text }}>PMPC WorkForce</p>
                        <p className="font-mono" style={{ fontSize: 9, color: C.dim, letterSpacing: '.05em' }}>EMPLOYEE PORTAL</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 mt-2">
                    <p className="font-mono" style={{ fontSize: 9, color: C.dim, padding: '6px 16px 4px', letterSpacing: '.12em', textTransform: 'uppercase' }}>
                        {isSuperAdmin ? 'Personal' : 'Main'}
                    </p>
                    {visibleNavMain.map(item => (
                        <NavLink key={item.href + item.label} item={item} currentUrl={currentUrl} />
                    ))}

                    {!isSuperAdmin && (
                        <Link href="/employee/notifications"
                            className="flex items-center justify-between px-4 py-2 text-xs transition-colors"
                            style={{
                                color: currentUrl.startsWith('/employee/notifications') ? C.text : C.sub,
                                background: currentUrl.startsWith('/employee/notifications') ? 'rgba(20,241,178,0.10)' : 'transparent',
                                borderLeft: currentUrl.startsWith('/employee/notifications') ? `2px solid ${C.teal}` : '2px solid transparent',
                            }}>
                            <span>Notifications</span>
                            {unreadCount > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                    style={{ background: 'rgba(255,107,129,0.15)', color: C.red, fontSize: 10, minWidth: 18, textAlign: 'center' }}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </Link>
                    )}

                    {isSuperAdmin ? (
                        <Link href="/admin/dashboard"
                            className="flex items-center gap-2 px-4 py-2 text-xs mt-2 transition-colors"
                            style={{ color: C.violet, borderLeft: '2px solid transparent' }}>
                            ← Back to admin
                        </Link>
                    ) : (
                        <>
                            <p className="font-mono" style={{ fontSize: 9, color: C.dim, padding: '10px 16px 4px', letterSpacing: '.12em', textTransform: 'uppercase' }}>
                                Account
                            </p>
                            {visibleNavAccount.map(item => (
                                <NavLink key={item.href + item.label} item={item} currentUrl={currentUrl} />
                            ))}
                        </>
                    )}
                </nav>

                {/* User footer */}
                <div className="px-4 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono font-medium border"
                            style={{ background: 'rgba(20,241,178,0.12)', color: C.teal, borderColor: 'rgba(20,241,178,0.3)', fontSize: 11 }}>
                            {employee?.initials}
                        </div>
                        <div>
                            <p className="font-medium" style={{ fontSize: 11, color: C.text }}>{employee?.full_name}</p>
                            <p style={{ fontSize: 10, color: C.dim }}>{employee?.employee_id}</p>
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

            {/* ── Main content ────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Mobile header — only visible on small screens */}
                <MobileHeader title={title} unreadCount={unreadCount} />

                {/* Page content */}
                <main className="flex-1 pb-20 md:pb-0">
                    {children}
                </main>
            </div>

            {/* ── Mobile bottom nav ────────────────────────────── */}
            <BottomNav unreadCount={unreadCount} />

            {/* ── Toast notifications ──────────────────────────── */}
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
        <Link href={item.href}
            className="flex items-center gap-2 px-4 py-2 text-xs transition-colors"
            style={{
                color: active ? C.text : C.sub,
                background: active ? 'rgba(20,241,178,0.10)' : 'transparent',
                borderLeft: active ? `2px solid ${C.teal}` : '2px solid transparent',
            }}>
            {item.label}
        </Link>
    )
}