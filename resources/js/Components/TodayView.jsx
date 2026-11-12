import Card from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import { PRIORITY_BADGE, SpanProgress, dueText } from '@/Components/TaskBoard'
import { manilaToday, todayGroups } from '@/Components/taskGroups'

const GROUPS = [
    { key: 'late',      label: 'Late',               tone: 'text-rose-700 dark:text-rose-400' },
    { key: 'dueToday',  label: 'Due today',          tone: 'text-amber-700 dark:text-amber-400' },
    { key: 'running',   label: 'Still running',      tone: 'text-[#0F6E56] dark:text-emerald-300' },
    { key: 'tomorrow',  label: 'Coming up tomorrow', tone: 'text-sub', faded: true },
    { key: 'doneToday', label: 'Done today',         tone: 'text-sub' },
]

function TaskRow({ task, group, onToggle, onOpen }) {
    const done = task.status === 'done'
    const due = dueText(task)
    return (
        <li className={`flex items-start gap-3 rounded-xl border border-border bg-panel p-3 ${group.faded ? 'opacity-60' : ''} ${done ? '' : 'shadow-2xs'}`}>
            <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={done ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                onClick={() => onToggle(task)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                    done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border bg-field hover:border-emerald-500'
                }`}
            >
                {done && (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </button>
            <div className="min-w-0 flex-1">
                <button
                    type="button"
                    onClick={() => onOpen(task)}
                    aria-haspopup="dialog"
                    className={`block w-full text-left text-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${done ? 'text-sub line-through' : 'text-text'}`}
                >
                    <span className="line-clamp-2 break-words">{task.title}</span>
                </button>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {group.key === 'running'
                        ? <span className="text-xs text-sub">{`ends ${task.due_label}`}</span>
                        : <span className={`text-xs ${due.className}`}>{due.text}</span>}
                    {PRIORITY_BADGE[task.priority]}
                    {task.employee_id === null && (
                        <Badge variant="indigo" size="sm">
                            {task.is_shared ? `Shared · ${task.assignees?.length ?? 0} people` : `Whole office${task.office_label ? ` · ${task.office_label}` : ''}`}
                        </Badge>
                    )}
                </div>
                {group.key === 'running' && <SpanProgress task={task} />}
            </div>
        </li>
    )
}

/** What needs doing today: late, due today, still running, tomorrow (faded) and done today. */
export default function TodayView({ tasks, onToggle, onOpen, onNew }) {
    const todayKey = manilaToday()
    const groups = todayGroups(tasks, todayKey)
    const nothingDue = !groups.late.length && !groups.dueToday.length && !groups.running.length
    const title = new Date(`${todayKey}T00:00:00`).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })

    return (
        <Card className="employee-workspace-card" title="Today" description={title}>
            <div className="space-y-5 pt-2">
                {nothingDue && (
                    <div className="rounded-xl border border-dashed border-border/80 p-6 text-center">
                        <p className="text-sm font-semibold text-text">Nothing due today</p>
                        <button
                            type="button"
                            onClick={onNew}
                            className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                        >
                            + New task
                        </button>
                    </div>
                )}

                {GROUPS.filter(g => groups[g.key].length > 0).map(group => (
                    <section key={group.key} aria-label={group.label}>
                        <h3 className={`mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide ${group.tone}`}>
                            {group.label}
                            <span className="font-mono text-dim">{groups[group.key].length}</span>
                        </h3>
                        <ul className="space-y-2">
                            {groups[group.key].map(task => (
                                <TaskRow key={task.id} task={task} group={group} onToggle={onToggle} onOpen={onOpen} />
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </Card>
    )
}
