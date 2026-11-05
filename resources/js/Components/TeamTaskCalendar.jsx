import { useMemo, useState } from 'react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_CHIPS = 3

const toKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function buildMonthGrid(viewDate) {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const startOffset = new Date(year, month, 1).getDay()
    const cells = []
    for (let i = startOffset; i > 0; i--) cells.push(new Date(year, month, 1 - i))
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) {
        const last = cells[cells.length - 1]
        cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1))
    }
    return cells
}

function ownerOf(task) {
    if (task.is_shared) {
        const people = task.assignees ?? []
        return people.length ? `${people[0].name.split(' ')[0]}${people.length > 1 ? ` +${people.length - 1}` : ''}` : 'No one'
    }
    if (task.employee_name) return task.employee_name.split(' ')[0]
    return task.office_label ? task.office_label.replace(' Office', '') : ''
}

/** Month grid of the Team tasks list. A chip opens the task's detail window. */
export default function TeamTaskCalendar({ tasks, onOpen }) {
    const today = useMemo(() => new Date(), [])
    const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

    const byDate = useMemo(() => {
        const map = {}
        tasks.forEach(t => {
            const key = t.due_date?.slice(0, 10)
            if (key) (map[key] ??= []).push(t)
        })
        return map
    }, [tasks])

    const cells = useMemo(() => buildMonthGrid(viewDate), [viewDate])
    const todayKey = toKey(today)
    const shift = months => setViewDate(v => new Date(v.getFullYear(), v.getMonth() + months, 1))

    return (
        <div className="rounded-2xl border border-border bg-panel p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-field p-1">
                    <button type="button" onClick={() => shift(-1)} aria-label="Previous month"
                        className="rounded-lg p-1.5 text-sub hover:bg-panel hover:text-text focus-visible:outline-2 focus-visible:outline-indigo-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="min-w-36 text-center font-heading text-xs font-bold text-text">
                        {viewDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                    </span>
                    <button type="button" onClick={() => shift(1)} aria-label="Next month"
                        className="rounded-lg p-1.5 text-sub hover:bg-panel hover:text-text focus-visible:outline-2 focus-visible:outline-indigo-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
                <button type="button" onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}
                    className="rounded-xl border border-border bg-field px-3 py-1.5 text-xs font-bold text-[#26215C] hover:bg-hover focus-visible:outline-2 focus-visible:outline-indigo-600">
                    Today
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs font-bold uppercase tracking-wider text-dim">
                {WEEKDAYS.map(w => <div key={w}>{w}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {cells.map(date => {
                    const key = toKey(date)
                    const inMonth = date.getMonth() === viewDate.getMonth()
                    const dayTasks = byDate[key] ?? []
                    const shown = dayTasks.slice(0, MAX_CHIPS)
                    const extra = dayTasks.length - shown.length

                    return (
                        <div
                            key={key}
                            className={`min-h-[84px] rounded-lg border p-1 sm:min-h-[104px] sm:p-1.5 ${
                                key === todayKey ? 'border-[#26215C] bg-indigo-50/60' : inMonth ? 'border-border/60 bg-field/40' : 'border-transparent opacity-50'
                            }`}
                        >
                            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-xs font-bold ${key === todayKey ? 'bg-[#26215C] text-white' : 'text-text'}`}>
                                {date.getDate()}
                            </span>
                            <div className="mt-1 space-y-1">
                                {shown.map(task => (
                                    <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => onOpen(task)}
                                        title={`${task.title}${ownerOf(task) ? ` · ${ownerOf(task)}` : ''}`}
                                        className={`block w-full truncate rounded-md px-1.5 py-0.5 text-left text-xs font-medium focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                                            task.status === 'done'
                                                ? 'bg-field text-dim line-through'
                                                : task.is_overdue
                                                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                                    : 'bg-indigo-500/10 text-[#26215C] dark:text-indigo-200'
                                        }`}
                                    >
                                        {task.repeat_label ? '↻ ' : ''}{task.title}{ownerOf(task) ? ` · ${ownerOf(task)}` : ''}
                                    </button>
                                ))}
                                {extra > 0 && <p className="px-1 text-xs font-semibold text-dim">+{extra} more</p>}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
