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
    const basic_before_absence = money(rate * days.length)
    const cutoff_basic = money(earned)
    const absence_deduction = money(basic_before_absence - cutoff_basic)
    const cutoff_transpo = money(item.cutoff_transpo)
    const cutoff_rep = money(item.cutoff_rep)
    const cutoff_quarterly = money(item.cutoff_quarterly)
    const weekday_ot_pay = money(hourly * 1.25 * Number(item.weekday_ot_hours || 0))
    const weekend_ot_pay = money(hourly * 1.30 * Number(item.weekend_ot_hours || 0))
    const holiday_pay = money(item.holiday_pay)
    const gross_pay = money(cutoff_basic + cutoff_transpo + cutoff_rep + cutoff_quarterly + weekday_ot_pay + weekend_ot_pay + holiday_pay)
    const deductions = { ...item.deductions }
    if (!isFirst) ['sss_deduction', 'philhealth_deduction', 'pagibig_deduction', 'tax_deduction'].forEach((key) => { deductions[key] = 0 })
    const total_deductions = money(Object.values(deductions).reduce((sum, value) => sum + money(value), 0))
    return { ...item, deductions, days_of_work: days.length, basic_before_absence, absence_deduction, cutoff_basic, cutoff_transpo, cutoff_rep, cutoff_quarterly, weekday_ot_pay, weekend_ot_pay, total_ot_pay: money(weekday_ot_pay + weekend_ot_pay), holiday_pay, gross_pay, total_deductions, net_pay: money(gross_pay - total_deductions) }
}
