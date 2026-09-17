import { useMemo, useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import Badge from '@/Components/UI/Badge'
import Button from '@/Components/UI/Button'
import EmployeeFormModal from '@/Components/EmployeeFormModal'

export default function Employees({ employees = [] }) {
    const { flash } = usePage().props
    const [search, setSearch] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [filter, setFilter] = useState('active')

    const counts = useMemo(() => ({
        active: employees.filter(e => e.status === 'active').length,
        inactive: employees.filter(e => e.status === 'inactive').length,
        all: employees.length,
    }), [employees])

    const filtered = employees
        .filter(e => (filter === 'all' ? true : e.status === filter))
        .filter(e => {
            const q = search.trim().toLowerCase()
            if (!q) return true
            return (
                e.full_name?.toLowerCase().includes(q) ||
                e.employee_id?.toLowerCase().includes(q) ||
                e.department?.toLowerCase().includes(q) ||
                e.position?.toLowerCase().includes(q)
            )
        })

    return (
        <AdminLayout>
            <div className="mx-auto max-w-7xl space-y-4 px-3.5 py-3.5 sm:space-y-5 sm:px-5 sm:py-4 lg:px-6 page-enter">
                {flash?.success && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        {flash.success}
                    </div>
                )}

                {/* ── Header ────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="indigo" dot>Workforce Directory</Badge>
                            <span className="text-xs text-sub">• {counts.active} active cooperative staff</span>
                        </div>
                        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text tracking-tight">
                            Employee Management
                        </h1>
                    </div>

                    <Button
                        variant="primary"
                        onClick={() => setShowForm(true)}
                        icon={
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        }
                    >
                        New Employee
                    </Button>
                </div>

                {/* ── Filters & Search Toolbar ──────────────────────── */}
                <Card>
                    <CardHeader className="flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <div
                            role="tablist"
                            aria-label="Filter employees by status"
                            className="flex items-center gap-1 bg-field p-1 rounded-lg border border-border/70 self-start"
                        >
                            {[
                                { key: 'active', label: 'Active' },
                                { key: 'inactive', label: 'Inactive' },
                                { key: 'all', label: 'All Staff' },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={filter === tab.key}
                                    onClick={() => setFilter(tab.key)}
                                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                                        filter === tab.key
                                            ? 'bg-panel text-text shadow-2xs font-semibold'
                                            : 'text-sub hover:text-text'
                                    }`}
                                >
                                    {tab.label} ({counts[tab.key]})
                                </button>
                            ))}
                        </div>

                        <div className="relative flex-1 max-w-md">
                            <svg
                                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dim"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search employees by name, ID, or department…"
                                className="w-full pl-9 pr-9 py-2 text-xs border border-border rounded-lg bg-panel text-text placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-dim transition-colors hover:bg-hover hover:text-text"
                                    aria-label="Clear employee search"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-xs min-w-[760px]">
                                <thead>
                                    <tr className="bg-field/70 border-b border-border/80 text-sub uppercase text-[11px]">
                                        <th className="text-left px-5 py-3 font-semibold">Employee</th>
                                        <th className="text-left px-4 py-3 font-semibold">ID</th>
                                        <th className="text-left px-4 py-3 font-semibold">Department</th>
                                        <th className="text-left px-4 py-3 font-semibold">Position</th>
                                        <th className="text-left px-4 py-3 font-semibold">Date Hired</th>
                                        <th className="text-center px-4 py-3 font-semibold">Status</th>
                                        <th className="text-right px-5 py-3 font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {filtered.map(emp => (
                                        <tr key={emp.id} className="hover:bg-field/40 transition-colors group">
                                            <td className="px-5 py-3.5">
                                                <Link href={`/admin/employees/${emp.id}`} className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center font-heading font-semibold text-xs flex-shrink-0">
                                                        {emp.initials}
                                                    </div>
                                                    <span className="font-semibold text-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {emp.full_name}
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-sub tnum">{emp.employee_id}</td>
                                            <td className="px-4 py-3.5 text-text font-medium">{emp.department ?? '—'}</td>
                                            <td className="px-4 py-3.5 text-sub">{emp.position ?? '—'}</td>
                                            <td className="px-4 py-3.5 text-dim tnum">{emp.date_hired ?? '—'}</td>
                                            <td className="px-4 py-3.5 text-center">
                                                <Badge variant={emp.status} size="sm" dot>
                                                    {emp.status}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <Link
                                                    href={`/admin/employees/${emp.id}`}
                                                    className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 shadow-2xs transition-colors hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-indigo-800/70 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                                                >
                                                    View Profile →
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}

                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-sub">
                                                No employees found matching the filter or search criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="md:hidden divide-y divide-border/60">
                            {filtered.map(emp => (
                                <Link
                                    key={emp.id}
                                    href={`/admin/employees/${emp.id}`}
                                    className="p-4 flex items-center justify-between gap-3 hover:bg-field/40 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-heading font-semibold text-xs flex-shrink-0">
                                            {emp.initials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-text truncate">{emp.full_name}</p>
                                            <p className="text-[11px] text-sub truncate">{emp.employee_id} • {emp.department ?? 'No Dept'}</p>
                                        </div>
                                    </div>
                                    <Badge variant={emp.status} size="sm">
                                        {emp.status}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {showForm && (
                <EmployeeFormModal onClose={() => setShowForm(false)} />
            )}
        </AdminLayout>
    )
}
