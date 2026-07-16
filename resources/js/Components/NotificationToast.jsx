import { useEffect } from 'react'

const C = {
    panel: 'var(--color-panel)', border: 'var(--color-border)', text: 'var(--color-text)',
    sub: 'var(--color-sub)', dim: 'var(--color-dim)',
    teal: 'var(--color-teal)', red: 'var(--color-red)', violet: 'var(--color-violet)',
}

const TYPE_STYLES = {
    dtr_edit_approved: { icon: '✓', color: C.teal },
    dtr_edit_declined: { icon: '✕', color: C.red },
    default:           { icon: 'ℹ', color: C.violet },
}

export default function NotificationToast({ notifications, onDismiss }) {
    if (! notifications || notifications.length === 0) return null

    return (
        <div className="fixed bottom-20 md:bottom-5 right-3 md:right-5 left-3 md:left-auto z-50 flex flex-col gap-2 max-w-sm w-auto md:w-full">
            {notifications.map(n => {
                const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.default

                return (
                    <Toast
                        key={n.id}
                        notification={n}
                        style={style}
                        onDismiss={onDismiss}
                    />
                )
            })}
        </div>
    )
}

function Toast({ notification: n, style, onDismiss }) {
    // Auto-dismiss after 6 seconds
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(n.id), 6000)
        return () => clearTimeout(timer)
    }, [n.id])

    return (
        <div className="flex items-start gap-3 rounded-xl border backdrop-blur-xl shadow-lg p-4 animate-in"
            style={{ background: C.panel, borderColor: C.border }}>

            {/* Icon */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: `color-mix(in srgb, ${style.color} 15%, transparent)`, color: style.color }}>
                {style.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: C.text }}>{n.title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: C.sub }}>{n.message}</p>
                {n.link && (
                    <a href={n.link}
                        onClick={() => onDismiss(n.id)}
                        className="text-xs font-medium mt-1 inline-block"
                        style={{ color: C.teal }}>
                        View →
                    </a>
                )}
            </div>

            {/* Close */}
            <button onClick={() => onDismiss(n.id)}
                className="text-lg leading-none flex-shrink-0 transition-colors"
                style={{ color: C.dim }}
                onMouseEnter={e => e.currentTarget.style.color = C.sub}
                onMouseLeave={e => e.currentTarget.style.color = C.dim}>
                ×
            </button>
        </div>
    )
}