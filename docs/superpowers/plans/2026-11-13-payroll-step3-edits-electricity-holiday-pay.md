# Payroll Step 3: Electricity, Edits, Holiday Pay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On payroll step 3, HR can type an electricity deduction, type over any computed number, and the system adds DOLE pay for work done on holidays; the Excel and voucher stay balanced.

**Architecture:** New saved inputs on `payroll_items` (`electricity_deduction`, `overrides` JSON, `holiday_hours` JSON, `worked_holiday_pay`). `OfficePayrollCalculator::calculateHours` stays the single source of money: it computes, applies typed overrides, adds worked-holiday pay, then totals. `officePayrollMath.js` mirrors it exactly. The template gains an ELECTRICITY column through `scripts/build-payroll-template.py`.

**Tech Stack:** Laravel 13 / PHP 8.3, PHPUnit (sqlite), React 19 + Inertia, `node --test` for JS, openpyxl for the template.

**Spec:** `docs/superpowers/specs/2026-11-13-payroll-step3-edits-electricity-holiday-pay-design.md`

## Global Constraints

- Money is recomputed on the server from the saved inputs; browser totals are never trusted. Screen (`resources/js/Pages/Admin/officePayrollMath.js`) and server (`app/Services/OfficePayrollCalculator.php`) give identical results; every new rule gets a PHP test and a `tests/js/officePayrollMath.test.js` case with the same numbers.
- Electricity: typed per cutoff, default `0`, never read from or written to the employee record.
- Editable computed cells (override keys): `days_present` (Days of work), `basic_before_absence` (Basic pay), `nwnp_deduction` (NPW-Holiday), `other_absence` (Absent), `tardiness_deduction` (Late). Deduction amounts (`OfficePayrollCalculator::DEDUCTIONS`, now including `electricity_deduction`) are already posted values; all become editable cells.
- Each typed value stands alone; `absence_deduction` = NPW-Holiday + Absent; `cutoff_basic` = max(0, Basic pay − absence_deduction); gross/total deductions/net are never typed.
- SSS, PhilHealth, Pag-IBIG on the 2nd cutoff: suggested 0; a posted non-zero value is deducted (remove the "forced 0 whatever is posted" rule in both PHP and JS).
- Holiday pay: hourly = daily rate ÷ that day's shift hours (`EmployeeSchedule::shiftHoursFor`). Multiplier m: special/announced 1.30 (rest day 1.50), regular 2.00 (rest day 2.60). Total = hourly × (min(h, 8) × m + max(h − 8, 0) × m × 1.30). Added = max(0, total − hourly × paid hours already counted that day). Rest day = `! Employee::isWorkDay`. Hours: DTR `hours_rendered` when the day has a punch; else typed `holiday_hours[date]`; none on assumed (mockup) days or dates without a `Holiday` row.
- Excel: ELECTRICITY column right after the RENTAL column in every deduction-style block (both cutoffs' deduction tables and both govt source tables) on all four sheets; voucher Rent Income line (row 23, journal key `rental`) includes electricity; OVERTIME PAY includes `worked_holiday_pay`.
- Finalized payrolls never change. One migration; back up live DB before deploying. `declare(strict_types=1);`, Form Request validation, Pint clean, `npm run build`, CHANGELOG `## [Unreleased]`, DEPLOYMENTS entry.

## Review Focus

1. A typed Basic pay lower than the absence: cutoff basic must floor at 0 and the Excel row still balance. Test `test_typed_basic_below_absence_floors_at_zero_and_exports_balanced` (Task 3).
2. Undo after typing: clearing an override must restore the system number, not save 0. Test `test_cleared_override_uses_the_system_number` (Task 3).
3. Two holidays in one cutoff with different types (regular and special): each date gets its own rate. Test `test_two_holidays_use_their_own_rates` (Task 4).
4. A store worker whose rest day is the holiday (not in `days` today): the 150% rate still applies and paid-already is 0. Test `test_rest_day_holiday_work_pays_full_rest_day_rate` (Task 4).
5. An old draft saved before this change (null `overrides`, null `holiday_hours`, no electricity) reopens and re-saves without errors and with the same net. Test `test_old_draft_without_new_fields_reopens_unchanged` (Task 3).

---

### Task 1: Electricity deduction (data, math, step 3, payslip)

**Files:**
- Create: `database/migrations/2026_11_13_000003_add_step3_edit_fields_to_payroll_items.php`: `electricity_deduction` decimal(12,2) default 0, `worked_holiday_pay` decimal(12,2) default 0, `overrides` json nullable, `holiday_hours` json nullable. (All four columns here so live needs one migration.)
- Modify: `app/Models/PayrollItem.php` (fillable + casts: floats, `overrides`/`holiday_hours` as `array`)
- Modify: `app/Services/OfficePayrollCalculator.php` (`DEDUCTIONS` gains `'electricity_deduction'`; its suggestion is `0.0`, not from the employee)
- Modify: `resources/js/Components/PayrollWizard/StepEntries.jsx` (ELECTRICITY editable cell after Rental in the deductions table)
- Modify: `app/Http/Controllers/PayslipController.php`, `resources/views/payslip/single.blade.php` (an Electricity line next to Rental), `resources/js/Pages/Admin/PayrollShow.jsx` (label `electricity_deduction: 'Electricity'`), `app/Http/Controllers/Admin/PayrollController.php:146` (pass `electricity_deduction`)
- Test: `tests/Feature/PayrollWizardTest.php`, `tests/js/officePayrollMath.test.js`

**Interfaces:**
- Produces: `payroll_items.electricity_deduction|worked_holiday_pay|overrides|holiday_hours`; `OfficePayrollCalculator::DEDUCTIONS` includes `electricity_deduction` (StorePayrollRequest picks it up automatically).

- [ ] **Step 1: Write failing tests:** `test_electricity_is_typed_per_cutoff_and_deducted`: preview row `deductions.electricity_deduction` is `0.0`; POST with `electricity_deduction` 350 → saved item `electricity_deduction` 350, `total_deductions` and `net_pay` move by 350, employee record unchanged. JS: `calculateHoursItem` with `deductions.electricity_deduction: 350` lowers `net_pay` by 350.
- [ ] **Step 2: Run** `php artisan test --filter=test_electricity_is_typed_per_cutoff_and_deducted` and `node --test tests/js/officePayrollMath.test.js` → FAIL.
- [ ] **Step 3: Implement** migration, model, constant, UI cell, payslip line, labels.
- [ ] **Step 4: Run** `php artisan migrate` (local), the two test commands plus `php artisan test --filter='PayrollWizardTest|PayslipTest|ManagementPayrollExportTest'` → PASS (fix any test fixtures that list every deduction key).
- [ ] **Step 5: Commit** `feat(payroll): electricity deduction typed per cutoff`.

### Task 2: ELECTRICITY in the Excel and voucher

**Files:**
- Modify: `scripts/build-payroll-template.py`: new `add_electricity_columns(ws)` called in `main()` after `reorder_signoffs`; apply it once to `resources/payroll/management-template.xlsx` the way `reorder_signoffs` was applied (runpy, load, apply, save, logos kept).
- Modify: `app/Services/ManagementPayrollExport.php` (`$pesos` gains `'ELECTRICITY' => 'electricity_deduction'`; the journal's `'rental'` = rental + electricity; `blankItem` field list)
- Test: `tests/Feature/ManagementPayrollExportTest.php`

**Interfaces:**
- Consumes: `electricity_deduction` (Task 1).
- `add_electricity_columns(ws)`: for each row-10 header starting with `RENTAL`, processed **right to left**, insert one column right after it with header `ELECTRICITY` (row 10 style copied from the rental header, body and total-row styles copied from the rental column, width copied). Shift everything to the right: merged ranges, print area, column widths, and picture anchors whose column is past the insert point. Widen a block's row-8/9 title merge that spans the insert point.

- [ ] **Step 1: Write failing tests:** `test_electricity_has_its_own_column_and_goes_to_rent_income`: export an item with rental 500 and electricity 350; on sheet 1 the cell under header `ELECTRICITY` in the 1st deductions block is 350 and the `RENTAL` cell is 500; the row's TOTAL DEDUCTIONS includes both; voucher `I23` = 850; existing balance tests still pass. Template check: every sheet has exactly 4 `ELECTRICITY` headers in row 10, each directly right of a `RENTAL…` header, and still 6 `EMPLOYEE NAME` blocks.
- [ ] **Step 2: Run** `php artisan test --filter=ManagementPayrollExportTest` → FAIL.
- [ ] **Step 3: Implement** the script function, regenerate the template, update the export.
- [ ] **Step 4: Run** `php artisan test --filter='ManagementPayrollExportTest|EmployeeSignatureTest'` → PASS (except GD-only). Then open the regenerated template with openpyxl and print: logo counts per sheet unchanged (3, 2, 2, 2), print areas, and each sign-off marker still present.
- [ ] **Step 5: Commit** `feat(payroll): ELECTRICITY column in the management Excel`.

### Task 3: Type over any number (overrides)

**Files:**
- Modify: `app/Services/OfficePayrollCalculator.php` (apply `$inputs['overrides']` after computing; drop 2nd-cutoff forcing)
- Modify: `app/Http/Requests/Admin/StorePayrollRequest.php` (`items.*.overrides` nullable array with only the five keys; each `nullable|numeric|min:0|max:99999999`)
- Modify: `app/Services/PayrollWizard.php` (`preview()` row: `overrides` from the saved item or `{}`, and `system` = the calculator result **without** overrides for the five keys plus every deduction; `save()` stores `overrides` with null values removed)
- Modify: `resources/js/Pages/Admin/officePayrollMath.js` (same override rules; drop 2nd-cutoff forcing)
- Modify: `resources/js/Components/PayrollWizard/StepEntries.jsx` (every cell in both tables editable; a cell whose value differs from `row.system[key]` gets a distinct background and an "↺" button that clears the override or restores the system deduction)
- Test: `tests/Feature/PayrollWizardTest.php`, `tests/Unit/OfficePayrollCalculatorTest.php` (create if missing), `tests/js/officePayrollMath.test.js`

**Interfaces:**
- `calculateHours(..., $inputs)` reads `$inputs['overrides']` as `array<'days_present'|'basic_before_absence'|'nwnp_deduction'|'other_absence'|'tardiness_deduction', float|null>`. Null or missing = system value. Applied: `basic_before_absence`, `nwnp_deduction`, absence = nwnp + other_absence (each typed or system), `cutoff_basic = max(0, basic − absence)`, `absence_days = absence / rate`, `tardiness_deduction`, then `days_present` last (typed or recomputed). Then `totals()`.
- JS `calculateHoursItem(item, isFirst)` reads `item.overrides` the same way and returns the same keys.

- [ ] **Step 1: Write failing tests** (PHP and JS, same numbers; rate 600, fixed 11 days, one 8 h absence):
  - `test_typed_basic_pay_replaces_only_basic`: overrides `basic_before_absence` 7000 → basic 7000, absence 600 (system), cutoff_basic 6400.
  - `test_typed_absent_and_npw_set_absence`: `nwnp_deduction` 0, `other_absence` 300 → absence_deduction 300.
  - `test_typed_late_replaces_tardiness_amount`: `tardiness_deduction` 50 → 50; `tardiness_minutes` unchanged.
  - `test_typed_days_present_is_shown_as_typed`: 10.5 → `days_present` 10.5.
  - `test_second_cutoff_typed_sss_is_deducted`: 2nd cutoff, posted `sss_deduction` 450 → deducted; suggestion still 0.
  - `test_typed_basic_below_absence_floors_at_zero_and_exports_balanced` (Review Focus 1).
  - `test_cleared_override_uses_the_system_number` (Review Focus 2): override posted as null → system value saved, `overrides` saved without that key.
  - `test_old_draft_without_new_fields_reopens_unchanged` (Review Focus 5): item saved with null `overrides`/`holiday_hours` → preview and re-save give the same net.
- [ ] **Step 2: Run** `php artisan test --filter='PayrollWizardTest|OfficePayrollCalculatorTest'` and `node --test tests/js/officePayrollMath.test.js` → FAIL.
- [ ] **Step 3: Implement** per the Interfaces.
- [ ] **Step 4: Run** the same commands plus `npm run build` → PASS. Check step 3 in the local preview (`payroll-preview` or a throwaway sqlite as in the payroll-day work): type over Basic pay, see the colour, press ↺, see the system number.
- [ ] **Step 5: Commit** `feat(payroll): type over any step 3 number`.

### Task 4: Holiday work pay (DOLE)

**Files:**
- Modify: `app/Services/DtrPayrollAttendanceCalculator.php` (`hoursFor` result gains `holiday_work: list<array{date: string, type: string, rest_day: bool, shift_hours: float, dtr_hours: float|null, paid_hours: float}>` for every `Holiday` date in the window up to yesterday/today, on or after the start date; `dtr_hours` = the log's `hours_rendered` when it has a time-in, else null; `paid_hours` = that date's `worked_hours` in `days`, or 0 if not there; assumed (mockup) days are left out)
- Modify: `app/Services/OfficePayrollCalculator.php` (`worked_holiday_pay` from `holiday_work` + `$inputs['holiday_hours']`, added in `totals()` to `gross_pay`)
- Modify: `app/Http/Requests/Admin/StorePayrollRequest.php` (`items.*.holiday_hours` nullable array keyed by `Y-m-d`, values `nullable|numeric|min:0|max:24`)
- Modify: `app/Services/PayrollWizard.php` (save/preview `holiday_hours`, store `worked_holiday_pay`)
- Modify: `resources/js/Pages/Admin/officePayrollMath.js` (same formula), `resources/js/Components/PayrollWizard/StepEntries.jsx` (in the "Overtime & holiday pay" panel: per employee, per holiday date, the DTR hours shown read-only, or an hours box when `dtr_hours` is null; a "Holiday work pay" amount next to the existing "Holiday premium ₱"; the sheet's Overtime cell includes it)
- Modify: `app/Services/ManagementPayrollExport.php` (`$overtime` and the balance check include `worked_holiday_pay`; `blankItem` list)
- Test: `tests/Feature/DtrPayrollAttendanceCalculatorTest.php`, `tests/Unit/OfficePayrollCalculatorTest.php`, `tests/js/officePayrollMath.test.js`, `tests/Feature/ManagementPayrollExportTest.php`

**Interfaces:**
- Consumes: Task 1 columns; Task 3 calculator flow (overrides apply before holiday pay; holiday pay is never overridden).
- Produces: `hoursFor(...)[id]['holiday_work']`; `calculateHours` output key `worked_holiday_pay`.

- [ ] **Step 1: Write failing tests** (identical numbers in PHP and JS):
  - `test_merchandise_worker_on_special_day_gets_the_difference`: rate 600, 12 h shift, Nov 2 special, normal work day, DTR 12 h, paid 12 h → 258.00.
  - `test_office_worker_cut_as_nwnp_gets_full_dole_amount_for_typed_hours`: rate 600, 8 h shift, Nov 2 special, no punch, typed 4 h, paid 0 → 4 × 75 × 1.30 = 390.00; NPW-Holiday still 600.
  - `test_rest_day_holiday_work_pays_full_rest_day_rate` (Review Focus 4): office worker (Mon–Fri), special holiday on a Saturday, typed 8 h → 8 × 75 × 1.50 = 900.00.
  - `test_two_holidays_use_their_own_rates` (Review Focus 3): one regular (typed 8 h → 8 × 75 × 2.00 = 1200) and one special (typed 8 h → 780) → 1980.00.
  - `test_overtime_hours_on_a_holiday`: special, normal day, typed 10 h, paid 0 → 75 × (8 × 1.30 + 2 × 1.30 × 1.30) = 1033.50.
  - `test_no_holiday_pay_on_assumed_days_or_without_a_holiday_row`.
  - Export: OVERTIME PAY includes `worked_holiday_pay` and the row still balances.
- [ ] **Step 2: Run** `php artisan test --filter='DtrPayrollAttendanceCalculatorTest|OfficePayrollCalculatorTest|ManagementPayrollExportTest|PayrollWizardTest'` and `node --test tests/js/officePayrollMath.test.js` → FAIL.
- [ ] **Step 3: Implement** per the Interfaces.
- [ ] **Step 4: Run** the full suite (`php artisan test`, all except the 5 GD-only pass), `node --test tests/js/`, `npm run build`, `vendor/bin/pint --test` → PASS. Local preview: Nov 2 holiday, a merchandise worker with a 12 h DTR shows ₱258 holiday work pay.
- [ ] **Step 5: Commit** `feat(payroll): DOLE holiday work pay`, with the CHANGELOG `### Added` lines for Tasks 1–4.

### Task 5: Deploy with backup and log

- [ ] **Step 1:** Push. On the server: `git status --short` clean; back up the database (`mysqldump` to `~/backups/pmpc-YYYYMMDD-HHMM-before-step3.sql`, file size checked); then the standard deploy (down, pull, `migrate --force`, optimize, up).
- [ ] **Step 2:** On live: HEAD matches; login 200; `Schema::hasColumns('payroll_items', [...4 columns])` true; a rolled-back mockup export of the November 1st cutoff balances (every row gross − deductions = net, voucher DR = CR), and has 4 ELECTRICITY headers per sheet.
- [ ] **Step 3:** `DEPLOYMENTS.md` entry (backup file named) and commit.
