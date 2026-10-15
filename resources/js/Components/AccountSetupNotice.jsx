import { Link, usePage } from '@inertiajs/react'

export default function AccountSetupNotice() {
    const { auth } = usePage().props
    const employee = auth?.employee
    if (!employee?.needs_account_setup || window.location.pathname === '/employee/setup') return null
    return <div role="status" className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p>{employee.account_setup_pending ? 'Your account setup is awaiting HR verification.' : 'Confirm your details and office to complete account setup.'} Attendance remains available.</p>
        <Link href="/employee/setup" className="inline-flex min-h-[44px] items-center font-semibold underline">{employee.account_setup_pending ? 'View setup status' : 'Complete setup'}</Link>
    </div>
}
