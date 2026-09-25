import pmpcLogo from '@images/pmpc_ems.png'

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
            className={`admin-page-header relative overflow-hidden rounded-2xl bg-[#26215C] text-white border border-[#201B4D] p-5 sm:p-6 select-none shadow-lg transition-colors ${className}`}
            style={{
                backgroundImage: 'radial-gradient(ellipse 90% 70% at 20% 20%, rgba(64, 56, 120, 0.45), transparent 75%), radial-gradient(ellipse 70% 60% at 85% 85%, rgba(19, 16, 47, 0.65), transparent)'
            }}
        >
            {/* Background swiss-grid & watermark emblem */}
            <div className="absolute inset-0 opacity-[0.08] swiss-grid pointer-events-none" aria-hidden="true" />
            <div
                className="absolute right-[-10%] sm:right-[-4%] top-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] pointer-events-none select-none opacity-[0.08] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_80%)]"
                aria-hidden="true"
            >
                <img
                    src={pmpcLogo}
                    alt=""
                    className="w-full h-full object-contain filter grayscale brightness-200 contrast-125"
                    onError={(e) => {
                        if (e.currentTarget.src !== window.location.origin + '/pmpc_ems.png') {
                            e.currentTarget.src = '/pmpc_ems.png'
                        }
                    }}
                />
            </div>

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    {leading && <div className="shrink-0">{leading}</div>}
                    <div className="min-w-0">
                        {eyebrow && (
                            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-300">
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
                            <p className="mt-1.5 max-w-3xl text-xs sm:text-sm leading-relaxed text-indigo-100/85">
                                {description}
                            </p>
                        )}
                        {meta && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-indigo-100/80">
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

