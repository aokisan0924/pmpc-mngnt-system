# Payroll Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-page payroll preview with a four-step wizard that pays from DTR hours, fills cutoff dates itself, and keeps the management-payroll Excel look.

**Architecture:** Server computes everything: `PayrollCutoffPeriod` picks dates and each cutoff's DTR window, `DtrPayrollAttendanceCalculator::hoursFor()` returns per-day hours capped at each person's shift length, `OfficePayrollCalculator::calculateHours()` turns that into the existing `payroll_items` money columns (so `ManagementPayrollExport` keeps working unchanged). One Inertia page (`Admin/PayrollWizard`) holds the four steps as client state; it never computes pay itself except a display mirror.

**Tech Stack:** Laravel 13, PHP 8.3, PHPUnit (sqlite in-memory), Inertia 3, React 19, Tailwind 4, Vite 8.

**Spec:** `docs/superpowers/specs/2026-11-12-payroll-wizard-design.md`

## Global Constraints

- `declare(strict_types=1);`, typed signatures, Form Requests for all validation, thin controllers, `DB::transaction` around every payroll save (AGENTS.md §2).
- Timezone `Asia/Manila`. "Today" means `today()` in that zone.
- Finalized payrolls are immutable; nothing in this plan may update or delete a `status = finalized` batch.
- Admin accent `#26215C`. Inertia `useForm`, buttons disabled while `processing`, errors next to inputs.
- Run `vendor/bin/pint`, `php artisan test`, `npm run build` before each commit that touches the matching layer; commit `public/build` (the server does not build).
- Log every change under `## [Unreleased]` in `CHANGELOG.md` before committing (Added / Changed / Fixed).
- Work happens on branch `feat/payroll-wizard` off `main`.

## Decisions this plan takes (the spec left them open)

