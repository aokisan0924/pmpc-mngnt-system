export default function EmployeePageHeader({
    eyebrow,
    title,
    description,
    badge,
    leading,
    action,
    className = '',
}) {
    return (
        <section className={`employee-page-header relative overflow-hidden rounded-2xl px-5 py-5 text-white shadow-lg sm:px-6 sm:py-6 ${className}`}>
            <div className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full border border-white/15" aria-hidden="true" />
            <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    {leading && <div className="shrink-0">{leading}</div>}
                    <div className="min-w-0">
                        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">{eyebrow}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
                            {badge && (
                                <span className="rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-50">
                                    {badge}
                                </span>
                            )}
                        </div>
                        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-emerald-100/85">{description}</p>}
                    </div>
                </div>
                {action && <div className="relative z-10 shrink-0">{action}</div>}
            </div>
        </section>
    )
}
