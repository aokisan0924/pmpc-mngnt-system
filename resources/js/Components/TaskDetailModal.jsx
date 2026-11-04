import { useEffect } from 'react'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'

const STATUSES = [
    { status: 'pending', label: 'To do' },
    { status: 'doing',   label: 'Doing' },
    { status: 'done',    label: 'Done' },
]

const PRIORITY = {
    high:   { variant: 'rose',   label: 'High priority' },
    medium: { variant: 'amber',  label: 'Medium priority' },
    low:    { variant: 'indigo', label: 'Low priority' },
}

function longDate(key) {
    return new Date(`${key}T00:00:00`).toLocaleDateString('en-PH', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
}

function Detail({ label, children }) {
    return (
        <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-sub">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-text break-words">{children}</dd>
        </div>
    )
}

/**
 * Larger read view of one task with the same actions as its card.
 * `readOnly` hides Edit and Delete (employees on a whole-office task).
 */
export default function TaskDetailModal({ task, onClose, onMove, onEdit, onDelete, readOnly = false, showOwner = false }) {
    useEffect(() => {
        if (!task) return
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [task, onClose])

    if (!task) return null

    const priority = PRIORITY[task.priority]
    const statusLabel = STATUSES.find(s => s.status === task.status)?.label
    const wholeOffice = task.employee_id === null
    const owner = task.employee_name ?? (wholeOffice && task.office_label ? `Whole office · ${task.office_label}` : null)
    const done = task.status === 'done'

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-detail-title"
        >
            <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-panel p-6 shadow-2xl space-y-5"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-border">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sub">Task</p>
                        <h2
                            id="task-detail-title"
                            className={`mt-1 text-xl font-bold font-display break-words ${done ? 'line-through text-dim' : 'text-text'}`}
                        >
                            {task.title}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {priority && <Badge variant={priority.variant} size="sm">{priority.label}</Badge>}
                            {statusLabel && <Badge variant="slate" size="sm">{statusLabel}</Badge>}
                            {task.is_overdue && <Badge variant="rose" size="sm">Overdue</Badge>}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        autoFocus
                        aria-label="Close task details"
                        className="shrink-0 text-sub hover:text-text p-1 rounded-lg hover:bg-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Detail label="Due">{longDate(task.due_date)}</Detail>
                    {(showOwner || wholeOffice) && owner && <Detail label={showOwner ? 'For' : 'Shared with'}>{owner}</Detail>}
                    {task.office_label && !wholeOffice && <Detail label="Office">{task.office_label}</Detail>}
                    {task.assigned_by_name && <Detail label="Assigned by">{task.assigned_by_name}</Detail>}
                    {task.category && <Detail label="List">{task.category}</Detail>}
                    {task.created_label && <Detail label="Added">{task.created_label}</Detail>}
                </dl>

                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-sub">Notes</h3>
                    {task.description ? (
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-text">{task.description}</p>
                    ) : (
                        <p className="mt-1.5 text-sm text-dim">No notes.</p>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                    <div className="flex flex-wrap items-center gap-2">
                        {STATUSES.filter(s => s.status !== task.status).map(s => (
                            <button
                                key={s.status}
                                type="button"
                                onClick={() => onMove(task, s.status)}
                                aria-label={`Move "${task.title}" to ${s.label}`}
                                className="rounded-lg border border-border bg-field px-3 py-1.5 text-xs font-semibold text-text hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                            >
                                {`→ ${s.label}`}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        {!readOnly && onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(task)}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-rose-600 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-400"
                            >
                                Delete
                            </button>
                        )}
                        {!readOnly && onEdit && (
                            <Button variant={showOwner ? 'primary' : 'emerald'} size="md" type="button" onClick={() => onEdit(task)}>
                                Edit
                            </Button>
                        )}
                        <Button variant="secondary" size="md" type="button" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
