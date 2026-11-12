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

test('typed allowances and holiday pay add to gross; statutory only on the 1st cutoff', () => {
    const first = calculateHoursItem(item({ days: days(8, [8]), cutoff_transpo: 750, holiday_pay: 390 }), true)
    assert.equal(first.gross_pay, 1740)
    assert.equal(first.total_deductions, 1350)
    const second = calculateHoursItem(item({ days: days(8, [8]) }), false)
    assert.equal(second.total_deductions, 0)
})
