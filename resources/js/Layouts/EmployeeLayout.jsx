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
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {/* ── Desktop sidebar (hidden on mobile) ─────────── */}
            <aside className="hidden md:flex w-64 flex-shrink-0 flex-col sticky top-0 h-screen border-r border-border bg-panel">

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
                            <p className="text-[10px] text-brand font-semibold tracking-[.1em] uppercase">Employee portal</p>
                        </div>
                    </div>
                    <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 overflow-y-auto" aria-label="Employee navigation">
                    <p className="text-[10px] font-semibold text-dim px-5 pt-3 pb-1.5 tracking-[.12em] uppercase">
                        {isSuperAdmin ? 'Personal' : 'Main'}
                    </p>
                    {visibleNavMain.map(item => (
                        <NavLink key={item.href + item.label} item={item} currentUrl={currentUrl} />
                    ))}

                    {!isSuperAdmin && (
                        <Link href="/employee/notifications"
                            className={`flex items-center justify-between min-h-10 mx-3 px-3 py-2 text-xs font-medium transition-colors border-l-2 ${
                                currentUrl.startsWith('/employee/notifications')
                                    ? 'text-brand bg-brand/10 border-l-brand'
                                    : 'text-sub border-l-transparent hover:text-text hover:bg-field'
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
                            className="flex items-center min-h-10 mx-3 px-3 py-2 text-xs font-medium mt-2 text-brand border border-brand/30">
                            ← Back to admin
                        </Link>
                    ) : (
                        <>
                            <p className="text-[10px] font-semibold text-dim px-5 pt-3 pb-1.5 tracking-[.12em] uppercase">
                                Account
                            </p>
                            {visibleNavAccount.map(item => (
                                <NavLink key={item.href + item.label} item={item} currentUrl={currentUrl} />
                            ))}
                        </>
                    )}
                </nav>

                {/* User footer */}
                <div className="px-5 py-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold border text-xs bg-brand/10 text-brand border-brand/30">
                            {employee?.initials}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-xs text-text truncate">{employee?.full_name}</p>
                            <p className="text-[10px] text-dim">{employee?.employee_id}</p>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full min-h-10 text-left px-3 py-2 text-xs font-medium text-sub border border-border transition-colors hover:text-red hover:border-red/40">
                        Sign out
                    </button>
                </div>
            </aside>

            {/* ── Main content ────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Mobile header — only visible on small screens */}
                <MobileHeader title={title} unreadCount={unreadCount} isDark={isDark} onToggleTheme={toggleTheme} />

                {/* Page content */}
                <main id="main-content" tabIndex="-1" className="flex-1 pb-20 md:pb-0">
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
            className={`flex items-center min-h-10 mx-3 px-3 py-2 text-xs font-medium transition-colors border-l-2 ${
                active
                    ? 'text-brand bg-brand/10 border-l-brand'
                    : 'text-sub border-l-transparent hover:text-text hover:bg-field'
            }`}>
            {item.label}
        </Link>
    )
}
