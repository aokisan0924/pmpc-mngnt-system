import { useState } from 'react'
import Badge from '@/Components/UI/Badge'
import CardMenu from '@/Components/CardMenu'

const COLUMNS = [
    { status: 'pending', label: 'To do' },
    { status: 'doing',   label: 'Doing' },
    { status: 'done',    label: 'Done' },
]

const PRIORITY_BADGE = {
    high:   <Badge variant="rose" size="sm">High</Badge>,
    medium: <Badge variant="amber" size="sm">Medium</Badge>,
    low:    <Badge variant="indigo" size="sm">Low</Badge>,
}

const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('')

/** Names on a shared task; people who were deactivated stay listed. */
export const sharedNames = task => (task.assignees ?? [])
    .map(a => a.active ? a.name : `${a.name} (inactive)`).join(', ') || 'No one yet'

/** Plain-words due date: red when late, otherwise the date. Finished tasks keep the plain date. */
function dueText(task) {
    if (task.status === 'done' || typeof task.due_in_days !== 'number') return { text: task.due_label, className: 'text-sub' }
    const n = task.due_in_days
    if (n < 0) return { text: `${-n} ${n === -1 ? 'day' : 'days'} late`, className: 'text-rose-700 dark:text-rose-400 font-semibold' }
    if (n === 0) return { text: 'Due today', className: 'text-amber-700 dark:text-amber-400 font-semibold' }
    if (n === 1) return { text: 'Due tomorrow', className: 'text-text' }
    return { text: task.due_label, className: 'text-sub' }
}

/**
 * Three-column task board. Cards can be dragged between columns or moved with
 * the "Move to" select (touch screens). `onMove(task, status)` does the saving.
 */
