import { useState } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import EmployeeLayout from '@/Layouts/EmployeeLayout'

const PRIORITY_STYLES = {
    high:   { bg: 'bg-red-50',    text: 'text-red-700',    label: 'High'   },
    medium: { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Medium' },
    low:    { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Low'    },
}

const EMPTY_FORM = {
    title:       '',
    description: '',
    due_date:    '',
    category:    '',
    priority:    'medium',
}

export default function Planner({ tasks }) {
    const { flash }                   = usePage().props
    const [showForm, setShowForm]     = useState(false)
    const [editTarget, setEditTarget] = useState(null)
    const [filter, setFilter]         = useState('pending')

    const { data, setData, post, patch, processing, errors, reset } = useForm(EMPTY_FORM)

    const filtered = filter === 'all'
        ? tasks
        : tasks.filter(t => t.status === filter)

    function submitTask(e) {
        e.preventDefault()
        if (editTarget) {
            patch(`/employee/planner/${editTarget.id}`, {
                onSuccess: () => { setEditTarget(null); reset() },
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
            due_date:    task.due_date,
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
        router.patch(`/employee/planner/${task.id}/toggle`)
    }

    function deleteTask(task) {
        if (confirm('Delete this task?')) {
            router.delete(`/employee/planner/${task.id}`)
        }
    }

    return (
        <EmployeeLayout>
            <div className="p-6 max-w-3xl mx-auto">

                {/* Flash */}
                {flash?.success && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-lg font-medium text-gray-900">Task planner</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Plan and track your upcoming tasks</p>
                    </div>
                    {!showForm && (
                        <button onClick={() => setShowForm(true)}
                            className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                            style={{ background: '#0F6E56' }}>
                            + Add task
                        </button>
                    )}
                </div>

                {/* Task form */}
                {showForm && (
                    <form onSubmit={submitTask}
                        className="bg-white rounded-xl border border-gray-200 p-5 mb-5 space-y-4">
                        <h2 className="text-sm font-medium text-gray-800">
                            {editTarget ? 'Edit task' : 'New task'}
                        </h2>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Title <span className="text-red-400">*</span>
                            </label>
                            <input type="text"
                                value={data.title}
                                onChange={e => setData('title', e.target.value)}
                                placeholder="What needs to be done?"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                required />
                            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Description</label>
                            <textarea
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                rows={2}
                                placeholder="Optional details…"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 resize-none" />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Due date <span className="text-red-400">*</span>
                                </label>
                                <input type="date"
                                    value={data.due_date}
                                    onChange={e => setData('due_date', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
                                    required />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Category</label>
                                <input type="text"
                                    value={data.category}
                                    onChange={e => setData('category', e.target.value)}
                                    placeholder="e.g. Finance, HR"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Priority</label>
                                <select
                                    value={data.priority}
                                    onChange={e => setData('priority', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 bg-white">
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button type="button" onClick={cancelForm}
                                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={processing}
                                className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                                style={{ background: '#0F6E56' }}>
                                {processing ? 'Saving…' : editTarget ? 'Update task' : 'Add task'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Filter tabs */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4">
                    {['pending', 'done', 'all'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`flex-1 text-xs py-1.5 rounded-md capitalize transition-all ${
                                filter === f
                                    ? 'bg-white text-gray-800 font-medium shadow-sm border border-gray-200'
                                    : 'text-gray-500'
                            }`}>
                            {f}
                        </button>
                    ))}
                </div>

                {/* Task list */}
                <div className="space-y-2">
                    {filtered.map(task => {
                        const priority = PRIORITY_STYLES[task.priority]
                        return (
                            <div key={task.id}
                                className={`bg-white rounded-xl border p-4 transition-opacity ${
                                    task.status === 'done' ? 'opacity-60 border-gray-100' : 'border-gray-200'
                                }`}>
                                <div className="flex items-start gap-3">
                                    {/* Checkbox */}
                                    <button onClick={() => toggleDone(task)}
                                        className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                                            task.status === 'done'
                                                ? 'border-emerald-500 bg-emerald-500'
                                                : 'border-gray-300 hover:border-emerald-400'
                                        }`}>
                                        {task.status === 'done' && (
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                                            </svg>
                                        )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                {task.title}
                                            </p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.bg} ${priority.text}`}>
                                                {priority.label}
                                            </span>
                                            {task.is_overdue && (
                                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600">
                                                    Overdue
                                                </span>
                                            )}
                                        </div>

                                        {task.description && (
                                            <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                                        )}

                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-gray-400">📅 {task.due_label}</span>
                                            {task.category && (
                                                <span className="text-xs text-gray-400">🏷 {task.category}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => startEdit(task)}
                                            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-50">
                                            Edit
                                        </button>
                                        <button onClick={() => deleteTask(task)}
                                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {filtered.length === 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
                            <p className="text-sm text-gray-400">
                                No {filter === 'all' ? '' : filter} tasks found.
                            </p>
                            {filter === 'pending' && (
                                <button onClick={() => setShowForm(true)}
                                    className="mt-3 text-sm font-medium"
                                    style={{ color: '#0F6E56' }}>
                                    + Add your first task
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </EmployeeLayout>
    )
}