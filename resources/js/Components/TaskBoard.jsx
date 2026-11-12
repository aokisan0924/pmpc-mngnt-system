import { useState } from 'react'
import Badge from '@/Components/UI/Badge'
import CardMenu from '@/Components/CardMenu'
import { boardColumns, manilaToday } from '@/Components/taskGroups'

// "Today & late" is not a status: cards stay in it, whatever their status, until they are done.
const COLUMNS = [
    { key: 'today',   status: null,      label: 'Today & late' },
    { key: 'pending', status: 'pending', label: 'To do' },
    { key: 'doing',   status: 'doing',   label: 'Doing' },
    { key: 'done',    status: 'done',    label: 'Done' },
]
const STATUS_COLUMNS = COLUMNS.filter(c => c.status)
const STATUS_LABEL = { pending: 'To do', doing: 'Doing' }

const PRIORITY_BADGE = {
    high:   <Badge variant="rose" size="sm">High</Badge>,
    medium: <Badge variant="amber" size="sm">Medium</Badge>,
    low:    <Badge variant="indigo" size="sm">Low</Badge>,
}

const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('')

/** Names on a shared task; people who were deactivated stay listed. */
export const sharedNames = task => (task.assignees ?? [])
    .map(a => a.active ? a.name : `${a.name} (inactive)`).join(', ') || 'No one yet'

const PeopleIcon = () => (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
)

const OfficeIcon = () => (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
)

const PILL = 'rounded px-1.5 py-0.5 font-semibold'

/** Plain-words due date: a red pill when late, amber when due today, otherwise the date. Finished tasks keep the plain date. */
export function dueText(task) {
    if (task.status === 'done' || typeof task.due_in_days !== 'number') return { text: task.due_label, className: 'text-sub' }
    const n = task.due_in_days
    if (n < 0) return { text: `${-n} ${n === -1 ? 'day' : 'days'} late`, className: `${PILL} bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300` }
    if (n === 0) return { text: 'Due today', className: `${PILL} bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300` }
    if (n === 1) return { text: 'Due tomorrow', className: 'text-text' }
    if (task.span_label) return { text: task.is_upcoming ? `Starts ${task.span_label}` : task.span_label, className: 'text-sub' }
    return { text: task.due_label, className: 'text-sub' }
}

/** Thin bar: how much of a span's time has gone by. Shown only for spans that are not done. */
export function SpanProgress({ task, accent = 'emerald' }) {
    if (task.span_progress === null || task.span_progress === undefined) return null
    return (
        <div
            role="progressbar"
            aria-label="Time used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={task.span_progress}
            className="mt-2 h-1 overflow-hidden rounded-full bg-field"
        >
            <div className={`h-full rounded-full ${accent === 'indigo' ? 'bg-[#26215C] dark:bg-indigo-400' : 'bg-[#0F6E56] dark:bg-emerald-400'}`} style={{ width: `${task.span_progress}%` }} />
        </div>
    )
}

/**
 * Three-column task board. Cards can be dragged between columns or moved with
 * the "Move to" select (touch screens). `onMove(task, status)` does the saving.
 */
