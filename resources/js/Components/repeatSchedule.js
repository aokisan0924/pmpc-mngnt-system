// Plain-language helpers for the "Does it repeat?" part of the New Task form.
// A schedule: { repeat, range, fromDay, toDay, lastDay, fromWeekday, toWeekday, month, showEarly }.
// toDay and toWeekday are the due day; a range is stored as "show it N days before".

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const filled = v => v !== '' && v !== null && v !== undefined

function ordinal(n) {
    const tail = n % 100
    if (tail >= 11 && tail <= 13) return `${n}th`
    return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

const shortDate = date => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
const daysIn = (year, month) => new Date(year, month + 1, 0).getDate()

/** A range that runs backwards, like day 25 to day 5. Weeks can wrap, months cannot. */
export function isBackwards(s) {
    return Boolean(s.range) && s.repeat !== 'weekly' && filled(s.fromDay) && filled(s.toDay) && Number(s.toDay) < Number(s.fromDay)
}

// shortcut: a range is a fixed number of days back from the due day, so day 25 to 31 starts early in a short month; store the first day on the rule if that matters.
/** Days between the first and last day of a range, or null while it is unfinished or backwards. */
export function rangeLead(s) {
    if (s.repeat === 'weekly') {
        if (!filled(s.fromWeekday) || !filled(s.toWeekday)) return null
        return (Number(s.toWeekday) - Number(s.fromWeekday) + 7) % 7
    }
    if (!filled(s.fromDay) || !filled(s.toDay) || isBackwards(s)) return null
    return Number(s.toDay) - Number(s.fromDay)
}

/** The first due date on or after today. Mirrors RecurringTask::nextDueAfter. */
export function nextDue(s, today) {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (s.repeat === 'daily') return start
    if (s.repeat === 'weekly') return addDays(start, (Number(s.toWeekday) - start.getDay() + 7) % 7)
    if (s.repeat === 'yearly') {
        const month = Number(s.month) - 1
        const on = year => new Date(year, month, Math.min(Number(s.toDay), daysIn(year, month)))
        return on(start.getFullYear()) >= start ? on(start.getFullYear()) : on(start.getFullYear() + 1)
    }
    const at = offset => {
        const first = new Date(start.getFullYear(), start.getMonth() + offset, 1)
        const last = daysIn(first.getFullYear(), first.getMonth())
        return new Date(first.getFullYear(), first.getMonth(), s.lastDay ? last : Math.min(Number(s.toDay), last))
    }
    return at(0) >= start ? at(0) : at(1)
}

function headline(s, isRange) {
    const from = Number(s.fromDay)
    const to = Number(s.toDay)
    switch (s.repeat) {
        case 'daily':
            return 'Every day.'
        case 'weekly':
            return isRange
                ? `Every week, ${WEEKDAYS[s.fromWeekday]} to ${WEEKDAYS[s.toWeekday]}.`
                : `Every week on ${WEEKDAYS[s.toWeekday]}.`
        case 'yearly':
            return isRange
                ? `Every year, ${MONTHS[s.month - 1]} ${from} to ${MONTHS[s.month - 1]} ${to}.`
                : `Every year on ${MONTHS[s.month - 1]} ${to}.`
        default:
            if (isRange) return `Every month, from the ${ordinal(from)} to the ${ordinal(to)}.`
            return s.lastDay ? 'Every month on the last day.' : `Every month on the ${ordinal(to)}.`
    }
}

/** The sentence under the form, or null until the schedule is complete. */
export function describeSchedule(s, today) {
    if (!s.repeat) return null
    if (s.repeat === 'weekly' && !filled(s.toWeekday)) return null
    if (((s.repeat === 'monthly' && !s.lastDay) || s.repeat === 'yearly') && !filled(s.toDay)) return null
    if (s.repeat === 'yearly' && !filled(s.month)) return null

    const lead = s.range ? rangeLead(s) : 0
    if (lead === null) return null

    const due = nextDue(s, today)
    const isRange = lead > 0
    const title = headline(s, isRange)
    if (isRange) {
        return { title, detail: `First one: ${shortDate(addDays(due, -lead))} → ${shortDate(due)}. Each new one appears on its first day and is late after the last.` }
    }
    const early = Number(s.showEarly) || 0
    return { title, detail: `First one: ${shortDate(due)}.${early > 0 ? ` Each new one appears ${early} ${early === 1 ? 'day' : 'days'} before it is due.` : ''}` }
}
