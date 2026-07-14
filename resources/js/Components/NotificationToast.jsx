import { useEffect } from 'react'

const C = {
    panel: 'rgba(14,20,27,0.92)', border: '#1F2C35', text: '#E7F1EE', sub: '#83979C', dim: '#4C5C61',
    teal: '#14F1B2', red: '#FF6B81', violet: '#8B7CF6',
}

const TYPE_STYLES = {
    dtr_edit_approved: { icon: '✓', color: C.teal },
    dtr_edit_declined: { icon: '✕', color: C.red },
    default:           { icon: 'ℹ', color: C.violet },
}

export default function NotificationToast({ notifications, onDismiss }) {
    if (! notifications || notifications.length === 0) return null

    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
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
                style={{ background: `${style.color}26`, color: style.color }}>
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