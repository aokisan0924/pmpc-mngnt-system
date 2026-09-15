export function Card({ children, className = '', hover = false, ...props }) {
    return (
        <div
            className={`bg-panel border border-border rounded-xl shadow-xs transition-all duration-200 ${
                hover ? 'hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700' : ''
            } ${className}`}
            {...props}
        >
            {children}
        </div>
    )
}

export function CardHeader({ children, className = '', ...props }) {
    return (
        <div
            className={`px-5 py-4 border-b border-border/70 flex items-center justify-between gap-4 ${className}`}
            {...props}
        >
            {children}
        </div>
    )
}

export function CardTitle({ children, className = '', ...props }) {
    return (
        <h3
            className={`font-heading font-semibold text-base text-text tracking-tight ${className}`}
            {...props}
        >
            {children}
        </h3>
    )
}

export function CardDescription({ children, className = '', ...props }) {
    return (
        <p className={`text-xs text-sub mt-0.5 ${className}`} {...props}>
            {children}
        </p>
    )
}

export function CardContent({ children, className = '', ...props }) {
    return (
        <div className={`p-5 ${className}`} {...props}>
            {children}
        </div>
    )
}

export function CardFooter({ children, className = '', ...props }) {
    return (
        <div
            className={`px-5 py-3.5 border-t border-border/70 bg-field/40 rounded-b-xl flex items-center justify-between ${className}`}
            {...props}
        >
            {children}
        </div>
    )
}

export default Card
