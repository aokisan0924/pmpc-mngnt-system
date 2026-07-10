import { useState, useEffect, useCallback } from 'react'
import { router } from '@inertiajs/react'

export default function useNotifications(employeeId, initialCount = 0) {
    const [unreadCount, setUnreadCount]         = useState(initialCount)
    const [liveNotifications, setLiveNotifications] = useState([])

    useEffect(() => {
        if (! employeeId || ! window.Echo) return

        const channel = window.Echo.private(`employee.${employeeId}`)

        channel.listen('.notification.sent', (data) => {
            // Increment badge count
            setUnreadCount(prev => prev + 1)

            // Add to live notifications list for toast
            setLiveNotifications(prev => [
                { ...data, id: data.id ?? Date.now() },
                ...prev.slice(0, 4), // keep last 5
            ])
        })

        return () => {
            window.Echo.leave(`employee.${employeeId}`)
        }
    }, [employeeId])

    const dismissToast = useCallback((id) => {
        setLiveNotifications(prev => prev.filter(n => n.id !== id))
    }, [])

    const resetCount = useCallback(() => {
        setUnreadCount(0)
    }, [])

    return { unreadCount, liveNotifications, dismissToast, resetCount }
}