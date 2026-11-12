import { useState } from 'react'
import Button from '@/Components/UI/Button'
import ConfirmModal from '@/Components/ConfirmModal'
import { peso } from './StepEntries'

const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)

export default function StepConfirm({ rows, offices, changed, form, canSave, save_after, period_title, onSave }) {
    const [confirming, setConfirming] = useState(false)
    const errors = Object.values(form.errors)
    const groups = Object.entries(offices).map(([key, office]) => [office.label, rows.filter((row) => row.payroll_office === key)]).filter(([, list]) => list.length)

    return (
        <section aria-labelledby="confirm-title" className="space-y-4 rounded-2xl border border-border bg-panel p-5">
            <div>
                <h2 id="confirm-title" className="font-heading text-xl font-bold text-text">Confirm {period_title}</h2>
                <p className="mt-1 text-sm text-sub">The system recalculates from the latest DTR when you save.</p>
            </div>
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
            <div className="flex flex-wrap items-center gap-3">
                <Button disabled={!canSave || form.processing} loading={form.processing && !form.data.finalize} onClick={() => onSave(false)} className="min-h-[44px] bg-[#26215C] hover:bg-[#201B4D]">
                    Save draft
                </Button>
                <Button variant="outline" disabled={!canSave || form.processing} onClick={() => setConfirming(true)} className="min-h-[44px]">
                    Save &amp; finalize
                </Button>
                {!canSave && <p className="text-sm text-sub" role="status">You can save after {save_after}.</p>}
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
