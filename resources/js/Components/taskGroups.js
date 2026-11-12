/**
 * Groups planner tasks for the Today view and the task board. Day counts come from each task's
 * `due_date` and `todayKey` (the Manila date as YYYY-MM-DD), not the server's `due_in_days`, so a
 * page left open past midnight regroups correctly on its next render.
 */
export const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

const rank = task => PRIORITY_ORDER[task.priority] ?? 3
const byPriority = (a, b) => rank(a) - rank(b)
const isDone = task => task.status === 'done'

export function manilaToday() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
}

const dayNumber = key => Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10))) / 86400000

function shiftKey(key, days) {
    return new Date((dayNumber(key) + days) * 86400000).toISOString().slice(0, 10)
}

/** Whole days from today until the due date: negative when late, null when undated. */
export function daysUntil(task, todayKey) {
    return task.due_date ? dayNumber(task.due_date.slice(0, 10)) - dayNumber(todayKey) : null
}

// A task marked done a moment ago (optimistic update) has no done_on yet: it was finished today.
const doneOn = (task, todayKey) => task.done_on ?? todayKey

/** Open and due today. Late tasks are not "today": they stay in their status column. */
export function isDueToday(task, todayKey) {
    return !isDone(task) && daysUntil(task, todayKey) === 0
}

/**
 * Board columns. Today holds not-started tasks due today; once started they show in Doing.
 * With `hideTodo`, late not-started tasks move from To do into `late` (shown atop Today), most late first.
 */
export function boardColumns(tasks, todayKey, { hideTodo = false } = {}) {
    const weekAgo = shiftKey(todayKey, -6)
    const notStarted = tasks.filter(t => t.status === 'pending')
    const isLate = t => (daysUntil(t, todayKey) ?? 0) < 0
    const done = tasks.filter(isDone)
    return {
        late: hideTodo
            ? notStarted.filter(isLate).sort((a, b) => daysUntil(a, todayKey) - daysUntil(b, todayKey) || byPriority(a, b))
            : [],
        today: notStarted.filter(t => isDueToday(t, todayKey)).sort(byPriority),
        pending: notStarted.filter(t => !isDueToday(t, todayKey) && !(hideTodo && isLate(t))),
        doing: tasks.filter(t => t.status === 'doing'),
        doneRecent: done.filter(t => doneOn(t, todayKey) >= weekAgo),
        doneOlder: done.filter(t => doneOn(t, todayKey) < weekAgo),
    }
}

export function todayGroups(tasks, todayKey) {
    const tomorrowKey = shiftKey(todayKey, 1)
    const days = t => daysUntil(t, todayKey)
    const byLateness = (a, b) => days(a) - days(b) || byPriority(a, b)
    const open = tasks.filter(t => !isDone(t) && days(t) !== null)
    const running = open.filter(t => t.start_date && t.start_date <= todayKey && days(t) > 0)
    return {
        late: open.filter(t => days(t) < 0).sort(byLateness),
        dueToday: open.filter(t => days(t) === 0).sort(byPriority),
        running: running.sort(byPriority),
        tomorrow: open
            .filter(t => !running.includes(t) && (days(t) === 1 || t.start_date === tomorrowKey))
            .sort(byPriority),
        doneToday: tasks.filter(t => isDone(t) && doneOn(t, todayKey) === todayKey).sort(byPriority),
    }
}
