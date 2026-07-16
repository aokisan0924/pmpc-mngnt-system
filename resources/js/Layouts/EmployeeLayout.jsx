import { Link, usePage, router } from '@inertiajs/react'
import useNotifications from '@/hooks/useNotifications'
import NotificationToast from '@/Components/NotificationToast'
import BottomNav from '@/Components/BottomNav'
import MobileHeader from '@/Components/MobileHeader'
import ThemeToggle from '@/Components/ThemeToggle'
import useTheme from '@/hooks/useTheme'

/* ---------- design tokens — resolve to CSS variables from app.css,
   shared with AdminLayout, so both portals stay visually uniform and
   both follow the light/dark theme toggle automatically. ---------- */
export const C = {
    bg:      'var(--color-bg)',
    panel:   'var(--color-panel)',
    field:   'var(--color-field)',
    border:  'var(--color-border)',
    text:    'var(--color-text)',
    sub:     'var(--color-sub)',
    dim:     'var(--color-dim)',
    teal:    'var(--color-teal)',
    blue:    'var(--color-blue)',
    amber:   'var(--color-amber)',
    purple:  'var(--color-purple)',
    violet:  'var(--color-violet)',
    red:     'var(--color-red)',
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
    const { isDark, toggleTheme } = useTheme()

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
        <div className="flex min-h-screen bg-bg">

            {/* ── Desktop sidebar (hidden on mobile) ─────────── */}
            <aside className="hidden md:flex w-52 flex-shrink-0 flex-col py-5 sticky top-0 h-screen border-r border-border"
                style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-panel) 90%, var(--color-teal) 4%) 0%, var(--color-bg) 100%)' }}>

                {/* Brand */}
                <div className="flex items-center justify-between gap-2 px-4 pb-4 mb-2 border-b border-border">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0 bg-teal/10 border-teal/30">
                            <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 10-8 0 4 4 0 008 0z"/>
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="font-display font-semibold text-[12px] text-text truncate">PMPC WorkForce</p>
                            <p className="font-mono text-[9px] text-dim tracking-[.05em]">EMPLOYEE PORTAL</p>
                        </div>
                    </div>
                    <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                </div>

                {/* Nav */}
                <nav className="flex-1 mt-2 overflow-y-auto">
                    <p className="font-mono text-[9px] text-dim px-4 pt-1.5 pb-1 tracking-[.12em] uppercase">
                        {isSuperAdmin ? 'Personal' : 'Main'}
                    </p>
                    {visibleNavMain.map(item => (
                        <NavLink key={item.href + item.label} item={item} currentUrl={currentUrl} />
                    ))}

                    {!isSuperAdmin && (
                        <Link href="/employee/notifications"
                            className={`flex items-center justify-between px-4 py-2 text-xs transition-colors border-l-2 ${
                                currentUrl.startsWith('/employee/notifications')
                                    ? 'text-text bg-teal/10 border-l-teal'
                                    : 'text-sub border-l-transparent hover:text-text'
                            }`}>
                            <span>Notifications</span>
                            {unreadCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red/15 text-red min-w-[18px] text-center">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </Link>
                    )}

                    {isSuperAdmin ? (
                        <Link href="/admin/dashboard"
                            className="flex items-center gap-2 px-4 py-2 text-xs mt-2 transition-colors text-violet border-l-2 border-l-transparent">
                            ← Back to admin
                        </Link>
                    ) : (
                        <>
                            <p className="font-mono text-[9px] text-dim px-4 pt-2.5 pb-1 tracking-[.12em] uppercase">
                                Account
                            </p>
                            {visibleNavAccount.map(item => (
                                <NavLink key={item.href + item.label} item={item} currentUrl={currentUrl} />
                            ))}
                        </>
                    )}
                </nav>

                {/* User footer */}
                <div className="px-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono font-medium border text-[11px] bg-teal/10 text-teal border-teal/30">
                            {employee?.initials}
                        </div>
                        <div>
                            <p className="font-medium text-[11px] text-text">{employee?.full_name}</p>
                            <p className="text-[10px] text-dim">{employee?.employee_id}</p>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-dim transition-colors hover:text-red hover:bg-red/10">
                        Sign out
                    </button>
                </div>
            </aside>

            {/* ── Main content ────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Mobile header — only visible on small screens */}
                <MobileHeader title={title} unreadCount={unreadCount} isDark={isDark} onToggleTheme={toggleTheme} />

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
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors border-l-2 ${
                active
                    ? 'text-text bg-teal/10 border-l-teal'
                    : 'text-sub border-l-transparent hover:text-text'
            }`}>
            {item.label}
        </Link>
    )
}