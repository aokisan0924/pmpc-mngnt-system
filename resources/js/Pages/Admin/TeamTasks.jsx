import { useState } from 'react'
import { router } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import AdminPageHeader from '@/Components/AdminPageHeader'
import ConfirmModal from '@/Components/ConfirmModal'
import TaskBoard from '@/Components/TaskBoard'
import TaskFormModal from '@/Components/TaskFormModal'
import TaskDetailModal from '@/Components/TaskDetailModal'
import TeamTaskCalendar from '@/Components/TeamTaskCalendar'
import TeamTaskFilters from '@/Components/TeamTaskFilters'
import { boardColumns, manilaToday } from '@/Components/taskGroups'
import useHideTodo from '@/Components/useHideTodo'

// No background here: each pill sets its own, so the late pill's rose is not overridden.
const COUNT = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white'

export default function TeamTasks({ tasks = [], employees = [], offices = [], filters = {}, overview = {}, people = [], status_counts = {} }) {
    const [showForm, setShowForm]         = useState(false)
    const [editTarget, setEditTarget]     = useState(null)
    const [taskToDelete, setTaskToDelete] = useState(null)
    const [detailId, setDetailId]         = useState(null)
    const [view, setView]                 = useState('board')
    const [stopAlso, setStopAlso]         = useState(false)
    const detailTask = tasks.find(t => t.id === detailId)
    const [hideTodo, setHideTodo] = useHideTodo()
    const columns = boardColumns(tasks, manilaToday(), { hideTodo })

    function applyFilters(next) {
        const merged = { ...filters, ...next }
        const query = {}
        if (merged.employee_id) query.employee_id = merged.employee_id
        if (merged.priority)    query.priority = merged.priority
        if (merged.office)      query.office = merged.office
        if (merged.whole)       query.whole = 1
        if (merged.overdue)     query.overdue = 1
        if (merged.upcoming)    query.upcoming = 1
        if (merged.older)       query.older = 1
        router.get('/admin/team-tasks', query, { preserveState: true, preserveScroll: true, replace: true })
    }

    function openForm(task = null) {
        setEditTarget(task)
        setShowForm(true)
    }

    function closeForm() {
        setShowForm(false)
        setEditTarget(null)
    }

    // The card jumps to its new column at once; Inertia rolls it back if the save fails.
    function moveTask(task, status) {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
        router.patch(`/admin/team-tasks/${task.id}/status`, { status }, {
            preserveScroll: true,
            showProgress: false,
            optimistic: props => ({
                tasks: props.tasks.map(t => t.id === task.id
                    ? { ...t, status, is_overdue: status !== 'done' && t.due_date !== null && t.due_date < today, done_on: status === 'done' ? today : null }
                    : t),
            }),
        })
    }

    function deleteTask() {
        if (!taskToDelete) return
        router.delete(`/admin/team-tasks/${taskToDelete.id}`, {
            data: stopAlso ? { stop_repeat: 1 } : {},
            preserveScroll: true,
            onFinish: () => { setTaskToDelete(null); setStopAlso(false) },
        })
    }

    function stopRepeat(task) {
        router.post(`/admin/team-tasks/${task.id}/stop-repeat`, {}, { preserveScroll: true })
    }

    return (
        <AdminLayout>
            <div className="admin-page-shell space-y-3 sm:space-y-4 page-enter">

                <AdminPageHeader
                    title="Team tasks"
                    meta={
                        <>
                            {/* Same numbers as the board's four columns, so header and columns never disagree. */}
                            <span className={`${COUNT} bg-white/12`}><span className="tnum">{columns.pending.length}</span> to do</span>
                            <span className={`${COUNT} bg-white/12`}><span className="tnum">{columns.late.length + columns.today.length}</span> today</span>
                            <span className={`${COUNT} bg-white/12`}><span className="tnum">{columns.doing.length}</span> doing</span>
                            <span className={`${COUNT} bg-white/12`}><span className="tnum">{columns.doneRecent.length}</span> done this week</span>
                        </>
                    }
                    action={
                        <button
                            type="button"
                            onClick={() => openForm()}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-extrabold text-[#26215C] shadow-md transition-all hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>New Task</span>
                        </button>
                    }
                />

                <TeamTaskFilters
                    offices={offices}
                    people={people}
                    employees={employees}
                    overview={overview}
                    filters={filters}
                    counts={status_counts}
                    onFilter={applyFilters}
                    view={view}
                    onView={setView}
                />

                {view === 'calendar' && (
                    <TeamTaskCalendar tasks={tasks} onOpen={task => setDetailId(task.id)} />
                )}

                {view === 'board' && <TaskBoard
                    tasks={tasks}
                    onMove={moveTask}
                    onEdit={openForm}
                    onDelete={setTaskToDelete}
                    onOpen={task => setDetailId(task.id)}
                    accent="indigo"
                    showOwner
                    hideTodo={hideTodo}
                    onHideTodoChange={setHideTodo}
                    showMoveButtons={false}
                />}
            </div>

            <TaskDetailModal
                task={detailTask}
                onClose={() => setDetailId(null)}
                onMove={moveTask}
                onEdit={task => { setDetailId(null); openForm(task) }}
                onDelete={task => { setDetailId(null); setStopAlso(false); setTaskToDelete(task) }}
                onStopRepeat={stopRepeat}
                showOwner
            />

            {showForm && (
                <TaskFormModal
                    task={editTarget}
                    employees={employees}
                    offices={offices}
                    createUrl="/admin/team-tasks"
                    updateUrl={t => `/admin/team-tasks/${t.id}`}
                    onClose={closeForm}
                />
            )}

            <ConfirmModal
                open={Boolean(taskToDelete)}
                title="Delete Task"
                message={taskToDelete ? `Are you sure you want to delete "${taskToDelete.title}"? This action cannot be undone.` : ''}
                confirmLabel="Delete Task"
                cancelLabel="Cancel"
                confirmStyle="danger"
                onConfirm={deleteTask}
                onCancel={() => { setTaskToDelete(null); setStopAlso(false) }}
            >
                {taskToDelete?.repeat_active && (
                    <label className="mb-5 flex items-center justify-center gap-2 text-sm font-medium text-text">
                        <input type="checkbox" checked={stopAlso} onChange={e => setStopAlso(e.target.checked)} className="h-4 w-4 rounded border-border" />
                        Also stop repeating
                    </label>
                )}
            </ConfirmModal>
        </AdminLayout>
    )
}
