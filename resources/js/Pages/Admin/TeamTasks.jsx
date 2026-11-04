import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import AdminPageHeader from '@/Components/AdminPageHeader'
import ConfirmModal from '@/Components/ConfirmModal'
import TaskBoard from '@/Components/TaskBoard'
import TaskFormModal from '@/Components/TaskFormModal'
import TaskDetailModal from '@/Components/TaskDetailModal'

const SELECT = 'rounded-xl border border-border bg-field px-3 py-2 text-xs font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'

export default function TeamTasks({ tasks = [], employees = [], offices = [], filters = {} }) {
    const { flash } = usePage().props
    const [showForm, setShowForm]         = useState(false)
    const [editTarget, setEditTarget]     = useState(null)
    const [taskToDelete, setTaskToDelete] = useState(null)
    const [detailId, setDetailId]         = useState(null)
    const detailTask = tasks.find(t => t.id === detailId)

    function applyFilters(next) {
        const merged = { ...filters, ...next }
        const query = {}
        if (merged.employee_id) query.employee_id = merged.employee_id
        if (merged.priority)    query.priority = merged.priority
        if (merged.office)      query.office = merged.office
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
                    ? { ...t, status, is_overdue: status !== 'done' && t.due_date < today }
                    : t),
            }),
        })
    }

    function deleteTask() {
        if (!taskToDelete) return
        router.delete(`/admin/team-tasks/${taskToDelete.id}`, {
            preserveScroll: true,
            onFinish: () => setTaskToDelete(null),
        })
    }

    return (
        <AdminLayout>
            <div className="admin-page-shell space-y-4 sm:space-y-5 page-enter">

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
                    badge={`${tasks.filter(t => t.status !== 'done').length} open`}
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

                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-panel p-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-sub">
                        Employee
                        <select
                            value={filters.employee_id ?? ''}
                            onChange={e => applyFilters({ employee_id: e.target.value })}
                            className={SELECT}
                        >
                            <option value="">All</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-sub">
                        Office
                        <select
                            value={filters.office ?? ''}
                            onChange={e => applyFilters({ office: e.target.value })}
                            className={SELECT}
                        >
                            <option value="">All</option>
                            {offices.map(o => (
                                <option key={o.key} value={o.key}>{o.label}</option>
                            ))}
                        </select>
                    </label>
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
                    <label className="flex items-center gap-2 text-xs font-semibold text-sub cursor-pointer">
                        <input
                            type="checkbox"
                            checked={Boolean(filters.overdue)}
                            onChange={e => applyFilters({ overdue: e.target.checked })}
                            className="h-4 w-4 rounded border-border accent-[#26215C]"
                        />
                        Overdue only
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-sub cursor-pointer">
                        <input
                            type="checkbox"
                            checked={Boolean(filters.older)}
                            onChange={e => applyFilters({ older: e.target.checked })}
                            className="h-4 w-4 rounded border-border accent-[#26215C]"
                        />
                        Show completed over 30 days old
                    </label>
                </div>

                <p className="text-xs text-sub">
                    Drag a card to another column to move it. Open a card with View to change its status without dragging.
                </p>

                <TaskBoard
                    tasks={tasks}
                    onMove={moveTask}
                    onEdit={openForm}
                    onDelete={setTaskToDelete}
                    onOpen={task => setDetailId(task.id)}
                    accent="indigo"
                    showOwner
                    showMoveButtons={false}
                />
            </div>

            <TaskDetailModal
                task={detailTask}
                onClose={() => setDetailId(null)}
                onMove={moveTask}
                onEdit={task => { setDetailId(null); openForm(task) }}
                onDelete={task => { setDetailId(null); setTaskToDelete(task) }}
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
                onCancel={() => setTaskToDelete(null)}
            />
        </AdminLayout>
    )
}
