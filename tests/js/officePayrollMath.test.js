import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateHoursItem } from '../../resources/js/Pages/Admin/officePayrollMath.js'

// Same numbers as tests/Unit/HoursPayrollCalculatorTest.php, so the step 3 screen and the saved payroll agree.
const days = (shift, worked) => worked.map((hours, i) => ({ date: `2026-11-${String(i + 2).padStart(2, '0')}`, shift_hours: shift, worked_hours: hours, holiday: false }))
const item = (changes) => ({ daily_rate: 600, days: [], weekday_ot_hours: 0, weekend_ot_hours: 0, holiday_pay: 0, cutoff_transpo: 0, cutoff_rep: 0, cutoff_quarterly: 0, deductions: { sss_deduction: 500, tax_deduction: 850, loan_deduction: 0 }, ...changes })

test('Mariel: two unworked days land in absent', () => {
    const row = calculateHoursItem(item({ days: days(8, [8, 8, 0, 0, 8, 8, 8, 8, 8]) }), true)
    assert.equal(row.basic_before_absence, 5400)
    assert.equal(row.absence_deduction, 1200)
    assert.equal(row.cutoff_basic, 4200)
})

test('Violie: 12-hour shift is 50 an hour, overtime uses the same rate', () => {
    const row = calculateHoursItem(item({ days: days(12, [6, ...Array(10).fill(12)]), weekday_ot_hours: 2, weekend_ot_hours: 1 }), true)
    assert.equal(row.cutoff_basic, 6300)
    assert.equal(row.weekday_ot_pay, 125)
    assert.equal(row.weekend_ot_pay, 65)
})

test('typed allowances and holiday pay add to gross; SSS & co. only on the 1st cutoff, tax on both', () => {
    const first = calculateHoursItem(item({ days: days(8, [8]), cutoff_transpo: 750, holiday_pay: 390 }), true)
    assert.equal(first.gross_pay, 1740)
    assert.equal(first.total_deductions, 1350)
    // 2nd cutoff: SSS & co. start at 0 on the server, but an amount HR types is deducted (Kurt, 2026-11-13).
    const second = calculateHoursItem(item({ days: days(8, [8]), deductions: { sss_deduction: 450, tax_deduction: 425 } }), false)
    assert.equal(second.total_deductions, 875)
})

test('office staff: fixed half month minus missing hours (Kurt, 800 x 22 / 2)', () => {
    const row = calculateHoursItem(item({ daily_rate: 800, fixed_days: 11, days: days(8, [0, 8, 8, 8, 4, 8, 8, 8, 8, 8]) }), true)
    assert.equal(row.basic_before_absence, 8800)
    assert.equal(row.absence_deduction, 1200)
    assert.equal(row.cutoff_basic, 7600)
})

test('October sheet: holiday in NPW- HOLIDAY, other absences in deductions, net unchanged', () => {
    const row = calculateHoursItem(item({ daily_rate: 800, fixed_days: 11, days: days(8, [0, 8, 8, 8, 4, 8, 8, 8, 8, 8]).map((day, i) => ({ ...day, holiday: i === 0 })) }), true)
    assert.equal(row.nwnp_deduction, 800)
    assert.equal(row.other_absence, 400)
    assert.equal(row.days_present, 9.5)
    assert.equal(row.sheet_gross, 8000)
    assert.equal(row.sheet_deductions, row.total_deductions + 400)
    assert.equal(row.sheet_gross - row.sheet_deductions, row.net_pay)
})

test('lates use the October formula: rate / 8 / 60 x minutes', () => {
    const row = calculateHoursItem(item({ daily_rate: 800, fixed_days: 11, tardiness_minutes: 4, deductions: {}, days: days(8, [8, 8]) }), false)
    assert.equal(row.tardiness_deduction, 6.67)
    assert.equal(row.total_deductions, 6.67)
})

test('days present rounded once, like the server (879.81, 11 days, 1 hour missing)', () => {
    const row = calculateHoursItem(item({ daily_rate: 879.81, fixed_days: 11, days: days(8, [7, ...Array(10).fill(8)]) }), true)
    assert.equal(row.days_present, 10.87)
})

test('typed electricity is a deduction', () => {
    const without = calculateHoursItem(item({ days: days(8, [8]) }), true)
    const withBill = calculateHoursItem(item({ days: days(8, [8]), deductions: { sss_deduction: 500, tax_deduction: 850, loan_deduction: 0, electricity_deduction: 350 } }), true)
    assert.equal(withBill.net_pay, without.net_pay - 350)
})

// Same numbers as HoursPayrollCalculatorTest: rate 600, fixed 11 days, one 8 h absence.
const oneAbsence = (overrides) => calculateHoursItem(item({ days: days(8, [8, 0, 8, 8, 8, 8, 8, 8, 8, 8]), fixed_days: 11, deductions: { tax_deduction: 0 }, overrides }), true)

test('typed basic pay replaces only basic', () => {
    const row = oneAbsence({ basic_before_absence: 7000 })
    assert.equal(row.basic_before_absence, 7000)
    assert.equal(row.absence_deduction, 600)
    assert.equal(row.cutoff_basic, 6400)
})

test('typed absent and NPW set the absence', () => {
    const row = oneAbsence({ nwnp_deduction: 0, other_absence: 300 })
    assert.equal(row.absence_deduction, 300)
    assert.equal(row.nwnp_deduction, 0)
    assert.equal(row.other_absence, 300)
    assert.equal(row.cutoff_basic, 6300)
})

test('typed late and days of work', () => {
    const late = calculateHoursItem(item({ days: days(8, [8]), tardiness_minutes: 30, deductions: {}, overrides: { tardiness_deduction: 50 } }), true)
    assert.equal(late.tardiness_deduction, 50)
    assert.equal(late.total_deductions, 50)
    assert.equal(oneAbsence({ days_present: 10.5 }).days_present, 10.5)
    assert.equal(oneAbsence({}).days_present, 10)
})

test('typed basic below the absence caps the absence', () => {
    const row = oneAbsence({ basic_before_absence: 500 })
    assert.equal(row.cutoff_basic, 0)
    assert.equal(row.absence_deduction, 500)
})

test('cleared overrides fall back to the system numbers', () => {
    const row = oneAbsence({ basic_before_absence: null, other_absence: '' })
    assert.equal(row.basic_before_absence, 6600)
    assert.equal(row.absence_deduction, 600)
})