export default function TaskBoard({ tasks, onMove, onEdit, onDelete, onOpen, accent = 'emerald', showOwner = false, showMoveButtons = true }) {
    const [overColumn, setOverColumn] = useState(null)

    // Employees may move a whole-office task but not edit or delete it.
    const readOnly = task => !showOwner && task.employee_id === null

    const accentText = accent === 'indigo'
        ? 'text-[#26215C] dark:text-indigo-300'
        : 'text-[#0F6E56] dark:text-emerald-300'
    const focusRing = accent === 'indigo' ? 'focus-visible:outline-indigo-600' : 'focus-visible:outline-emerald-600'

    function handleDrop(e, status) {
        e.preventDefault()
        setOverColumn(null)
        const id = Number(e.dataTransfer.getData('text/plain'))
        const task = tasks.find(t => t.id === id)
        if (task && task.status !== status) onMove(task, status)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {COLUMNS.map(({ status, label }) => {
                const columnTasks = tasks.filter(t => t.status === status)
                return (
                    <section
                        key={status}
                        aria-label={`${label} tasks`}
                        onDragOver={e => { e.preventDefault(); setOverColumn(status) }}
                        onDragLeave={() => setOverColumn(null)}
                        onDrop={e => handleDrop(e, status)}
                        className={`rounded-2xl border p-3 min-h-40 transition-colors ${
                            overColumn === status ? 'border-dashed border-sub bg-field' : 'border-border bg-field/50'
                        }`}
                    >
                        <h3 className={`mb-3 flex items-center gap-2 text-sm font-bold ${accentText}`}>
                            {label}
                            <span className="text-xs font-mono font-semibold text-dim">{columnTasks.length}</span>
                        </h3>

                        <div className="space-y-2.5">
                            {columnTasks.map(task => {
                                const done = task.status === 'done'
                                return (
                                    <article
                                        key={task.id}
                                        draggable
                                        onDragStart={e => e.dataTransfer.setData('text/plain', String(task.id))}
                                        onClick={e => {
                                            if (onOpen && !e.target.closest('button, select, a')) onOpen(task)
                                        }}
                                        className={`relative focus-within:z-30 rounded-xl border border-border bg-panel p-3 shadow-2xs cursor-grab active:cursor-grabbing ${done ? 'opacity-60' : ''}`}
                                    >
                                        {onOpen ? (
                                            <button
                                                type="button"
                                                onClick={() => onOpen(task)}
                                                aria-haspopup="dialog"
                                                className={`block w-full text-left text-sm font-semibold hover:underline focus-visible:outline-2 ${focusRing} ${done ? 'line-through text-dim' : 'text-text'}`}
                                            >
                                                {task.title}
                                            </button>
                                        ) : (
                                            <p className={`text-sm font-semibold ${done ? 'line-through text-dim' : 'text-text'}`}>
                                                {task.title}
                                            </p>
                                        )}
                                        {showOwner && (task.employee_name || task.office_label || task.is_shared) && (
                                            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-sub">
                                                {task.employee_name && !task.is_shared && (
                                                    <span aria-hidden="true" className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-[#26215C] dark:bg-indigo-950 dark:text-indigo-200">
                                                        {initials(task.employee_name)}
                                                    </span>
                                                )}
                                                <span className="min-w-0 break-words">
                                                    {task.is_shared
                                                        ? sharedNames(task)
                                                        : task.employee_name
                                                            ? `${task.employee_name}${task.office_label ? ` · ${task.office_label}` : ''}`
                                                            : `Whole office · ${task.office_label}`}
                                                </span>
                                                {task.is_shared && <Badge variant="indigo" size="sm">Shared</Badge>}
                                            </p>
                                        )}
                                        {task.description && (
                                            <p className="mt-1 text-xs text-sub line-clamp-2">{task.description}</p>
                                        )}
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <span className={`text-xs ${dueText(task).className}`}>{dueText(task).text}</span>
                                            {PRIORITY_BADGE[task.priority]}
                                            {task.category && <Badge variant="slate" size="sm">{`List: ${task.category}`}</Badge>}
                                            {readOnly(task) && (
                                                <Badge variant="indigo" size="sm">{task.is_shared ? 'Shared' : `Whole office${task.office_label ? ` · ${task.office_label}` : ''}`}</Badge>
                                            )}
                                            {task.repeat_label && <Badge variant="slate" size="sm">↻ Repeats</Badge>}
                                        </div>

                                        <div className="mt-3 flex items-center gap-2">
                                            {showMoveButtons && COLUMNS.filter(c => c.status !== task.status).map(c => (
                                                <button
                                                    key={c.status}
                                                    type="button"
                                                    onClick={() => onMove(task, c.status)}
                                                    aria-label={`Move "${task.title}" to ${c.label}`}
                                                    className={`flex-1 rounded-lg border border-border bg-field px-2 py-1 text-xs font-semibold text-text hover:bg-hover focus-visible:outline-2 ${focusRing}`}
                                                >
                                                    {`→ ${c.label}`}
                                                </button>
                                            ))}
                                            {onOpen && (
                                                <button
                                                    type="button"
                                                    onClick={() => onOpen(task)}
                                                    aria-haspopup="dialog"
                                                    aria-label={`View task "${task.title}"`}
                                                    className={`rounded-lg border border-border bg-panel px-2.5 py-1 text-xs font-semibold text-text hover:bg-hover focus-visible:outline-2 ${focusRing}`}
                                                >
                                                    View
                                                </button>
                                            )}
                                            <div className="ml-auto">
                                                <CardMenu
                                                    label={`More actions for "${task.title}"`}
                                                    focusRing={focusRing}
                                                    items={[
                                                        ...(!readOnly(task) && onEdit ? [{ label: 'Edit', onClick: () => onEdit(task) }] : []),
                                                        ...(onDelete && !readOnly(task) ? [{ label: 'Delete', onClick: () => onDelete(task), danger: true }] : []),
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}

                            {columnTasks.length === 0 && (
                                <p className="rounded-xl border border-dashed border-border/80 px-3 py-6 text-center text-xs text-dim">
                                    Nothing here.
                                </p>
                            )}
                        </div>
                    </section>
                )
            })}
        </div>
    )
}
