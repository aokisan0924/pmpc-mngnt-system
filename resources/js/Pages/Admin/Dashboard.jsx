import AdminLayout from '@/Layouts/AdminLayout'

export default function Dashboard({ stats }) {
    return (
        <AdminLayout>
            <div className="p-6">
                <h1 className="text-base font-medium text-gray-900 mb-0.5">Good morning, Admin</h1>
                <p className="text-sm text-gray-500 mb-5">Here's today's workforce overview.</p>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                    {[
                        { label: 'Total employees', value: stats?.total_employees  ?? '—', sub: `${stats?.active_employees ?? '—'} active` },
                        { label: 'Present today',   value: '—', sub: 'loading…' },
                        { label: 'Late today',       value: '—', sub: 'loading…' },
                        { label: 'Pending edits',    value: '—', sub: 'needs review', accent: true },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-3">
                            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                            <p className={`text-xl font-medium ${stat.accent ? '' : 'text-gray-800'}`}
                                style={stat.accent ? { color: '#534AB7' } : {}}>
                                {stat.value}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Panels */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-gray-800">DTR edit requests</p>
                            <a href="/admin/edit-requests" className="text-xs" style={{ color: '#534AB7' }}>
                                View all →
                            </a>
                        </div>
                        <p className="text-sm text-gray-400 text-center py-6">No pending requests.</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-sm font-medium text-gray-800 mb-3">Today's attendance snapshot</p>
                        <p className="text-sm text-gray-400 text-center py-6">DTR data loads after first punch.</p>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}