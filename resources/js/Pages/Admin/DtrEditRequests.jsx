import { useState } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

const STATUS_STYLES = {
    pending:  { bg: 'bg-purple-50',  text: 'text-purple-700',  label: 'Pending'  },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
    declined: { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Declined' },
}

export default function DtrEditRequests({ requests, pendingCount }) {
    const { flash } = usePage().props
    const [filter, setFilter]         = useState('pending')
    const [activeId, setActiveId]     = useState(null)
    const [adminNote, setAdminNote]   = useState('')
    const [processing, setProcessing] = useState(false)

    const filtered = filter === 'all'
        ? requests
        : requests.filter(r => r.status === filter)

    function resolve(id, action) {
        setProcessing(true)
        router.post(`/admin/edit-requests/${id}/${action}`, { admin_note: adminNote }, {
            onSuccess: () => {
                setActiveId(null)
                setAdminNote('')
                setProcessing(false)
            },
            onError: () => setProcessing(false),
        })
    }

    return (
        <AdminLayout pendingEditCount={pendingCount}>
            <div className="p-6 max-w-6xl mx-auto">

                {/* Flash */}
                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-lg font-medium text-gray-900">DTR edit requests</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {pendingCount} pending review
                        </p>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                        {['pending', 'approved', 'declined', 'all'].map((f) => (
                            <button key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-xs rounded-md capitalize transition-all ${
                                    filter === f
                                        ? 'bg-white text-gray-800 font-medium shadow-sm border border-gray-200'
                                        : 'text-gray-500'
                                }`}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Requests list */}
                <div className="space-y-3">
                    {filtered.map((req) => {
                        const style   = STATUS_STYLES[req.status]
                        const isOpen  = activeId === req.id
                        const isPending = req.status === 'pending'

                        return (
                            <div key={req.id}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden">

                                {/* Request header */}
                                <div className="flex items-center justify-between px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                                            style={{ background: '#26215C' }}>
                                            {req.employee_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{req.employee_name}</p>
                                            <p className="text-xs text-gray-400">{req.employee_id} · {req.date}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                                            {style.label}
                                        </span>
                                        {isPending && (
                                            <button
                                                onClick={() => setActiveId(isOpen ? null : req.id)}
                                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                                                {isOpen ? 'Close' : 'Review'}
                                            </button>
                                        )}
                                        {!isPending && (
                                            <button
                                                onClick={() => setActiveId(isOpen ? null : req.id)}
                                                className="text-xs text-gray-400 hover:text-gray-600">
                                                {isOpen ? 'Hide' : 'View'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {isOpen && (
                                    <div className="px-5 pb-5 border-t border-gray-100 pt-4">

                                        {/* Times comparison */}
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                <p className="text-xs text-gray-400 mb-2">Original times</p>
                                                <div className="grid grid-cols-2 gap-y-1">
                                                    {[
                                                        ['AM In',  req.original_am_time_in],
                                                        ['AM Out', req.original_am_time_out],
                                                        ['PM In',  req.original_pm_time_in],
                                                        ['PM Out', req.original_pm_time_out],
                                                    ].map(([label, val]) => (
                                                        <div key={label}>
                                                            <p className="text-xs text-gray-400">{label}</p>
                                                            <p className="text-xs font-medium text-gray-600">
                                                                {val ? val.slice(0, 5) : '—'}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                                <p className="text-xs text-emerald-600 mb-2">Requested times</p>
                                                <div className="grid grid-cols-2 gap-y-1">
                                                    {[
                                                        ['AM In',  req.requested_am_time_in],
                                                        ['AM Out', req.requested_am_time_out],
                                                        ['PM In',  req.requested_pm_time_in],
                                                        ['PM Out', req.requested_pm_time_out],
                                                    ].map(([label, val]) => (
                                                        <div key={label}>
                                                            <p className="text-xs text-emerald-500">{label}</p>
                                                            <p className="text-xs font-medium text-emerald-700">
                                                                {val ? val.slice(0, 5) : '—'}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Reason */}
                                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-4">
                                            <p className="text-xs text-gray-400 mb-1">Reason</p>
                                            <p className="text-sm text-gray-700 italic">"{req.reason}"</p>
                                        </div>

                                        {/* Admin note + actions */}
                                        {isPending && (
                                            <>
                                                <div className="mb-3">
                                                    <label className="block text-xs text-gray-500 mb-1">
                                                        Admin note (optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={adminNote}
                                                        onChange={e => setAdminNote(e.target.value)}
                                                        placeholder="Add a note for the employee…"
                                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                                    />
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => resolve(req.id, 'approve')}
                                                        disabled={processing}
                                                        className="flex-1 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                                                        style={{ background: '#0F6E56' }}>
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => resolve(req.id, 'decline')}
                                                        disabled={processing}
                                                        className="flex-1 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg disabled:opacity-60 hover:bg-red-100 transition-colors">
                                                        Decline
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {/* Resolved state */}
                                        {!isPending && req.admin_note && (
                                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                <p className="text-xs text-gray-400 mb-1">Admin note</p>
                                                <p className="text-sm text-gray-600">{req.admin_note}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {filtered.length === 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
                            <p className="text-sm text-gray-400">No {filter === 'all' ? '' : filter} requests found.</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}