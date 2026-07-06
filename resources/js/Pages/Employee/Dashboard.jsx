import EmployeeLayout from '@/Layouts/EmployeeLayout'
import { usePage } from '@inertiajs/react'

export default function Dashboard({ employee }) {
    const now = new Date()
    const hour = now.getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    return (
        <EmployeeLayout>
            <div className="p-6">
                <h1 className="text-base font-medium text-gray-900 mb-0.5">
                    {greeting}, {employee?.first_name ?? 'there'}
                </h1>
                <p className="text-sm text-gray-500 mb-5">Here's your summary for today.</p>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                    {[
                        { label: 'Days present',   value: '—', sub: 'this month' },
                        { label: 'Days late',       value: '—', sub: 'this month' },
                        { label: 'Hours rendered',  value: '—', sub: 'of ~176h expected' },
                        { label: 'Edit requests',   value: '—', sub: 'pending approval' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-3">
                            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                            <p className="text-xl font-medium text-gray-800">{stat.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Panels */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-gray-800">Today's attendance</p>
                            <a href="/employee/dtr" className="text-xs" style={{ color: '#0F6E56' }}>
                                View full DTR →
                            </a>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {['AM In', 'AM Out', 'PM In', 'PM Out'].map((slot) => (
                                <div key={slot} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                                    <p className="text-xs text-gray-400 mb-0.5">{slot}</p>
                                    <p className="text-sm text-gray-300">—</p>
                                </div>
                            ))}
                        </div>
                        <a href="/employee/dtr"
                            className="block w-full text-center py-2 text-sm font-medium text-white rounded-lg"
                            style={{ background: '#0F6E56' }}>
                            Go to DTR →
                        </a>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-sm font-medium text-gray-800 mb-3">Notifications</p>
                        <p className="text-sm text-gray-400 text-center py-6">No notifications yet.</p>
                    </div>
                </div>
            </div>
        </EmployeeLayout>
    )
}