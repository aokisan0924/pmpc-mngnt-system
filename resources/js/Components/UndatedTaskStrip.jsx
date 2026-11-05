/** Chips for tasks that have no due date, shown under a month calendar. */
export default function UndatedTaskStrip({ tasks, onOpen, label = t => t.title, focusRing = 'focus-visible:outline-indigo-600' }) {
    if (tasks.length === 0) return null

    return (
        <section aria-label="Tasks with no due date" className="mt-3">
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-sub">No date · {tasks.length}</h3>
            <div className="flex flex-wrap gap-1">
                {tasks.map(task => (
                    <button
                        key={task.id}
                        type="button"
                        onClick={() => onOpen(task)}
                        title={label(task)}
                        className={`max-w-full truncate rounded-md px-1.5 py-0.5 text-left text-xs font-medium focus-visible:outline-2 ${focusRing} ${
                            task.status === 'done'
                                ? 'bg-field text-dim line-through'
                                : 'bg-indigo-500/10 text-[#26215C] dark:text-indigo-200'
                        }`}
                    >
                        {label(task)}
                    </button>
                ))}
            </div>
        </section>
    )
}
