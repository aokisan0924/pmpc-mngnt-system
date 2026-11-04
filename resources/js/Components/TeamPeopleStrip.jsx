import { useState } from 'react'

const VISIBLE = 8
const CHIP = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
const IDLE = 'border-border bg-panel text-text hover:bg-hover'
const ACTIVE = 'border-[#26215C] bg-[#26215C] text-white'

function Late({ count, onDark }) {
    return (
        <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${onDark ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'}`}>
            {count} late
        </span>
    )
}

/**
 * Chips that filter Team tasks by person or whole-office group.
 * `people` comes from the server and ignores the board filters, so chips stay put while one is selected.
 */
export default function TeamPeopleStrip({ people = [], overview = {}, filters = {}, onFilter }) {
    const [expanded, setExpanded] = useState(false)
    // Office groups are few, so they always show; only the people list folds.
    const persons = people.filter(c => c.type === 'employee')
    const offices = people.filter(c => c.type === 'office')
    const shown = [...(expanded ? persons : persons.slice(0, VISIBLE)), ...offices]
    const hidden = persons.length - Math.min(persons.length, VISIBLE)
    const everyone = !filters.employee_id && !filters.group
    const showLate = (overview.overdue ?? 0) > 0 || filters.overdue

    return (
        <section aria-label="Filter by person or office" className="flex flex-wrap items-center gap-2">
            <button type="button" aria-pressed={everyone} onClick={() => onFilter({ employee_id: '', group: '' })} className={`${CHIP} ${everyone ? ACTIVE : IDLE}`}>
                Everyone <b className="tnum">{overview.open ?? 0}</b>
            </button>

            {showLate && (
                <button
                    type="button"
                    aria-pressed={Boolean(filters.overdue)}
                    onClick={() => onFilter({ overdue: !filters.overdue })}
                    className={`${CHIP} border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 ${filters.overdue ? 'ring-2 ring-rose-400' : ''}`}
                >
                    <b className="tnum">{overview.overdue ?? 0}</b> late
                </button>
            )}

            {shown.map(chip => {
                const isOffice = chip.type === 'office'
                const selected = isOffice ? filters.group === chip.key : String(filters.employee_id) === chip.key
                const toggle = isOffice
                    ? { group: selected ? '' : chip.key, employee_id: '' }
                    : { employee_id: selected ? '' : chip.key, group: '' }

                return (
                    <button
                        key={`${chip.type}:${chip.key}`}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onFilter(toggle)}
                        className={`${CHIP} ${selected ? ACTIVE : isOffice ? 'border-border bg-field text-sub hover:bg-hover' : IDLE}`}
                    >
                        {isOffice && (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1" />
                            </svg>
                        )}
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
        </section>
    )
}
