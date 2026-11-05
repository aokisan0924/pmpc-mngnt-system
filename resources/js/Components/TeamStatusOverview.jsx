/** To do / Doing / Done counts for the current Team tasks filters, with a progress bar. Not interactive. */
export default function TeamStatusOverview({ counts = {}, older = false }) {
    const todo = counts.todo ?? 0
    const doing = counts.doing ?? 0
    const done = counts.done ?? 0
    const late = counts.late ?? 0
    const total = todo + doing + done
    const pct = total === 0 ? 0 : Math.floor((done / total) * 100)

    const cards = [
        { label: 'To do', value: todo, note: late > 0 ? `${late} late` : 'waiting', noteClass: late > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-sub' },
        { label: 'Doing', value: doing, note: 'in progress', noteClass: 'text-sub' },
        { label: 'Done', value: done, note: `${pct}% finished · ${older ? 'all time' : 'last 30 days'}`, noteClass: 'text-emerald-700 dark:text-emerald-400' },
    ]

    return (
        <section aria-label="Task status overview" className="rounded-2xl border border-border bg-panel px-3 py-2.5 sm:px-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {cards.map(card => (
                    <div key={card.label} className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-sub">{card.label}</p>
                        <p className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-heading text-xl sm:text-2xl font-extrabold tnum text-text">{card.value}</span>
                            <span className={`text-xs ${card.noteClass}`}>{card.note}</span>
                        </p>
                    </div>
                ))}
            </div>
            <div aria-hidden="true" className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-field">
                <div className="bg-emerald-600" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                <div className="bg-amber-500" style={{ width: `${total ? (doing / total) * 100 : 0}%` }} />
            </div>
        </section>
    )
}
