import Card from './Card'

export function StatCard({
    title,
    value,
    subtitle,
    icon,
    trend,
    trendDirection = 'neutral',
    accent = 'indigo',
    progress,
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

    const progressPercent = progress !== undefined && progress !== null
        ? typeof progress === 'number'
            ? Math.min(100, Math.max(0, Math.round(progress)))
            : Math.min(100, Math.max(0, Math.round(((progress.value || 0) / (progress.max || 1)) * 100)))
        : null

    const progressBarColor = (typeof progress === 'object' && progress?.color) || {
        indigo: 'bg-indigo-500',
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500',
        sky: 'bg-sky-500',
        slate: 'bg-slate-400',
    }[accent] || 'bg-emerald-500'

    return (
        <Card
            hover={Boolean(onClick)}
            onClick={onClick}
            className={`p-5 flex flex-col justify-between ${onClick ? 'cursor-pointer' : ''} ${className}`}
            {...props}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] leading-tight text-sub min-h-7 line-clamp-2 select-none">
                        {title}
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-heading font-bold text-2xl lg:text-3xl text-text tracking-tight tnum">
                            {value}
                        </span>
                        {trend && (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full border select-none ${trendColor}`}>
                                {trendDirection === 'up' && '↑'}
                                {trendDirection === 'down' && '↓'}
                                {trend}
                            </span>
                        )}
                    </div>
                </div>
                {icon && (
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 select-none ${accentStyles}`}>
                        {icon}
                    </div>
                )}
            </div>
            {progressPercent !== null && (
                <div className="mt-3 space-y-1 select-none">
                    <div className="flex items-center justify-between text-[10px] text-sub font-medium">
                        <span className="truncate">{typeof progress === 'object' && progress?.label ? progress.label : 'Period progress'}</span>
                        <span className="font-semibold text-text tnum">{progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-field dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}
            {subtitle && (
                <div className="mt-3 pt-3 border-t border-border/60 text-xs text-sub flex items-center gap-1.5 select-none">
                    {subtitle}
                </div>
            )}
        </Card>
    )
}

export default StatCard
