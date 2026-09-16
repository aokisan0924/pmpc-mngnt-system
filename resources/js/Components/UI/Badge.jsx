const variantMap = {
    // Attendance
    on_time: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    late: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    undertime: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    half_day: 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    absent: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    leave: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',

    // Workflow & Approvals
    pending: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    declined: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    draft: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    finalized: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',

    // Employment
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    inactive: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    resigned: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',

    // Standard Palette
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
}

const dotColorMap = {
    on_time: 'bg-emerald-500',
    late: 'bg-amber-500',
    undertime: 'bg-amber-500',
    half_day: 'bg-sky-500',
    absent: 'bg-rose-500',
    leave: 'bg-indigo-500',
    pending: 'bg-amber-500',
    approved: 'bg-emerald-500',
    declined: 'bg-rose-500',
    draft: 'bg-slate-400',
    finalized: 'bg-indigo-500',
    active: 'bg-emerald-500',
    inactive: 'bg-slate-400',
    resigned: 'bg-rose-500',
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    slate: 'bg-slate-400',
}

export function Badge({
    children,
    variant = 'slate',
    dot = false,
    pulse = false,
    size = 'md',
    className = '',
    ...props
}) {
    const variantStyle = variantMap[variant] || variantMap.slate
    const dotColor = dotColorMap[variant] || 'bg-current'

    const sizeClasses = {
        sm: 'text-[11px] px-2 py-0.5 font-medium',
        md: 'text-xs px-2.5 py-0.75 font-medium',
        lg: 'text-xs px-3 py-1 font-semibold',
    }[size] || 'text-xs px-2.5 py-0.75 font-medium'

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border leading-none tracking-normal select-none ${sizeClasses} ${variantStyle} ${className}`}
            {...props}
        >
            {dot && (
                <span className="relative flex h-1.5 w-1.5">
                    {pulse && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`} />
                    )}
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`} />
                </span>
            )}
            {children}
        </span>
    )
}

export default Badge
