# Payroll wizard: hours-based pay in four steps

Date: 2026-11-12 · Portal: Admin (`#26215C`) · Status: draft for approval

## Why

Processing a cutoff today takes too much hand work and goes wrong easily. On 2026-11-12 HR made a
Nov 1–15 draft and had to delete it, because the real cutoff ran Nov 3–13 (Nov 2 holiday, Nov 14–15
weekend). The current flow (pick dates → one wide preview table with paid days, absences, overtime,
holiday pay and late minutes per row → review dialog → draft → export / finalize) has four confirmed
pain points:

1. Cutoff dates are typed by hand, and `PayrollCutoffPeriod` only accepts exactly 1–15 or 16–EOM, so
   a Nov 3–13 cutoff cannot even be prepared.
2. Saving is rejected when any DTR value changed after the preview was opened (snapshot check in
   `PayrollController::store`); HR has to reload and start over.
3. Holiday pay is a hand-typed peso amount, even though holidays are already in the `holidays` table.
4. Two batches for the same cutoff in one month block the management Excel export.

Pay is also on the wrong basis: everyone gets a fixed 11 days per cutoff (15 for General
Merchandise) minus absences, whatever the dates. The owner wants pay to follow the hours on the DTR.

## Goals

- HR prepares a cutoff in four short steps, one per screen, with almost nothing to type.
- Pay is computed from DTR hours, not a fixed day count.
- The payroll screen and its Excel export keep the look and columns of the management payroll
  workbook HR already uses (`SEPTEMBER 2026 MANAGEMENT PAYROLL.xlsx`, same layout as
  `resources/payroll/management-template.xlsx`).

## Non-goals

- No change to statutory deduction amounts, loan/rental logic, 13th month pay, or the employee payslip
  archive beyond showing the new values.
- No automatic overtime. Overtime needs prior approval and stays hand-typed.
- No new auto-fill of DTR. Only the President keeps `auto_present_weekdays`.

## Anti-goals (failure even if it "works")

- An HR user can skip past a day with missing punches without making a choice.
- The screen or Excel stops looking like the management payroll HR knows.
- A second batch for the same month and cutoff can be created again.
- A finalized payroll can be changed.

## Pay rules (decided by the owner)

