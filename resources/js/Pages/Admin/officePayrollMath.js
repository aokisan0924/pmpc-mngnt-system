const money = value => {
    const number = Number(value) || 0
    return Math.round((number + Math.abs(number) * Number.EPSILON) * 100) / 100
}
export function calculateOfficeItem(item) {
    const days_present = Number(item.paid_days_basis) - Number(item.absence_days)
    const cutoff_basic = money(Number(item.daily_rate) * days_present)
    const cutoff_transpo = money(Number(item.transpo_allowance) / 2)
    const cutoff_rep = money(Number(item.rep_allowance) / 2)
    const cutoff_quarterly = money(Number(item.quarterly_allowance) / 2)
    const weekday_ot_pay = money(Number(item.daily_rate) / 8 * 1.25 * Number(item.weekday_ot_hours || 0))
    const weekend_ot_pay = money(Number(item.daily_rate) / 8 * 1.30 * Number(item.weekend_ot_hours || 0))
    const cutoff_gross = money(cutoff_basic + cutoff_transpo + cutoff_rep + cutoff_quarterly)
    const gross_pay = money(cutoff_gross + weekday_ot_pay + weekend_ot_pay)
    const total_deductions = money(Object.values(item.deductions).reduce((sum, value) => sum + money(value), 0) + money(item.tardiness_deduction))
    return { ...item, ...item.deductions, days_present, cutoff_basic, cutoff_transpo, cutoff_rep, cutoff_quarterly, cutoff_gross, weekday_ot_pay, weekend_ot_pay, gross_pay, total_deductions, net_pay: money(gross_pay - total_deductions) }
}
