# Admin screens: compact header, consistent layout and text cleanup (design)

Date: 2026-11-04. Status: awaiting approval. Size: medium-large frontend change. Follows `2026-11-04-employee-ui-cleanup-design.md`
(same approach, already approved and live for employees).

## Intent
Admins use these screens for HR, attendance and payroll all day. Today every page opens with the same tall indigo banner carrying an
eyebrow label, a description and often a decorative chip, page widths change from screen to screen, and lists show everything in the same
grey so the important figure is hard to find. Make admin screens lead with what needs attention, look consistent, and carry no filler.

## Goals
- **Compact indigo header** (same pattern as the employee screens): title, at most one chip that carries real information, and the page's main action.
- **Same six cleanup rules** as the employee round (no eyebrow or description in headers, a number once per screen, metric sub-text only if it adds
  information, no filler section text, short status text plus colour, one-line empty states).
- **Real chips only:** keep chips that show a count, period or status ("4 active staff", "3 pending review", "1st cutoff", "Finalized").
  Remove decorative ones ("Attendance ledger", "Executive view", "Admin configuration", "ZIP and PDF", "PD 851").
- **Two standard page widths** instead of today's mix of 4xl/5xl/6xl/unbounded: wide for lists, tables and dashboards; narrow for forms and
  settings.
- **Findability in lists:** the key figure (net pay, days present, status) is visually primary; secondary text is readable (not tiny and pale);
  buttons are never cut off mid-word (for example "View Profile" on Employees).
- **Order by what needs me:** pending items first (DTR edit requests, account setups, draft payroll), then the main list, then history.
- **Fix the washed-out Payroll header** seen on the Payroll page, so it matches the others.
- **Login and password pages:** contrast only (placeholder text, and the Sign in button should not look disabled).

## Non-goals
- No change to payroll calculations, exports (Excel/PDF), DTR rules, URLs, roles, or what data a page shows.
- No new fonts, libraries or dark theme. Employee screens are not touched again.
- The admin sidebar groups stay as they are.

## Anti-goals
- Do not hide figures admins rely on to check pay (gross, deductions, net, periods, signatories).
- Do not shrink touch targets below 44px, drop visible focus, or lower contrast.
- Do not break table layouts used for printing or exports.

## Approaches considered
A. Slim title bar, no banner. B. **Compact indigo header (same as employees).** C. Title row plus a figures strip on selected pages.
Choosing B keeps admin and employee screens a matched pair (green and indigo) and is the least change; a figures strip may be used on a page only
where one number clearly matters (Payroll batches, Employees).

## Design
- Change `AdminPageHeader.jsx` once (compact single row; `eyebrow` and `description` no longer rendered; keep `leading`, `meta`, `action`).
- Add one shared shell rule for page width (wide and narrow) and use it everywhere instead of per-page `max-w-*` classes.
- Go page by page in three groups, against the rules:
  1. People and attendance: Employees, Employee record, Attendance records, an employee's attendance, DTR edit requests, Account setups, Team tasks.
  2. Compensation: Payroll batches, Payroll input, Saved payroll batch, Payroll analytics, 13th month (3 pages), DTR archives.
  3. Operations dashboard, Settings, then login and password contrast.
- Pages that put data in the header description today (an employee's ID and department, a payroll period) move that data into the single chip.

## Verification
Before/after screenshots of every admin screen at desktop (1440px) and phone (390px) width, `npm run build`, the full test suite, and a check
that payroll and DTR exports are unchanged. Deploy once, after you have seen the screenshots.

## Calls made (change any of these)
- Payroll create keeps one short instruction line near its employee list because it explains where attendance comes from; the long header sentence goes.
- The dashboard hero is trimmed, not replaced; the admin's own punch station stays where it is.
- I will do all groups before deploying, not one deploy per group.
