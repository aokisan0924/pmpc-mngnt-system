import { useMemo, useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import Card, { CardHeader, CardTitle, CardContent } from '@/Components/UI/Card'
import StatCard from '@/Components/UI/StatCard'
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
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 page-enter">
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
                        <p className="text-xs sm:text-sm text-sub mt-0.5">
                            Manage staff profiles, departmental assignments, and compensation profiles.
                        </p>
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

                {/* ── Metric Summary Tiles ─────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                        title="Total Roster"
                        value={counts.all}
                        subtitle="Registered employee records"
                        accent="indigo"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Active Staff"
                        value={counts.active}
                        subtitle="Eligible for DTR & payroll"
                        accent="emerald"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Inactive / On Leave"
                        value={counts.inactive}
                        subtitle="Archived or suspended records"
                        accent={counts.inactive > 0 ? 'amber' : 'slate'}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        }
                    />
                </div>

                {/* ── Filters & Search Toolbar ──────────────────────── */}
                <Card>
                    <CardHeader className="flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <div className="flex items-center gap-1 bg-field p-1 rounded-lg border border-border/70 self-start">
                            {[
                                { key: 'active', label: 'Active' },
                                { key: 'inactive', label: 'Inactive' },
                                { key: 'all', label: 'All Staff' },
                            ].map(tab => (
                                <button
                                    key={tab.key}
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
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-text"
                                >
                                    ✕
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
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
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