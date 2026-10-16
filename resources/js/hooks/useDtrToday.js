import { useEffect, useRef } from 'react'

export default function useDtrToday(month, todayDate, employeeId) {
    const containerRef = useRef(null)

    useEffect(() => {
        if (!todayDate || month !== todayDate.slice(0, 7)) return

        // Wait until Inertia has restored the visit's scroll position.
        let frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => {
                const today = [...(containerRef.current?.querySelectorAll('[data-dtr-today]') ?? [])]
                    .find(element => element.getClientRects().length > 0)
                today?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
                    block: 'center',
                    inline: 'nearest',
                })
            })
        })

        return () => cancelAnimationFrame(frame)
    }, [month, todayDate, employeeId])

    return containerRef
}
