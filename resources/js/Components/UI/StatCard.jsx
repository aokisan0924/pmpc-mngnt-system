import Card from './Card'

export function StatCard({
    title,
    value,
    subtitle,
    icon,
    trend,
    trendDirection = 'neutral',
    accent = 'indigo',
    className = '',
    onClick,
    ...props
}) {
    const accentStyles = {
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400',
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
        rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
        sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400',
        slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    }[accent] || 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'

    const trendColor = {
        up: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60',
        down: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60',
        neutral: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    }[trendDirection]

    return (
        <Card
            hover={Boolean(onClick)}
            onClick={onClick}
            className={`p-5 flex flex-col justify-between ${onClick ? 'cursor-pointer' : ''} ${className}`}
            {...props}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] leading-tight text-sub min-h-7 line-clamp-2">
                        {title}
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-heading font-bold text-2xl lg:text-3xl text-text tracking-tight tnum">
                            {value}
                        </span>
                        {trend && (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full border ${trendColor}`}>
                                {trendDirection === 'up' && '↑'}
                                {trendDirection === 'down' && '↓'}
                                {trend}
                            </span>
                        )}
                    </div>
                </div>
                {icon && (
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accentStyles}`}>
                        {icon}
                    </div>
                )}
            </div>
            {subtitle && (
                <div className="mt-3 pt-3 border-t border-border/60 text-xs text-sub flex items-center gap-1.5">
                    {subtitle}
                </div>
            )}
        </Card>
    )
}

export default StatCard
