import { useEffect } from 'react'

const TYPE_STYLES = {
    dtr_edit_approved: { icon: '✓', bg: '#0F6E56' },
    dtr_edit_declined: { icon: '✕', bg: '#EF4444' },
    default:           { icon: 'ℹ', bg: '#26215C' },
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
        <div className="flex items-start gap-3 bg-white rounded-xl border border-gray-200 shadow-lg p-4 animate-in"
            style={{ '--tw-animate-from': 'translateY(16px)', '--tw-animate-opacity': '0' }}>

            {/* Icon */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: style.bg }}>
                {style.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                {n.link && (
                    <a href={n.link}
                        onClick={() => onDismiss(n.id)}
                        className="text-xs font-medium mt-1 inline-block"
                        style={{ color: '#0F6E56' }}>
                        View →
                    </a>
                )}
            </div>

            {/* Close */}
            <button onClick={() => onDismiss(n.id)}
                className="text-gray-300 hover:text-gray-500 text-lg leading-none flex-shrink-0">
                ×
            </button>
        </div>
    )
}