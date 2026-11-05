import { useEffect, useState } from 'react'
import { useForm } from '@inertiajs/react'
import Button from '@/Components/UI/Button'
import PeoplePicker from '@/Components/PeoplePicker'

const INPUT = 'w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all'
const LEAD_DEFAULTS = { daily: 0, weekly: 2, monthly: 7, yearly: 14 }
const LABEL = 'block text-xs font-semibold text-sub uppercase tracking-wider mb-1.5'

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
    const { data, setData, post, patch, processing, errors, transform } = useForm({
        title:       task?.title ?? '',
        description: task?.description ?? '',
        due_date:    task?.due_date?.slice(0, 10) ?? defaultDate,
        category:    task?.category ?? '',
        priority:    task?.priority ?? 'medium',
        ...(employees ? {
            employee_id: task?.employee_id ?? '', office: task?.office ?? '', employee_ids: [],
            repeat: '', repeat_day_of_week: '', repeat_day_of_month: '', repeat_last_day: false,
            repeat_month: '', repeat_lead_days: '', repeat_until: '',
        } : {}),
    })

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    // Choosing how often it repeats pre-fills the day from the due date.
    function chooseRepeat(value) {
        const due = data.due_date ? new Date(`${data.due_date}T00:00:00`) : new Date()
        setData(d => ({
            ...d,
            repeat: value,
            repeat_day_of_week: d.repeat_day_of_week === '' ? due.getDay() : d.repeat_day_of_week,
            repeat_day_of_month: d.repeat_day_of_month === '' ? due.getDate() : d.repeat_day_of_month,
            repeat_month: d.repeat_month === '' ? due.getMonth() + 1 : d.repeat_month,
        }))
    }

    function submit(e) {
        e.preventDefault()
        const options = { preserveScroll: true, onSuccess: onClose }
        if (employees && !task) {
            // People mode sends the list; whole-office mode sends only the office.
            transform(d => mode === 'people'
                ? { ...d, employee_id: '', office: '' }
                : (({ employee_ids, ...rest }) => rest)(d))
        }
        if (task) {
            patch(updateUrl(task), options)
        } else {
            post(createUrl, options)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-form-title"
        >
            <div
                className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-panel p-6 shadow-2xl space-y-5"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-3 border-b border-border">
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

                <form onSubmit={submit} className="space-y-4">
                    {employees && !task && (
                        <div>
                            <div className="flex gap-1 rounded-xl border border-border bg-field p-1 w-fit" role="group" aria-label="Who is this task for">
                                {[['people', 'Specific people'], ['office', 'Whole office']].map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        aria-pressed={mode === key}
                                        onClick={() => setMode(key)}
                                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                                            mode === key ? 'border border-indigo-200 bg-white font-bold text-[#26215C] shadow-xs' : 'border border-transparent text-sub hover:text-text'
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
                                        value={data.employee_ids}
                                        onChange={ids => setData('employee_ids', ids)}
                                        error={errors.employee_ids ?? Object.entries(errors).find(([k]) => k.startsWith('employee_ids.'))?.[1] ?? errors.employee_id}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {employees && task && (
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

                    {employees && (task || mode === 'office') && (
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
                            autoFocus
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

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="task-form-due-date-input" className={LABEL}>
                                Due Date <span className="text-rose-500">*</span>
                            </label>
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
                    </div>

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

                    {employees && !task && (
                        <fieldset className="space-y-3 rounded-xl border border-border p-3">
                            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-sub">Repeats</legend>
                            <div>
                                <label htmlFor="task-form-repeat-input" className="sr-only">Repeats</label>
                                <select
                                    id="task-form-repeat-input"
                                    value={data.repeat}
                                    onChange={e => chooseRepeat(e.target.value)}
                                    className={INPUT}
                                >
                                    <option value="">Does not repeat</option>
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
                        </fieldset>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
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