| Rule | Decision |
|---|---|
| Hours counted | Each employee's own scheduled work days across the whole half-month (1–15 or 16–EOM), so Gen Mdse staff are paid for the weekend days they work. Weekend or rest-day work by other staff is only paid as typed overtime (builder-check answer; my call). |
| Cutoff dates (label) | Working days only. 1st cutoff: first work day on/after the 1st → last work day on/before the 15th. 2nd: first work day on/after the 16th → last work day on/before month end. "Work day" skips weekends and `holidays` rows. Example: Nov 2026 1st cutoff = Tue Nov 3 – Fri Nov 13. Dates are pre-filled and stay editable within the cutoff's half of the month. |
| Basic pay | Hourly rate × paid hours. Hourly rate = `daily_rate ÷ shift hours`. |
| Shift hours | The employee's scheduled shift length: 8 for most staff, 12 for the two General Merchandise staff (Violie R. Malana 6:00–18:00, John Roy C. Sibal 18:00–06:00). Violie: ₱600 ÷ 12 = ₱50/hour. |
| Paid hours per day | DTR `hours_rendered`, capped at that day's shift hours. Hours past the shift are never paid automatically. |
| Lates / early-outs | Not paid (they are simply missing hours). No separate tardiness deduction. |
| Holidays not worked | Not paid, and not counted in DAYS OF WORK. |
| Holidays worked | Paid as normal hours; any holiday premium is typed by HR as a peso amount per employee (keeps today's `holiday_pay` field). |
| Overtime | Only approved overtime, typed by HR as hours: weekday OT at 125%, rest-day OT at 130% of the hourly rate (the rates in the September workbook). |
| Allowances | Transport, representation and quarterly allowance are typed by HR per cutoff. Boxes start at ₱0; the employee-record allowance amounts are no longer used for payroll. |
| Deductions | Unchanged: SSS, PhilHealth, Pag-IBIG and withholding tax on the 1st cutoff only; loan, capital contribution, cash advance, rental, savings and other from the employee record, split per cutoff, editable per row. |

## The four steps (approach B, layout A: one step per screen)

A step bar ("1 Cutoff · 2 DTR check · 3 OT & allowances · 4 Confirm") sits at the top of every step.

1. **Cutoff.** HR picks the month and 1st/2nd cutoff. The system shows the computed dates and what it
   skipped ("Nov 2 holiday and Nov 14–15 weekend skipped"). If a batch already exists for that month
   and cutoff, this step opens that batch instead of starting a new one.
2. **DTR check.** Lists every employee-day in the range with missing or incomplete punches (today's
   `dtr_unresolved_dates`). Each day needs one of three choices before **Next** is enabled:
   - **Fix DTR**: opens that employee's DTR for correction, then returns to this step.
   - **Type hours**: HR enters the hours and a required short note; saved on the payroll item only (the
     DTR, and therefore 13th month pay, still sees the day as missing).
   - **Count as 0 hours**: unpaid.
3. **OT & allowances.** Styled like the September workbook: office tabs (Main Office, Fort Magsaysay,
   Gen Mdse, Cubao Satellite Office); a "MANAGEMENT PAYROLL / <PERIOD>" grid with EMPLOYEE NAME,
   POSITION, DAYS OF WORK, BASIC PAY, OVERTIME PAY, ABSENT, TRANSPO ALLOW, REP ALLOW, QUART ALLOW,
   GROSS PAY, DEDUCTIONS, NET PAY; the "GOVT & OTHER DEDUCTIONS" table beside it; the overtime tables
   (NO OF HOURS / TOTAL OT PAY for 125% and 130%) below; signatories at the bottom. Bordered grid,
   bold headers, red totals. Only HR-typed cells are inputs (highlighted): allowances, OT hours, and
   loan / CC / cash advance when they differ. Mockup: `.superpowers/brainstorm/10046-1794461572/content/excel-look-v2.html`.
4. **Confirm.** Before the cutoff's last day has passed, HR can open and fill every step, but both
   save buttons stay disabled with "You can save after <last day>" (owner's choice: start early, save
   after the cutoff ends). Days that have not happened yet are not listed in step 2. Totals per office and overall. If any DTR value changed since step 2, the system
   recalculates with the latest DTR and lists who changed ("2 employees' hours changed") instead of
   rejecting. Two buttons: **Save draft**, and **Save & finalize** (asks "This can't be undone" first).

## How the Excel columns are filled (my call, shown to the owner on the mockup)

- DAYS OF WORK = scheduled work days in the range (9 for Nov 3–13 for Mon–Fri staff; 11 for the
  Gen Mdse staff who work every day).
- BASIC PAY = days of work × daily rate.
- ABSENT = (scheduled hours − paid hours) × hourly rate. Missing days, lates and early-outs all land here.
- GROSS PAY = BASIC − ABSENT + OVERTIME + allowances, which equals pay for hours actually worked.
- Example: Mariel S. Lucero, ₱600, 9 days, 2 days absent → 5,400 − 1,200 = 4,200 gross.

## Approaches considered

- **A. Update the current preview page.** Same pages, hours-based columns. Smaller (≈1–2 days) but
  keeps the wide, busy table.
- **B. New four-step wizard (chosen).** About twice the work and a second screen to retire, but the
  owner wants a simpler redesign with less friction. Chosen by the owner.
- **Rejected:** auto-dates only, keeping fixed 11/15 days. Does not give pay for hours worked.

## Constraints

- Laravel 13 / Inertia 3 / React 19 / Tailwind 4; Form Requests, thin controllers, `DB::transaction`
  for every save, `declare(strict_types=1)`, Pint, `npm run build` (AGENTS.md).
- Timezone Asia/Manila. Overnight shifts already save on the start date with `hours_rendered` correct
  (live: Sibal 17:59 → 06:03 = 12.07 h).
- Finalized payrolls stay immutable.
- The management export (`ManagementPayrollExport`) must keep producing the same workbook.
- One batch per month and cutoff must be enforced in the database, not only in the UI.

## Settled during the builder check (my calls)

- Opening an existing draft from step 1 reloads every typed value (allowances, OT, typed hours, edited
  deductions) and refreshes DTR hours; a finalized batch opens read-only.
- **Save & finalize** requires the same permission as today's Finalize action.
- Live `payrolls` is empty on 2026-11-12, so a unique (month, cutoff) constraint can be added without
  cleaning data first; the migration should still fail loudly if duplicates exist.

## Left to the builder

- How shift hours are stored or derived (from `employee_schedules` shift start/end, or a field).
- New `payroll_items` columns (paid hours, scheduled hours, typed-hours notes) and how existing
  columns (`paid_days_basis`, `absence_days`, `days_present`, tardiness fields) map or retire, keeping
  saved historical batches readable.
- Whether the old preview page is removed in the same change or after.
- How "Fix DTR" returns the user to step 2 with state kept.

## Separate from this design

- Live data fix: set rent to ₱1,250 per cutoff for Kurt Vincent Fariñas and Katherine Sevilleno
  (Cubao); the two Ferias keep ₱1,000. A data change logged in `DEPLOYMENTS.md`, not part of the build.
- Legal check for the owner's accountant: Philippine labor law usually treats hours past 8 in a day as
  overtime with a premium; the 12-hour flat rate for the Gen Mdse staff should be confirmed.

## Change after plan review (owner, 2026-11-12)

Holidays stay inside the cutoff dates (Nov 2026 1st cutoff = Nov 2–13). A holiday not worked is NWNP
(no work, no pay): it counts in DAYS OF WORK and its pay shows in ABSENT, labelled NWNP on screen.
