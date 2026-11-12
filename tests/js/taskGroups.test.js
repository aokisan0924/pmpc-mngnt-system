import test from 'node:test'
import assert from 'node:assert/strict'
import { boardColumns, daysUntil, isDueToday, manilaToday, todayGroups } from '../../resources/js/Components/taskGroups.js'

const todayKey = '2026-11-12'
const keyPlus = n => { const d = new Date(2026, 10, 12 + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
let nextId = 1
// Tests give due_in_days for readability; it becomes a due_date, and due_in_days is set to a stale value the helper must ignore.
const t = ({ due_in_days = null, ...overrides } = {}) => ({
    id: nextId++, status: 'pending', priority: 'low', start_date: null, done_on: null,
    due_date: due_in_days === null ? null : keyPlus(due_in_days), due_in_days: due_in_days === null ? null : 99,
    ...overrides,
})

test('day counts come from due_date and the given today, so a page left open past midnight stays right', () => {
    const task = t({ due_in_days: 1 })
    assert.equal(daysUntil(task, todayKey), 1)
    assert.equal(daysUntil(task, '2026-11-13'), 0)
    assert.equal(isDueToday(task, todayKey), false)
    assert.equal(isDueToday(task, '2026-11-13'), true)
    assert.equal(daysUntil(t(), todayKey), null)
})
const ids = list => list.map(x => x.id)

test('boardColumns puts due-today not-started tasks in today, high priority first; late not-started tasks in late; late doing stays in doing', () => {
    const late = t({ due_in_days: -3 })
    const lateDoing = t({ due_in_days: -1, status: 'doing' })
    const todayLow = t({ due_in_days: 0, priority: 'low' })
    const todayHigh = t({ due_in_days: 0, priority: 'high' })
    const later = t({ due_in_days: 5 })
    const cols = boardColumns([later, todayLow, late, todayHigh, lateDoing], todayKey)
    assert.deepEqual(ids(cols.today), [todayHigh.id, todayLow.id])
    assert.deepEqual(ids(cols.pending), [later.id])
    assert.deepEqual(ids(cols.doing), [lateDoing.id])
    assert.deepEqual(ids(cols.late), [late.id])
})

test('a doing task due today moves to doing', () => {
    const doing = t({ status: 'doing', due_in_days: 0 })
    const cols = boardColumns([doing], todayKey)
    assert.deepEqual(ids(cols.doing), [doing.id])
    assert.deepEqual(cols.today, [])
})

test('late not-started tasks go to late, most late first then priority; future and undated stay in To do', () => {
    const late3 = t({ due_in_days: -3 })
    const late1High = t({ due_in_days: -1, priority: 'high' })
    const late1Low = t({ due_in_days: -1 })
    const lateDoing = t({ due_in_days: -2, status: 'doing' })
    const later = t({ due_in_days: 4 })
    const undated = t()
    const cols = boardColumns([late1Low, later, late3, undated, lateDoing, late1High], todayKey)
    assert.deepEqual(ids(cols.late), [late3.id, late1High.id, late1Low.id])
    assert.deepEqual(ids(cols.doing), [lateDoing.id])
    assert.deepEqual(ids(cols.pending), [later.id, undated.id])
})

test('a done task due today goes to done, not today or doing', () => {
    const done = t({ status: 'done', due_in_days: 0, done_on: todayKey })
    const cols = boardColumns([done], todayKey)
    assert.deepEqual(ids(cols.doneRecent), [done.id])
    assert.deepEqual(cols.today, [])
    assert.deepEqual(cols.doing, [])
})

test('undated open tasks stay in their status column', () => {
    const undated = t({ due_in_days: null })
    const cols = boardColumns([undated], todayKey)
    assert.equal(isDueToday(undated, todayKey), false)
    assert.deepEqual(ids(cols.pending), [undated.id])
    assert.deepEqual(cols.today, [])
})

test('done this week vs older', () => {
    const recent = t({ status: 'done', done_on: '2026-11-06' })
    const older = t({ status: 'done', done_on: '2026-11-05' })
    const cols = boardColumns([recent, older], todayKey)
    assert.deepEqual(ids(cols.doneRecent), [recent.id])
    assert.deepEqual(ids(cols.doneOlder), [older.id])
})

test('a just-finished task with no done_on counts as done today', () => {
    const justDone = t({ status: 'done', done_on: null, due_in_days: -1 })
    assert.deepEqual(ids(boardColumns([justDone], todayKey).doneRecent), [justDone.id])
    assert.deepEqual(boardColumns([justDone], todayKey).today, [])
    assert.deepEqual(ids(todayGroups([justDone], todayKey).doneToday), [justDone.id])
})

test('todayGroups splits late, today, running, tomorrow', () => {
    const late = t({ due_in_days: -1 })
    const due = t({ due_in_days: 0 })
    const running = t({ start_date: '2026-11-10', due_in_days: 3 })
    const tomorrow = t({ due_in_days: 1 })
    const startsTomorrow = t({ start_date: '2026-11-13', due_in_days: 4 })
    const farAway = t({ due_in_days: 9 })
    const undated = t({})
    const oldDone = t({ status: 'done', done_on: '2026-11-11' })
    const g = todayGroups([late, due, running, tomorrow, startsTomorrow, farAway, undated, oldDone], todayKey)
    assert.deepEqual(ids(g.late), [late.id])
    assert.deepEqual(ids(g.dueToday), [due.id])
    assert.deepEqual(ids(g.running), [running.id])
    assert.deepEqual(ids(g.tomorrow), [tomorrow.id, startsTomorrow.id])
    assert.deepEqual(g.doneToday, [])
})

test('groups sort high priority first', () => {
    const low = t({ due_in_days: 0, priority: 'low' })
    const high = t({ due_in_days: 0, priority: 'high' })
    const medium = t({ due_in_days: 0, priority: 'medium' })
    assert.deepEqual(ids(todayGroups([low, high, medium], todayKey).dueToday), [high.id, medium.id, low.id])
})

test('an overdue span is late, not running', () => {
    const span = t({ start_date: '2026-11-01', due_in_days: -2 })
    const g = todayGroups([span], todayKey)
    assert.deepEqual(ids(g.late), [span.id])
    assert.deepEqual(g.running, [])
})

test('manilaToday returns a YYYY-MM-DD date', () => {
    assert.match(manilaToday(), /^\d{4}-\d{2}-\d{2}$/)
})