export default function TaskBoard({ tasks, onMove, onEdit, onDelete, onOpen, accent = 'emerald', showOwner = false, showMoveButtons = true }) {
    const [overColumn, setOverColumn] = useState(null)
    const [showOlder, setShowOlder] = useState(false)
    const columns = boardColumns(tasks, manilaToday())
    const columnTasks = key => key === 'done'
        ? (showOlder ? [...columns.doneRecent, ...columns.doneOlder] : columns.doneRecent)
        : columns[key]

    // Employees may move a whole-office task but not edit or delete it.
    const readOnly = task => !showOwner && task.employee_id === null
    const inlineActions = !showMoveButtons

    const accentText = accent === 'indigo'
        ? 'text-[#26215C] dark:text-indigo-300'
        : 'text-[#0F6E56] dark:text-emerald-300'
    const focusRing = accent === 'indigo' ? 'focus-visible:outline-indigo-600' : 'focus-visible:outline-emerald-600'

    // View and the "..." menu; they sit in the meta row (admin) or the move row (employee).
    const actions = task => (
        <>
            {onOpen && (
                <button
                    type="button"
                    onClick={() => onOpen(task)}
                    aria-haspopup="dialog"
                    aria-label={`View task "${task.title}"`}
                    className={`inline-flex h-[36px] items-center rounded-lg border border-border bg-panel px-3 text-xs font-semibold text-text hover:bg-hover focus-visible:outline-2 ${focusRing}`}
                >
                    View
                </button>
            )}
            <CardMenu
                label={`More actions for "${task.title}"`}
                focusRing={focusRing}
                items={[
                    ...(!readOnly(task) && onEdit ? [{ label: 'Edit', onClick: () => onEdit(task) }] : []),
                    ...(onDelete && !readOnly(task) ? [{ label: 'Delete', onClick: () => onDelete(task), danger: true }] : []),
                ]}
            />
        </>
    )

    function handleDrop(e, status) {
        e.preventDefault()
        setOverColumn(null)
        const id = Number(e.dataTransfer.getData('text/plain'))
        const task = tasks.find(t => t.id === id)
        if (task && task.status !== status) onMove(task, status)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {COLUMNS.map(({ key, status, label }) => {
                const list = columnTasks(key)
                const isToday = key === 'today'
                // Dropping on Today does nothing: it is not a status.
                const dropProps = status ? {
                    onDragOver: e => { e.preventDefault(); setOverColumn(status) },
                    onDragLeave: () => setOverColumn(null),
                    onDrop: e => handleDrop(e, status),
                } : {}
                return (
                    <section
                        key={key}
                        aria-label={isToday ? 'Today and late tasks' : `${label} tasks`}
                        {...dropProps}
                        className={`rounded-2xl border p-3 min-h-40 transition-colors ${
                            overColumn === status && status
                                ? 'border-dashed border-sub bg-field'
                                : isToday
                                    ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
                                    : 'border-border bg-field/50'
                        }`}
                    >
                        <h3 className={`mb-3 flex items-center gap-2 text-sm font-bold ${isToday ? 'text-amber-800 dark:text-amber-300' : accentText}`}>
                            {label}
                            <span className="text-xs font-mono font-semibold text-dim">{list.length}</span>
                        </h3>

                        <div className="space-y-2.5">
                            {list.map(task => {
                                const done = task.status === 'done'
                                return (
                                    <article
                                        key={task.id}
                                        draggable
                                        onDragStart={e => e.dataTransfer.setData('text/plain', String(task.id))}
                                        onClick={e => {
                                            if (onOpen && !e.target.closest('button, select, a')) onOpen(task)
                                        }}
                                        className={`relative focus-within:z-30 rounded-xl border border-border p-2.5 cursor-grab active:cursor-grabbing bg-panel ${done ? '' : 'shadow-2xs'}`}
                                    >
                                        {onOpen ? (
                                            <button
                                                type="button"
                                                onClick={() => onOpen(task)}
                                                aria-haspopup="dialog"
                                                className={`block w-full text-left text-sm font-semibold hover:underline focus-visible:outline-2 ${focusRing} ${done ? 'line-through text-sub' : 'text-text'}`}
                                            >
                                                {task.title}
                                            </button>
                                        ) : (
                                            <p className={`text-sm font-semibold ${done ? 'line-through text-sub' : 'text-text'}`}>
                                                {task.title}
                                            </p>
                                        )}
                                        {showOwner && (task.employee_name || task.office_label || task.is_shared) && (
                                            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-sub">
                                                <span aria-hidden="true" className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-[#26215C] dark:bg-indigo-950 dark:text-indigo-200">
                                                    {task.is_shared ? <PeopleIcon /> : task.employee_name ? initials(task.employee_name) : <OfficeIcon />}
                                                </span>
                                                <span className="min-w-0 break-words">
                                                    {task.is_shared
                                                        ? sharedNames(task)
                                                        : task.employee_name
                                                            ? `${task.employee_name}${task.office_label ? ` · ${task.office_label}` : ''}`
                                                            : `Whole office · ${task.office_label}`}
                                                </span>
                                            </p>
                                        )}
                                        {task.description && (
                                            <p className="mt-1 text-xs text-sub line-clamp-1">{task.description}</p>
                                        )}
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-2">
                                            <span className={`text-xs ${dueText(task).className}`}>{dueText(task).text}</span>
                                            {PRIORITY_BADGE[task.priority]}
                                            {isToday && <Badge variant="slate" size="sm">{STATUS_LABEL[task.status]}</Badge>}
                                            {readOnly(task) && (
                                                <Badge variant="indigo" size="sm">{task.is_shared ? 'Shared' : `Whole office${task.office_label ? ` · ${task.office_label}` : ''}`}</Badge>
                                            )}
                                            {inlineActions && <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions(task)}</div>}
                                        </div>
                                        <SpanProgress task={task} accent={accent} />

                                        {!inlineActions && (
                                            <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2">
                                                {STATUS_COLUMNS.filter(c => c.status !== task.status).map(c => (
                                                    <button
                                                        key={c.status}
                                                        type="button"
                                                        onClick={() => onMove(task, c.status)}
                                                        aria-label={`Move "${task.title}" to ${c.label}`}
                                                        className={`flex-1 h-[36px] rounded-lg border border-border bg-field px-2 text-xs font-semibold text-text hover:bg-hover focus-visible:outline-2 ${focusRing}`}
                                                    >
                                                        {`→ ${c.label}`}
                                                    </button>
                                                ))}
                                                <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions(task)}</div>
                                            </div>
                                        )}
                                    </article>
                                )
                            })}

                            {list.length === 0 && (
                                <p className="rounded-xl border border-dashed border-border/80 px-3 py-6 text-center text-xs text-dim">
                                    {isToday ? 'Nothing due today.' : 'Nothing here.'}
                                </p>
                            )}

                            {key === 'done' && columns.doneOlder.length > 0 && (
                                <button
                                    type="button"
                                    aria-expanded={showOlder}
                                    onClick={() => setShowOlder(v => !v)}
                                    className={`w-full rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold ${accentText} hover:bg-hover focus-visible:outline-2 ${focusRing}`}
                                >
                                    {showOlder ? 'Show this week only' : `Show older (${columns.doneOlder.length})`}
                                </button>
                            )}
                        </div>
                    </section>
                )
            })}
        </div>
    )
}
