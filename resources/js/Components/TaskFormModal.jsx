import { useEffect, useState } from 'react'
import { useForm } from '@inertiajs/react'
import Button from '@/Components/UI/Button'
import PeoplePicker from '@/Components/PeoplePicker'

const INPUT = 'w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all'
const LEAD_DEFAULTS = { daily: 0, weekly: 2, monthly: 7, yearly: 14 }
const LABEL = 'block text-xs font-semibold text-sub uppercase tracking-wider mb-1.5'

/** Days from start to due, both counted ("Nov 10 → Nov 20" is 11 days); null until both are valid. */
function spanDays(start, due) {
    if (!start || !due || start > due) return null
    return Math.round((Date.parse(due) - Date.parse(start)) / 86400000) + 1
}

/**
 * Create / edit dialog for a task. Render it only while open: it reads its
 * initial values from `task` / `defaultDate` when it mounts.
 *
 * Pass `employees` ([{ id, name }]) and `offices` ([{ key, label }]) to show the
 * Employee and Office selects (admin use). Leaving the employee empty makes it a
 * whole-office task, seen by everyone in the chosen office.
 */
export default function TaskFormModal({
    task = null,
    defaultDate = '',
    employees = null,
    offices = [],
    createUrl,
    updateUrl,
    onClose,
}) {
    const [mode, setMode] = useState('people') // when creating as admin: pick people, or a whole office
    const [share, setShare] = useState('copies') // with 2+ people: one copy each, or one shared task
    const [dueType, setDueType] = useState('date') // when creating as admin: a date, a span, a schedule, or none
    const [spanOn, setSpanOn] = useState(Boolean(task?.start_date)) // employee form and edits: Start beside Due
    const accent = employees ? 'accent-[#26215C]' : 'accent-[#0F6E56]'
    const adminCreate = Boolean(employees) && !task
    const sharedEdit = Boolean(task?.is_shared)
    const { data, setData, post, patch, processing, errors, transform } = useForm({
        title:       task?.title ?? '',
        description: task?.description ?? '',
        due_date:    task ? (task.due_date?.slice(0, 10) ?? '') : defaultDate,
        start_date:  task?.start_date ?? '',
        category:    task?.category ?? '',
        priority:    task?.priority ?? 'medium',
        ...(employees ? {
            employee_id: task?.employee_id ?? '', office: task?.office ?? '', employee_ids: task?.is_shared ? task.assignees.map(a => a.id) : [],
            repeat: '', repeat_day_of_week: '', repeat_day_of_month: '', repeat_last_day: false,
            repeat_month: '', repeat_lead_days: '', repeat_until: '',
        } : {}),
    })

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Escape inside a filled search box clears the search (the browser does that); it must not close the form and lose the draft.
            if (e.key === 'Escape' && !(e.target?.type === 'search' && e.target.value)) onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    // Choosing how often it repeats pre-fills the day from today, never from a date typed earlier.
    function chooseRepeat(value) {
        const due = new Date()
        setData(d => ({
            ...d,
            repeat: value,
            repeat_day_of_week: d.repeat_day_of_week === '' ? due.getDay() : d.repeat_day_of_week,
            repeat_day_of_month: d.repeat_day_of_month === '' ? due.getDate() : d.repeat_day_of_month,
            repeat_month: d.repeat_month === '' ? due.getMonth() + 1 : d.repeat_month,
        }))
    }

    function chooseDueType(value) {
        setDueType(value)
        if (value === 'recurring' && !data.repeat) chooseRepeat('monthly')
    }

    const dateRequired = employees ? Boolean(task?.repeat_label) : !(task && !task.due_date)
    const pickerError = errors.employee_ids ?? Object.entries(errors).find(([k]) => k.startsWith('employee_ids.'))?.[1] ?? errors.employee_id

    function submit(e) {
        e.preventDefault()
        const options = { preserveScroll: true, onSuccess: onClose }
        if (adminCreate) {
            // People mode sends the list; whole-office mode sends only the office.
            const due = d => ({
                ...d,
                due_type: dueType,
                ...(dueType === 'date' || dueType === 'span' ? { repeat: '' } : { due_date: '' }),
                // A Start typed under Date span must not follow the admin to another choice.
                ...(dueType !== 'span' ? { start_date: '' } : {}),
                ...(dueType === 'none' ? { repeat: '' } : {}),
                // A "Stop after" typed under Recurring must not follow the admin to another choice.
                ...(dueType !== 'recurring' ? { repeat_until: '' } : {}),
            })
            transform(d => due(mode === 'people'
                ? { ...d, employee_id: '', office: '', shared: share === 'shared' && d.employee_ids.length >= 2 }
                : (({ employee_ids, ...rest }) => rest)(d)))
        }
        if (task) {
            patch(updateUrl(task), options)
        } else {
            post(createUrl, options)
        }
    }

    const who = (
        <>
            {employees && !task && (
                <div>
                    <div className="flex gap-1 rounded-xl border border-border bg-field p-1 w-fit" role="group" aria-label="Who is this task for">
                        {[['people', 'Specific people'], ['office', 'Whole office']].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                autoFocus={key === 'people'}
                                aria-pressed={mode === key}
                                onClick={() => setMode(key)}
                                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                                    mode === key ? 'border border-indigo-200 bg-white font-bold text-[#26215C] shadow-xs dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200' : 'border border-transparent text-sub hover:text-text'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {mode === 'people' && (
                        <div className="mt-3">
                            <PeoplePicker
                                employees={employees}
                                offices={offices}
                                listClassName="max-h-56 lg:max-h-[min(26rem,50vh)]"
                                value={data.employee_ids}
                                onChange={ids => setData('employee_ids', ids)}
                                error={pickerError}
                            />
                            {data.employee_ids.length >= 2 && (
                                <fieldset className="mt-3 space-y-2">
                                    <legend className={LABEL}>How to give it</legend>
                                    {[
                                        ['copies', 'Each person gets their own copy', null],
                                        ['shared', 'One shared task', 'One task for everyone on it; any of them can move it.'],
                                    ].map(([key, label, hint]) => (
                                        <label key={key} className="flex cursor-pointer items-start gap-2 text-sm font-medium text-text">
                                            <input
                                                type="radio"
                                                name="task-form-share"
                                                value={key}
                                                checked={share === key}
                                                onChange={() => setShare(key)}
                                                className="mt-0.5 h-4 w-4 accent-[#26215C]"
                                            />
                                            <span>
                                                {label}
                                                {hint && <span className="block text-xs font-normal text-sub">{hint}</span>}
                                            </span>
                                        </label>
                                    ))}
                                </fieldset>
                            )}
                        </div>
                    )}
                </div>
            )}

            {employees && sharedEdit && (
                <PeoplePicker
                    employees={[
                        ...employees,
                        ...task.assignees
                            .filter(a => !a.active && !employees.some(e => e.id === a.id))
                            .map(a => ({ id: a.id, name: `${a.name} (inactive)`, office: a.office })),
                    ]}
                    offices={offices}
                    value={data.employee_ids}
                    onChange={ids => setData('employee_ids', ids)}
                    error={pickerError}
                />
            )}

            {employees && task && !sharedEdit && (
                <div>
                    <label htmlFor="task-form-employee-input" className={LABEL}>
                        Employee
                    </label>
                    <select
                        id="task-form-employee-input"
                        value={data.employee_id}
                        onChange={e => setData('employee_id', e.target.value)}
                        className={INPUT}
                    >
                        <option value="">Whole office (everyone in the office)</option>
                        {(task && !employees.some(emp => emp.id === task.employee_id)
                            ? [{ id: task.employee_id, name: `${task.employee_name} (inactive)` }, ...employees]
                            : employees
                        ).map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                    </select>
                    {errors.employee_id && <p className="mt-1 text-xs text-rose-500">{errors.employee_id}</p>}
                </div>
            )}

            {employees && !sharedEdit && (task || mode === 'office') && (
                <div>
                    <label htmlFor="task-form-office-input" className={LABEL}>
                        Office {!data.employee_id && <span className="text-rose-500">*</span>}
                    </label>
                    <select
                        id="task-form-office-input"
                        value={data.office}
                        onChange={e => setData('office', e.target.value)}
                        className={INPUT}
                        required={!data.employee_id}
                    >
                        <option value="">{data.employee_id ? "The employee's own office" : 'Choose an office'}</option>
                        {offices.map(o => (
                            <option key={o.key} value={o.key}>{o.label}</option>
                        ))}
                    </select>
                    {errors.office && <p className="mt-1 text-xs text-rose-500">{errors.office}</p>}
                </div>
            )}
        </>
    )

    const days = spanDays(data.start_date, data.due_date)

    // Start → Due side by side, with the number of days between them.
    const spanInputs = (
        <div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="task-form-start-date-input" className={LABEL}>Start <span className="text-rose-500">*</span></label>
                    <input
                        id="task-form-start-date-input"
                        type="date"
                        value={data.start_date}
                        max={data.due_date || undefined}
                        onChange={e => setData('start_date', e.target.value)}
                        className={`${INPUT} py-2 font-mono`}
                        required
                    />
                    {errors.start_date && <p className="mt-1 text-xs text-rose-500">{errors.start_date}</p>}
                </div>
                <div>
                    <label htmlFor="task-form-due-date-input" className={LABEL}>Due <span className="text-rose-500">*</span></label>
                    <input
                        id="task-form-due-date-input"
                        type="date"
                        value={data.due_date}
                        min={data.start_date || undefined}
                        onChange={e => setData('due_date', e.target.value)}
                        className={`${INPUT} py-2 font-mono`}
                        required
                    />
                    {errors.due_date && <p className="mt-1 text-xs text-rose-500">{errors.due_date}</p>}
                </div>
            </div>
            {days && <p className="mt-1 text-xs text-sub">{days === 1 ? '1 day' : `${days} days`}</p>}
        </div>
    )

    function toggleSpan(on) {
        setSpanOn(on)
        if (!on) setData('start_date', '')
    }

    const due = (
            <fieldset className="space-y-3 rounded-xl border border-border p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-sub">When is it due?</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {[['date', 'Has a due date'], ['span', 'Date span'], ['recurring', 'Recurring'], ['none', 'No due date']].map(([key, label]) => (
                        <label key={key} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text">
                            <input
                                type="radio"
                                name="task-form-due-type"
                                value={key}
                                checked={dueType === key}
                                onChange={() => chooseDueType(key)}
                                className="h-4 w-4 accent-[#26215C]"
                            />
                            {label}
                        </label>
                    ))}
                </div>

                {dueType === 'date' && (
                    <div>
                        <label htmlFor="task-form-due-date-input" className="sr-only">Due date</label>
                        <input
                            id="task-form-due-date-input"
                            type="date"
                            value={data.due_date}
                            onChange={e => setData('due_date', e.target.value)}
                            className={`${INPUT} py-2 font-mono`}
                            required
                        />
                        {errors.due_date && <p className="mt-1 text-xs text-rose-500">{errors.due_date}</p>}
                    </div>
                )}

                {dueType === 'span' && spanInputs}

                {dueType === 'none' && <p className="text-xs text-sub">Ongoing: it stays open until someone marks it done.</p>}

                {dueType === 'recurring' && (<>
                <p className="text-xs text-sub">The first one is the next date on this schedule, from today.</p>
                <div>
                    <label htmlFor="task-form-repeat-input" className={LABEL}>How often</label>
                    <select
                        id="task-form-repeat-input"
                        value={data.repeat}
                        onChange={e => chooseRepeat(e.target.value)}
                        className={INPUT}
                    >
                        <option value="daily">Every day</option>
                        <option value="weekly">Every week</option>
                        <option value="monthly">Every month</option>
                        <option value="yearly">Every year</option>
                    </select>
                    {errors.repeat && <p className="mt-1 text-xs text-rose-500">{errors.repeat}</p>}
                </div>

                {data.repeat === 'weekly' && (
                    <div>
                        <label htmlFor="task-form-repeat-weekday" className={LABEL}>On</label>
                        <select id="task-form-repeat-weekday" value={data.repeat_day_of_week} onChange={e => setData('repeat_day_of_week', e.target.value)} className={INPUT}>
                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => <option key={d} value={i}>{d}</option>)}
                        </select>
                        {errors.repeat_day_of_week && <p className="mt-1 text-xs text-rose-500">{errors.repeat_day_of_week}</p>}
                    </div>
                )}

                {(data.repeat === 'monthly' || data.repeat === 'yearly') && (
                    <div className="grid grid-cols-2 gap-3">
                        {data.repeat === 'yearly' && (
                            <div>
                                <label htmlFor="task-form-repeat-month" className={LABEL}>Month</label>
                                <select id="task-form-repeat-month" value={data.repeat_month} onChange={e => setData('repeat_month', e.target.value)} className={INPUT}>
                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                </select>
                                {errors.repeat_month && <p className="mt-1 text-xs text-rose-500">{errors.repeat_month}</p>}
                            </div>
                        )}
                        <div>
                            <label htmlFor="task-form-repeat-day" className={LABEL}>Day of the month</label>
                            <input
                                id="task-form-repeat-day" type="number" min="1" max="31"
                                value={data.repeat_day_of_month}
                                disabled={data.repeat === 'monthly' && data.repeat_last_day}
                                onChange={e => setData('repeat_day_of_month', e.target.value)}
                                className={INPUT}
                            />
                            {errors.repeat_day_of_month && <p className="mt-1 text-xs text-rose-500">{errors.repeat_day_of_month}</p>}
                        </div>
                        {data.repeat === 'monthly' && (
                            <label className="flex items-end gap-2 pb-2 text-sm font-medium text-text">
                                <input type="checkbox" checked={data.repeat_last_day} onChange={e => setData('repeat_last_day', e.target.checked)} className="h-4 w-4 rounded border-border" />
                                Last day of the month
                            </label>
                        )}
                    </div>
                )}

                {data.repeat && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="task-form-repeat-lead" className={LABEL}>Show it days before</label>
                            <input
                                id="task-form-repeat-lead" type="number" min="0" max="60"
                                value={data.repeat_lead_days}
                                placeholder={String(LEAD_DEFAULTS[data.repeat])}
                                onChange={e => setData('repeat_lead_days', e.target.value)}
                                className={INPUT}
                            />
                        </div>
                        <div>
                            <label htmlFor="task-form-repeat-until" className={LABEL}>Stop after (optional)</label>
                            <input id="task-form-repeat-until" type="date" value={data.repeat_until} onChange={e => setData('repeat_until', e.target.value)} className={`${INPUT} py-2 font-mono`} />
                            {errors.repeat_until && <p className="mt-1 text-xs text-rose-500">{errors.repeat_until}</p>}
                        </div>
                    </div>
                )}
                </>)}
            </fieldset>
    )

    const titleDesc = (
        <>
            <div>
                <label htmlFor="task-form-title-input" className={LABEL}>
                    Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                    id="task-form-title-input"
                    type="text"
                    value={data.title}
                    onChange={e => setData('title', e.target.value)}
                    placeholder="What needs to be accomplished?"
                    className={INPUT}
                    required
                    autoFocus={!adminCreate}
                />
                {errors.title && <p className="mt-1 text-xs text-rose-500">{errors.title}</p>}
            </div>

            <div>
                <label htmlFor="task-form-desc-input" className={LABEL}>
                    Description (Optional)
                </label>
                <textarea
                    id="task-form-desc-input"
                    value={data.description}
                    onChange={e => setData('description', e.target.value)}
                    rows={2}
                    placeholder="Details or deliverables..."
                    className={`${INPUT} resize-none`}
                />
            </div>
        </>
    )

    // Employee form and every edit. Copies made by a repeat rule keep a single date.
    const dueDateField = (
        <div className="space-y-2">
            {!task?.repeat_label && (
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-text">
                    <input type="checkbox" checked={spanOn} onChange={e => toggleSpan(e.target.checked)} className={`h-4 w-4 rounded border-border ${accent}`} />
                    Date span (start and due date)
                </label>
            )}
            {spanOn ? spanInputs : (
                <div>
                    <label htmlFor="task-form-due-date-input" className={LABEL}>
                        Due Date {dateRequired ? <span className="text-rose-500">*</span> : '(optional)'}
                    </label>
                    <input
                        id="task-form-due-date-input"
                        type="date"
                        value={data.due_date}
                        onChange={e => setData('due_date', e.target.value)}
                        className={`${INPUT} py-2 font-mono`}
                        required={dateRequired}
                    />
                    {!dateRequired && <p className="mt-1 text-xs text-sub">Leave empty for no due date.</p>}
                    {errors.due_date && <p className="mt-1 text-xs text-rose-500">{errors.due_date}</p>}
                </div>
            )}
        </div>
    )

    const priority = (
        <div>
            <label htmlFor="task-form-priority-input" className={LABEL}>
                Priority
            </label>
            <select
                id="task-form-priority-input"
                value={data.priority}
                onChange={e => setData('priority', e.target.value)}
                className={`${INPUT} py-2`}
            >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
            </select>
        </div>
    )

    const category = (
        <div>
            <label htmlFor="task-form-category-input" className={LABEL}>
                Category / Label
            </label>
            <input
                id="task-form-category-input"
                type="text"
                value={data.category}
                onChange={e => setData('category', e.target.value)}
                placeholder="e.g. Operations, Accounting"
                className={INPUT}
            />
        </div>
    )

    const details = (
        <>
            {titleDesc}
            {adminCreate ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {priority}
                    {category}
                </div>
            ) : (<>
                {dueDateField}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {priority}
                    {category}
                </div>
            </>)}
        </>
    )

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-form-title"
        >
            <div
                className={`flex w-full max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl ${adminCreate ? 'max-w-2xl lg:max-w-4xl' : 'max-w-lg'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="shrink-0 flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
                    <h2 id="task-form-title" className="text-lg font-bold font-display text-text">
                        {task ? 'Edit Task' : 'Schedule New Task'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close task form"
                        className="text-sub hover:text-text p-1 rounded-lg hover:bg-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
                        {adminCreate ? (
                            <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
                                <div className="space-y-4 lg:border-r lg:border-border lg:pr-6">{who}</div>
                                <div className="space-y-4">{due}{details}</div>
                            </div>
                        ) : (<>{who}{details}</>)}
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border bg-panel px-5 py-3 sm:px-6">
                        <Button variant="secondary" size="md" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button variant={employees ? 'primary' : 'emerald'} size="md" type="submit" loading={processing}>
                            {task ? 'Update Task' : 'Add Task'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
