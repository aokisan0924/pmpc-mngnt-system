import AdminLayout from '@/Layouts/AdminLayout'

// Placeholder: replaced by the full board in the Team tasks UI task.
export default function TeamTasks({ tasks = [] }) {
    return (
        <AdminLayout>
            <div className="admin-page-shell max-w-6xl page-enter">
                <h1 className="text-xl font-semibold">Team tasks</h1>
                <p className="text-sm text-dim">{tasks.length} tasks</p>
            </div>
        </AdminLayout>
    )
}
