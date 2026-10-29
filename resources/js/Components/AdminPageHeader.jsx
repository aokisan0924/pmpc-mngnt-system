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
        <section
            className={`admin-page-header relative overflow-hidden rounded-2xl bg-[#26215C] text-white border border-[#201B4D] p-6 sm:p-7 select-none shadow-lg transition-colors ${className}`}
            style={{
                backgroundImage: 'radial-gradient(ellipse 90% 70% at 20% 20%, rgba(64, 56, 120, 0.45), transparent 75%), radial-gradient(ellipse 70% 60% at 85% 85%, rgba(19, 16, 47, 0.65), transparent)'
            }}
        >
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    {leading && <div className="shrink-0">{leading}</div>}
                    <div className="min-w-0">
                        {eyebrow && (
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-200">
                                {eyebrow}
                            </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                {title}
                            </h1>
                            {badge && (
                                <span className="inline-flex items-center rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs font-semibold text-white tracking-normal shadow-2xs backdrop-blur-xs">
                                    {badge}
                                </span>
                            )}
                        </div>
                        {description && (
                            <p className="mt-2 max-w-3xl text-sm sm:text-base leading-relaxed text-indigo-100/90">
                                {description}
                            </p>
                        )}
                        {meta && (
                            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-indigo-100/90">
                                {meta}
                            </div>
                        )}
                    </div>
                </div>
                {action && (
                    <div className="admin-page-actions relative z-10 flex shrink-0 flex-wrap items-center gap-2.5">
                        {action}
                    </div>
                )}
            </div>
        </section>
    )
}

