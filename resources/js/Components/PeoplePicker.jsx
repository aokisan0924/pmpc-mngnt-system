import { useId, useMemo, useState } from 'react'

const INPUT = 'w-full px-3.5 py-2 text-sm font-medium border border-border rounded-xl bg-field text-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all'
const LINK = 'text-xs font-semibold text-[#26215C] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 rounded'

/**
 * Searchable checklist of people grouped by office, with chips for who is picked.
 * `value` is an array of employee ids; `onChange` gets the next array.
 */
export default function PeoplePicker({ employees = [], offices = [], value = [], onChange, error }) {
    const [query, setQuery] = useState('')
    const searchId = useId()
    const picked = new Set(value)
    const text = query.trim().toLowerCase()

    const groups = useMemo(() => {
        const label = key => offices.find(o => o.key === key)?.label ?? 'No office'
        const byOffice = new Map()
        employees.forEach(emp => {
            if (text && !emp.name.toLowerCase().includes(text)) return
            const key = emp.office ?? ''
            if (!byOffice.has(key)) byOffice.set(key, { key, label: label(key), people: [] })
            byOffice.get(key).people.push(emp)
        })
        return [...byOffice.values()]
    }, [employees, offices, text])

    const toggle = id => onChange(picked.has(id) ? value.filter(v => v !== id) : [...value, id])
    const setMany = (ids, on) => onChange(on ? [...new Set([...value, ...ids])] : value.filter(v => !ids.includes(v)))
    const nameOf = id => employees.find(e => e.id === id)?.name ?? `#${id}`

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <label htmlFor={searchId} className="block text-xs font-semibold text-sub uppercase tracking-wider">People</label>
                <span className="text-xs font-semibold text-sub" aria-live="polite">{value.length} selected</span>
            </div>

            {value.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Selected people">
                    {value.map(id => (
                        <li key={id}>
                            <button
                                type="button"
                                onClick={() => toggle(id)}
                                aria-label={`Remove ${nameOf(id)}`}
                                className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-[#26215C] hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                                {nameOf(id)} <span aria-hidden="true">×</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <input id={searchId} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search people" className={INPUT} />

            <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-field/40 p-2 space-y-3">
                {groups.length === 0 && <p className="px-1 py-2 text-sm text-sub">No one matches.</p>}
                {groups.map(group => {
                    const ids = group.people.map(p => p.id)
                    const allOn = ids.every(id => picked.has(id))
                    return (
                        <fieldset key={group.key || 'none'}>
                            <legend className="sr-only">{group.label}</legend>
                            <div className="flex items-center justify-between px-1 pb-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-sub">{group.label}</p>
                                <button type="button" onClick={() => setMany(ids, !allOn)} className={LINK}>
                                    {allOn ? 'Clear' : 'Select all'}
                                </button>
                            </div>
                            <ul>
                                {group.people.map(emp => (
                                    <li key={emp.id}>
                                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-text hover:bg-hover">
                                            <input
                                                type="checkbox"
                                                checked={picked.has(emp.id)}
                                                onChange={() => toggle(emp.id)}
                                                className="h-4 w-4 rounded border-border accent-[#26215C]"
                                            />
                                            {emp.name}
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </fieldset>
                    )
                })}
            </div>

            {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
    )
}
