import { useState } from 'react'
import Button from '@/Components/UI/Button'
import ConfirmModal from '@/Components/ConfirmModal'
import { peso } from './StepEntries'

const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)

export default function StepConfirm({ rows, offices, changed, form, cutoff_open, counted_through, period_title, onSave, onMockup, mockup, mock }) {
    const [confirming, setConfirming] = useState(false)
    const negative = rows.filter((row) => Number(row.net_pay) < 0)
    const errors = Object.values(form.errors)
    const groups = Object.entries(offices).map(([key, office]) => [office.label, rows.filter((row) => row.payroll_office === key)]).filter(([, list]) => list.length)

    return (
        <section aria-labelledby="confirm-title" className="space-y-4 rounded-2xl border border-border bg-panel p-5">
            <div>
                <h2 id="confirm-title" className="font-heading text-xl font-bold text-text">Confirm {period_title}</h2>
                <p className="mt-1 text-sm text-sub">The system recalculates from the latest DTR when you save.</p>
            </div>
            {negative.length > 0 && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200">
                    <p className="font-semibold">Net pay is below zero for {negative.length} employee{negative.length === 1 ? '' : 's'}. Check typed allowances and this cutoff's loan, rent or cash advance before saving.</p>
                    <ul className="mt-1 list-disc pl-5">
                        {negative.map((row) => <li key={row.id}>{row.full_name}: ₱ {peso(row.net_pay)}</li>)}
                    </ul>
                </div>
            )}
            {changed.length > 0 && (
                <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    DTR changed since you started for {changed.length} employee{changed.length === 1 ? '' : 's'}: {changed.join(', ')}. The numbers below already use the new hours.
                </p>
            )}
            <table className="w-full text-sm">
                <thead className="text-left text-xs text-sub">
                    <tr><th className="py-2">Office</th><th className="py-2 text-right">People</th><th className="py-2 text-right">Gross</th><th className="py-2 text-right">Deductions</th><th className="py-2 text-right">Net</th></tr>
                </thead>
                <tbody className="tabular-nums">
                    {groups.map(([label, list]) => (
                        <tr key={label} className="border-t border-border">
                            <td className="py-2 text-text">{label}</td>
                            <td className="py-2 text-right">{list.length}</td>
                            <td className="py-2 text-right">{peso(sum(list, 'gross_pay'))}</td>
                            <td className="py-2 text-right">{peso(sum(list, 'total_deductions'))}</td>
                            <td className="py-2 text-right font-semibold">{peso(sum(list, 'net_pay'))}</td>
                        </tr>
                    ))}
                    <tr className="border-t-2 border-text font-bold">
                        <td className="py-2">Total</td><td className="py-2 text-right">{rows.length}</td>
                        <td className="py-2 text-right">{peso(sum(rows, 'gross_pay'))}</td>
                        <td className="py-2 text-right">{peso(sum(rows, 'total_deductions'))}</td>
                        <td className="py-2 text-right">₱ {peso(sum(rows, 'net_pay'))}</td>
                    </tr>
                </tbody>
            </table>
            {errors.length > 0 && (
                <ul role="alert" className="space-y-1 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                    {errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
            )}
            {!mock && <div className="flex flex-wrap items-center gap-3">
                <Button disabled={form.processing} loading={form.processing && !form.data.finalize} onClick={() => onSave(false)} className="min-h-[44px] bg-[#26215C] hover:bg-[#201B4D]">
                    Save draft
                </Button>
                <Button variant="outline" disabled={form.processing} onClick={() => setConfirming(true)} className="min-h-[44px]">
                    Save &amp; finalize
                </Button>
                {cutoff_open && <p className="text-sm text-amber-800 dark:text-amber-300" role="status">This cutoff isn't over yet: only days through {counted_through} are counted. Save the draft again after the last day.</p>}
            </div>}
            <div className="space-y-2 rounded-xl border border-dashed border-border p-4">
                <p className="text-sm text-sub">{mock ? 'The mockup counts every remaining day up to the end date as present. Nothing is saved.' : 'Want to check the numbers first? Download a mockup of the management Excel from this data. Nothing is saved.'}</p>
                <Button variant="outline" disabled={mockup.busy || form.processing} loading={mockup.busy} onClick={onMockup} className="min-h-[44px]">
                    Download mockup Excel
                </Button>
                {mockup.error && <p role="alert" className="text-sm text-rose-700">{mockup.error}</p>}
            </div>
            <ConfirmModal
                open={confirming}
                title="Finalize this payroll?"
                message="This can't be undone. The payroll will be locked and can no longer be edited or deleted."
                confirmLabel="Save & finalize"
                processing={form.processing}
                onCancel={() => setConfirming(false)}
                onConfirm={() => { setConfirming(false); onSave(true) }}
            />
        </section>
    )
}
