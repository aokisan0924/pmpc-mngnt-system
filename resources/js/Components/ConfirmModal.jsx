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
        danger:  { bg: 'bg-red-100',     type: 'warning', color: 'text-red-600'     },
        primary: { bg: 'bg-purple-100',  type: 'check',   color: 'text-purple-600'  },
        emerald: { bg: 'bg-emerald-100', type: 'check',   color: 'text-emerald-600' },
    }

    const ic = icons[confirmStyle] ?? icons.danger

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog" aria-modal="true" aria-labelledby="modal-title">

            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onCancel} />

            {/* Modal */}
            <div className="relative bg-panel border border-border shadow-2xl w-full max-w-sm mx-auto p-6
                            transform transition-all animate-in"
                style={{ animation: 'modalIn .18s ease-out both' }}>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-full ${ic.bg} flex items-center justify-center mx-auto mb-4`}>
                    {ic.type === 'warning' ? (
                        <svg className={`h-6 w-6 ${ic.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.949 3.374H4.646c-1.732 0-2.815-1.874-1.949-3.374L10.05 3.374c.866-1.5 3.034-1.5 3.9 0l7.353 12.752zM12 15.75h.008v.008H12v-.008z" />
                        </svg>
                    ) : (
                        <svg className={`h-6 w-6 ${ic.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    )}
                </div>

                {/* Content */}
                <h2 id="modal-title"
                    className="text-base font-semibold text-text text-center mb-2">
                    {title}
                </h2>
                <p className="text-sm text-sub text-center leading-relaxed mb-6">
                    {message}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button onClick={onCancel}
                        disabled={processing}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-sub
                                bg-field hover:text-text border border-border transition-colors
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
