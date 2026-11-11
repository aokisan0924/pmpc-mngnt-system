const SELECT = 'min-h-10 rounded-xl border border-border bg-panel px-3 py-2 text-sm font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
const CHIP = 'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
const CHIP_IDLE = 'border-border bg-panel text-text hover:bg-hover'
const CHIP_ON = 'border-[#26215C] bg-[#26215C] text-white'

const openText = (open, late) => `${open} open${late > 0 ? ` · ${late} late` : ''}`

function Chip({ on, onClick, children }) {
    return (
        <button type="button" aria-pressed={on} onClick={onClick} className={`${CHIP} ${on ? CHIP_ON : CHIP_IDLE}`}>
            {children}
        </button>
    )
}

/**
 * The one filter row of Team tasks: office, person and priority dropdowns, the Late / Upcoming /
 * Old completed chips, and the Board / Calendar switch. `offices` and `people` come from the server.
 */
export default function TeamTaskFilters({ offices = [], people = [], employees = [], overview = {}, filters = {}, counts = {}, onFilter, view, onView }) {
    const office = filters.office || ''
    const persons = people.filter(p => p.type === 'employee')
    // Keep "Whole office tasks" listed while it is the active filter, even when its last open task is gone.
    const whole = people.find(p => p.type === 'whole') ?? (filters.whole ? { open: 0, late: 0 } : null)
    const selectedId = String(filters.employee_id ?? '')
    // The chosen person stays listed even when they have no open tasks here.
    const chosenMissing = selectedId && !persons.some(p => p.key === selectedId)
    const personValue = filters.whole ? 'whole' : selectedId

    function choosePerson(value) {
        if (value === 'whole') onFilter({ whole: 1, employee_id: '' })
        else onFilter({ employee_id: value, whole: '' })
    }

    return (
        <section aria-label="Filter tasks" className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-field/60 p-3">
            <label className="sr-only" htmlFor="team-tasks-office">Office</label>
            <select
                id="team-tasks-office"
                value={office}
                onChange={e => onFilter({ office: e.target.value, employee_id: '', whole: '' })}
                className={SELECT}
            >
                <option value="">All offices · {overview.open ?? 0}</option>
                {offices.map(o => <option key={o.key} value={o.key}>{o.label} · {openText(o.open, o.late)}</option>)}
            </select>

            <label className="sr-only" htmlFor="team-tasks-person">Person</label>
            <select id="team-tasks-person" value={personValue} onChange={e => choosePerson(e.target.value)} className={SELECT}>
                <option value="">Everyone</option>
                {office && whole && <option value="whole">Whole office tasks · {openText(whole.open, whole.late)}</option>}
                {persons.map(p => <option key={p.key} value={p.key}>{p.label} · {openText(p.open, p.late)}</option>)}
                {chosenMissing && (
                    <option value={selectedId}>{employees.find(e => String(e.id) === selectedId)?.name ?? 'Selected person'} · 0 open</option>
                )}
            </select>

            <label className="sr-only" htmlFor="team-tasks-priority">Priority</label>
            <select id="team-tasks-priority" value={filters.priority ?? ''} onChange={e => onFilter({ priority: e.target.value })} className={SELECT}>
                <option value="">Any priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
            </select>

            <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-border sm:block" />

            {/* Late and Upcoming never overlap, so turning one on turns the other off. */}
            <Chip on={Boolean(filters.overdue)} onClick={() => onFilter({ overdue: !filters.overdue, upcoming: false })}>
                Late only <b className="tnum">{counts.late ?? 0}</b>
            </Chip>
            <Chip on={Boolean(filters.upcoming)} onClick={() => onFilter({ upcoming: !filters.upcoming, overdue: false })}>
                Upcoming <b className="tnum">{counts.upcoming ?? 0}</b>
            </Chip>
            <Chip on={Boolean(filters.older)} onClick={() => onFilter({ older: !filters.older })}>
                Old completed
            </Chip>

            <div className="ml-auto flex gap-1 rounded-xl border border-border bg-panel p-1 shrink-0" role="group" aria-label="Team tasks view">
                {[['board', 'Board'], ['calendar', 'Calendar']].map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        aria-pressed={view === key}
                        onClick={() => onView(key)}
                        className={`min-h-8 rounded-lg px-3 py-1 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                            view === key ? 'bg-[#26215C] text-white shadow-xs' : 'text-sub hover:bg-hover hover:text-text'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </section>
    )
}
