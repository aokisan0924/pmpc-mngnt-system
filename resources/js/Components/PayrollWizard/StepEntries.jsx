import { useState } from 'react'
import MarkHolidayModal from '@/Components/MarkHolidayModal'

export const peso = (value) => (Number(value) ? Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-')
const th = 'border border-black px-2.5 py-2 text-center text-[11px] font-bold uppercase leading-tight text-black dark:border-slate-500 dark:text-slate-100'
const td = 'border border-black px-2.5 py-2 text-right tabular-nums whitespace-nowrap text-black dark:border-slate-500 dark:text-slate-100'
const name = `${td} !text-left !whitespace-normal min-w-[170px] bg-slate-100 dark:bg-slate-800`
const strong = `${td} bg-slate-100 font-bold dark:bg-slate-800`
const total = 'px-2.5 py-2 text-right font-bold tabular-nums text-[#c00000] dark:text-rose-400'

function Cell({ label, value, onChange, step = '0.01', error }) {
    return (
        <td className={`${td} bg-yellow-50 p-0 dark:bg-yellow-950/40`}>
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
                    <table className="w-full min-w-[640px] border-collapse text-xs">
                        <thead>
                            <tr className="text-left text-sub">
                                {['Employee', 'Weekday OT hours (125%)', 'Rest-day OT hours (130%)', 'Holiday premium ₱', 'Overtime + premium'].map((label) => <th key={label} className="px-2 py-2 font-semibold">{label}</th>)}
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
                                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-text">₱ {peso(Number(row.total_ot_pay) + Number(row.holiday_pay || 0))}</td>
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
                                        <td className={td}>{row.days_present}</td>
                                        <td className={td}>{peso(row.basic_before_absence)}</td>
                                        <td className={td} title={Number(row.holiday_pay) ? 'Includes the typed holiday premium, as in the Excel' : undefined}>{peso(Number(row.total_ot_pay) + Number(row.holiday_pay || 0))}</td>
                                        <Cell label={`Transport allowance for ${row.full_name}`} value={row.cutoff_transpo} onChange={(value) => setTyped(row.id, 'cutoff_transpo', value)} error={err(row, 'cutoff_transpo')} />
                                        <Cell label={`Representation allowance for ${row.full_name}`} value={row.cutoff_rep} onChange={(value) => setTyped(row.id, 'cutoff_rep', value)} error={err(row, 'cutoff_rep')} />
                                        <Cell label={`Quarterly allowance for ${row.full_name}`} value={row.cutoff_quarterly} onChange={(value) => setTyped(row.id, 'cutoff_quarterly', value)} error={err(row, 'cutoff_quarterly')} />
                                        <td className={td} title="Holiday not worked: no work, no pay">{peso(row.nwnp_deduction)}</td>
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
                                <tr>{['Employee name', 'W/H tax', 'SSS', 'PhilHealth', 'Pag-IBIG', 'Loan', 'CC', 'Cash advance', 'Absent', 'Late', 'Rental', 'Total'].map((label) => <th key={label} className={th}>{label}</th>)}</tr>
                            </thead>
                            <tbody>
                                {visible.map((row) => (
                                    <tr key={row.id}>
                                        <td className={name}>{row.sheet_name}</td>
                                        {['tax_deduction', 'sss_deduction', 'philhealth_deduction', 'pagibig_deduction'].map((field) => <td key={field} className={td}>{peso(row.deductions[field])}</td>)}
                                        {[['loan_deduction', 'Loan'], ['capital_contribution_deduction', 'Capital contribution'], ['cash_advance_deduction', 'Cash advance']].map(([field, label]) => (
                                            <Cell key={field} label={`${label} for ${row.full_name}`} value={row.deductions[field]} onChange={(value) => deduction(row, field, value)} error={err(row, `deductions.${field}`)} />
                                        ))}
                                        <td className={td}>{peso(row.other_absence)}</td>
                                        <td className={td} title={Number(row.tardiness_minutes) ? `${row.tardiness_minutes} minutes late × daily rate ÷ 8 ÷ 60` : undefined}>
                                            {peso(row.tardiness_deduction)}
                                            {Number(row.tardiness_minutes) > 0 && <span className="block text-[11px] font-normal text-slate-600 dark:text-slate-400">{row.tardiness_minutes} min</span>}
                                        </td>
                                        <td className={td}>{peso(row.deductions.rental_deduction)}</td>
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
