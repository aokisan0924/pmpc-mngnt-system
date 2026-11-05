import { useState } from 'react'

const VISIBLE = 8
const CHIP = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
const IDLE = 'border-border bg-panel text-text hover:bg-hover'
const ACTIVE = 'border-[#26215C] bg-[#26215C] text-white'
const TAB = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'

function Late({ count, onDark }) {
    return (
        <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${onDark ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'}`}>
            {count} late
        </span>
    )
}

/**
 * Office tabs (All, each office, Late) and a row of people chips for the chosen office.
 * `offices` and `people` come from the server; offices ignore the board filters, people follow the office only.
 */
export default function TeamPeopleStrip({ offices = [], people = [], employees = [], overview = {}, filters = {}, onFilter }) {
    const [expanded, setExpanded] = useState(false)
    const office = filters.office || ''

    const persons = people.filter(c => c.type === 'employee')
    // Keep the Whole office chip visible while it is the active filter, even when its last open task is gone.
    const whole = people.find(c => c.type === 'whole') ?? (filters.whole ? { type: 'whole', key: office, label: 'Whole office', open: 0, late: 0 } : null)
    const selectedId = String(filters.employee_id ?? '')
    const folded = persons.slice(0, VISIBLE)
    // The chosen person stays visible even when folded away, or when they have no open tasks here.
    const chosen = persons.find(c => c.key === selectedId)
        ?? (selectedId ? { type: 'employee', key: selectedId, label: employees.find(e => String(e.id) === selectedId)?.name ?? 'Selected person', open: 0, late: 0 } : null)
    const visiblePersons = expanded ? persons : chosen && !folded.includes(chosen) ? [...folded, chosen] : folded
    const hidden = persons.length - VISIBLE

    const tabs = [
        { key: '', label: 'All', count: overview.open ?? 0 },
        ...offices.map(o => ({ key: o.key, label: o.label, count: o.open })),
    ]

    return (
        <section aria-label="Filter by office and person" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <nav aria-label="Office" className="flex flex-wrap gap-1 rounded-xl border border-border bg-field p-1">
                    {tabs.map(tab => {
                        const selected = tab.key === office
                        return (
                            <button
                                key={tab.key || 'all'}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => { if (!(selected && tab.key === '')) onFilter({ office: selected ? '' : tab.key, employee_id: '', whole: '' }) }}
                                className={`${TAB} ${selected ? 'bg-white text-[#26215C] shadow-xs border border-indigo-200' : 'border border-transparent text-sub hover:bg-panel/60 hover:text-text'}`}
                            >
                                {tab.label} <b className="tnum">{tab.count}</b>
                            </button>
                        )
                    })}
                </nav>
            </div>

            <div role="group" aria-label="Person" className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-bold uppercase tracking-wider text-sub">People</span>
                {visiblePersons.map(chip => {
                    const selected = selectedId === chip.key
                    return (
                        <button
                            key={chip.key}
                            type="button"
                            aria-pressed={selected}
                            aria-label={`${chip.label}, ${chip.open} open${chip.late > 0 ? `, ${chip.late} late` : ''}`}
                            onClick={() => onFilter({ employee_id: selected ? '' : chip.key, whole: '' })}
                            className={`${CHIP} ${selected ? ACTIVE : IDLE}`}
                        >
                            {chip.label} <b className="tnum">{chip.open}</b>
                            {chip.late > 0 && <Late count={chip.late} onDark={selected} />}
                        </button>
                    )
                })}

                {persons.length > VISIBLE && (
                    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(v => !v)} className={`${CHIP} ${IDLE}`}>
                        {expanded ? 'Show fewer' : `+${hidden} more`}
                    </button>
                )}

                {whole && (
                    <button
                        type="button"
                        aria-pressed={Boolean(filters.whole)}
                        aria-label={`Whole office, ${whole.open} open${whole.late > 0 ? `, ${whole.late} late` : ''}`}
                        onClick={() => onFilter({ whole: filters.whole ? '' : 1, employee_id: '' })}
                        className={`${CHIP} ${filters.whole ? ACTIVE : 'border-border bg-field text-sub hover:bg-hover'}`}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1" />
                        </svg>
                        Whole office <b className="tnum">{whole.open}</b>
                        {whole.late > 0 && <Late count={whole.late} onDark={Boolean(filters.whole)} />}
                    </button>
                )}
            </div>
        </section>
    )
}
