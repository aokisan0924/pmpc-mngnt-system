/**
 * Groups planner tasks for the Today view and the task board. Late / today come from the
 * server's Manila-based `due_in_days`; `todayKey` is the Manila date as YYYY-MM-DD.
 */
export const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

const rank = task => PRIORITY_ORDER[task.priority] ?? 3
const byPriority = (a, b) => rank(a) - rank(b)
const byLateness = (a, b) => a.due_in_days - b.due_in_days || byPriority(a, b)
const isDone = task => task.status === 'done'

export function manilaToday() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
}

function shiftKey(key, days) {
    const d = new Date(`${key}T00:00:00`)
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// A task marked done a moment ago (optimistic update) has no done_on yet: it was finished today.
const doneOn = (task, todayKey) => task.done_on ?? todayKey

export function isTodayOrLate(task) {
    return !isDone(task) && typeof task.due_in_days === 'number' && task.due_in_days <= 0
}

export function boardColumns(tasks, todayKey) {
    const weekAgo = shiftKey(todayKey, -6)
    const open = tasks.filter(t => !isDone(t) && !isTodayOrLate(t))
    const done = tasks.filter(isDone)
    return {
        today: tasks.filter(isTodayOrLate).sort(byLateness),
        pending: open.filter(t => t.status === 'pending'),
        doing: open.filter(t => t.status === 'doing'),
        doneRecent: done.filter(t => doneOn(t, todayKey) >= weekAgo),
        doneOlder: done.filter(t => doneOn(t, todayKey) < weekAgo),
    }
}

export function todayGroups(tasks, todayKey) {
    const tomorrowKey = shiftKey(todayKey, 1)
    const open = tasks.filter(t => !isDone(t) && typeof t.due_in_days === 'number')
    const running = open.filter(t => t.start_date && t.start_date <= todayKey && t.due_in_days > 0)
    return {
        late: open.filter(t => t.due_in_days < 0).sort(byLateness),
        dueToday: open.filter(t => t.due_in_days === 0).sort(byPriority),
        running: running.sort(byPriority),
        tomorrow: open
            .filter(t => !running.includes(t) && (t.due_in_days === 1 || t.start_date === tomorrowKey))
            .sort(byPriority),
        doneToday: tasks.filter(t => isDone(t) && doneOn(t, todayKey) === todayKey).sort(byPriority),
    }
}
