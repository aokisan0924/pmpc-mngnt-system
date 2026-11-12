// Empty list block: what would be here, why it is empty, and at most one next step.
export default function EmptyState({ title, body, action, className = '' }) {
    return (
        <div className={`px-5 py-10 text-center ${className}`}>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-field text-sub" aria-hidden="true">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
            </div>
            <p className="font-heading text-sm font-bold text-text">{title}</p>
            {body && <p className="mx-auto mt-1 max-w-[45ch] text-sm text-sub">{body}</p>}
            {action && <div className="mt-4 flex justify-center">{action}</div>}
        </div>
    )
}
