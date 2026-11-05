import { useMemo, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'
import EmployeePageHeader from '@/Components/EmployeePageHeader'
import Card from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import ConfirmModal from '@/Components/ConfirmModal'
import TaskBoard from '@/Components/TaskBoard'
import TaskFormModal from '@/Components/TaskFormModal'
import TaskDetailModal from '@/Components/TaskDetailModal'
import UndatedTaskStrip from '@/Components/UndatedTaskStrip'
import CardMenu from '@/Components/CardMenu'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1)
}
function buildMonthGrid(viewDate) {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOffset = firstDay.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []

    for (let i = startOffset - 1; i >= 0; i--) {
        cells.push(new Date(year, month, -i))
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push(new Date(year, month, d))
    }
    while (cells.length % 7 !== 0) {
        const last = cells[cells.length - 1]
        cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1))
    }
    return cells
}

export default function Planner({ tasks = [] }) {
    const { flash } = usePage().props
    const today = useMemo(() => new Date(), [])
    const todayKey = toKey(today)

    const [viewDate, setViewDate]         = useState(startOfMonth(today))
    const [selectedDate, setSelectedDate] = useState(todayKey)
    const [showForm, setShowForm]         = useState(false)
    const [editTarget, setEditTarget]     = useState(null)
    const [formDate, setFormDate]         = useState('')
    const [taskToDelete, setTaskToDelete] = useState(null)
    const [filter, setFilter]             = useState('all')
    const [view, setView]                 = useState('calendar')
    const [detailId, setDetailId]         = useState(null)
    const detailTask = tasks.find(t => t.id === detailId)

    // "pending" means anything not finished yet, so tasks in Doing stay visible.
    const visibleTasks = filter === 'all'
        ? tasks
        : tasks.filter(t => (filter === 'done') === (t.status === 'done'))

    const tasksByDate = useMemo(() => {
        const map = {}
        visibleTasks.forEach(t => {
            const key = t.due_date?.slice(0, 10)
            if (!key) return
            if (!map[key]) map[key] = []
            map[key].push(t)
        })
        return map
    }, [visibleTasks])

    const undatedTasks = useMemo(() => visibleTasks.filter(t => !t.due_date), [visibleTasks])
    const cells = useMemo(() => buildMonthGrid(viewDate), [viewDate])
    const selectedTasks = tasksByDate[selectedDate] ?? []

    function changeMonth(dir) {
        setViewDate(v => new Date(v.getFullYear(), v.getMonth() + dir, 1))
    }
    function goToToday() {
        setViewDate(startOfMonth(today))
        setSelectedDate(todayKey)
    }
    function selectDay(date) {
        const key = toKey(date)
        setSelectedDate(key)
        if (date.getMonth() !== viewDate.getMonth() || date.getFullYear() !== viewDate.getFullYear()) {
            setViewDate(startOfMonth(date))
        }
    }

    function openNewTaskForm(prefillDate) {
        setFormDate(prefillDate ?? selectedDate)
        setEditTarget(null)
        setShowForm(true)
    }

    function startEdit(task) {
        setEditTarget(task)
        setShowForm(true)
    }

    function cancelForm() {
        setShowForm(false)
        setEditTarget(null)
    }

    function moveTask(task, status) {
        router.patch(`/employee/planner/${task.id}/status`, { status }, { preserveScroll: true })
    }

    function toggleDone(task) {
        router.patch(`/employee/planner/${task.id}/toggle`, {}, { preserveScroll: true })
    }

    function confirmDelete(task) {
        setTaskToDelete(task)
    }

    function handleDeleteTask() {
        if (!taskToDelete) return
        router.delete(`/employee/planner/${taskToDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => setTaskToDelete(null),
            onFinish: () => setTaskToDelete(null),
        })
    }

    const selectedLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', {
        weekday: 'long', month: 'long', day: 'numeric',
    })

    function getPriorityBadge(priority) {
        switch (priority) {
            case 'high':
                return <Badge variant="rose" size="sm">High</Badge>
            case 'medium':
                return <Badge variant="amber" size="sm">Medium</Badge>
            case 'low':
                return <Badge variant="indigo" size="sm">Low</Badge>
            default:
                return null
        }
    }

    return (
        <EmployeeLayout title="My tasks">
            <div className="employee-page-shell space-y-5">

                {flash?.success && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#0F6E56]/10 border border-[#0F6E56]/25 text-[#0F6E56] dark:text-emerald-400 text-xs font-semibold">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}

                <EmployeePageHeader
                    title="My tasks"
                    badge={`${tasks.filter(task => task.status !== 'done').length} pending`}
                    action={<button
                        type="button"
                        onClick={() => openNewTaskForm()}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-extrabold text-[#0F6E56] shadow-md transition-all hover:bg-emerald-50 active:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
                    >
                        <svg className="w-4 h-4 text-[#0F6E56]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>New Task</span>
                    </button>}
                />

                {/* Controls Bar */}
                <div className="employee-toolbar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-2.5 rounded-2xl border">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex gap-1 p-1 bg-field rounded-xl border border-border" role="group" aria-label="Planner view">
                            {[['calendar', 'Calendar'], ['board', 'Board']].map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    aria-pressed={view === key}
                                    onClick={() => setView(key)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                                        view === key
                                            ? 'bg-white text-[#0F6E56] dark:bg-emerald-950/80 dark:text-emerald-300 font-bold shadow-xs border border-emerald-200/80 dark:border-emerald-800'
                                            : 'text-sub hover:text-text hover:bg-panel/50'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    <div className={`flex items-center gap-2 ${view === 'calendar' ? '' : 'hidden'}`}>
                        <div className="flex items-center gap-1.5 p-1 bg-field rounded-xl border border-border">
                            <button
                                type="button"
                                onClick={() => changeMonth(-1)}
                                className="p-1.5 rounded-lg text-sub hover:text-text hover:bg-panel transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                                title="Previous Month"
                                aria-label="Previous Month"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="min-w-36 text-center font-heading text-xs font-bold text-text">
                                {`${viewDate.toLocaleDateString('en-PH', { month: 'long' })} ${viewDate.getFullYear()}`}
                            </span>
                            <button
                                type="button"
                                onClick={() => changeMonth(1)}
                                className="p-1.5 rounded-lg text-sub hover:text-text hover:bg-panel transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                                title="Next Month"
                                aria-label="Next Month"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={goToToday}
                            aria-label="Jump to current date"
                            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-300/80 bg-white text-[#0F6E56] shadow-2xs hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 cursor-pointer"
                        >
                            Today
                        </button>
                    </div>
                    </div>

                    <div className={`flex gap-1 p-1 bg-field rounded-xl border border-border ${view === 'calendar' ? '' : 'hidden'}`} role="group" aria-label="Filter tasks">
                        {['all', 'pending', 'done'].map(f => (
                            <button
                                key={f}
                                type="button"
                                aria-pressed={filter === f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                                    filter === f
                                        ? 'bg-white text-[#0F6E56] dark:bg-emerald-950/80 dark:text-emerald-300 font-bold shadow-xs border border-emerald-200/80 dark:border-emerald-800'
                                        : 'text-sub hover:text-text hover:bg-panel/50'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {view === 'board' && (
                    <TaskBoard
                        tasks={tasks}
                        onMove={moveTask}
                        onEdit={startEdit}
                        onDelete={confirmDelete}
                        onOpen={task => setDetailId(task.id)}
                        accent="emerald"
                    />
                )}

                {/* Calendar + Agenda Grid */}
                <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 items-start ${view === 'calendar' ? '' : 'hidden'}`}>

                    {/* Month Grid Card (2 Cols) */}
                    <Card className="employee-workspace-card lg:col-span-2 overflow-hidden p-3 sm:p-4">
                        <div className="grid grid-cols-7 mb-2 border-b border-border/60 pb-2">
                            {WEEKDAYS.map(w => (
                                <div key={w} className="text-center text-[12px] font-bold text-dim uppercase tracking-wider">
                                    {w}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                            {cells.map((date, i) => {
                                const key = toKey(date)
                                const inMonth = date.getMonth() === viewDate.getMonth()
                                const isToday = key === todayKey
                                const isSelected = key === selectedDate
                                const dayTasks = tasksByDate[key] ?? []
                                const visible = dayTasks.slice(0, 2)
                                const overflow = dayTasks.length - visible.length

                                const formattedDate = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                                const taskCountLabel = `${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'}`
                                const cellAriaLabel = `${formattedDate}, ${taskCountLabel}${isSelected ? ', selected' : ''}${isToday ? ', today' : ''}`

                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => selectDay(date)}
                                        aria-label={cellAriaLabel}
                                        aria-pressed={isSelected}
                                        aria-current={isToday ? 'date' : undefined}
                                        className={`relative text-left rounded-xl border p-1.5 sm:p-2 min-h-[52px] sm:min-h-[80px] flex flex-col gap-1 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                                            isSelected
                                                ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-xs'
                                                : inMonth
                                                    ? 'border-border/60 bg-field/40 hover:bg-field hover:border-emerald-500/30'
                                                    : 'border-transparent bg-transparent'
                                        }`}
                                    >
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono font-bold ${
                                            isToday
                                                ? 'bg-[#0F6E56] text-white shadow-2xs'
                                                : inMonth ? 'text-text' : 'text-sub'
                                        }`}>
                                            {date.getDate()}
                                        </span>

                                        <div className="hidden sm:flex flex-col gap-1 overflow-hidden w-full">
                                            {visible.map(t => {
                                                const done = t.status === 'done'
                                                return (
                                                    <span
                                                        key={t.id}
                                                        title={t.title}
                                                        className={`line-clamp-2 break-words rounded-md px-1.5 py-0.5 text-[12px] leading-4 font-medium ${
                                                            done
                                                                ? 'line-through bg-field text-sub'
                                                                : t.priority === 'high'
                                                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                                    : t.priority === 'medium'
                                                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                                        : 'bg-[#0F6E56]/10 text-[#0F6E56] dark:text-emerald-300'
                                                        }`}
                                                    >
                                                        {t.title}
                                                    </span>
                                                )
                                            })}
                                            {overflow > 0 && (
                                                <span className="text-[12px] font-mono font-semibold text-dim px-1">
                                                    +{overflow} more
                                                </span>
                                            )}
                                        </div>
                                        {dayTasks.length > 0 && <span className="sm:hidden self-start rounded-full bg-[#0F6E56]/10 px-1.5 text-xs font-bold tnum text-[#0F6E56] dark:text-emerald-300">{dayTasks.length}</span>}
                                    </button>
                                )
                            })}
                        </div>
                        <UndatedTaskStrip tasks={undatedTasks} onOpen={t => setDetailId(t.id)} focusRing="focus-visible:outline-emerald-600" />
                    </Card>

                    {/* Day Agenda Panel (1 Col) */}
                    <Card
                        className="employee-workspace-card"
                        title={selectedDate === todayKey ? "Today's Agenda" : "Day Agenda"}
                        description={selectedLabel}
                        action={
                            <button
                                type="button"
                                onClick={() => openNewTaskForm(selectedDate)}
                                className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-[#0F6E56] hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 cursor-pointer"
                                title="Add task to this date"
                                aria-label="Add task to this date"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        }
                    >
                        <div className="space-y-3 pt-2">
                            {selectedTasks.map(task => {
                                const done = task.status === 'done'
                                return (
                                    <div
                                        key={task.id}
                                        className={`relative focus-within:z-30 p-3 rounded-xl border transition-colors ${
                                            done
                                                ? 'border-border/60 bg-panel'
                                                : 'border-border bg-panel shadow-2xs hover:border-emerald-500/30'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <button
                                                type="button"
                                                role="checkbox"
                                                aria-checked={done}
                                                aria-label={done ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                                                onClick={() => toggleDone(task)}
                                                className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                                                    done
                                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                                        : 'border-border hover:border-emerald-500 bg-field'
                                                }`}
                                            >
                                                {done && (
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setDetailId(task.id)}
                                                    aria-haspopup="dialog"
                                                    className={`block w-full text-left text-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${done ? 'line-through text-sub' : 'text-text'}`}
                                                >
                                                    {/* The clamp lives on an inner span: display:block on the button would cancel it. */}
                                                    <span className="line-clamp-2 break-words">{task.title}</span>
                                                </button>
                                                {task.description && (
                                                    <p className="text-xs text-sub mt-0.5 line-clamp-2">{task.description}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    {getPriorityBadge(task.priority)}
                                                    {task.category && (
                                                        <Badge variant="slate" size="sm">
                                                            {task.category}
                                                        </Badge>
                                                    )}
                                                    {task.employee_id === null && (
                                                        <Badge variant="indigo" size="sm">
                                                            {task.is_shared
                                                                ? `Shared · ${task.assignees?.length ?? 0} people`
                                                                : `Whole office${task.office_label ? ` · ${task.office_label}` : ''}`}
                                                        </Badge>
                                                    )}
                                                    {task.is_overdue && !done && (
                                                        <Badge variant="rose" size="sm">Overdue</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setDetailId(task.id)}
                                                    aria-haspopup="dialog"
                                                    aria-label={`View task "${task.title}"`}
                                                    className="inline-flex h-[36px] items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-[#0F6E56] shadow-2xs transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                                >
                                                    View
                                                </button>
                                                {task.employee_id !== null && (
                                                    <CardMenu
                                                        label={`More actions for "${task.title}"`}
                                                        focusRing="focus-visible:outline-emerald-600"
                                                        items={[
                                                            { label: 'Edit', onClick: () => startEdit(task) },
                                                            { label: 'Delete', onClick: () => confirmDelete(task), danger: true },
                                                        ]}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {selectedTasks.length === 0 && (
                                <div className="text-center py-12 rounded-xl border border-dashed border-border/80 p-4">
                                    <div className="w-10 h-10 rounded-full bg-field flex items-center justify-center mx-auto mb-2 text-sub">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <p className="text-xs font-medium text-sub">No tasks scheduled for this day.</p>
                                    <button
                                        type="button"
                                        onClick={() => openNewTaskForm(selectedDate)}
                                        className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                                    >
                                        + Schedule Task
                                    </button>
                                </div>
                            )}
                        </div>
                    </Card>

                </div>

            </div>

            <TaskDetailModal
                task={detailTask}
                onClose={() => setDetailId(null)}
                onMove={moveTask}
                onEdit={task => { setDetailId(null); startEdit(task) }}
                onDelete={task => { setDetailId(null); confirmDelete(task) }}
                readOnly={detailTask?.employee_id === null}
            />

            {showForm && (
                <TaskFormModal
                    task={editTarget}
                    defaultDate={formDate}
                    createUrl="/employee/planner"
                    updateUrl={t => `/employee/planner/${t.id}`}
                    onClose={cancelForm}
                />
            )}

            {/* Task Deletion Confirmation Dialog */}
            <ConfirmModal
                open={Boolean(taskToDelete)}
                title="Delete Task"
                message={taskToDelete ? `Are you sure you want to delete "${taskToDelete.title}"? This action cannot be undone.` : ''}
                confirmLabel="Delete Task"
                cancelLabel="Cancel"
                confirmStyle="danger"
                onConfirm={handleDeleteTask}
                onCancel={() => setTaskToDelete(null)}
            />
        </EmployeeLayout>
    )
}
