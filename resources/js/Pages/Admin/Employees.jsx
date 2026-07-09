import { useMemo, useState } from 'react'
import { usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import EmployeeFormModal from '@/Components/EmployeeFormModal'

const BRAND = '#26215C'

/* ---------- avatar color palette (deterministic by id) ---------- */
const AVATAR_COLORS = [
    { bg: '#EEF0FB', fg: '#26215C' },
    { bg: '#ECFDF5', fg: '#047857' },
    { bg: '#FFF7ED', fg: '#C2410C' },
    { bg: '#EFF6FF', fg: '#1D4ED8' },
    { bg: '#FDF2F8', fg: '#BE185D' },
    { bg: '#FEFCE8', fg: '#A16207' },
]
function avatarColor(id) {
    const n = typeof id === 'number' ? id : String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

/* ---------- icons ---------- */
const IconSearch = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
)
const IconX = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
)
const IconPlus = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" {...p}>
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
)
const IconUsers = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19c.6-3.2 3-5 5.5-5s4.9 1.8 5.5 5" strokeLinecap="round" />
        <circle cx="17" cy="8.5" r="2.4" />
        <path d="M15.5 14.2c1.9.4 3.6 1.9 4 4.3" strokeLinecap="round" />
    </svg>
)
const IconArrowRight = (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export default function Employees({ employees }) {
    const { flash }              = usePage().props
    const [search, setSearch]    = useState('')
    const [showForm, setShowForm] = useState(false)
    const [filter, setFilter]    = useState('active')

    const counts = useMemo(() => ({
        active:   employees.filter(e => e.status === 'active').length,
        inactive: employees.filter(e => e.status === 'inactive').length,
        all:      employees.length,
    }), [employees])

    const filtered = employees
        .filter(e => filter === 'all' ? true : e.status === filter)
        .filter(e => {
            const q = search.trim().toLowerCase()
            if (!q) return true
            return e.full_name.toLowerCase().includes(q) ||
                e.employee_id.toLowerCase().includes(q) ||
                e.department?.toLowerCase().includes(q)
        })

    return (
        <AdminLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">

                {flash?.success && (
                    <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                        <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        {flash.success}
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: '#EEF0FB', color: BRAND }}>
                            <IconUsers className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Employees</h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {employees.length} total &middot; {counts.active} active
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setShowForm(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm hover:shadow-md hover:brightness-110 transition-all w-full sm:w-auto"
                        style={{ background: BRAND }}>
                        <IconPlus className="w-4 h-4" /> New employee
                    </button>
                </div>

                {/* Filters + search */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                        {['active', 'inactive', 'all'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3.5 py-1.5 text-xs rounded-lg capitalize transition-all font-medium ${
                                    filter === f
                                        ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}>
                                {f} <span className="text-slate-400 font-normal">({counts[f]})</span>
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1">
                        <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, ID, or department…"
                            className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#26215C]/15 focus:border-[#26215C] bg-white transition-colors placeholder:text-slate-400" />
                        {search && (
                            <button onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                <IconX className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table — desktop */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70">
                                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-400 font-medium">Employee</th>
                                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-400 font-medium">ID</th>
                                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-400 font-medium">Department</th>
                                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-400 font-medium">Position</th>
                                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-400 font-medium">Date hired</th>
                                <th className="text-center px-4 py-3 text-[11px] uppercase tracking-wide text-slate-400 font-medium">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(emp => {
                                const av = avatarColor(emp.id)
                                return (
                                    <tr key={emp.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors group">
                                        <td className="px-4 py-3">
                                            <a href={`/admin/employees/${emp.id}`} className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                                                    style={{ background: av.bg, color: av.fg }}>
                                                    {emp.initials}
                                                </div>
                                                <span className="text-sm font-medium text-slate-800 group-hover:text-[#26215C] transition-colors">{emp.full_name}</span>
                                            </a>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-slate-500">{emp.employee_id}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{emp.department ?? '—'}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{emp.position ?? '—'}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{emp.date_hired ?? '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                                                emp.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-red-50 text-red-600'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <a href={`/admin/employees/${emp.id}`}
                                                className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:text-[#26215C] hover:bg-[#26215C]/5 transition-colors">
                                                View <IconArrowRight className="w-3.5 h-3.5" />
                                            </a>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-14">
                                        <EmptyState hasSearch={Boolean(search)} onClear={() => setSearch('')} onAdd={() => setShowForm(true)} />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Cards — mobile */}
                <div className="md:hidden space-y-2.5">
                    {filtered.map(emp => {
                        const av = avatarColor(emp.id)
                        return (
                            <a key={emp.id} href={`/admin/employees/${emp.id}`}
                                className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 active:bg-slate-50">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                                    style={{ background: av.bg, color: av.fg }}>
                                    {emp.initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{emp.full_name}</p>
                                    <p className="text-xs text-slate-400 truncate">{emp.employee_id} &middot; {emp.department ?? 'No department'}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                    emp.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                }`}>
                                    {emp.status}
                                </span>
                                <IconArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                            </a>
                        )
                    })}
                    {filtered.length === 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 py-14 px-4">
                            <EmptyState hasSearch={Boolean(search)} onClear={() => setSearch('')} onAdd={() => setShowForm(true)} />
                        </div>
                    )}
                </div>
            </div>

            {showForm && (
                <EmployeeFormModal onClose={() => setShowForm(false)} />
            )}
        </AdminLayout>
    )
}

function EmptyState({ hasSearch, onClear, onAdd }) {
    return (
        <div className="flex flex-col items-center justify-center text-center">
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3 bg-slate-50 text-slate-300">
                <IconUsers className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-600">No employees found</p>
            <p className="text-xs text-slate-400 mt-1">
                {hasSearch ? 'Try a different search term or clear your filters.' : 'Add your first employee to get started.'}
            </p>
            <div className="mt-3">
                {hasSearch ? (
                    <button onClick={onClear} className="text-xs font-medium" style={{ color: BRAND }}>Clear search</button>
                ) : (
                    <button onClick={onAdd} className="text-xs font-medium" style={{ color: BRAND }}>+ New employee</button>
                )}
            </div>
        </div>
    )
}