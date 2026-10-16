export function dtrPage(portal, month = '2026-10', id = 1, missingToday = false) {
    const today = '2026-10-16'
    const employee = { id, full_name: 'Attendance QA', employee_id: 'QA-0001', initials: 'QA', role: portal === 'admin' ? 'super_admin' : 'employee', can_correct_dtr: true }
    const logs = Array.from({ length: new Date(`${month}-01T00:00:00Z`).getUTCMonth() === 9 ? 31 : 30 }, (_, index) => {
        const date = `${month}-${String(index + 1).padStart(2, '0')}`
        return { date, date_label: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-PH', { timeZone: 'UTC', month: 'short', day: '2-digit', weekday: 'short' }), week: `${month}-${String(Math.floor(index / 7) * 7 + 1).padStart(2, '0')}`, status: 'on_time', has_entry: true, id: index + 1, hours_rendered: 8 }
    }).filter(log => !missingToday || log.date !== today)
    return {
        component: portal === 'admin' ? 'Admin/DtrShow' : 'Employee/Dtr',
        props: { auth: { employee }, flash: {}, errors: {}, employee, month, today_date: today, today: { date: today }, logs, summary: {}, weeklyStrip: [] },
        url: `/tests/fixtures/dtr-today.html?portal=${portal}`,
        version: 'dtr-today-test',
    }
}
