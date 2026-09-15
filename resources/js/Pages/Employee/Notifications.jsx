import { useState } from 'react'
import { router, usePage, Link } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'
import Card from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'

export default function Notifications({ notifications = [] }) {
    const { flash } = usePage().props
    const [loading, setLoading] = useState(false)
    const [removingId, setRemovingId] = useState(null)

    function markAllRead() {
        if (loading) return
        setLoading(true)
        router.post('/employee/notifications/read-all', {}, {
            onFinish: () => setLoading(false),
        })
    }

    function deleteNotification(id) {
        if (loading) return
        setRemovingId(id)
        router.delete(`/employee/notifications/${id}`, {
            preserveScroll: true,
            onFinish: () => setRemovingId(null),
        })
    }

    const unread   = notifications.filter(n => !n.is_read)
    const approved = notifications.filter(n => n.type === 'dtr_edit_approved')
    const declined = notifications.filter(n => n.type === 'dtr_edit_declined')

    function getTypeDetails(type) {
        switch (type) {
            case 'dtr_edit_approved':
                return {
                    badge: <Badge variant="emerald" size="sm">Approved</Badge>,
                    icon: (
                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    ),
                    bg: 'bg-emerald-500/10 border-emerald-500/20',
                }
            case 'dtr_edit_declined':
                return {
                    badge: <Badge variant="rose" size="sm">Declined</Badge>,
                    icon: (
                        <svg className="w-4 h-4 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ),
                    bg: 'bg-rose-500/10 border-rose-500/20',
                }
            default:
                return {
                    badge: <Badge variant="indigo" size="sm">Notice</Badge>,
                    icon: (
                        <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    bg: 'bg-indigo-500/10 border-indigo-500/20',
                }
        }
    }

    return (
        <EmployeeLayout title="Notifications">
            <div className="min-h-screen bg-bg p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">

                {flash?.success && (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold font-display text-text tracking-tight">Notification Center</h1>
                            <Badge variant="emerald" size="sm">System Alerts</Badge>
                        </div>
                        <p className="text-sm text-sub mt-1">
                            Review administrative updates, DTR edit request approvals, and organizational announcements
                        </p>
                    </div>

                    {unread.length > 0 && (
                        <Button
                            variant="secondary"
                            size="md"
                            onClick={markAllRead}
                            disabled={loading}
                        >
                            <svg className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7m-4 5l4 4L23 8" />
                            </svg>
                            <span>Mark All Read</span>
                        </Button>
                    )}
                </div>

                {/* Stat Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard
                        title="Unread Alerts"
                        value={unread.length}
                        sub="Awaiting review"
                        color="amber"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="DTR Approved"
                        value={approved.length}
                        sub="Timesheet edits accepted"
                        color="emerald"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="DTR Declined"
                        value={declined.length}
                        sub="Corrections rejected"
                        color="rose"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Total History"
                        value={notifications.length}
                        sub="All received updates"
                        color="slate"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        }
                    />
                </div>

                {/* Notifications List */}
                <div className="space-y-3">
                    {notifications.map((notif) => {
                        const { badge, icon, bg } = getTypeDetails(notif.type)
                        const isRemoving = removingId === notif.id

                        return (
                            <div
                                key={notif.id}
                                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                                    notif.is_read
                                        ? 'border-border bg-panel'
                                        : 'border-emerald-500/30 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/10'
                                } ${isRemoving ? 'opacity-30' : ''}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}>
                                        {icon}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-bold font-display text-text">{notif.title}</p>
                                            {badge}
                                            {!notif.is_read && (
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-auto" />
                                            )}
                                        </div>

                                        <p className="text-xs text-sub leading-relaxed">{notif.message}</p>

                                        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/50 text-xs">
                                            <span className="font-mono text-dim text-[11px]">{notif.created_at}</span>
                                            {notif.link && (
                                                <Link
                                                    href={notif.link}
                                                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                                >
                                                    <span>Open Record</span>
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </Link>
                                            )}
                                            <button
                                                onClick={() => deleteNotification(notif.id)}
                                                disabled={loading}
                                                className="ml-auto text-dim hover:text-rose-500 transition-colors p-1 rounded-md"
                                                title="Delete Notification"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {notifications.length === 0 && (
                        <Card>
                            <div className="py-14 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-field flex items-center justify-center mx-auto mb-3 text-sub">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <p className="text-base font-semibold text-text">No Notifications Yet</p>
                                <p className="text-xs text-dim mt-1">You will receive notifications here whenever your DTR edit requests or submissions are reviewed.</p>
                            </div>
                        </Card>
                    )}
                </div>

            </div>
        </EmployeeLayout>
    )
}