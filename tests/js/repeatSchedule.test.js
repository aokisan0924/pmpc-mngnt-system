import test from 'node:test'
import assert from 'node:assert/strict'
import { describeSchedule, isBackwards, nextDue, rangeLead } from '../../resources/js/Components/repeatSchedule.js'

const nov11 = new Date(2026, 10, 11)
const monthly = { repeat: 'monthly', range: true, fromDay: 16, toDay: 20 }

test('a monthly 16 to 20 range is 4 days and reads plainly', () => {
    assert.equal(rangeLead(monthly), 4)
    assert.deepEqual(describeSchedule(monthly, nov11), {
        title: 'Every month, from the 16th to the 20th.',
        detail: 'First one: Nov 16 → Nov 20. Each new one appears on its first day and is late after the last.',
    })
})

test('a monthly range already past this month starts next month', () => {
    assert.ok(describeSchedule({ ...monthly, fromDay: 1, toDay: 5 }, nov11).detail.startsWith('First one: Dec 1 → Dec 5.'))
})

test('a due day of today still counts this month', () => {
    assert.equal(nextDue({ repeat: 'monthly', toDay: 11 }, nov11).getMonth(), 10)
})

test('a backwards monthly range has no lead and no sentence', () => {
    const s = { ...monthly, fromDay: 25, toDay: 5 }
    assert.equal(isBackwards(s), true)
    assert.equal(rangeLead(s), null)
    assert.equal(describeSchedule(s, nov11), null)
})

test('a week range may wrap past Sunday', () => {
    const s = { repeat: 'weekly', range: true, fromWeekday: 5, toWeekday: 1 }
    assert.equal(rangeLead(s), 3)
    assert.equal(isBackwards(s), false)
    assert.equal(describeSchedule(s, nov11).title, 'Every week, Friday to Monday.')
})

test('a one day monthly repeat mentions how early it appears', () => {
    assert.deepEqual(describeSchedule({ repeat: 'monthly', range: false, toDay: 20, showEarly: 7 }, nov11), {
        title: 'Every month on the 20th.',
        detail: 'First one: Nov 20. Each new one appears 7 days before it is due.',
    })
})

test('the last day of a short month is used', () => {
    assert.equal(nextDue({ repeat: 'monthly', lastDay: true }, new Date(2027, 1, 3)).getDate(), 28)
    assert.equal(describeSchedule({ repeat: 'monthly', lastDay: true, range: false }, nov11).title, 'Every month on the last day.')
})

test('day 31 clamps in a short month', () => {
    assert.equal(nextDue({ repeat: 'monthly', toDay: 31 }, new Date(2027, 1, 3)).getDate(), 28)
})

test('a yearly date already past moves to next year', () => {
    const s = { repeat: 'yearly', range: true, month: 3, fromDay: 16, toDay: 20 }
    assert.equal(describeSchedule(s, nov11).title, 'Every year, March 16 to March 20.')
    assert.equal(nextDue(s, nov11).getFullYear(), 2027)
})

test('an unfinished range gives no sentence', () => {
    assert.equal(describeSchedule({ ...monthly, fromDay: '' }, nov11), null)
})

test('the same first and last day reads as one day', () => {
    assert.equal(describeSchedule({ ...monthly, fromDay: 20, toDay: 20 }, nov11).title, 'Every month on the 20th.')
})

test('ordinals read correctly', () => {
    const title = d => describeSchedule({ repeat: 'monthly', range: false, toDay: d }, nov11).title
    assert.equal(title(1), 'Every month on the 1st.')
    assert.equal(title(2), 'Every month on the 2nd.')
    assert.equal(title(3), 'Every month on the 3rd.')
    assert.equal(title(11), 'Every month on the 11th.')
    assert.equal(title(22), 'Every month on the 22nd.')
})
