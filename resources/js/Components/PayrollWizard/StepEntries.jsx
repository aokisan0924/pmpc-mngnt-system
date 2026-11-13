import { Fragment, useState } from 'react'
import MarkHolidayModal from '@/Components/MarkHolidayModal'
import { shownOverride } from '@/Pages/Admin/officePayrollMath'

export const peso = (value) => (Number(value) ? Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-')
const th = 'border border-black px-2.5 py-2 text-center text-[11px] font-bold uppercase leading-tight text-black dark:border-slate-500 dark:text-slate-100'
const td = 'border border-black px-2.5 py-2 text-right tabular-nums whitespace-nowrap text-black dark:border-slate-500 dark:text-slate-100'
const name = `${td} !text-left !whitespace-normal min-w-[170px] bg-slate-100 dark:bg-slate-800`
const strong = `${td} bg-slate-100 font-bold dark:bg-slate-800`
const total = 'px-2.5 py-2 text-right font-bold tabular-nums text-[#c00000] dark:text-rose-400'

// A typed-over number shows in blue with an undo (↺) that brings back the system's number.
function Cell({ label, value, onChange, step = '0.01', error, changed = false, onReset, system }) {
    return (
        <td className={`${td} relative p-0 ${changed ? 'bg-sky-100 dark:bg-sky-950/60' : 'bg-yellow-50 dark:bg-yellow-950/40'}`} title={changed && system !== undefined ? `Typed by hand. System: ${peso(system)}` : undefined}>
            {changed && onReset && (
                <button type="button" onClick={onReset} aria-label={`Undo: use the system number for ${label}`} className="absolute left-0.5 top-0.5 min-h-[24px] min-w-[24px] rounded text-xs font-bold text-sky-800 hover:bg-sky-200 dark:text-sky-300 dark:hover:bg-sky-900">↺</button>
            )}
            <input
                type="number" min="0" step={step} value={value} aria-label={label} aria-invalid={!!error} title={error}
                onChange={(event) => onChange(event.target.value)}
                className={`h-10 w-full min-w-[96px] bg-transparent px-2.5 text-right tabular-nums text-black outline-none focus:bg-white focus:ring-2 focus:ring-[#26215C] dark:text-slate-100 dark:focus:bg-slate-900 ${error ? 'ring-2 ring-rose-600' : ''}`}
            />
        </td>
    )
}

const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)

