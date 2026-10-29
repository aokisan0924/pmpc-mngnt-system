import { router, Link, useForm, usePage } from '@inertiajs/react'
import { Fragment, useMemo, useState } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import AdminPageHeader from '@/Components/AdminPageHeader'
import Button from '@/Components/UI/Button'
import DtrEditRequestNote from '@/Components/DtrEditRequestNote'
import useDtrToday from '@/hooks/useDtrToday'

const SLOTS = [['am_time_in', 'AM in'], ['am_time_out', 'AM out'], ['pm_time_in', 'PM in'], ['pm_time_out', 'PM out']]
const blank = { date: '', am_time_in: '', am_time_out: '', pm_time_in: '', pm_time_out: '', reason: '' }


export default function DtrShow({ employee, logs = [], summary = {}, month, today_date }) {
    const slots = employee.two_punch ? [['am_time_in', 'Time In'], ['pm_time_out', 'Time Out']] : SLOTS
    const { auth, flash } = usePage().props
    const canCorrect = !!auth?.employee?.can_correct_dtr
    const [editing, setEditing] = useState(null)
    const form = useForm(blank)
    const todayRef = useDtrToday(month, today_date, employee.id)

    function openCorrection(log) {
        form.clearErrors()
        form.setData({ ...blank, date: log.date, ...Object.fromEntries(SLOTS.map(([slot]) => [slot, (log[slot] || '').slice(0, 5)])) })
        setEditing(log)
    }
    function saveCorrection(event) {
        event.preventDefault()
        form.post(`/admin/dtr/${employee.id}/corrections`, { preserveScroll: true, onSuccess: () => setEditing(null) })
    }
    function handleMonthChange(dir) {
        const d = new Date(month + '-02')
        d.setMonth(d.getMonth() + dir)
        router.get(`/admin/dtr/${employee.id}`, {
            month: d.toISOString().slice(0, 7),
        }, { preserveState: true })
    }

    // Sunday–Saturday weeks, oldest first, with present/absent/hours subtotals.
    const weeks = useMemo(() => {
        const groups = []
        logs.forEach((log) => {
            const last = groups[groups.length - 1]
            if (last && last.key === log.week) last.days.push(log)
            else groups.push({ key: log.week, days: [log] })
        })
        const label = (date) => new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
        return groups.map((group) => ({
            ...group,
            label: `Week of ${label(group.days[0].date)} – ${label(group.days[group.days.length - 1].date)}`,
            present: group.days.reduce((sum, d) => sum + (['on_time', 'late', 'undertime'].includes(d.status) ? 1 : d.status === 'half_day' ? 0.5 : 0), 0),
            absent: group.days.filter((d) => ['absent', 'missing_out'].includes(d.status)).length,
            hours: Math.round(group.days.reduce((sum, d) => sum + Number(d.hours_rendered || 0), 0) * 100) / 100,
        }))
    }, [logs])

    const monthLabel = useMemo(() => new Date(month + '-02').toLocaleDateString('en-PH', {
        month: 'long',
        year: 'numeric',
    }), [month])

    return (
        <AdminLayout>
            <div ref={todayRef} className="admin-page-shell max-w-6xl space-y-4 sm:space-y-5 page-enter">
                {/* ── Top Header ────────────────────────────────────── */}
                <AdminPageHeader
                    eyebrow="Individual attendance ledger"
                    title={employee.full_name}
                    description={`${employee.employee_id} · ${employee.department} · ${employee.position}`}
                    badge={monthLabel}
                    leading={<div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 font-heading text-sm font-bold text-white">{employee.initials}</div>}
                    meta={<Link href="/admin/dtr" className="font-medium text-indigo-100 hover:text-white">← Back to DTR Ledger</Link>}
                    action={
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Month Navigator */}
                        <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 p-1 shadow-xs">
                            <button
                                type="button"
                                onClick={() => handleMonthChange(-1)}
                                className="rounded-lg p-1.5 text-indigo-100 transition-colors hover:bg-white/10 hover:text-white"
                                title="Previous Month"
                                aria-label="View previous month"
                            >
                                ←
                            </button>
                            <span className="px-2 font-heading text-xs font-semibold text-white">{monthLabel}</span>
                            <button
                                type="button"
                                onClick={() => handleMonthChange(1)}
                                className="rounded-lg p-1.5 text-indigo-100 transition-colors hover:bg-white/10 hover:text-white"
                                title="Next Month"
                                aria-label="View next month"
                            >
                                →
                            </button>
                        </div>

                        <a
                            href={`/admin/dtr/${employee.id}/print?month=${month}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Print DTR PDF for ${employee.full_name}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white px-4 py-2 text-xs font-semibold text-indigo-950 shadow-xs transition-colors hover:bg-indigo-50 sm:text-sm"
                        >
                            <span>Print DTR</span>
                            <span aria-hidden="true">↓</span>
                        </a>
                    </div>
                    }
                />

                {flash?.success && (
                    <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{flash.success}</p>
                )}

                {/* ── Summary Stats ──────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Days Present',   value: summary.days_present ?? 0,         color: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'Days Late',      value: summary.days_late ?? 0,            color: (summary.days_late > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-sub') },
                        { label: 'Days Absent',    value: summary.days_absent ?? 0,          color: (summary.days_absent > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-sub') },
                        { label: 'Half Days',      value: summary.half_days ?? 0,            color: (summary.half_days > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-sub') },
                        { label: 'Hours Rendered', value: `${summary.hours_rendered ?? 0}h`, color: 'text-text' },
                    ].map(s => (
                        <Card key={s.label}>
                            <CardContent className="p-3.5 text-center">
                                <p className={`text-2xl font-bold font-heading tnum ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-sub mt-1 font-medium">{s.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* ── DTR Log Table ─────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Time Record — {monthLabel}</CardTitle>
                        <span className="text-xs text-sub">{logs.length} days in period</span>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] border-collapse border border-border text-xs [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border/70">
                                <thead>
                                    <tr className="bg-field/70 border-b border-border/80 text-sub uppercase text-[12px]">
                                        <th scope="col" className="text-left px-5 py-3 font-semibold">Date</th>
                                        {slots.map(([slot, label]) => (
                                            <th key={slot} scope="col" className={`text-center px-3 py-3 font-semibold ${slot.endsWith('out') ? 'border-r border-border/80' : ''}`}>{label}</th>
                                        ))}
                                        <th scope="col" className="text-center px-3 py-3 font-semibold">Hours</th>
                                        <th scope="col" className="text-center px-4 py-3 font-semibold">Status</th>
                                        {canCorrect && <th scope="col" className="text-center px-3 py-3 font-semibold">Final check</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 tnum">
                                    {weeks.map(week => (
                                        <Fragment key={week.key}>
                                        <tr className="bg-indigo-50/60">
                                            <th scope="rowgroup" colSpan={(canCorrect ? 8 : 7) - (4 - slots.length)} className="px-5 py-2 text-left text-[12px] font-bold uppercase tracking-wide text-[#26215C]">
                                                {week.label}
                                            </th>
                                        </tr>
                                        {week.days.map(log => (
                                        <tr
                                                key={log.date}
                                                data-dtr-today={log.date === today_date ? '' : undefined}
                                                aria-current={log.date === today_date ? 'date' : undefined}
                                                className={`scroll-mt-20 scroll-mb-24 transition-colors ${
                                                    log.date === today_date ? 'bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60' : log.is_future ? 'text-dim opacity-60' : log.is_weekend ? 'bg-field/20' : 'hover:bg-field/40'
                                                }`}
                                            >
                                                <td className="px-5 py-3.5">
                                                    <p className="font-semibold text-text">{log.date_label}{log.date === today_date && <span className="ml-2 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[12px] font-bold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100">Today</span>}</p>
                                                    {log.is_weekend && (
                                                        <p className="text-[12px] text-dim font-medium">Rest day</p>
                                                    )}
                                                </td>
                                                {slots.map(([slot]) => (
                                                    <td
                                                        key={slot}
                                                        className={`px-3 py-3.5 text-center font-mono ${
                                                            slot.endsWith('out') ? 'border-r border-border/80' : ''
                                                        }`}
                                                    >
                                                        {log[slot] ? (
                                                            <span className="text-text font-medium">{log[slot].slice(0, 5)}</span>
                                                        ) : (
                                                            <span className="text-dim">—</span>
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="px-3 py-3.5 text-center font-semibold text-text">
                                                    {log.hours_rendered ? `${log.hours_rendered}h` : '—'}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    {log.has_pending_edit ? (
                                                        <Badge variant="amber" size="sm" dot>
                                                            Pending Edit
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant={log.status ?? 'absent'} size="sm">
                                                            {log.status === 'missing_out' ? 'missing time out' : (log.status ?? 'absent').replace('_', ' ')}
                                                        </Badge>
                                                    )}
                                                    {log.absence_reason && <p className="mt-1 max-w-64 whitespace-normal text-left text-xs text-sub">{log.absence_reason}</p>}
                                                    <DtrEditRequestNote request={log.edit_request} slots={slots} />
                                                    {!log.has_entry && !log.is_future && <p className="mt-1 text-[12px] text-dim">No entry</p>}
                                                </td>
                                                {canCorrect && (
                                                    <td className="px-3 py-2 text-center">
                                                        {log.is_future ? (
                                                            <span className="text-dim">—</span>
                                                        ) : log.has_pending_edit ? (
                                                            <Link href="/admin/edit-requests" className="text-[12px] font-semibold text-amber-800 underline">Review request first</Link>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => openCorrection(log)}
                                                                aria-label={`${log.has_entry ? 'Correct' : 'Add entry for'} ${log.date_label}`}
                                                                className="min-h-[44px] rounded-lg border border-border px-3 text-xs font-semibold text-[#26215C] hover:bg-field"
                                                            >
                                                                {log.has_entry ? 'Correct' : 'Add entry'}
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        <tr className="bg-field/40 text-[12px] font-semibold text-sub">
                                            <td colSpan={(canCorrect ? 8 : 7) - (4 - slots.length)} className="px-5 py-2">
                                                Week subtotal: {week.present} present · {week.absent} absent · {week.hours}h
                                            </td>
                                        </tr>
                                        </Fragment>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr>
                                            <td colSpan={(canCorrect ? 8 : 7) - (4 - slots.length)} className="px-5 py-12 text-center text-sub">
                                                No DTR records for this month.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="dtr-correction-title">
                    <form onSubmit={saveCorrection} className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-panel p-5 shadow-xl">
                        <div>
                            <h2 id="dtr-correction-title" className="font-heading text-lg font-bold text-text">
                                {editing.has_entry ? 'Correct' : 'Add entry for'} {editing.date_label}
                            </h2>
                            <p className="text-sm text-sub">{employee.full_name}. Hours and status are recalculated with the normal attendance rules. The employee is not notified.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {slots.map(([slot, label]) => (
                                <label key={slot} className="text-xs font-medium text-sub">
                                    {label}
                                    <input
                                        type="time"
                                        value={form.data[slot]}
                                        onChange={(event) => form.setData(slot, event.target.value)}
                                        aria-invalid={!!form.errors[slot]}
                                        className="mt-1 min-h-[44px] w-full rounded-lg border border-border bg-field px-2 text-sm text-text"
                                    />
                                    {form.errors[slot] && <span className="mt-1 block text-rose-700">{form.errors[slot]}</span>}
                                </label>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => form.setData({ ...form.data, am_time_in: '', am_time_out: '', pm_time_in: '', pm_time_out: '' })}
                            className="min-h-[44px] rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                        >
                            Mark absent (clear all punches)
                        </button>
                        <label className="block text-xs font-medium text-sub">
                            Reason (required)
                            <input
                                type="text"
                                required
                                maxLength={500}
                                value={form.data.reason}
                                onChange={(event) => form.setData('reason', event.target.value)}
                                placeholder="e.g. Final DTR check: forgot to punch out"
                                aria-invalid={!!form.errors.reason}
                                className="mt-1 min-h-[44px] w-full rounded-lg border border-border bg-field px-3 text-sm text-text"
                            />
                            {form.errors.reason && <span className="mt-1 block text-rose-700">{form.errors.reason}</span>}
                        </label>
                        {form.errors.date && <p role="alert" className="text-sm text-rose-700">{form.errors.date}</p>}
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" disabled={form.processing} onClick={() => setEditing(null)} className="min-h-[44px]">Cancel</Button>
                            <Button type="submit" loading={form.processing} disabled={form.processing || !form.data.reason.trim()} className="min-h-[44px] bg-[#26215C] hover:bg-[#201B4D]">Save correction</Button>
                        </div>
                    </form>
                </div>
            )}
        </AdminLayout>
    )
}
