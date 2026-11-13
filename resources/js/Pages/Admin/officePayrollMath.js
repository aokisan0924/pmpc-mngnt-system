const money = value => {
    const number = Number(value) || 0
    return Math.round((number + Math.abs(number) * Number.EPSILON) * 100) / 100
}
// Display mirror of OfficePayrollCalculator::calculateHours; the server recomputes on save.
export function calculateHoursItem(item, isFirst) {
    const rate = Number(item.daily_rate) || 0
    const days = item.days || []
    const earned = days.reduce((sum, day) => sum + (day.shift_hours > 0 ? rate * day.worked_hours / day.shift_hours : 0), 0)
    const hourly = rate / (Number(days.at(-1)?.shift_hours) || 8)
    // Monday-to-Friday staff: fixed half month (rate x 22 / 2) minus unworked hours; others: days worked.
    const fixed = item.fixed_days ?? null
    // Numbers HR typed over the system's (blank or null = system number), as in OfficePayrollCalculator::applyOverrides.
    const typed = (key) => (item.overrides?.[key] === null || item.overrides?.[key] === undefined || item.overrides?.[key] === '' ? null : money(item.overrides[key]))
    const system_basic = money(rate * (fixed ?? days.length))
    const basic_before_absence = typed('basic_before_absence') ?? system_basic
    const missing = days.reduce((sum, day) => sum + (day.shift_hours > 0 ? rate * (day.shift_hours - day.worked_hours) / day.shift_hours : 0), 0)
    const system_cutoff_basic = fixed === null ? money(earned) : money(Math.max(0, system_basic - missing))
    const system_absence = money(system_basic - system_cutoff_basic)
    // As on the October sheet: unworked holidays go in NPW- HOLIDAY, other unworked hours in the deductions' ABSENT.
    const system_nwnp = Math.min(system_absence, money(days.reduce((sum, day) => sum + (day.holiday && day.shift_hours > 0 ? rate * (day.shift_hours - day.worked_hours) / day.shift_hours : 0), 0)))
    // Absence = NPW-Holiday + Absent, capped at basic pay (Absent first) so the Excel row still balances.
    const nwnp_deduction = Math.min(typed('nwnp_deduction') ?? system_nwnp, basic_before_absence)
    const other_absence = Math.min(typed('other_absence') ?? money(system_absence - system_nwnp), money(basic_before_absence - nwnp_deduction))
    const absence_deduction = money(nwnp_deduction + other_absence)
    const cutoff_basic = money(basic_before_absence - absence_deduction)
    const cutoff_transpo = money(item.cutoff_transpo)
    const cutoff_rep = money(item.cutoff_rep)
    const cutoff_quarterly = money(item.cutoff_quarterly)
    const weekday_ot_pay = money(hourly * 1.25 * Number(item.weekday_ot_hours || 0))
    const weekend_ot_pay = money(hourly * 1.30 * Number(item.weekend_ot_hours || 0))
    const holiday_pay = money(item.holiday_pay)
    const gross_pay = money(cutoff_basic + cutoff_transpo + cutoff_rep + cutoff_quarterly + weekday_ot_pay + weekend_ot_pay + holiday_pay)
    // SSS & co. are suggested only on the 1st cutoff by the server; an amount typed on the 2nd is deducted.
    const deductions = { ...item.deductions }
    // October formula for lates: daily rate / 8 / 60 x minutes late.
    const tardiness_deduction = typed('tardiness_deduction') ?? money(rate / 8 / 60 * Number(item.tardiness_minutes || 0))
    const total_deductions = money(Object.values(deductions).reduce((sum, value) => sum + money(value), 0) + tardiness_deduction)
    const days_of_work = fixed ?? days.length
    const days_present = typed('days_present') ?? (rate > 0 ? Math.round((days_of_work - absence_deduction / rate) * 100) / 100 : 0)
    return { ...item, deductions, tardiness_deduction, days_of_work, days_present, nwnp_deduction, other_absence, sheet_gross: money(gross_pay + absence_deduction - nwnp_deduction), sheet_deductions: money(total_deductions + other_absence), basic_before_absence, absence_deduction, cutoff_basic, cutoff_transpo, cutoff_rep, cutoff_quarterly, weekday_ot_pay, weekend_ot_pay, total_ot_pay: money(weekday_ot_pay + weekend_ot_pay), holiday_pay, gross_pay, total_deductions, net_pay: money(gross_pay - total_deductions) }
}
