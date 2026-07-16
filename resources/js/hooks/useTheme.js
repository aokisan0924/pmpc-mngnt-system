import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'pmpc-theme'

function getInitialTheme() {
    if (typeof window === 'undefined') return 'dark'

    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored

    // No saved preference yet — fall back to the OS/browser setting.
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * Shared light/dark theme state. Applies the `dark` class to <html>,
 * which every semantic color token in app.css (--color-bg, --color-text,
 * etc.) responds to automatically — no per-component theme logic needed
 * beyond using the `bg-bg`, `text-text`, etc. utility classes.
 */
export default function useTheme() {
    const [theme, setTheme] = useState(getInitialTheme)

    useEffect(() => {
        const root = document.documentElement
        if (theme === 'dark') {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        window.localStorage.setItem(STORAGE_KEY, theme)
    }, [theme])

    const toggleTheme = useCallback(() => {
        setTheme(t => (t === 'dark' ? 'light' : 'dark'))
    }, [])

    return { theme, toggleTheme, isDark: theme === 'dark' }
}