1. **Each DTR day belongs to exactly one cutoff.** A cutoff's DTR window runs from the day after the previous cutoff's `period_to` through this cutoff's `period_to`. Example: Nov 2026 1st cutoff is labelled Nov 2–13, window Oct 31–Nov 13 (Oct 2nd cutoff ends Fri Oct 30). Gen Mdse staff are paid for every day they work and no day is counted twice; Mon–Fri staff get the same days as the label. This makes "save after the cutoff's last day" safe for everyone.
2. **A counted day** = a scheduled work day (`Employee::isWorkDay`) on or after `Employee::startDateFor`. Holidays on a work day ARE counted (owner, 2026-11-12: "still include Nov 2"); not worked = NWNP (no work, no pay), so the day's pay lands in ABSENT with `holiday: true` so the screen can label it NWNP. Days of work = count of counted days.
3. **Per-day pay** = `daily_rate × min(worked_hours, shift_hours) / shift_hours`, rounded at the total. Basic before absence = counted days × daily rate. Absence = basic before absence − Σ per-day pay.
4. **Hourly rate for OT** = `daily_rate / shift_hours` of the last counted day (8 if none). Weekday OT × 1.25, rest-day OT × 1.30.
5. **Withholding tax:** full `employees.tax_deduction` on the 1st cutoff, 0 on the 2nd (spec: "SSS, PhilHealth, Pag-IBIG and withholding tax on the 1st cutoff only"; today's code halves it per cutoff — owner to confirm at plan review).
6. **Tardiness** columns are saved as 0 for new batches; lateness is already missing hours.
7. The old `Admin/PayrollCreate` page and `paidDaysBasisFor()` are deleted in Task 6.

## Review Focus

- A schedule changes mid-cutoff (8 h → 12 h shift on Nov 9): each day uses its own shift length, not the last one.
- Employee hired mid-window: days before `date_hired` are not counted and not absent.
- A day the employee typed hours for exceeds the shift (HR types 14 for a 12 h shift): capped at shift hours, OT still separate.
- Opening the wizard for a month that already has a draft reloads typed values; a finalized batch redirects to its read-only page.
- Saving on the cutoff's last day itself (Nov 13, 18:00) is refused; Nov 14 00:00 Manila is allowed.

---

### Task 1: Cutoff dates and DTR window

**Files:**
- Modify: `app/Services/PayrollCutoffPeriod.php` (replace `matches()`/`message()`)
- Test: `tests/Unit/PayrollCutoffPeriodTest.php` (create; extends `Tests\TestCase`, `RefreshDatabase` for holidays)

**Interfaces:**
- Produces:
  - `PayrollCutoffPeriod::suggest(string $month, string $cutoff): array{from: CarbonImmutable, to: CarbonImmutable}` — `$month` is `Y-m`, `$cutoff` `first|second`. First weekday on/after the 1st (16th) to last weekday on/or before the 15th (month end). Holidays are NOT skipped (owner: include Nov 2, shown as NWNP).
  - `PayrollCutoffPeriod::window(string $month, string $cutoff, CarbonInterface $to): array{from: CarbonImmutable, to: CarbonImmutable}` — `from` = day after the previous cutoff's `suggest()['to']`.
  - `PayrollCutoffPeriod::withinHalf(CarbonInterface $from, CarbonInterface $to, string $month, string $cutoff): bool` — both dates in that month half, `from <= to`.
  - `PayrollCutoffPeriod::canSaveOn(CarbonInterface $to, CarbonInterface $today): bool` — `$today > $to` by date.

- [ ] **Step 1: Write failing tests**
  - `test_november_first_cutoff_keeps_holiday_and_skips_weekend`: with `Holiday::create(['date'=>'2026-11-02','name'=>"All Soul's Day",'type'=>'special'])`, `suggest('2026-11','first')` → from `2026-11-02`, to `2026-11-13` (holiday kept, weekend Nov 1/14/15 skipped).
  - `test_second_cutoff_ends_on_last_weekday`: `suggest('2026-10','second')` → `2026-10-16`, `2026-10-30`.
  - `test_window_starts_after_previous_cutoff`: `window('2026-11','first', 2026-11-13)` → from `2026-10-31`; `window('2026-11','second', 2026-11-30)` → from `2026-11-14` (with the Nov 2 holiday row).
  - `test_within_half_rejects_dates_outside_or_reversed`: `withinHalf(11-03, 11-13, '2026-11','first')` true; `(11-03, 11-16)` false; `(11-13, 11-03)` false.
  - `test_can_save_only_after_last_day`: `canSaveOn(11-13, 11-13)` false; `canSaveOn(11-13, 11-14)` true.
- [ ] **Step 2: Run** `php artisan test --filter=PayrollCutoffPeriodTest` — Expected: FAIL (methods missing).
- [ ] **Step 3: Implement the four static methods.** January 1st cutoff's previous cutoff is December of the prior year.
- [ ] **Step 4: Run** the same filter — Expected: PASS. Existing callers of `matches()` stay broken until Task 5; do not run the full suite here.
- [ ] **Step 5: Commit** `feat(payroll): compute cutoff dates and DTR window from work days`

### Task 2: Shift length per day

**Files:**
- Modify: `app/Models/EmployeeSchedule.php`
- Test: `tests/Feature/EmployeeScheduleLookupTest.php` (add tests)

**Interfaces:**
- Produces: `EmployeeSchedule::shiftHoursFor(int $employeeId, CarbonInterface $date): float`
  - `standard` or no row: `Setting shift_start`→`shift_end` (defaults `08:00`/`17:00`) minus the `lunch_start`→`lunch_end` overlap → 8.0 by default.
  - `two_punch`: `shift_end − shift_start`, adding 24 h when end ≤ start (18:00→06:00 = 12.0, 06:00→18:00 = 12.0), no lunch.
  - other custom four-punch: end − start minus lunch overlap.

- [ ] **Step 1: Write failing tests** `test_shift_hours_default_is_eight`, `test_shift_hours_two_punch_day_and_overnight_are_twelve` (rows `type=two_punch`, `06:00`–`18:00` and `18:00`–`06:00`), `test_shift_hours_follow_the_row_in_effect_on_the_date` (8 before `effective_from 2026-11-09`, 12 from it).
- [ ] **Step 2: Run** `php artisan test --filter=EmployeeScheduleLookupTest` — Expected: FAIL.
- [ ] **Step 3: Implement** `shiftHoursFor` using `forDate()`.
- [ ] **Step 4: Run** the filter — Expected: PASS.
- [ ] **Step 5: Commit** `feat(dtr): shift length per employee and date`

### Task 3: Hours attendance from the DTR

**Files:**
- Modify: `app/Services/DtrPayrollAttendanceCalculator.php` (add method; keep `calculateMany` until Task 6 deletes its last caller)
- Test: `tests/Feature/DtrPayrollAttendanceCalculatorTest.php` (add tests)

**Interfaces:**
- Consumes: `EmployeeSchedule::shiftHoursFor`, `PayrollCutoffPeriod::window` (caller passes the window).
- Produces: `hoursFor(Collection $employees, CarbonInterface $from, CarbonInterface $to, array $resolutions = []): Collection` keyed by employee id, each:
  ```
  ['days' => list<array{date: string, shift_hours: float, worked_hours: float, holiday: bool, source: 'dtr'|'typed'|'zero'|'unresolved'}>,
   'days_of_work' => float, 'unresolved_dates' => list<string>]
  ```
  `$resolutions` = `[employeeId => [date => ['type' => 'hours', 'hours' => float, 'note' => string] | ['type' => 'zero']]]`.
  - Only counted days (Decision 2). `worked_hours = min(hours_rendered, shift_hours)`.
  - A past counted day whose status is `missing_out` or `in_progress` (or has punches but `hours_rendered = 0` and is not `absent`) is `unresolved` with `worked_hours 0` unless a resolution exists; typed hours are capped at shift hours. Future days are omitted from `days` and from `unresolved_dates`.
  - `absent` / no log → worked 0, not unresolved.

- [ ] **Step 1: Write failing tests** (all with `Carbon::setTestNow('2026-11-14 08:00:00')`):
  - `test_hours_are_capped_at_shift_and_holiday_is_skipped`: Mon–Fri employee, logs Nov 3–13 with `hours_rendered` 8 except Nov 4 = 6 and Nov 5 = 9; Nov 2 holiday with no log → `days_of_work` 10, Nov 2 entry `holiday: true` worked 0.0, Nov 4 worked 6.0, Nov 5 worked 8.0.
  - `test_gen_mdse_two_punch_counts_weekends_in_window`: two_punch 06:00–18:00 row, `work_days` all 7, logs Oct 31–Nov 13 with 12.18 h → every day 12.0 except Nov 2 (no log, holiday, 0.0), `days_of_work` 14.
  - `test_missing_punch_is_unresolved_until_resolved`: Nov 11 log `am_time_in` only, status `missing_out` → in `unresolved_dates`; with resolution `['type'=>'hours','hours'=>14,'note'=>'Forgot to clock out']` → worked 8.0 source `typed`; with `['type'=>'zero']` → 0.0 source `zero`, not unresolved.
  - `test_days_before_hire_are_not_counted`: `date_hired 2026-11-09` → `days_of_work` 5.
- [ ] **Step 2: Run** `php artisan test --filter=DtrPayrollAttendanceCalculatorTest` — Expected: new tests FAIL.
- [ ] **Step 3: Implement `hoursFor`**, one DTR query for all employees (as `calculateMany` does).
- [ ] **Step 4: Run** the filter — Expected: PASS.
- [ ] **Step 5: Commit** `feat(payroll): DTR hours per counted day for a cutoff window`

### Task 4: Hours-based pay amounts

**Files:**
- Modify: `app/Services/OfficePayrollCalculator.php`
- Modify: `resources/js/Pages/Admin/officePayrollMath.js` (display mirror)
- Test: `tests/Unit/HoursPayrollCalculatorTest.php` (create), `resources/js` has no JS test runner — mirror is checked in Task 6's manual gate.

**Interfaces:**
- Consumes: Task 3 attendance array for one employee.
- Produces: `calculateHours(Employee $employee, bool $isFirst, array $attendance, array $inputs): array<string, float>` where `$inputs` keys: `weekday_ot_hours, weekend_ot_hours, holiday_pay, cutoff_transpo, cutoff_rep, cutoff_quarterly, deductions` (deductions as today). Returns every key `calculate()` returns today, plus `paid_hours`, `scheduled_hours`. Mapping:
  - `paid_days_basis` = `days_of_work`; `basic_before_absence` = days × daily rate; `cutoff_basic` = Σ per-day pay (Decision 3); `absence_deduction` = difference; `absence_days` = absence ÷ daily rate (2 dp); `days_present` = `paid_days_basis − absence_days`.
  - Allowances = the typed inputs (not `employee->*_allowance`). `tardiness_deduction` = 0.
  - OT per Decision 4; tax per Decision 5; other deductions exactly as `calculate()` (split ÷ 2 unless overridden).
  - Also make `compensationSignature()` hash `daily_rate` only.
- JS: export `calculateHoursItem(item)` that mirrors the same formulas from `item.days` + typed inputs; delete `calculateOfficeItem`/`tardinessFor` in Task 6 with their last caller.

- [ ] **Step 1: Write failing tests**
  - `test_holiday_not_worked_is_nwnp_in_absent`: daily 600, 10 counted days (one holiday, 0 h), 9 × 8 h → `basic_before_absence` 6000.00, `absence_deduction` 600.00, `cutoff_basic` 5400.00.
  - `test_mariel_example`: daily 600, 9 counted days of 8 h shift, two with 0 h → `basic_before_absence` 5400.00, `absence_deduction` 1200.00, `cutoff_basic` 4200.00, `paid_days_basis` 9.0, `absence_days` 2.0.
  - `test_violie_is_fifty_per_hour`: daily 600, 11 days at 12 h shift, all 12 h → `cutoff_basic` 6600.00; one day 6 h → 6300.00; 2 weekday OT h → `weekday_ot_pay` 125.00 (50 × 1.25 × 2).
  - `test_typed_allowances_are_used_and_profile_allowances_ignored`: employee `transpo_allowance` 1000, input `cutoff_transpo` 0 → 0.00; input 750 → 750.00 and in `gross_pay`.
  - `test_tax_only_on_first_cutoff`: `tax_deduction` 850 → first 850.00, second 0.00; SSS 500 first / 0 second.
  - `test_holiday_pay_added_to_gross`: `holiday_pay` 390 → `gross_pay` = `cutoff_basic + 390`.
- [ ] **Step 2: Run** `php artisan test --filter=HoursPayrollCalculatorTest` — Expected: FAIL.
- [ ] **Step 3: Implement `calculateHours`** and the JS mirror `calculateHoursItem`.
- [ ] **Step 4: Run** the filter — Expected: PASS.
- [ ] **Step 5: Commit** `feat(payroll): pay from DTR hours capped at shift length`

### Task 5: Schema — one batch per month and cutoff, hours snapshots

**Files:**
- Create: `database/migrations/2026_11_13_000001_add_payroll_month_and_hours_snapshots.php`
- Modify: `app/Models/Payroll.php`, `app/Models/PayrollItem.php` (fillable/casts)
- Test: `tests/Feature/PayrollSchemaTest.php` (create)

**Interfaces:**
- Produces: `payrolls.period_month` `char(7)` not null, unique (`period_month`, `cutoff`); `payroll_items.paid_hours decimal(8,2) null`, `scheduled_hours decimal(8,2) null`, `day_resolutions json null`.
- Migration `up()`: add nullable column, backfill `DATE_FORMAT(period_from,'%Y-%m')` (use `substr(period_from,1,7)` so sqlite works), then throw `RuntimeException('Duplicate payroll batches for <month> <cutoff>; resolve before migrating.')` if any (month, cutoff) repeats, then make it not null and add the unique index. `down()` drops all four columns and the index.

- [ ] **Step 1: Write failing tests** `test_second_batch_for_same_month_and_cutoff_is_rejected_by_database` (expects `QueryException`), `test_migration_refuses_existing_duplicates` (insert two rows with `period_month` null via `DB::table`, run the migration class's `up()` → `RuntimeException`), `test_migration_rolls_back_and_reapplies`.
- [ ] **Step 2: Run** `php artisan test --filter=PayrollSchemaTest` — Expected: FAIL.
- [ ] **Step 3: Implement migration and model changes.** `Payroll::create` callers must now set `period_month`.
- [ ] **Step 4: Run** the filter — Expected: PASS.
- [ ] **Step 5: Commit** `feat(payroll): one batch per month and cutoff; hours snapshot columns`

### Task 6: Wizard endpoints and page

**Files:**
- Modify: `app/Http/Controllers/Admin/PayrollController.php` (`create`, `store`; delete `paidDaysBasisFor`)
- Modify: `app/Http/Requests/Admin/CreatePayrollRequest.php`, `app/Http/Requests/Admin/StorePayrollRequest.php`
- Create: `resources/js/Pages/Admin/PayrollWizard.jsx`, `resources/js/Components/PayrollWizard/StepCutoff.jsx`, `StepDtrCheck.jsx`, `StepEntries.jsx` (Excel-look grid), `StepConfirm.jsx`
- Delete: `resources/js/Pages/Admin/PayrollCreate.jsx`; `calculateOfficeItem`/`tardinessFor` in `officePayrollMath.js`; `DtrPayrollAttendanceCalculator::calculateMany` if no caller remains (grep first)
- Modify: `resources/js/Pages/Admin/Payroll.jsx` (start form = month + cutoff), `resources/js/Pages/Admin/Dashboard.jsx:197` and `AdminDashboardController` `active_cutoff` link (`?month=Y-m&cutoff=`)
- Test: `tests/Feature/PayrollWizardTest.php` (create); rewrite `tests/Feature/OfficePayrollTest.php` payloads to the new request shape (the specified behaviour changed; keep its permission, rounding, payslip and PDF tests)

**Interfaces:**
- `GET /admin/payroll/create?month=2026-11&cutoff=first` → `CreatePayrollRequest` (`month` `date_format:Y-m`, `cutoff` `in:first,second`). If a finalized batch exists → redirect `admin.payroll.show`. Renders `Admin/PayrollWizard` with props: `month, cutoff, is_first, period_from, period_to, window_from, skipped` (list of `{date, reason: 'holiday'|'weekend', name}` inside the suggested range's half), `can_save` (`canSaveOn`), `save_after` (`D, M d`), `offices`, `signatories` (`ManagementPayrollExport::defaultSignatories()` resolved to names/positions), `draft_id|null`, and `employees` (active staff, office order as today) each with `id, employee_id, full_name, position, payroll_office, office_verified, daily_rate, days` (Task 3), `days_of_work, unresolved_dates`, plus saved typed values from the draft (or 0s) `weekday_ot_hours, weekend_ot_hours, holiday_pay, cutoff_transpo, cutoff_rep, cutoff_quarterly, deductions, day_resolutions`.
- `POST /admin/payroll` → `StorePayrollRequest`: `month, cutoff, period_from, period_to, finalize: boolean, items.*: employee_id (distinct, active staff), payroll_office, weekday_ot_hours, weekend_ot_hours (0–999), holiday_pay, cutoff_transpo, cutoff_rep, cutoff_quarterly (0–99999999), deductions (same keys as today), day_resolutions` (`items.*.day_resolutions.*.type in:hours,zero`, `hours` required_if hours `numeric 0–24`, `note` required_if hours `string max:500`). `after()` checks: `withinHalf`, `canSaveOn(period_to, today())` else error `period_to` = `You can save after <D, M d>.`, every employee's unresolved date has a resolution else `items.N.day_resolutions` = `Choose what to do with <date> for <name>.`, office verified.
- Store, in one `DB::transaction`: `lockForUpdate` the existing draft for (month, cutoff); refuse if finalized; recompute attendance server-side (`window()` + `hoursFor` with posted resolutions) — client hours are never trusted; replace the draft's items (or create the batch with `period_month`, label `M d – M d, Y`); `recalculateTotals()`; if `finalize`, set `status/finalized_by/finalized_at` exactly as `finalize()` does. Redirect to `admin.payroll.show` with `Payroll saved.` or `Payroll saved and finalized.`
- Page behaviour (spec "The four steps"): step bar; step 2 lists unresolved days with **Fix DTR** (opens `/admin/dtr/<employee>?date=` in a new tab — use the existing admin DTR route; grep `routes/web.php`), **Type hours** (+ note), **Count as 0 hours**, and a **Refresh DTR** button (`router.reload({ only: ['employees'] })`, keeps typed state); Next disabled until each unresolved day has hours or zero. Step 3 renders the Excel-look grid from `excel-look-v2.html` (office tabs, MANAGEMENT PAYROLL table, GOVT & OTHER DEDUCTIONS table, OT tables, signatories, yellow = inputs). Step 4 reloads `employees`, lists names whose `days` changed since step 2, shows totals, and two buttons **Save draft** / **Save & finalize** (confirm dialog "This can't be undone"), both disabled with "You can save after <save_after>" when `!can_save`.

- [ ] **Step 1: Write failing feature tests** (`Carbon::setTestNow` in Asia/Manila):
  - `test_create_prefills_november_dates_and_marks_holiday_nwnp` → props `period_from 2026-11-02`, `period_to 2026-11-13`, `holidays` contains `2026-11-02` labelled NWNP.
  - `test_save_is_refused_before_cutoff_ends` (now `2026-11-13 18:00`) → error on `period_to` "You can save after Fri, Nov 13."; at `2026-11-14 00:00` → redirect to show.
  - `test_store_recomputes_hours_and_ignores_client_money` (post `cutoff_basic` 999999 in an item → saved value from DTR).
  - `test_unresolved_day_requires_a_choice` then passes with `zero`.
  - `test_reopening_month_updates_the_draft_instead_of_creating_a_second` (two posts → one `payrolls` row, items replaced, typed `cutoff_transpo` reloaded by `create`).
  - `test_save_and_finalize_locks_the_batch`, `test_finalized_month_redirects_create_to_show`, `test_employee_cannot_post_payroll` (403).
  - `test_export_still_fills_template_for_hours_batch`: save a Nov 3–13 batch, call `ManagementPayrollExport::export()`, assert Fort sheet row 11 D = days of work and E = basic before absence, G = absence (open the zip as `ManagementPayrollExportTest` does).
- [ ] **Step 2: Run** `php artisan test --filter=PayrollWizardTest` — Expected: FAIL.
- [ ] **Step 3: Implement requests and controller.**
- [ ] **Step 4: Run** `php artisan test --filter="PayrollWizardTest|OfficePayrollTest|ManagementPayrollExportTest|PayrollCalculationTest"` — Expected: PASS.
- [ ] **Step 5: Implement the page and step components**, update `Payroll.jsx`/`Dashboard.jsx` links, delete the old page and dead helpers (grep each name: zero hits).
- [ ] **Step 6: Run** `npm run build` — Expected: build succeeds, no missing-import errors.
- [ ] **Step 7: Manual gate (reviewer, local):** seed November DTR, open `/admin/payroll/create?month=2026-11&cutoff=first`, walk all four steps; Excel grid totals in step 3 equal the saved show page; Refresh DTR keeps typed allowances.
- [ ] **Step 8: Run** `vendor/bin/pint` then full `php artisan test` — Expected: all green.
- [ ] **Step 9: Update** `CHANGELOG.md` `[Unreleased]` (Changed: hours-based pay, wizard; Added: one batch per month/cutoff, save-after-cutoff rule) and AGENTS.md §4.3 to describe the new flow; commit with `public/build`: `feat(payroll): four-step wizard with hours-based pay`

## Out of this plan

- Live rent fix for Kurt and Kath (₱1,250/cutoff): run after deploy as a logged data change.
- Deploy: per AGENTS.md §7 with a DB backup (Task 5 migrates).
