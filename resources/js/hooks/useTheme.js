import { useEffect } from 'react'

const STORAGE_KEY = 'pmpc-theme'

/**
 * Keep every portal in light mode, including browsers with an old dark preference.
 */
export default function useTheme() {
    useEffect(() => {
        document.documentElement.classList.remove('dark')
        try {
            window.localStorage.setItem(STORAGE_KEY, 'light')
        } catch {
            // Light mode still applies when browser storage is unavailable.
        }
    }, [])
}
