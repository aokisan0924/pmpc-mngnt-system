# Employee schedule history — design

Date: 2026-10-23. Status: draft, awaiting approval.

## Why

An employee's personal shift and workdays are stored with no history:

- The shift is one `settings` row, `employee_shift_{id}`, holding a single `effective_from`. Editing it overwrites the old shift, so days before the new date fall back to the global shift, not the person's previous one. An old two-punch day is then read as a four-punch day: HR corrections, edit approvals and the In/Out table layout all use the wrong shift.
- Workdays are one column, `employees.work_days`, read for every date. Changing them turns past absences into rest days and past rest days into absences on DTR screens, PDFs, archives, absence counts and 13th-month attendance.
- A new shift always starts today. When Ricalde's two-punch shift (worked from Oct 17) was entered on Oct 21, the backdate had to be done over SSH.
- A personal shift can't be removed from the app.
- New employees can only be set up as standard and edited afterwards.

Real schedules today: most staff work 4 punches, 8–5, Monday–Friday; some work 2 punches, 12-hour shifts, weekends only.

## Goals

1. Each schedule change is kept as dated history; every date is read with the schedule in effect on that date.
2. HR picks a "Starts on" date when changing a schedule: past or future.
3. A backdated change quietly recalculates saved statuses of the affected days (no preview).
4. HR can return a person to the standard schedule.
5. The add-employee form sets the first schedule: Standard, 2 punches, or Custom.

## Non-goals

- History for the global shift settings (`shift_start`, `lunch_start`, …). Standard employees keep following the current global values.
- Changing punches automatically. Tap-through punches left from a wrong schedule stay for HR to correct.
- Changing payroll amounts. Payroll keeps its own rules; only DTR statuses are recalculated.
- Flexible schedules with no fixed hours.

## Anti-goals

- A finalized payroll's cutoff must never change. A backdated schedule must not reach into it.
- Existing employees' current behaviour must not change on deploy.

## Approaches considered

- **A. New `employee_schedules` table** — one row per change. Chosen: one mechanism for shift and workdays, checked by the database, easy to extend.
- B. Dated list inside the existing settings JSON — smaller migration, but workdays would need a second history, the JSON is unchecked, and it inherits the 1-hour settings cache.
- C. Copy the shift onto each DTR log at punch time — misses days with no log (exactly the absent vs rest-day cases) and needs rewriting on backdate. Dropped.

## Design

### Data

Table `employee_schedules`:

| column | notes |
|---|---|
| `employee_id` | FK, cascade on delete |
| `effective_from` | date; unique with `employee_id` |
| `type` | `standard`, `two_punch`, `custom` |
| `shift_start`, `shift_end` | `H:i`, null for `standard` |
| `work_days` | e.g. `1,2,3,4,5`; Monday–Friday default |
| `created_by` | employee id of the admin who saved it |
| timestamps | |

- `standard`: 4 punches, global hours, chosen workdays.
- `two_punch`: time in / time out, own hours, may end after midnight.
- `custom`: 4 punches, own hours (end after start).

The schedule for a date is the latest row with `effective_from <= date`; no row means standard, Monday–Friday.

### Migration

For every employee with an `employee_shift_{id}` setting or non-null `work_days`, create rows that reproduce today's behaviour:

- personal shift → a row at its `effective_from` with its hours and type (`two_punch` or `custom`), plus the current workdays;
- if the employee has custom workdays, an earlier `standard` row at their start date (hire date, else account creation) with those workdays, so days before the shift keep today's reading. *(Builder's call: this keeps current output identical; workdays had no history, so there is no truer value to restore.)*

Then drop `employees.work_days` and delete the `employee_shift_*` settings. Down migration restores both from the latest row.

### Lookup

One cached-per-request lookup, e.g. `EmployeeSchedule::forDate(int $employeeId, CarbonInterface $date)`, replacing:

- `Setting::employeeShiftForDate` (DtrLog, AdminDashboardController, EmployeeDashboardController, CorrectDtrRequest, EmployeeController)
- `Employee::workDaysFor` / `isWorkDay` / `hasCustomWorkDays` (DtrLog, DTR/print/archive controllers, PayrollController, ReportAbsenceRequest, EmployeeDashboardController)
- `Employee::hasTwoPunchShift` (today) — `DtrLog::twoPunchLayout` should use the logs' own dates.

### Editing (Compensation tab → its own Schedule section)

- Fields: type, hours (hidden for Standard), workdays, **Starts on** (default today).
- Starts on may be past or future, but not on or before the `period_to` of the latest finalized payroll that has an item for this employee; validation error otherwise. *(Builder's call: per employee, since payrolls are per office.)*
- Saving with the same Starts on as an existing row replaces that row; otherwise adds one.
- Shows the history list (from, type, hours, days, who) with delete for future rows.
- Choosing Standard is how a personal shift is removed.

### Backdated recalculation

When Starts on is today or earlier, in one `DB::transaction`: save the row, then run `computeHoursAndStatus()` on that employee's logs from Starts on through today, ending before the next schedule row (the same rule as `dtr:recompute-status --apply`), saving only hours and status. No preview, no notification.

### Add-employee form

`EmployeeFormModal` gets a Schedule section: Standard (default) / 2 punches / Custom, hours when needed, workdays (Mon–Fri default; quick pick "Sat–Sun"). Saved in the existing create transaction as the first row, `effective_from` = hire date, else today. `StoreEmployeeRequest` validates it with the same rules as editing.

## Testing

Feature tests:

- changing workdays or shift leaves earlier days' statuses unchanged;
- two-punch history: a past two-punch day stays two-punch after switching to standard (correction validation, layout, missing time out);
- backdated change recalculates only the affected range and is blocked inside a finalized cutoff;
- create employee with each schedule type;
- migration reproduces current statuses for existing employees (run against a copy of live data before deploy).

## Deploy

Migration + data change: back up the database, deploy per AGENTS.md §7, then compare a month of DTR statuses for every employee before and after. Log in DEPLOYMENTS.md and CHANGELOG.md (Added/Fixed).

## Left to the builder

- Model and service names, and where the recalculation lives (service class).
- UI layout of the history list, within the admin purple design.
- Caching strategy, as long as lookups don't query per day.
