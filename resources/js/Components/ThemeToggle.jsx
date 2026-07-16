export default function ThemeToggle({ isDark, onToggle, className = '' }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-field text-sub transition-colors hover:text-text hover:border-brand/40 ${className}`}
        >
            {isDark ? (
                // Sun icon — click to go light
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                    <circle cx="12" cy="12" r="4" />
                    <path strokeLinecap="round" d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                </svg>
            ) : (
                // Moon icon — click to go dark
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.5 14.5A8.5 8.5 0 019.5 3.5a8.5 8.5 0 1011 11z" />
                </svg>
            )}
        </button>
    )
}