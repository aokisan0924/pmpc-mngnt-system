import { useMemo, useState } from 'react'
import { router, useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import AdminPageHeader from '@/Components/AdminPageHeader'
import Button from '@/Components/UI/Button'
import { calculateHoursItem } from './officePayrollMath'
import StepCutoff from '@/Components/PayrollWizard/StepCutoff'
import StepDtrCheck from '@/Components/PayrollWizard/StepDtrCheck'
import StepEntries from '@/Components/PayrollWizard/StepEntries'
import StepConfirm from '@/Components/PayrollWizard/StepConfirm'

const STEPS = ['Cutoff', 'DTR check', 'OT & allowances', 'Confirm']
const TYPED = ['weekday_ot_hours', 'weekend_ot_hours', 'holiday_pay', 'cutoff_transpo', 'cutoff_rep', 'cutoff_quarterly', 'deductions', 'day_resolutions']

// Apply HR's choice for a problem day on screen; the server repeats this on save.
function withResolutions(days, resolutions) {
    return days.map((day) => {
        const choice = resolutions?.[day.date]
        if (choice?.type === 'hours') return { ...day, worked_hours: Math.min(Number(choice.hours) || 0, day.shift_hours), source: 'typed' }
        if (choice?.type === 'zero') return { ...day, worked_hours: 0, source: 'zero' }
        return day
    })
}

export default function PayrollWizard(props) {
    const { employees, is_first } = props
    const [step, setStep] = useState(1)
    const [changed, setChanged] = useState([])
    const form = useForm({
        month: props.month,
        cutoff: props.cutoff,
        period_from: props.period_from,
        period_to: props.period_to,
        finalize: false,
        mock: !!props.mock,
        items: employees.map((employee) => ({
            employee_id: employee.id,
            ...Object.fromEntries(TYPED.map((key) => [key, key === 'day_resolutions' ? { ...employee.day_resolutions } : employee[key]])),
        })),
    })
    const typedFor = (id) => form.data.items.find((item) => item.employee_id === id)
    const rows = useMemo(
        () => employees.map((employee) => {
            const typed = typedFor(employee.id) ?? {}
            return calculateHoursItem({ ...employee, ...typed, days: withResolutions(employee.days, typed.day_resolutions) }, is_first)
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [employees, form.data.items, is_first],
    )
    const problems = employees.flatMap((employee) => employee.days
        .filter((day) => ['unresolved', 'typed', 'zero'].includes(day.source))
        .map((day) => ({ employee, day })))
    const pending = problems.filter(({ employee, day }) => !typedFor(employee.id)?.day_resolutions?.[day.date] && day.source === 'unresolved')

    function setTyped(id, key, value) {
        form.setData('items', form.data.items.map((item) => (item.employee_id === id ? { ...item, [key]: value } : item)))
    }
    function refreshDtr(onDone) {
        const before = Object.fromEntries(employees.map((employee) => [employee.id, JSON.stringify(employee.days)]))
        router.reload({
            only: ['employees', 'cutoff_open', 'counted_through'],
            onSuccess: (page) => {
                const names = page.props.employees.filter((employee) => before[employee.id] !== JSON.stringify(employee.days)).map((employee) => employee.full_name)
                onDone?.(names)
            },
        })
    }
    function go(next) {
        if (next === 4) refreshDtr(setChanged)
        setStep(next)
        window.scrollTo({ top: 0 })
    }
    const [mockup, setMockup] = useState({ busy: false, error: '' })
    // Runs the real save and export on the server, then throws the batch away: nothing is kept.
    async function downloadMockup() {
        setMockup({ busy: true, error: '' })
        form.clearErrors()
        try {
            const token = decodeURIComponent(document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '')
            const response = await fetch('/admin/payroll/mockup-export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': token },
                body: JSON.stringify({ ...form.data, finalize: false }),
            })
            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                if (body.errors) form.setError(Object.fromEntries(Object.entries(body.errors).map(([key, list]) => [key, list[0]])))
                return setMockup({ busy: false, error: body.message || 'The mockup could not be made. Try again.' })
            }
            const name = /filename="?([^"]+)"?/.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? 'MOCKUP PAYROLL.xlsx'
            const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(await response.blob()), download: name })
            link.click()
            URL.revokeObjectURL(link.href)
            setMockup({ busy: false, error: '' })
        } catch {
            setMockup({ busy: false, error: 'The mockup could not be made. Check your connection and try again.' })
        }
    }
    function save(finalize) {
        form.transform((data) => ({ ...data, finalize }))
        form.post('/admin/payroll', { preserveScroll: true, onError: () => setStep(4) })
    }

    return (
        <AdminLayout>
            <div className="admin-page-shell space-y-5 page-enter">
                <AdminPageHeader title={props.mock ? 'Payroll mockup' : 'Process payroll'} subtitle={props.period_title} />
                {props.mock && (
                    <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                        <b>Mockup — nothing is saved.</b> Days up to the end date that have not happened yet count as present (holidays stay no work, no pay). Download the mockup Excel on step 4.
                    </p>
                )}
                <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Payroll steps">
                    {STEPS.map((label, index) => {
                        const number = index + 1
                        const state = number < step ? 'done' : number === step ? 'current' : 'todo'
                        return (
                            <li
                                key={label}
                                aria-current={state === 'current' ? 'step' : undefined}
                                className={`rounded-xl px-3 py-2 text-sm font-semibold ${state === 'current' ? 'bg-[#26215C] text-white' : state === 'done' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-field text-sub'}`}
                            >
                                {number} · {label} {state === 'done' && '✓'}
                            </li>
                        )
                    })}
                </ol>

                {step === 1 && <StepCutoff {...props} />}
                {step === 2 && <StepDtrCheck problems={problems} typedFor={typedFor} setTyped={setTyped} onRefresh={() => refreshDtr()} errors={form.errors} employees={employees} />}
                {step === 3 && <StepEntries {...props} rows={rows} setTyped={setTyped} errors={form.errors} />}
                {step === 4 && <StepConfirm {...props} rows={rows} changed={changed} form={form} onSave={save} onMockup={downloadMockup} mockup={mockup} />}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <Button variant="outline" disabled={step === 1 || form.processing} onClick={() => go(step - 1)} className="min-h-[44px]">
                        ← Back
                    </Button>
                    {step < 4 && (
                        <div className="flex items-center gap-3">
                            {step === 2 && pending.length > 0 && (
                                <p className="text-sm text-sub" role="status">{pending.length} day{pending.length === 1 ? '' : 's'} still need a choice</p>
                            )}
                            <Button
                                disabled={(step === 2 && pending.length > 0) || (step === 1 && employees.some((employee) => !employee.office_verified))}
                                onClick={() => go(step + 1)}
                                className="min-h-[44px] bg-[#26215C] hover:bg-[#201B4D]"
                            >
                                Next: {STEPS[step]} →
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
