import { Link, usePage } from '@inertiajs/react'

export default function AccountSetupNotice() {
    const { auth } = usePage().props
    const employee = auth?.employee
    if ((!employee?.needs_account_setup && !employee?.needs_signature) || window.location.pathname === '/employee/setup') return null
    const message = employee.needs_account_setup
        ? (employee.account_setup_pending ? 'Your account setup is awaiting HR verification.' : 'Confirm your details, office and signature to complete account setup.')
        : 'Upload a picture of your signature. It is required for payroll records.'
    const action = employee.needs_account_setup && employee.account_setup_pending && !employee.needs_signature ? 'View setup status' : employee.needs_account_setup ? 'Complete setup' : 'Upload signature'
    return <div role="status" className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p>{message} Attendance remains available.</p>
        <Link href="/employee/setup" className="inline-flex min-h-[44px] items-center font-semibold underline">{action}</Link>
    </div>
}
