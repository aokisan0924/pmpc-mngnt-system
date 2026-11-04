import { useEffect } from 'react'
import { useForm } from '@inertiajs/react'
import Button from '@/Components/UI/Button'

const INPUT = 'w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all'
const LABEL = 'block text-xs font-semibold text-sub uppercase tracking-wider mb-1.5'

/**
 * Create / edit dialog for a task. Render it only while open: it reads its
 * initial values from `task` / `defaultDate` when it mounts.
 *
 * Pass `employees` ([{ id, name }]) to show an Employee select (admin use).
 */
export default function TaskFormModal({
    task = null,
    defaultDate = '',
    employees = null,
    createUrl,
    updateUrl,
    onClose,
}) {
    const { data, setData, post, patch, processing, errors } = useForm({
        title:       task?.title ?? '',
        description: task?.description ?? '',
        due_date:    task?.due_date?.slice(0, 10) ?? defaultDate,
        category:    task?.category ?? '',
        priority:    task?.priority ?? 'medium',
        ...(employees ? { employee_id: task?.employee_id ?? '' } : {}),
    })

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    function submit(e) {
        e.preventDefault()
        const options = { preserveScroll: true, onSuccess: onClose }
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
                className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-2xl space-y-5"
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
                    {employees && (
                        <div>
                            <label htmlFor="task-form-employee-input" className={LABEL}>
                                Employee <span className="text-rose-500">*</span>
                            </label>
                            <select
                                id="task-form-employee-input"
                                value={data.employee_id}
                                onChange={e => setData('employee_id', e.target.value)}
                                className={INPUT}
                                required
                            >
                                <option value="" disabled>Choose an employee</option>
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
