// Compact page header: title, at most one status chip, and the page's main action.
// The sidebar and breadcrumb already name the page, so there is no eyebrow or description.
export default function EmployeePageHeader({
    title,
    badge,
    leading,
    action,
    className = '',
}) {
    return (
        <section
            className={`employee-page-header relative overflow-hidden rounded-2xl bg-[#0F6E56] text-white border border-[#0D5C48] px-4 py-3 sm:px-5 sm:py-3.5 select-none shadow-md transition-colors ${className}`}
            style={{
                backgroundImage: 'radial-gradient(ellipse 90% 70% at 20% 20%, rgba(20, 138, 108, 0.45), transparent 75%), radial-gradient(ellipse 70% 60% at 85% 85%, rgba(6, 46, 36, 0.65), transparent)'
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
                    </div>
                </div>
                {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
            </div>
        </section>
    )
}
