import { useState } from 'react'
import { useForm, Link, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'
import AdminPageHeader from '@/Components/AdminPageHeader'

const fmt = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0))
const control = 'min-h-[44px] w-full min-w-0 rounded-xl border border-border bg-field px-3 py-2 text-sm text-text'

export default function Payroll({ payrolls = [] }) {
    const thisMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7)
    const { auth } = usePage().props
    const form = useForm({ month: thisMonth, cutoff: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(8) > '15' ? 'second' : 'first' })
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [preparing, setPreparing] = useState(!payrolls.length)
    const visible = payrolls.filter(
        (batch) =>
            (status === 'all' || batch.status === status) &&
            `${batch.period_label} ${batch.created_by}`.toLowerCase().includes(search.toLowerCase()),
    )
    function start(event) {
        event.preventDefault()
        form.clearErrors()
        if (!form.data.month) return form.setError('month', 'Choose the payroll month.')
        form.get('/admin/payroll/create')
    }
    return (
        <AdminLayout>
            <div className="admin-page-shell space-y-5 page-enter">
                <AdminPageHeader
                    title="Payroll Management"
                    action={
                        <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={() => setPreparing(!preparing)} aria-expanded={preparing} aria-controls="payroll-setup" className="admin-header-primary min-h-[44px]">
                            {preparing ? 'Close setup' : 'New payroll batch'}
                        </Button>
                        {auth?.employee?.role === 'super_admin' && <Link
                            href="/admin/payroll/analytics"
                            className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10"
                        >
                            Payroll analytics
                        </Link>}
                        </div>
                    }
                />
                <section
                    id="payroll-setup"
                    hidden={!preparing && !Object.keys(form.errors).length}
                    aria-labelledby="prepare-title"
                    className={`${preparing || Object.keys(form.errors).length ? "grid" : "hidden"} overflow-hidden rounded-2xl border border-border bg-panel lg:grid-cols-[260px_minmax(0,1fr)]`}
                >
                    <div className="border-b border-border bg-field p-5 lg:border-r lg:border-b-0">
                        <p className="text-xs font-semibold text-[#26215C]">New batch</p>
                        <h2 id="prepare-title" className="mt-2 font-heading text-xl font-bold text-text">
                            Start a payroll batch
                        </h2>
                        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-sub">
                            Choose the month and cutoff. The dates and DTR hours are filled in for you; if this
                            cutoff already has a draft, it opens that draft.
                        </p>
                    </div>
                    <form onSubmit={start} className="space-y-4 p-5">
                        <fieldset>
                            <legend className="mb-2 text-xs font-semibold text-sub">Cutoff</legend>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {[
                                    ['first', 'First cutoff', '1st to 15th'],
                                    ['second', 'Second cutoff', '16th to month end'],
                                ].map(([value, label, detail]) => (
                                    <label
                                        key={value}
                                        className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 ${form.data.cutoff === value ? 'border-indigo-300 bg-indigo-50' : 'border-border bg-field'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="cutoff"
                                            value={value}
                                            checked={form.data.cutoff === value}
                                            onChange={() => form.setData('cutoff', value)}
                                            className="size-4 accent-[#26215C]"
                                        />
                                        <span>
                                            <span className="block text-sm font-semibold text-text">{label}</span>
                                            <span className="text-xs text-sub">{detail}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {form.errors.cutoff && (
                                <p role="alert" className="mt-2 text-sm text-rose-700">
                                    {form.errors.cutoff}
                                </p>
                            )}
                        </fieldset>
                        <label className="block min-w-0 max-w-xs text-xs font-semibold text-sub">
                            Month
                            <input
                                type="month"
                                required
                                value={form.data.month}
                                onInput={(event) => {
                                    form.setData('month', event.currentTarget.value)
                                    form.clearErrors('month')
                                }}
                                aria-invalid={!!form.errors.month}
                                className={`${control} mt-2`}
                            />
                            {form.errors.month && (
                                <span role="alert" className="mt-2 block text-rose-700">
                                    {form.errors.month}
                                </span>
                            )}
                        </label>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                            <p className="max-w-[45ch] text-xs leading-relaxed text-sub">
                                Four steps: cutoff, DTR check, overtime &amp; allowances, confirm.
                            </p>
                            <Button
                                type="submit"
                                loading={form.processing}
                                className="min-h-[44px] bg-[#26215C] hover:bg-[#201B4D]"
                            >
                                Start payroll
                            </Button>
                        </div>
                    </form>
                </section>
                <section
                    aria-labelledby="batches-title"
                    className="overflow-hidden rounded-2xl border border-border bg-panel"
                >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
                        <div>
                            <h2 id="batches-title" className="font-heading text-xl font-bold text-text">
                                Payroll batches
                            </h2>
                            <p className="mt-1 text-xs text-sub">
                                {payrolls.filter((batch) => batch.status === 'draft').length === 1 ? '1 draft' : `${payrolls.filter((batch) => batch.status === 'draft').length} drafts`} ·{' '}
                                {payrolls.filter((batch) => batch.status === 'finalized').length} finalized
                            </p>
                        </div>
                        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(180px,1fr)_150px]">
                            <label className="text-xs text-sub">
                                Search batches
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Period or preparer"
                                    className={`${control} mt-1`}
                                />
                            </label>
                            <label className="text-xs text-sub">
                                Batch status
                                <select
                                    value={status}
                                    onChange={(event) => setStatus(event.target.value)}
                                    className={`${control} mt-1`}
                                >
                                    <option value="all">All statuses</option>
                                    <option value="draft">Draft</option>
                                    <option value="finalized">Finalized</option>
                                </select>
                            </label>
                        </div>
                    </div>
                    <div className="divide-y divide-border">
                        {visible.map((batch) => (
                            <div
                                key={batch.id}
                                className="grid items-center gap-4 p-5 md:grid-cols-[minmax(200px,1.5fr)_2fr_auto]"
                            >
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Link
                                            href={`/admin/payroll/${batch.id}`}
                                            className="font-semibold text-text hover:text-[#26215C]"
                                        >
                                            {batch.period_label}
                                        </Link>
                                        <Badge variant={batch.status}>{batch.status}</Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-sub">
                                        {batch.cutoff === 'first' ? 'First' : 'Second'} cutoff · {batch.created_by}
                                    </p>
                                </div>
                                <dl className="grid grid-cols-3 gap-3 text-xs">
                                    {[
                                        ['Gross', batch.total_gross],
                                        ['Deductions', batch.total_deductions],
                                        ['Net pay', batch.total_net],
                                    ].map(([label, amount]) => (
                                        <div key={label}>
                                            <dt className="text-sub">{label}</dt>
                                            <dd className={`mt-1 break-words tnum ${label === 'Net pay' ? 'text-base font-bold text-text' : 'font-medium text-sub'}`}>
                                                {fmt(amount)}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                                <Link
                                    href={`/admin/payroll/${batch.id}`}
                                    aria-label={`Open payroll for ${batch.period_label}`}
                                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-[#26215C] hover:bg-field"
                                >
                                    Open batch
                                </Link>
                            </div>
                        ))}
                    </div>
                    {!visible.length && (
                        <div className="px-5 py-12 text-center">
                            <h3 className="font-semibold text-text">
                                {payrolls.length ? 'No matching batches' : 'No payroll batches yet'}
                            </h3>
                            <p className="mx-auto mt-2 max-w-[45ch] text-sm leading-relaxed text-sub">
                                {payrolls.length
                                    ? 'Try a different search or status filter.'
                                    : 'Prepare a cutoff above.'}
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </AdminLayout>
    )
}
