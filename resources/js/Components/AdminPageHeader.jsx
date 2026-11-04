// Compact page header: title, at most one chip that carries real information (a count, period or status),
// and the page's main action. The sidebar and breadcrumb already name the page, so there is no eyebrow or description.
export default function AdminPageHeader({
    title,
    badge,
    leading,
    action,
    meta,
    className = '',
}) {
    return (
        <section
            className={`admin-page-header relative overflow-hidden rounded-2xl bg-[#26215C] text-white border border-[#201B4D] px-4 py-3 sm:px-5 sm:py-3.5 select-none shadow-md transition-colors ${className}`}
            style={{
                backgroundImage: 'radial-gradient(ellipse 90% 70% at 20% 20%, rgba(64, 56, 120, 0.45), transparent 75%), radial-gradient(ellipse 70% 60% at 85% 85%, rgba(19, 16, 47, 0.65), transparent)'
            }}
        >
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 items-center gap-3">
                    {leading && <div className="shrink-0">{leading}</div>}
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <h1 className="font-heading text-xl font-bold tracking-tight text-white sm:text-2xl">
                            {title}
                        </h1>
                        {badge && (
                            <span className="inline-flex items-center rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs font-semibold text-white tracking-normal">
                                {badge}
                            </span>
                        )}
                        {meta && (
                            <div className="flex flex-wrap items-center gap-3 text-sm text-indigo-100/90">
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
