const STATUS_STYLES = {
    pending: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
    approved: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
    declined: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200',
}

const STATUS_LABELS = { pending: 'Edit requested', approved: 'Edit approved', declined: 'Edit declined' }

// Shows an edit request on a DTR log row: original -> edited punches and the employee's reason.
export default function DtrEditRequestNote({ request, slots }) {
    if (!request) return null

    const labelFor = (change) => slots?.find(([slot]) => slot === change.slot)?.[1] ?? change.label

    return (
        <div className={`mt-1.5 max-w-64 whitespace-normal rounded-lg border px-2.5 py-1.5 text-left font-sans text-[11px] leading-snug ${STATUS_STYLES[request.status] ?? STATUS_STYLES.pending}`}>
            <p className="font-bold">{STATUS_LABELS[request.status] ?? 'Edit requested'}</p>
            {request.changes.length > 0 && (
                <ul className="mt-1 space-y-0.5 font-mono">
                    {request.changes.map(change => (
                        <li key={change.slot}>
                            <span className="font-sans font-semibold">{labelFor(change)}:</span>{' '}
                            <span className="line-through opacity-70">{change.original ?? '--:--'}</span> → <strong>{change.requested ?? '--:--'}</strong>
                        </li>
                    ))}
                </ul>
            )}
            {request.reason && <p className="mt-1 italic">Reason: &ldquo;{request.reason}&rdquo;</p>}
            {request.admin_note && <p className="mt-1">Admin note: {request.admin_note}</p>}
            {request.submitted_at && <p className="mt-1 opacity-70">Requested {request.submitted_at}</p>}
        </div>
    )
}
