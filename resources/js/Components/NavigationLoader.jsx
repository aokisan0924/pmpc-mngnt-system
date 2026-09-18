import { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import pmpcLogo from '@images/pmpc_ems.png'

export default function NavigationLoader() {
    const [visible, setVisible] = useState(false)
    const delayRef = useRef(null)
    const safetyTimeoutRef = useRef(null)

    useEffect(() => {
        const clearTimers = () => {
            if (delayRef.current) {
                window.clearTimeout(delayRef.current)
                delayRef.current = null
            }
            if (safetyTimeoutRef.current) {
                window.clearTimeout(safetyTimeoutRef.current)
                safetyTimeoutRef.current = null
            }
        }

        const hide = () => {
            clearTimers()
            setVisible(false)
        }

        const removeStart = router.on('start', (event) => {
            // Never display full-screen loader for silent background polls or partial reloads
            const visit = event?.detail?.visit
            if (
                visit?.poll ||
                (Array.isArray(visit?.only) && visit.only.length > 0) ||
                visit?.showProgress === false ||
                (visit?.preserveState && visit?.preserveScroll && !visit?.url)
            ) {
                return
            }

            clearTimers()
            // Only show loader for real page navigations that take longer than 300ms
            delayRef.current = window.setTimeout(() => {
                setVisible(true)
                // Safety timeout: automatically dismiss after 8s if network hangs
                safetyTimeoutRef.current = window.setTimeout(hide, 8000)
            }, 300)
        })

        const removeFinish = router.on('finish', hide)
        const removeCancel = router.on('cancel', hide)
        const removeError = router.on('error', hide)

        return () => {
            clearTimers()
            removeStart()
            removeFinish()
            removeCancel()
            removeError()
        }
    }, [])

    if (!visible) return null

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 px-5 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-label="Loading workspace"
        >
            <div className="flex w-full max-w-xs flex-col items-center rounded-2xl border border-border bg-panel px-6 py-7 text-center shadow-xl">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                    <div className="absolute inset-0 rounded-2xl border-2 border-emerald-500/20 border-t-emerald-600 motion-safe:animate-spin" />
                    <img
                        src={pmpcLogo}
                        alt="PMPC"
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                            if (e.currentTarget.src !== window.location.origin + '/pmpc_ems.png') {
                                e.currentTarget.src = '/pmpc_ems.png'
                            }
                        }}
                    />
                </div>
                <p className="mt-4 font-display text-sm font-bold text-text">Preparing your workspace</p>
                <p className="mt-1 text-xs text-sub">PMPC WorkForce is loading your latest information.</p>
                <div className="mt-5 h-1.5 w-28 overflow-hidden rounded-full bg-field">
                    <div className="h-full w-1/2 rounded-full bg-emerald-600 motion-safe:animate-pulse" />
                </div>
            </div>
        </div>
    )
}
