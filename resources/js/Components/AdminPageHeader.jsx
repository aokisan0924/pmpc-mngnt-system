export default function AdminPageHeader({
    eyebrow,
    title,
    description,
    badge,
    leading,
    action,
    meta,
    className = '',
}) {
    return (
        <section className={`admin-page-header relative overflow-hidden rounded-2xl px-5 py-5 text-white sm:px-6 sm:py-6 ${className}`}>
            <div className="admin-page-header-grid pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/15" aria-hidden="true" />
            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    {leading && <div className="shrink-0">{leading}</div>}
                    <div className="min-w-0">
                        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200">{eyebrow}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2.5">
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
                            {badge && (
                                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-50">
                                    {badge}
                                </span>
                            )}
                        </div>
                        {description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-indigo-100/85">{description}</p>}
                        {meta && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-indigo-100/80">{meta}</div>}
                    </div>
                </div>
                {action && <div className="admin-page-actions relative z-10 flex shrink-0 flex-wrap items-center gap-2.5">{action}</div>}
            </div>
        </section>
    )
}
