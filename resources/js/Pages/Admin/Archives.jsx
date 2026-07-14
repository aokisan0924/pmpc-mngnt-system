import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

const C = {
    purple: '#26215C',
}

export default function Archives({ archives, last_month }) {
    const { flash, errors } = usePage().props
    const [month, setMonth] = useState(last_month)
    const [busy, setBusy]   = useState(false)

    function generate() {
        if (!month) return
        setBusy(true)
        router.post('/admin/archives/generate', { month }, {
            preserveScroll: true,
            onFinish: () => setBusy(false),
        })
    }

    return (
        <AdminLayout>
            <div className="p-6 max-w-4xl mx-auto">

                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        {flash.success}
                    </div>
                )}
                {errors?.error && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                        {errors.error}
                    </div>
                )}

                <div className="mb-6">
                    <h1 className="text-lg font-medium text-gray-900">DTR archives</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        One ZIP per month, containing a PDF DTR for every active employee. Generated automatically
                        on the 1st of each month, or trigger one manually below.
                    </p>
                </div>

                {/* Manual generate card */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                    <p className="text-sm font-medium text-gray-800 mb-1">Generate archive</p>
                    <p className="text-xs text-gray-400 mb-4">
                        Runs the archive job immediately for the selected month. If an archive already exists
                        for that month, it will be regenerated.
                    </p>

                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Month</label>
                            <input type="month" value={month}
                                onChange={e => setMonth(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                        </div>

                        <button onClick={generate} disabled={busy || !month}
                            className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                            style={{ background: C.purple }}>
                            {busy ? 'Generating…' : 'Generate archive'}
                        </button>
                    </div>
                </div>

                {/* Archive list */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Month</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Generated</th>
                                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Size</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {archives.map(a => (
                                <tr key={a.month} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-gray-800">{a.month_label}</p>
                                        <p className="text-xs text-gray-400">{a.month}</p>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{a.created_at}</td>
                                    <td className="px-4 py-3 text-right text-xs text-gray-500">{a.size}</td>
                                    <td className="px-4 py-3 text-center">
                                        <a href={`/admin/archives/${a.month}/download`}
                                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                                            Download ↓
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {archives.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                                        No archives generated yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    )
}