export default function StepEntries({ rows, offices, period_title, holidays, signatories, setTyped, employees, errors = {}, can_mark_holiday = false, holiday_types = {} }) {
    const [markingHoliday, setMarkingHoliday] = useState(false)
    const officeKeys = Object.keys(offices).filter((key) => rows.some((row) => row.payroll_office === key))
    const [office, setOffice] = useState(officeKeys[0])
    const visible = rows.filter((row) => row.payroll_office === office)
    const err = (row, field) => errors[`items.${employees.findIndex((employee) => employee.id === row.id)}.${field}`]
    const deduction = (row, field, value) => setTyped(row.id, 'deductions', { ...row.deductions, [field]: value })
    const override = (row, key, value) => {
        const next = { ...row.overrides }
        if (value === null) delete next[key]
        else next[key] = value
        setTyped(row.id, 'overrides', next)
    }
    const typedOver = (row, key) => row.overrides?.[key] !== undefined && row.overrides?.[key] !== null && row.overrides?.[key] !== ''
    // A computed number HR may type over; the sheet shows the typed value or the system's.
    const Over = ({ row, field, label, step }) => (
        <Cell label={`${label} for ${row.full_name}`} step={step} value={shownOverride(row, field)} system={row.system?.[field]}
            changed={typedOver(row, field) || Object.hasOwn(row.overrides ?? {}, field)} onReset={() => override(row, field, null)} onChange={(value) => override(row, field, value)}
            error={err(row, `overrides.${field}`) || (row.capped?.[field] !== undefined ? `Capped at ${peso(row.capped[field])}: absences cannot be more than basic pay` : undefined)} />
    )
    const Ded = ({ row, field, label }) => {
        const changed = row.system && Number(row.deductions[field] ?? 0) !== Number(row.system[field] ?? 0)
        return <Cell label={`${label} for ${row.full_name}`} value={row.deductions[field] ?? 0} system={row.system?.[field]} changed={changed}
            onReset={() => deduction(row, field, row.system[field])} onChange={(value) => deduction(row, field, value)} error={err(row, `deductions.${field}`)} />
    }

    return (
        <section aria-labelledby="entries-title" className="space-y-3">
            <h2 id="entries-title" className="sr-only">Overtime and allowances</h2>
            <div className="rounded-2xl border border-border bg-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="font-heading text-base font-bold text-text">Overtime &amp; holiday pay</h3>
                        <p className="mt-0.5 text-sm text-sub">Approved overtime hours and the premium for anyone who worked a holiday. Everyone in this payroll, all offices.</p>
                        <p className="mt-1 text-xs text-sub">
                            Holidays in this cutoff: {holidays.length ? holidays.map((holiday) => `${holiday.label} (${holiday.name})`).join(', ') : 'none'}.
                        </p>
                    </div>
                    {can_mark_holiday && (
                        <button type="button" onClick={() => setMarkingHoliday(true)} className="min-h-[44px] rounded-xl border border-border px-3 text-sm font-semibold text-[#26215C] hover:bg-field dark:text-indigo-300">
                            + Add a holiday
                        </button>
                    )}
                </div>
                <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse text-xs">
                        <thead>
                            <tr className="text-left text-sub">
                                {['Employee', 'Weekday OT hours (125%)', 'Rest-day OT hours (130%)', 'Holiday premium ₱', 'Hours worked on holidays', 'Holiday work pay (DOLE)', 'Overtime + premium'].map((label) => <th key={label} className="px-2 py-2 font-semibold">{label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="border-t border-border">
                                    <td className="px-2 py-1.5 text-text">{row.full_name}</td>
                                    {[['weekday_ot_hours', 'Weekday overtime hours', '0.5'], ['weekend_ot_hours', 'Rest-day overtime hours', '0.5'], ['holiday_pay', 'Holiday premium', '0.01']].map(([field, text, step]) => (
                                        <td key={field} className="px-2 py-1.5">
                                            <input
                                                type="number" min="0" step={step} value={row[field]} aria-label={`${text} for ${row.full_name}`}
                                                aria-invalid={!!err(row, field)} title={err(row, field)}
                                                onChange={(event) => setTyped(row.id, field, event.target.value)}
                                                className={`h-10 w-28 rounded-lg border bg-yellow-50 px-2 text-right tabular-nums text-text dark:bg-yellow-950/40 ${err(row, field) ? 'border-rose-600' : 'border-border'}`}
                                            />
                                        </td>
                                    ))}
                                    <td className="px-2 py-1.5">
                                        {(row.holiday_work ?? []).length === 0 && <span className="text-sub">—</span>}
                                        {(row.holiday_work ?? []).map((holiday) => {
                                            const label = new Date(`${holiday.date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                                            return (
                                                <div key={holiday.date} className="flex items-center gap-2 py-0.5 whitespace-nowrap">
                                                    <span className="w-14 text-sub">{label}</span>
                                                    {holiday.dtr_hours !== null
                                                        ? <span className="tabular-nums text-text" title="From the DTR">{holiday.dtr_hours} h (DTR)</span>
                                                        : (
                                                            <input
                                                                type="number" min="0" max="24" step="0.5" value={row.holiday_hours?.[holiday.date] ?? ''} placeholder="0"
                                                                aria-label={`Hours ${row.full_name} worked on ${label} (no DTR punches)`}
                                                                onChange={(event) => setTyped(row.id, 'holiday_hours', { ...row.holiday_hours, [holiday.date]: event.target.value })}
                                                                className="h-10 w-20 rounded-lg border border-border bg-yellow-50 px-2 text-right tabular-nums text-text dark:bg-yellow-950/40"
                                                            />
                                                        )}
                                                </div>
                                            )
                                        })}
                                        {err(row, 'holiday_hours') && <p role="alert" className="text-rose-700">{err(row, 'holiday_hours')}</p>}
                                    </td>
                                    <td className="px-2 py-1.5 text-right tabular-nums text-text" title="DOLE rate for the hours worked, minus pay already counted for that day">
                                        ₱ {peso(row.worked_holiday_pay)}
                                        {row.holiday_paid_twice && <p role="alert" className="mt-1 whitespace-normal text-left text-[11px] font-semibold text-amber-800 dark:text-amber-300">Also has a typed holiday premium. Check it isn't paid twice.</p>}
                                    </td>
                                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-text">₱ {peso(Number(row.total_ot_pay) + Number(row.holiday_pay || 0) + Number(row.worked_holiday_pay || 0))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {markingHoliday && (
                <MarkHolidayModal holidayTypes={holiday_types} preserveState onClose={() => setMarkingHoliday(false)} onDone={() => {}} />
            )}
            <div role="tablist" aria-label="Office" className="flex flex-wrap gap-1">
                {officeKeys.map((key) => (
                    <button
                        key={key} type="button" role="tab" aria-selected={office === key} onClick={() => setOffice(key)}
                        className={`min-h-[44px] rounded-t-lg border border-b-0 px-4 text-xs font-bold uppercase ${office === key ? 'border-slate-400 bg-white text-black dark:bg-slate-900 dark:text-white' : 'border-border bg-field text-sub'}`}
                    >
                        {offices[key].label}
                    </button>
                ))}
            </div>
            <div role="tabpanel" className="overflow-x-auto rounded-b-xl rounded-tr-xl border border-slate-400 bg-white p-4 dark:bg-slate-900" style={{ fontFamily: '"Tw Cen MT", "Century Gothic", Arial, sans-serif' }}>
                <div className="flex w-max items-start gap-12">
                    <div className="shrink-0">
                        <p className="text-center text-sm font-bold text-black dark:text-white">MANAGEMENT PAYROLL</p>
                        <p className="mb-1 text-center text-sm font-bold text-black dark:text-white">{period_title}</p>
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr>{['Employee name', 'Position', 'Days of work', 'Basic pay', 'Overtime pay', 'Transpo allow', 'Rep allow', 'Quart allow', 'NPW- Holiday', 'Gross pay', 'Deductions', 'Net pay'].map((label) => <th key={label} className={th}>{label}</th>)}</tr>
                            </thead>
                            <tbody>
                                {visible.map((row) => (
                                    <tr key={row.id}>
                                        <td className={name}>{row.sheet_name}</td>
                                        <td className={`${td} !text-left !whitespace-normal min-w-[150px]`}>{row.position}</td>
                                        {Over({ row, field: 'days_present', label: 'Days of work' })}
                                        {Over({ row, field: 'basic_before_absence', label: 'Basic pay' })}
                                        <td className={td} title={Number(row.holiday_pay) || Number(row.worked_holiday_pay) ? 'Includes holiday pay (typed premium and DOLE holiday work pay), as in the Excel' : undefined}>{peso(Number(row.total_ot_pay) + Number(row.holiday_pay || 0) + Number(row.worked_holiday_pay || 0))}</td>
                                        <Cell label={`Transport allowance for ${row.full_name}`} value={row.cutoff_transpo} onChange={(value) => setTyped(row.id, 'cutoff_transpo', value)} error={err(row, 'cutoff_transpo')} />
                                        <Cell label={`Representation allowance for ${row.full_name}`} value={row.cutoff_rep} onChange={(value) => setTyped(row.id, 'cutoff_rep', value)} error={err(row, 'cutoff_rep')} />
                                        <Cell label={`Quarterly allowance for ${row.full_name}`} value={row.cutoff_quarterly} onChange={(value) => setTyped(row.id, 'cutoff_quarterly', value)} error={err(row, 'cutoff_quarterly')} />
                                        {Over({ row, field: 'nwnp_deduction', label: 'NPW-Holiday (no work, no pay)' })}
                                        <td className={strong}>{peso(row.sheet_gross)}</td>
                                        <td className={td}>{peso(row.sheet_deductions)}</td>
                                        <td className={`${strong} ${row.net_pay < 0 ? '!text-rose-700 dark:!text-rose-400' : ''}`} title={row.net_pay < 0 ? 'Net pay is below zero' : undefined}>{row.net_pay < 0 ? `(${peso(-row.net_pay)})` : peso(row.net_pay)}</td>
                                    </tr>
                                ))}
                                <tr><td colSpan={9} className={total}>TOTAL</td><td className={total}>{peso(sum(visible, 'sheet_gross'))}</td><td className={total}>{peso(sum(visible, 'sheet_deductions'))}</td><td className={total}>{peso(sum(visible, 'net_pay'))}</td></tr>
                            </tbody>
                        </table>
                        {holidays.length > 0 && <p className="mt-1 text-xs text-black dark:text-slate-300">NPW- Holiday: {holidays.map((holiday) => holiday.label).join(', ')} (no work, no pay). Other absences, lates and early-outs are under ABSENT in the deductions.</p>}
                    </div>
                    <div className="shrink-0">
                        <p className="text-center text-base font-bold text-black dark:text-white">GOVT &amp; OTHER DEDUCTIONS</p>
                        <table className="mt-1 w-full border-collapse text-xs">
                            <thead>
                                <tr>{['Employee name', 'W/H tax', 'SSS', 'PhilHealth', 'Pag-IBIG', 'Loan', 'CC', 'Cash advance', 'Absent', 'Late', 'Rental', 'Electricity', 'Total'].map((label) => <th key={label} className={th}>{label}</th>)}</tr>
                            </thead>
                            <tbody>
                                {visible.map((row) => (
                                    <tr key={row.id}>
                                        <td className={name}>{row.sheet_name}</td>
                                        {[['tax_deduction', 'W/H tax'], ['sss_deduction', 'SSS'], ['philhealth_deduction', 'PhilHealth'], ['pagibig_deduction', 'Pag-IBIG'], ['loan_deduction', 'Loan'], ['capital_contribution_deduction', 'Capital contribution'], ['cash_advance_deduction', 'Cash advance']].map(([field, label]) => (
                                            <Fragment key={field}>{Ded({ row, field, label })}</Fragment>
                                        ))}
                                        {Over({ row, field: 'other_absence', label: 'Absent' })}
                                        {Over({ row, field: 'tardiness_deduction', label: Number(row.tardiness_minutes) ? `Late (${row.tardiness_minutes} min)` : 'Late' })}
                                        {Ded({ row, field: 'rental_deduction', label: 'Rental' })}
                                        {Ded({ row, field: 'electricity_deduction', label: 'Electricity' })}
                                        <td className={strong}>{peso(row.sheet_deductions)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <table className="mt-10 border-collapse text-xs">
                    <thead>
                        <tr><th colSpan={3} className={th}>Overtime pay (125%)</th><th colSpan={2} className={th}>Rest-day overtime (130%)</th><th className={th}>Holiday pay ₱</th></tr>
                        <tr>{['Employee name', 'No of hours', 'Total OT pay', 'No of hours', 'Total OT pay', 'Typed premium'].map((label, index) => <th key={index} className={th}>{label}</th>)}</tr>
                    </thead>
                    <tbody>
                        {visible.map((row) => (
                            <tr key={row.id}>
                                <td className={name}>{row.sheet_name}</td>
                                <td className={td}>{Number(row.weekday_ot_hours) || '-'}</td>
                                <td className={td}>{peso(row.weekday_ot_pay)}</td>
                                <td className={td}>{Number(row.weekend_ot_hours) || '-'}</td>
                                <td className={td}>{peso(row.weekend_ot_pay)}</td>
                                <td className={td}>{peso(row.holiday_pay)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-10 grid max-w-4xl grid-cols-4 gap-8 text-xs text-black dark:text-slate-200">
                    {[['prepared', 'Prepared by:'], ['prepared_2', ' '], ['certified', 'Certified correct:'], ['approved', 'Approved by:']].map(([key, label]) => (
                        <div key={key}>
                            {label}
                            <p className="mt-4 font-bold underline">{signatories?.[key]?.name ?? '—'}</p>
                            <p>{signatories?.[key]?.position}</p>
                        </div>
                    ))}
                </div>
            </div>
            <p className="text-xs text-sub">Scroll sideways inside the sheet to see every column. Yellow cells are typed by HR; overtime and holiday pay go in the panel above. Only approved overtime goes in. Everything else comes from the DTR and employee records.</p>
        </section>
    )
}
