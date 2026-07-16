import { useEffect } from 'react'

export default function ConfirmModal({
    open,
    title,
    message,
    confirmLabel  = 'Confirm',
    cancelLabel   = 'Cancel',
    confirmStyle  = 'danger',
    onConfirm,
    onCancel,
    processing    = false,
}) {
    // Close on Escape key
    useEffect(() => {
        if (! open) return
        const handler = (e) => { if (e.key === 'Escape') onCancel() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onCancel])

    if (! open) return null

    const btnStyles = {
        danger:  'bg-red-600 hover:bg-red-700 text-white',
        primary: 'text-white',
        emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    }

    const icons = {
        danger:  { bg: 'bg-red-100',     icon: '⚠', color: 'text-red-600'     },
        primary: { bg: 'bg-purple-100',   icon: '✓', color: 'text-purple-600'  },
        emerald: { bg: 'bg-emerald-100',  icon: '✓', color: 'text-emerald-600' },
    }

    const ic = icons[confirmStyle] ?? icons.danger

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog" aria-modal="true" aria-labelledby="modal-title">

            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onCancel} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-6
                            transform transition-all animate-in"
                style={{ animation: 'modalIn .18s ease-out both' }}>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-full ${ic.bg} flex items-center justify-center mx-auto mb-4`}>
                    <span className={`text-xl ${ic.color}`}>{ic.icon}</span>
                </div>

                {/* Content */}
                <h2 id="modal-title"
                    className="text-base font-semibold text-gray-900 text-center mb-2">
                    {title}
                </h2>
                <p className="text-sm text-gray-500 text-center leading-relaxed mb-6">
                    {message}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button onClick={onCancel}
                        disabled={processing}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700
                                bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors
                                disabled:opacity-50">
                        {cancelLabel}
                    </button>
                    <button onClick={onConfirm}
                        disabled={processing}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl
                                    transition-colors disabled:opacity-50 ${btnStyles[confirmStyle]}`}
                        style={confirmStyle === 'primary' ? { background: '#26215C' } : {}}>
                        {processing ? 'Processing…' : confirmLabel}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(.95) translateY(8px); }
                    to   { opacity: 1; transform: scale(1)  translateY(0);    }
                }
            `}</style>
        </div>
    )
}