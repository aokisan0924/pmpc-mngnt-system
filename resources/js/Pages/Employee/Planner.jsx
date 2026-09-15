import { useEffect, useMemo, useState } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'
import Card from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EMPTY_FORM = {
    title:       '',
    description: '',
    due_date:    '',
    category:    '',
    priority:    'medium',
}

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
    while (cells.length < 42) {
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
    const [filter, setFilter]             = useState('all')
    const [loading, setLoading]           = useState(false)

    useEffect(() => {
        const stop = router.on('start', () => setLoading(true))
        const finish = router.on('finish', () => setLoading(false))
        return () => { stop(); finish() }
    }, [])

    const { data, setData, post, patch, processing, errors, reset } = useForm(EMPTY_FORM)

    const visibleTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

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
        reset()
        setData(d => ({ ...d, due_date: prefillDate ?? selectedDate }))
        setEditTarget(null)
        setShowForm(true)
    }

    function submitTask(e) {
        e.preventDefault()
        if (editTarget) {
            patch(`/employee/planner/${editTarget.id}`, {
                onSuccess: () => { setEditTarget(null); setShowForm(false); reset() },
            })
        } else {
            post('/employee/planner', {
                onSuccess: () => { setShowForm(false); reset() },
            })
        }
    }

    function startEdit(task) {
        setEditTarget(task)
        setData({
            title:       task.title,
            description: task.description ?? '',
            due_date:    task.due_date?.slice(0, 10) ?? '',
            category:    task.category ?? '',
            priority:    task.priority,
        })
        setShowForm(true)
    }

    function cancelForm() {
        setShowForm(false)
        setEditTarget(null)
        reset()
    }

    function toggleDone(task) {
        if (loading) return
        router.patch(`/employee/planner/${task.id}/toggle`)
    }

    function deleteTask(task) {
        if (loading) return
        if (confirm('Delete this task?')) {
            router.delete(`/employee/planner/${task.id}`)
        }
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
        <EmployeeLayout title="Task Planner">
            <div className="min-h-screen bg-bg p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

                {flash?.success && (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold font-display text-text tracking-tight">Work Planner</h1>
                            <Badge variant="emerald" size="sm">Schedule & Deliverables</Badge>
                        </div>
                        <p className="text-sm text-sub mt-1">
                            Organize daily milestones, cooperative department tasks, and work priorities
                        </p>
                    </div>

                    <button
                        onClick={() => openNewTaskForm()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 active:scale-[0.98] transition-all w-fit"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>New Task</span>
                    </button>
                </div>

                {/* Controls Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-2 bg-panel rounded-2xl border border-border shadow-xs">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => changeMonth(-1)}
                            className="p-2 rounded-xl border border-border bg-field text-sub hover:text-text hover:bg-panel transition-all"
                            title="Previous Month"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-sm font-bold font-display text-text min-w-[140px] text-center">
                            {viewDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                            onClick={() => changeMonth(1)}
                            className="p-2 rounded-xl border border-border bg-field text-sub hover:text-text hover:bg-panel transition-all"
                            title="Next Month"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button
                            onClick={goToToday}
                            className="ml-2 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-field text-emerald-600 dark:text-emerald-400 hover:bg-panel transition-all"
                        >
                            Today
                        </button>
                    </div>

                    <div className="flex gap-1 p-1 bg-field rounded-xl border border-border">
                        {['all', 'pending', 'done'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                                    filter === f
                                        ? 'bg-panel text-text shadow-xs border border-border'
                                        : 'text-sub hover:text-text'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Calendar + Agenda Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    {/* Month Grid Card (2 Cols) */}
                    <Card className="lg:col-span-2 overflow-hidden">
                        <div className="grid grid-cols-7 mb-2 border-b border-border/60 pb-2">
                            {WEEKDAYS.map(w => (
                                <div key={w} className="text-center text-[11px] font-bold text-dim uppercase tracking-wider">
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

                                return (
                                    <button
                                        key={i}
                                        onClick={() => selectDay(date)}
                                        className={`relative text-left rounded-xl border p-1.5 sm:p-2 min-h-[72px] sm:min-h-[100px] flex flex-col gap-1 transition-all ${
                                            isSelected
                                                ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-xs'
                                                : inMonth
                                                    ? 'border-border/60 bg-field/40 hover:bg-field hover:border-emerald-500/30'
                                                    : 'border-transparent bg-transparent opacity-30'
                                        }`}
                                    >
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono font-bold ${
                                            isToday
                                                ? 'bg-emerald-600 text-white'
                                                : inMonth ? 'text-text' : 'text-dim'
                                        }`}>
                                            {date.getDate()}
                                        </span>

                                        <div className="flex flex-col gap-1 overflow-hidden w-full">
                                            {visible.map(t => {
                                                const done = t.status === 'done'
                                                return (
                                                    <span
                                                        key={t.id}
                                                        className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium ${
                                                            done
                                                                ? 'line-through opacity-50 bg-field text-dim'
                                                                : t.priority === 'high'
                                                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                                    : t.priority === 'medium'
                                                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                                        }`}
                                                    >
                                                        {t.title}
                                                    </span>
                                                )
                                            })}
                                            {overflow > 0 && (
                                                <span className="text-[10px] font-mono font-semibold text-dim px-1">
                                                    +{overflow} more
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </Card>

                    {/* Day Agenda Panel (1 Col) */}
                    <Card
                        title={selectedDate === todayKey ? "Today's Agenda" : "Day Agenda"}
                        description={selectedLabel}
                        action={
                            <button
                                onClick={() => openNewTaskForm(selectedDate)}
                                className="p-1.5 rounded-lg border border-border bg-field text-emerald-600 dark:text-emerald-400 hover:bg-panel transition-all"
                                title="Add task to this date"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        }
                    >
                        <div className="space-y-3 pt-2 max-h-[500px] overflow-y-auto pr-1">
                            {selectedTasks.map(task => {
                                const done = task.status === 'done'
                                return (
                                    <div
                                        key={task.id}
                                        className={`p-3.5 rounded-xl border transition-all ${
                                            done
                                                ? 'border-border/60 bg-field/40 opacity-60'
                                                : 'border-border bg-panel shadow-2xs hover:border-emerald-500/30'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <button
                                                onClick={() => toggleDone(task)}
                                                className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
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
                                                <p className={`text-sm font-semibold truncate ${done ? 'line-through text-dim' : 'text-text'}`}>
                                                    {task.title}
                                                </p>
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
                                                    {task.is_overdue && !done && (
                                                        <Badge variant="rose" size="sm">Overdue</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1 shrink-0">
                                                <button
                                                    onClick={() => startEdit(task)}
                                                    className="text-xs text-sub hover:text-text font-medium px-1.5 py-0.5 rounded hover:bg-hover"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => deleteTask(task)}
                                                    className="text-xs text-rose-500 hover:text-rose-600 font-medium px-1.5 py-0.5 rounded hover:bg-rose-500/10"
                                                >
                                                    Delete
                                                </button>
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
                                        onClick={() => openNewTaskForm(selectedDate)}
                                        className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                                    >
                                        + Schedule Task
                                    </button>
                                </div>
                            )}
                        </div>
                    </Card>

                </div>

            </div>

            {/* Task Form Modal */}
            {showForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
                    onClick={cancelForm}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-2xl space-y-5"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <h2 className="text-lg font-bold font-display text-text">
                                {editTarget ? 'Edit Task' : 'Schedule New Task'}
                            </h2>
                            <button
                                type="button"
                                onClick={cancelForm}
                                className="text-sub hover:text-text p-1 rounded-lg hover:bg-hover"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={submitTask} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-sub uppercase tracking-wider mb-1.5">
                                    Task Title <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.title}
                                    onChange={e => setData('title', e.target.value)}
                                    placeholder="What needs to be accomplished?"
                                    className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    required
                                    autoFocus
                                />
                                {errors.title && <p className="mt-1 text-xs text-rose-500">{errors.title}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-sub uppercase tracking-wider mb-1.5">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    rows={2}
                                    placeholder="Details or deliverables..."
                                    className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-sub uppercase tracking-wider mb-1.5">
                                        Due Date <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={data.due_date}
                                        onChange={e => setData('due_date', e.target.value)}
                                        className="w-full px-3.5 py-2 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-sub uppercase tracking-wider mb-1.5">
                                        Priority
                                    </label>
                                    <select
                                        value={data.priority}
                                        onChange={e => setData('priority', e.target.value)}
                                        className="w-full px-3.5 py-2 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    >
                                        <option value="low">Low Priority</option>
                                        <option value="medium">Medium Priority</option>
                                        <option value="high">High Priority</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-sub uppercase tracking-wider mb-1.5">
                                    Category / Label
                                </label>
                                <input
                                    type="text"
                                    value={data.category}
                                    onChange={e => setData('category', e.target.value)}
                                    placeholder="e.g. Operations, Accounting"
                                    className="w-full px-3.5 py-2.5 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                                <Button variant="secondary" size="md" type="button" onClick={cancelForm}>
                                    Cancel
                                </Button>
                                <Button variant="primary" size="md" type="submit" loading={processing}>
                                    {editTarget ? 'Update Task' : 'Add Task'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </EmployeeLayout>
    )
}