import { useEffect, useMemo, useState } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'

/* ---------- design tokens ---------- */
const C = {
    bg:        '#06090D',
    panel:     'rgba(14,20,27,0.72)',
    field:     'rgba(255,255,255,0.03)',
    border:    '#1F2C35',
    borderHi:  'rgba(20,241,178,0.35)',
    text:      '#E7F1EE',
    sub:       '#83979C',
    dim:       '#4C5C61',
    teal:      '#14F1B2',
    blue:      '#5AA9FF',
    amber:     '#FFC168',
    red:       '#FF6B81',
}

const PRIORITY_STYLES = {
    high:   { color: C.red,   label: 'High'   },
    medium: { color: C.amber, label: 'Medium' },
    low:    { color: C.blue,  label: 'Low'    },
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EMPTY_FORM = {
    title:       '',
    description: '',
    due_date:    '',
    category:    '',
    priority:    'medium',
}

const inputClass = "w-full px-3 py-2.5 text-sm rounded-lg border bg-transparent outline-none transition-colors"

/* ---------- date helpers ---------- */
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

/* ---------- icons ---------- */
const IconPlus = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
)
const IconCheck = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" {...p}>
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconChevronLeft = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
        <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconChevronRight = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const IconTag = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M20 12.5 12.5 20a1.5 1.5 0 0 1-2.1 0L3 12.6V4h8.6l8.4 8.4a1.5 1.5 0 0 1 0 2.1Z" strokeLinejoin="round" />
        <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </svg>
)
const IconClipboard = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <rect x="6" y="4" width="12" height="17" rx="2" />
        <rect x="9" y="2.5" width="6" height="3" rx="1" />
    </svg>
)
const IconX = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
)
const IconTrash = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

/* ---------- skeleton primitive ---------- */
const Skeleton = ({ className = '', style = {} }) => (
    <span className={`inline-block skeleton-shimmer rounded-md align-middle ${className}`} style={style} />
)

