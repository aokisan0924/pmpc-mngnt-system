import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'

export default function Archives({ archives = [], last_month }) {
    const { flash, errors } = usePage().props
    const [month, setMonth] = useState(last_month || '')
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
            <div className="mx-auto min-h-screen max-w-6xl space-y-4 bg-bg px-3.5 py-3.5 sm:space-y-5 sm:px-5 sm:py-4 lg:px-6">

                {flash?.success && (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}
                {errors?.error && (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm font-medium">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>{errors.error}</span>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold font-display text-text tracking-tight">DTR Archives</h1>
                            <Badge variant="indigo" size="sm">Monthly Cold Storage</Badge>
                        </div>
                        <p className="text-sm text-sub mt-1">
                            Consolidated monthly ZIP packages containing individual employee PDF DTR certificates
                        </p>
                    </div>
                </div>

                {/* Quick Stats */}
                {/* Manual generate card */}
                <Card className="overflow-hidden">
                    <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
                        <div>
                            <CardTitle>Generate a Monthly Archive</CardTitle>
                            <CardDescription>
                                Compile PDF DTR certificates for active employees into one downloadable ZIP package.
                            </CardDescription>
                        </div>
                        <Badge variant="indigo" size="sm">ZIP + PDF</Badge>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-sub">
                                Target Month
                            </label>
                            <input
                                type="month"
                                value={month}
                                onChange={e => setMonth(e.target.value)}
                                className="h-11 w-full rounded-xl border border-border bg-field px-3.5 font-mono text-sm font-semibold text-text transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-44"
                            />
                        </div>

                        <Button
                            variant="primary"
                            size="md"
                            onClick={generate}
                            disabled={busy || !month}
                            loading={busy}
                            className="h-11 w-full whitespace-nowrap sm:w-auto"
                            icon={
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            }
                        >
                            <span>Compile Archive</span>
                        </Button>
                    </div>
                    </CardContent>
                </Card>

                {/* Archive list */}
                <Card className="overflow-hidden">
                    <CardHeader>
                        <div>
                            <CardTitle>Available Archives</CardTitle>
                            <CardDescription>Download a compiled ZIP package for an archived month.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                    <div className={`overflow-x-auto ${archives.length === 0 ? 'hidden sm:block' : ''}`}>
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-field/70 border-b border-border text-dim uppercase tracking-wider font-semibold">
                                    <th className="text-left px-6 py-3.5">Archive Period</th>
                                    <th className="text-left px-4 py-3.5">Generated Timestamp</th>
                                    <th className="text-right px-4 py-3.5">Archive Size</th>
                                    <th className="text-right px-6 py-3.5">Download</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 font-mono">
                                {archives.map(a => (
                                    <tr key={a.month} className="hover:bg-hover/60 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-sans font-bold text-xs">
                                                    ZIP
                                                </div>
                                                <div>
                                                    <p className="font-sans font-semibold text-text text-sm">{a.month_label}</p>
                                                    <p className="text-[11px] text-dim">{a.month}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sub font-sans">
                                            {a.created_at}
                                        </td>
                                        <td className="px-4 py-4 text-right text-text font-bold">
                                            {a.size}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a
                                                href={`/admin/archives/${a.month}/download`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-panel text-sub hover:text-text hover:bg-hover hover:border-indigo-500/30 font-sans font-medium transition-all shadow-2xs"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                <span>Download</span>
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                                {archives.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-dim font-sans">
                                            <div className="w-10 h-10 rounded-full bg-field flex items-center justify-center mx-auto mb-2 text-sub">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                </svg>
                                            </div>
                                            No archives have been generated yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {archives.length === 0 && (
                        <div className="px-5 py-12 text-center text-dim sm:hidden">
                            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-field text-sub">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-2.586a1 1 0 0 0-.707.293l-2.414 2.414a1 1 0 0 1-.707.293h-3.172a1 1 0 0 1-.707-.293l-2.414-2.414A1 1 0 0 0 6.586 13H4" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-sub">No archives yet.</p>
                            <p className="mt-1 text-xs">Generate the first archive using the form above.</p>
                        </div>
                    )}
                    </CardContent>
                </Card>

            </div>
        </AdminLayout>
    )
}
