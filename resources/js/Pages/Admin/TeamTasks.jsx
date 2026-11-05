import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import AdminPageHeader from '@/Components/AdminPageHeader'
import ConfirmModal from '@/Components/ConfirmModal'
import TaskBoard from '@/Components/TaskBoard'
import TaskFormModal from '@/Components/TaskFormModal'
import TaskDetailModal from '@/Components/TaskDetailModal'
import TeamTaskCalendar from '@/Components/TeamTaskCalendar'
import TeamPeopleStrip from '@/Components/TeamPeopleStrip'
import TeamStatusOverview from '@/Components/TeamStatusOverview'

const SELECT = 'rounded-xl border border-border bg-field px-3 py-2 text-xs font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'

export default function TeamTasks({ tasks = [], employees = [], offices = [], filters = {}, overview = {}, people = [], status_counts = {} }) {
    const { flash } = usePage().props
    const [showForm, setShowForm]         = useState(false)
    const [editTarget, setEditTarget]     = useState(null)
    const [taskToDelete, setTaskToDelete] = useState(null)
    const [detailId, setDetailId]         = useState(null)
    const [view, setView]                 = useState('board')
    const [stopAlso, setStopAlso]         = useState(false)
    const detailTask = tasks.find(t => t.id === detailId)

    function applyFilters(next) {
        const merged = { ...filters, ...next }
        const query = {}
        if (merged.employee_id) query.employee_id = merged.employee_id
        if (merged.priority)    query.priority = merged.priority
        if (merged.office)      query.office = merged.office
        if (merged.whole)       query.whole = 1
        if (merged.overdue)     query.overdue = 1
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
                    ? { ...t, status, is_overdue: status !== 'done' && t.due_date !== null && t.due_date < today }
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

                {flash?.success && (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{flash.success}</span>
                    </div>
                )}

                <AdminPageHeader
                    title="Team tasks"
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

                <TeamStatusOverview counts={status_counts} older={Boolean(filters.older)} />

                <div className="space-y-3 rounded-2xl border border-border bg-panel p-3 sm:p-4">
                    <TeamPeopleStrip offices={offices} people={people} employees={employees} overview={overview} filters={filters} onFilter={applyFilters} />

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
                        {view === 'board' && (
                            <p className="text-xs text-sub">Drag cards between columns, or use View</p>
                        )}
                        <label className="flex items-center gap-2 text-xs font-semibold text-sub">
                            Priority
                            <select
                                value={filters.priority ?? ''}
                                onChange={e => applyFilters({ priority: e.target.value })}
                                className={SELECT}
                            >
                                <option value="">Any</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-text cursor-pointer">
                            <input
                                type="checkbox"
                                checked={Boolean(filters.overdue)}
                                onChange={e => applyFilters({ overdue: e.target.checked })}
                                className="h-4 w-4 rounded border-border accent-[#26215C]"
                            />
                            Late only ({status_counts.late ?? 0})
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-text cursor-pointer">
                            <input
                                type="checkbox"
                                checked={Boolean(filters.older)}
                                onChange={e => applyFilters({ older: e.target.checked })}
                                className="h-4 w-4 rounded border-border accent-[#26215C]"
                            />
                            Show old completed
                        </label>
                        <div className="ml-auto flex gap-1 rounded-xl border border-border bg-field p-1 shrink-0" role="group" aria-label="Team tasks view">
                            {[['board', 'Board'], ['calendar', 'Calendar']].map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    aria-pressed={view === key}
                                    onClick={() => setView(key)}
                                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                                        view === key ? 'border border-indigo-200 bg-white font-bold text-[#26215C] shadow-xs' : 'border border-transparent text-sub hover:bg-panel/50 hover:text-text'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

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