export default function Planner({ tasks }) {
    const { flash } = usePage().props
    const today = useMemo(() => new Date(), [])
    const todayKey = toKey(today)

    const [viewDate, setViewDate]     = useState(startOfMonth(today))
    const [selectedDate, setSelectedDate] = useState(todayKey)
    const [showForm, setShowForm]     = useState(false)
    const [editTarget, setEditTarget] = useState(null)
    const [filter, setFilter]         = useState('all')
    const [loading, setLoading]       = useState(false)

    // Any in-flight Inertia visit (create/edit/delete/toggle) shows a skeleton in the agenda panel
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

    return (
        <EmployeeLayout title="Task planner">
            <div className="relative min-h-screen overflow-hidden hud-grid" style={{ background: C.bg }}>
                {loading && (
                    <div className="fixed top-0 left-0 right-0 h-[2px] z-50 overflow-hidden" style={{ background: 'rgba(20,241,178,0.12)' }}>
                        <div className="h-full w-1/3 progress-sweep" style={{ background: C.teal }} />
                    </div>
                )}
                <div className="pointer-events-none absolute -top-40 -right-32 w-[26rem] h-[26rem] rounded-full blur-[120px] opacity-15"
                    style={{ background: C.teal }} />

                <div className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

                    {/* Flash */}
                    {flash?.success && (
                        <div className="mb-4 px-4 py-3 rounded-xl border text-sm animate-in"
                            style={{ background: 'rgba(20,241,178,0.08)', borderColor: 'rgba(20,241,178,0.3)', color: C.teal }}>
                            {flash.success}
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5 animate-in">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] font-mono mb-1" style={{ color: C.teal }}>
                                Task Planner
                            </p>
                            <h1 className="font-display text-xl sm:text-2xl font-semibold" style={{ color: C.text }}>
                                Plan &amp; track your work
                            </h1>
                        </div>
                        <button onClick={() => openNewTaskForm()}
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-black rounded-xl transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed w-fit"
                                style={{ background: C.teal, boxShadow: `0 0 24px -6px ${C.teal}` }}>
                            <IconPlus className="w-4 h-4" /> New task
                        </button>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 animate-in">
                        <div className="flex items-center gap-2 rounded-xl border px-2 py-1.5 w-fit" style={{ borderColor: C.border, background: C.panel }}>
                            <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg transition-colors" style={{ color: C.sub }}>
                                <IconChevronLeft className="w-4 h-4" />
                            </button>
                            <p className="text-sm font-medium font-display min-w-[130px] text-center" style={{ color: C.text }}>
                                {viewDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                            </p>
                            <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg transition-colors" style={{ color: C.sub }}>
                                <IconChevronRight className="w-4 h-4" />
                            </button>
                            <button onClick={goToToday}
                                    className="ml-1 text-xs px-2.5 py-1 rounded-lg border transition-colors"
                                    style={{ borderColor: C.border, color: C.teal }}>
                                Today
                            </button>
                        </div>

                        <div className="flex gap-1 p-1 rounded-xl border w-fit" style={{ background: C.panel, borderColor: C.border }}>
                            {['all', 'pending', 'done'].map(f => (
                                <button key={f} onClick={() => setFilter(f)}
                                        className="text-xs px-3 py-1.5 rounded-lg capitalize transition-all font-medium"
                                        style={filter === f
                                            ? { background: 'rgba(20,241,178,0.12)', color: C.teal, boxShadow: 'inset 0 0 0 1px rgba(20,241,178,0.3)' }
                                            : { color: C.dim }}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Calendar + agenda */}
                    <div className="grid lg:grid-cols-[1fr_310px] gap-4 items-start">

                        {/* Month grid */}
                        <div className="rounded-2xl border backdrop-blur-xl p-2 sm:p-3 animate-in overflow-hidden"
                            style={{ background: C.panel, borderColor: C.border }}>
                            <div className="grid grid-cols-7 mb-1">
                                {WEEKDAYS.map(w => (
                                    <div key={w} className="text-center text-[10px] sm:text-[11px] font-medium uppercase tracking-wide py-2" style={{ color: C.dim }}>
                                        {w}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {cells.map((date, i) => {
                                    const key = toKey(date)
                                    const inMonth = date.getMonth() === viewDate.getMonth()
                                    const isToday = key === todayKey
                                    const isSelected = key === selectedDate
                                    const dayTasks = tasksByDate[key] ?? []
                                    const visible = dayTasks.slice(0, 2)
                                    const overflow = dayTasks.length - visible.length

                                    return (
                                        <button key={i} onClick={() => selectDay(date)}
                                                className="relative text-left rounded-xl border p-1.5 sm:p-2 min-h-[64px] sm:min-h-[92px] flex flex-col gap-1 transition-colors"
                                                style={{
                                                    borderColor: isSelected ? C.borderHi : 'transparent',
                                                    background: isSelected ? 'rgba(20,241,178,0.07)' : inMonth ? 'rgba(255,255,255,0.015)' : 'transparent',
                                                    opacity: inMonth ? 1 : 0.35,
                                                }}>
                                            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[11px] font-mono flex-shrink-0"
                                                style={isToday
                                                    ? { background: C.teal, color: '#06090D', fontWeight: 600 }
                                                    : { color: inMonth ? C.sub : C.dim }}>
                                                {date.getDate()}
                                            </span>
                                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                                {visible.map(t => {
                                                    const pr = PRIORITY_STYLES[t.priority]
                                                    const done = t.status === 'done'
                                                    return (
                                                        <span key={t.id}
                                                            className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium"
                                                            style={{
                                                                color: pr.color,
                                                                background: `${pr.color}18`,
                                                                textDecoration: done ? 'line-through' : 'none',
                                                                opacity: done ? 0.6 : 1,
                                                            }}>
                                                            {t.title}
                                                        </span>
                                                    )
                                                })}
                                                {overflow > 0 && (
                                                    <span className="text-[9px] sm:text-[10px] px-1.5" style={{ color: C.dim }}>
                                                        +{overflow} more
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Agenda side panel */}
                        <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-5 animate-in lg:sticky lg:top-4"
                            style={{ background: C.panel, borderColor: C.border, animationDelay: '120ms' }}>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-[11px] font-mono" style={{ color: C.teal }}>
                                        {selectedDate === todayKey ? 'TODAY' : 'SELECTED'}
                                    </p>
                                    <p className="text-sm font-medium font-display" style={{ color: C.text }}>{selectedLabel}</p>
                                </div>
                                <button onClick={() => openNewTaskForm(selectedDate)}
                                        className="p-1.5 rounded-lg border transition-colors"
                                        style={{ borderColor: C.border, color: C.teal }}>
                                    <IconPlus className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-0.5">
                                {loading && selectedTasks.length > 0 && Array.from({ length: selectedTasks.length }).map((_, i) => (
                                    <div key={`skeleton-${i}`} className="relative rounded-xl border p-3 overflow-hidden"
                                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: C.border }}>
                                        <div className="flex items-start gap-2 pl-1.5">
                                            <Skeleton className="mt-0.5 w-4 h-4 rounded-md flex-shrink-0" />
                                            <div className="flex-1 min-w-0 space-y-2">
                                                <Skeleton className="h-3 w-3/4" />
                                                <Skeleton className="h-2.5 w-1/3" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {!loading && selectedTasks.map(task => {
                                    const pr = PRIORITY_STYLES[task.priority]
                                    const done = task.status === 'done'
                                    return (
                                        <div key={task.id}
                                            className="relative rounded-xl border p-3 overflow-hidden"
                                            style={{ background: 'rgba(255,255,255,0.02)', borderColor: C.border, opacity: done ? 0.55 : 1 }}>
                                            <div className="absolute top-0 left-0 bottom-0 w-[3px]" style={{ background: pr.color, opacity: 0.7 }} />
                                            <div className="flex items-start gap-2 pl-1.5">
                                                <button onClick={() => toggleDone(task)}
                                                        className="mt-0.5 w-4 h-4 rounded-md border flex-shrink-0 flex items-center justify-center transition-all"
                                                        style={done
                                                            ? { borderColor: C.teal, background: C.teal, color: '#06090D' }
                                                            : { borderColor: C.border, color: 'transparent' }}>
                                                    {done && <IconCheck className="w-2.5 h-2.5" />}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate"
                                                        style={{ color: done ? C.dim : C.text, textDecoration: done ? 'line-through' : 'none' }}>
                                                        {task.title}
                                                    </p>
                                                    {task.description && (
                                                        <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: C.sub }}>{task.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border"
                                                            style={{ color: pr.color, borderColor: `${pr.color}55`, background: `${pr.color}14` }}>
                                                            {pr.label}
                                                        </span>
                                                        {task.category && (
                                                            <span className="flex items-center gap-1 text-[10px]" style={{ color: C.dim }}>
                                                                <IconTag className="w-2.5 h-2.5" /> {task.category}
                                                            </span>
                                                        )}
                                                        {task.is_overdue && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border"
                                                                style={{ color: C.red, borderColor: 'rgba(255,107,129,0.4)', background: 'rgba(255,107,129,0.1)' }}>
                                                                Overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1 flex-shrink-0">
                                                    <button onClick={() => startEdit(task)} disabled={loading} className="text-[10px] px-1.5 py-0.5 rounded disabled:opacity-40 disabled:cursor-not-allowed" style={{ color: C.sub }}>Edit</button>
                                                    <button onClick={() => deleteTask(task)} disabled={loading} className="text-[10px] px-1.5 py-0.5 rounded disabled:opacity-40 disabled:cursor-not-allowed" style={{ color: C.red }}>Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}

                                {!loading && selectedTasks.length === 0 && (
                                    <div className="text-center py-10 rounded-xl border border-dashed" style={{ borderColor: C.border }}>
                                        <IconClipboard className="w-5 h-5 mx-auto mb-2" style={{ color: C.dim }} />
                                        <p className="text-xs" style={{ color: C.sub }}>No tasks for this day.</p>
                                        <button onClick={() => openNewTaskForm(selectedDate)}
                                                className="mt-2 text-xs font-medium" style={{ color: C.teal }}>
                                            + Add task
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Task form modal */}
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(6,9,13,0.75)', backdropFilter: 'blur(4px)' }}
                        onClick={cancelForm}>
                        <form onSubmit={submitTask} onClick={e => e.stopPropagation()}
                            className="w-full max-w-md rounded-2xl border p-5 space-y-4 animate-in"
                            style={{ background: '#0D1420', borderColor: C.border }}>
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-medium font-display" style={{ color: C.text }}>
                                    {editTarget ? 'Edit task' : 'New task'}
                                </h2>
                                <button type="button" onClick={cancelForm} style={{ color: C.dim }}>
                                    <IconX className="w-4 h-4" />
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: C.sub }}>
                                    Title <span style={{ color: C.red }}>*</span>
                                </label>
                                <input type="text"
                                    value={data.title}
                                    onChange={e => setData('title', e.target.value)}
                                    placeholder="What needs to be done?"
                                    className={inputClass}
                                    style={{ borderColor: C.border, color: C.text }}
                                    required autoFocus
                                />
                                {errors.title && <p className="mt-1 text-xs" style={{ color: C.red }}>{errors.title}</p>}
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: C.sub }}>Description</label>
                                <textarea
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    rows={2}
                                    placeholder="Optional details…"
                                    className={`${inputClass} resize-none`}
                                    style={{ borderColor: C.border, color: C.text }} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs mb-1.5" style={{ color: C.sub }}>
                                        Due date <span style={{ color: C.red }}>*</span>
                                    </label>
                                    <input type="date"
                                        value={data.due_date}
                                        onChange={e => setData('due_date', e.target.value)}
                                        className={inputClass}
                                        style={{ borderColor: C.border, color: C.text, colorScheme: 'dark' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1.5" style={{ color: C.sub }}>Priority</label>
                                    <select
                                        value={data.priority}
                                        onChange={e => setData('priority', e.target.value)}
                                        className={inputClass}
                                        style={{ borderColor: C.border, color: C.text, background: C.field }}>
                                        <option value="low" style={{ color: '#000' }}>Low</option>
                                        <option value="medium" style={{ color: '#000' }}>Medium</option>
                                        <option value="high" style={{ color: '#000' }}>High</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: C.sub }}>Category</label>
                                <input type="text"
                                    value={data.category}
                                    onChange={e => setData('category', e.target.value)}
                                    placeholder="e.g. Finance, HR"
                                    className={inputClass}
                                    style={{ borderColor: C.border, color: C.text }}
                                />
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={cancelForm}
                                        className="px-4 py-2.5 text-sm rounded-lg border transition-colors"
                                        style={{ borderColor: C.border, color: C.sub }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing}
                                        className="flex-1 px-5 py-2.5 text-sm font-semibold text-black rounded-lg disabled:opacity-60 transition-all hover:brightness-110"
                                        style={{ background: C.teal }}>
                                    {processing ? 'Saving…' : editTarget ? 'Update task' : 'Add task'}
                                </button>
                                {editTarget && (
                                    <button type="button" onClick={() => { deleteTask(editTarget); cancelForm() }}
                                            className="px-3 py-2.5 text-sm rounded-lg border transition-colors"
                                            style={{ borderColor: 'rgba(255,107,129,0.35)', color: C.red }}>
                                        <IconTrash className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
                    .font-display { font-family: 'Space Grotesk', sans-serif; }
                    .font-mono { font-family: 'JetBrains Mono', monospace; }
                    input, textarea, select { font-family: 'Inter', sans-serif; }
                    input:focus, textarea:focus, select:focus { border-color: rgba(20,241,178,0.5) !important; box-shadow: 0 0 0 3px rgba(20,241,178,0.12); }
                    ::-webkit-scrollbar { width: 6px; height: 6px; }
                    ::-webkit-scrollbar-thumb { background: rgba(20,241,178,0.25); border-radius: 8px; }
                    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                    @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-in { animation: fadeSlideUp 0.4s ease-out both; }
                    @keyframes gridDrift { from { background-position: 0 0; } to { background-position: 60px 60px; } }
                    .hud-grid { background-image: linear-gradient(rgba(20,241,178,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,241,178,0.05) 1px, transparent 1px); background-size: 34px 34px; animation: gridDrift 16s linear infinite; }
                    .skeleton-shimmer { background: linear-gradient(90deg, rgba(255,255,255,0.045) 25%, rgba(255,255,255,0.11) 37%, rgba(255,255,255,0.045) 63%); background-size: 400% 100%; animation: skeletonShimmer 1.6s ease-in-out infinite; }
                    @keyframes skeletonShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
                    @keyframes progressSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
                    .progress-sweep { animation: progressSweep 1.1s ease-in-out infinite; }
                    @media (prefers-reduced-motion: reduce) { .animate-in, .hud-grid, .skeleton-shimmer, .progress-sweep { animation: none; } .skeleton-shimmer { opacity: 0.6; } }
                `}</style>
            </div>
        </EmployeeLayout>
    )
}