const currency = (value) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0))

export default function PayrollSummary({ gross, deductions, net, children }) {
    return (
        <section aria-label="Batch totals" className="rounded-2xl border border-border bg-panel px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1.2fr] sm:divide-x sm:divide-border">
                {[
                    ['Gross pay', gross],
                    ['Deductions', deductions],
                    ['Net payout', net],
                ].map(([label, value], index) => (
                    <div key={label} className={index ? 'sm:pl-5' : ''}>
                        <p className="text-xs font-medium text-sub">{label}</p>
                        <p
                            className={`mt-1 break-words font-heading text-xl font-bold tnum ${index === 2 ? 'text-[#26215C]' : 'text-text'}`}
                        >
                            {currency(value)}
                        </p>
                    </div>
                ))}
            </div>
            {children}
        </section>
    )
}
