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
        <section
            className={`employee-page-header relative overflow-hidden rounded-2xl bg-[#0F6E56] text-white border border-[#0D5C48] p-5 sm:p-6 select-none shadow-lg transition-colors ${className}`}
            style={{
                backgroundImage: 'radial-gradient(ellipse 90% 70% at 20% 20%, rgba(20, 138, 108, 0.45), transparent 75%), radial-gradient(ellipse 70% 60% at 85% 85%, rgba(6, 46, 36, 0.65), transparent)'
            }}
        >
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    {leading && <div className="shrink-0">{leading}</div>}
                    <div className="min-w-0">
                        {eyebrow && (
                            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                                {eyebrow}
                            </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2.5">
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                {title}
                            </h1>
                            {badge && (
                                <span className="inline-flex items-center rounded-full border border-white/20 bg-black/20 px-2.5 py-0.5 text-[11px] font-semibold text-white tracking-normal shadow-2xs backdrop-blur-xs">
                                    {badge}
                                </span>
                            )}
                        </div>
                        {description && (
                            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-emerald-100/85">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {action && <div className="relative z-10 shrink-0 flex items-center gap-2">{action}</div>}
            </div>
        </section>
    )
}
