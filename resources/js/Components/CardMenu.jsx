import { useEffect, useId, useRef, useState } from 'react'

/**
 * A "⋯" button that opens a small menu. `items` is [{ label, onClick, danger? }].
 * Enter/Space open it, arrows move, Escape closes and returns focus, a click elsewhere closes.
 */
export default function CardMenu({ label, items, focusRing = 'focus-visible:outline-indigo-600' }) {
    const [open, setOpen] = useState(false)
    const root = useRef(null)
    const trigger = useRef(null)
    const menuId = useId()

    useEffect(() => {
        if (!open) return
        root.current?.querySelector('[role=menuitem]')?.focus()
        const away = e => { if (!root.current?.contains(e.target)) setOpen(false) }
        document.addEventListener('pointerdown', away)
        return () => document.removeEventListener('pointerdown', away)
    }, [open])

    if (items.length === 0) return null

    function close(returnFocus = true) {
        setOpen(false)
        if (returnFocus) trigger.current?.focus()
    }

    function onMenuKey(e) {
        const buttons = [...root.current.querySelectorAll('[role=menuitem]')]
        const i = buttons.indexOf(document.activeElement)
        if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(i + 1) % buttons.length].focus() }
        else if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length].focus() }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
        else if (e.key === 'Tab') close(false)
    }

    return (
        <div ref={root} className="relative" onClick={e => e.stopPropagation()} draggable={false}>
            <button
                ref={trigger}
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={label}
                onClick={() => setOpen(v => !v)}
                className={`rounded-lg border border-border bg-panel px-2 py-1 text-sm font-bold leading-none text-sub hover:bg-hover hover:text-text focus-visible:outline-2 ${focusRing}`}
            >
                <span aria-hidden="true">⋯</span>
            </button>
            {open && (
                <div id={menuId} role="menu" aria-label={label} onKeyDown={onMenuKey} className="absolute right-0 z-20 mt-1 min-w-28 rounded-xl border border-border bg-panel p-1 shadow-lg">
                    {items.map(item => (
                        <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            onClick={() => { close(false); item.onClick() }}
                            className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm font-semibold focus:outline-none focus-visible:bg-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600 ${item.danger ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40' : 'text-text hover:bg-hover'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
