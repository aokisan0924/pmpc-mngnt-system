import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

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
            <div className="min-h-screen bg-bg">
                <div className="p-4 sm:p-6 max-w-4xl mx-auto">

                    {flash?.success && (
                        <div className="mb-4 px-4 py-3 rounded-lg bg-teal/10 border border-teal/25 text-teal text-sm">
                            {flash.success}
                        </div>
                    )}
                    {errors?.error && (
                        <div className="mb-4 px-4 py-3 rounded-lg bg-red/10 border border-red/25 text-red text-sm">
                            {errors.error}
                        </div>
                    )}

                    <div className="mb-6">
                        <h1 className="text-lg font-medium text-text">DTR archives</h1>
                        <p className="text-sm text-sub mt-0.5">
                            One ZIP per month, containing a PDF DTR for every active employee. Generated automatically
                            on the 1st of each month, or trigger one manually below.
                        </p>
                    </div>

                    {/* Manual generate card */}
                    <div className="bg-panel rounded-xl border border-border p-5 mb-6">
                        <p className="text-sm font-medium text-text mb-1">Generate archive</p>
                        <p className="text-xs text-dim mb-4">
                            Runs the archive job immediately for the selected month. If an archive already exists
                            for that month, it will be regenerated.
                        </p>

                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="block text-xs text-sub mb-1">Month</label>
                                <input type="month" value={month}
                                    onChange={e => setMonth(e.target.value)}
                                    className="px-3 py-2 text-sm border border-border rounded-lg bg-panel text-text focus:outline-none focus:ring-2 focus:ring-violet/20 focus:border-violet" />
                            </div>

                            <button onClick={generate} disabled={busy || !month}
                                className="px-5 py-2 text-sm font-medium rounded-lg disabled:opacity-50 bg-violet text-bg hover:brightness-110 transition-all">
                                {busy ? 'Generating…' : 'Generate archive'}
                            </button>
                        </div>
                    </div>

                    {/* Archive list */}
                    <div className="bg-panel rounded-xl border border-border overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm min-w-[480px]">
                            <thead>
                                <tr className="border-b border-border bg-field">
                                    <th className="text-left px-4 py-3 text-xs text-dim font-medium">Month</th>
                                    <th className="text-left px-4 py-3 text-xs text-dim font-medium">Generated</th>
                                    <th className="text-right px-4 py-3 text-xs text-dim font-medium">Size</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {archives.map(a => (
                                    <tr key={a.month} className="border-b border-border last:border-0 hover:bg-hover transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-text">{a.month_label}</p>
                                            <p className="text-xs text-dim">{a.month}</p>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-sub">{a.created_at}</td>
                                        <td className="px-4 py-3 text-right text-xs text-sub">{a.size}</td>
                                        <td className="px-4 py-3 text-center">
                                            <a href={`/admin/archives/${a.month}/download`}
                                                className="text-xs px-3 py-1.5 rounded-lg border border-border text-sub hover:bg-hover transition-colors">
                                                Download ↓
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                                {archives.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-10 text-center text-sm text-dim">
                                            No archives generated yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}