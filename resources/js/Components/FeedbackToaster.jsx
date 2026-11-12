import { useEffect, useSyncExternalStore } from 'react'
import { router } from '@inertiajs/react'

// One feedback channel for the whole app. Lives outside React so toasts survive page swaps
// (each page renders its own layout, so layout state resets on every visit).
let toasts = []
let nextId = 1
const listeners = new Set()
const emit = () => listeners.forEach(l => l())

export function dismissToast(id) {
    toasts = toasts.filter(t => t.id !== id)
    emit()
}

/**
 * Show a toast. type: 'success' | 'error' | 'info'.
 * action: optional { label, onClick } (e.g. Undo). Errors stay until closed; others fade.
 */
export function toast({ type = 'success', title, body, action }) {
    if (!title) return
    // Same message twice in a row replaces the old one instead of stacking.
    toasts = toasts.filter(t => !(t.title === title && t.body === body))
    toasts = [...toasts.slice(-2), { id: nextId++, type, title, body, action }]
    emit()
}

function showFlash(flash) {
    if (flash?.success) toast({ type: 'success', title: flash.success })
    if (flash?.error) toast({ type: 'error', title: flash.error })
}

function firstError(errors) {
    const value = Object.values(errors ?? {})[0]
    return Array.isArray(value) ? value[0] : value
}

let registered = false
export function registerFeedback(initialPage) {
    if (registered) return
    registered = true
    showFlash(initialPage?.props?.flash)

    router.on('success', event => showFlash(event.detail.page.props.flash))

    router.on('error', event => {
        // Sign-in pages are one short form that already shows its errors inline.
        if (event.detail.page && !event.detail.page.props?.auth?.employee) return
        const message = firstError(event.detail.errors)
        toast({
            type: 'error',
            title: 'Please check this',
            body: message ? `${message}` : 'Check the highlighted fields and try again.',
        })
    })

    router.on('networkError', () => {
        toast({
            type: 'error',
            title: 'No connection',
            body: 'Nothing was saved. Check your internet, then try again. What you typed is kept.',
        })
    })

    router.on('httpException', event => {
        const status = event.detail.response?.status
        if (status === 419) {
            toast({
                type: 'error',
                title: 'Your session expired',
                body: 'Reload the page and sign in again. Nothing was saved.',
                action: { label: 'Reload', onClick: () => window.location.reload() },
            })
        } else if (status === 403) {
            toast({ type: 'error', title: 'Not allowed', body: 'Your account cannot do this action.' })
        } else {
            toast({
                type: 'error',
                title: 'Something went wrong',
                body: 'The server could not finish this. Nothing was saved. Try again in a moment.',
            })
        }
        // Keep Laravel's debug modal while developing; hide raw error pages from users.
        if (import.meta.env.PROD) return false
    })
}

const STYLES = {
    success: { ring: 'bg-emerald-500', path: 'm4.5 12.75 6 6 9-13.5' },
    error: { ring: 'bg-rose-600', path: 'M12 8v4.5m0 3h.01' },
    info: { ring: 'bg-slate-500', path: 'M12 11v5m0-8h.01' },
}

function Toast({ t }) {
    const style = STYLES[t.type] ?? STYLES.info

    useEffect(() => {
        if (t.type === 'error') return
        const timer = setTimeout(() => dismissToast(t.id), t.action ? 7000 : 4500)
        return () => clearTimeout(timer)
    }, [t.id, t.type, t.action])

    return (
        <div
            role={t.type === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-panel p-3.5 shadow-lg page-enter"
        >
            <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white ${style.ring}`}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={style.path} />
                </svg>
            </span>
            <div className="min-w-0 flex-1 text-sm">
                <p className="font-bold text-text">{t.title}</p>
                {t.body && <p className="mt-0.5 text-sub">{t.body}</p>}
                {t.action && (
                    <button
                        type="button"
                        onClick={() => { dismissToast(t.id); t.action.onClick() }}
                        className="mt-1.5 rounded text-sm font-bold text-text underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {t.action.label}
                    </button>
                )}
            </div>
            <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Close message"
                className="-m-1 rounded-lg p-1.5 text-dim hover:bg-field hover:text-text focus-visible:outline-2"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    )
}

const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }
const snapshot = () => toasts

export default function FeedbackToaster() {
    const list = useSyncExternalStore(subscribe, snapshot)

    // Phones: under the top bar, clear of the bottom nav and punch bar. Desktop: bottom-right.
    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed inset-x-3 top-16 z-[60] flex flex-col gap-2 md:inset-x-auto md:top-auto md:bottom-5 md:right-5 md:w-96"
        >
            {list.map(t => <Toast key={t.id} t={t} />)}
        </div>
    )
}
