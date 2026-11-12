import { useState } from 'react'

const KEY = 'pmpc.taskBoard.hideTodo'

/** Whether the task board's To do column is hidden, remembered on this device. Shows To do when storage is blocked. */
export default function useHideTodo() {
    const [hidden, setHidden] = useState(() => {
        try { return window.localStorage.getItem(KEY) === '1' } catch { return false }
    })
    const update = value => {
        setHidden(value)
        try { window.localStorage.setItem(KEY, value ? '1' : '0') } catch { /* keep it for this visit only */ }
    }
    return [hidden, update]
}
