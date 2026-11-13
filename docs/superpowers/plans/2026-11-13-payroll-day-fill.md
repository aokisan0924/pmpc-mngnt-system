# Payroll Day Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Payroll day" button on payroll step 2 fills in the rest of today's punches for everyone already timed in, and from then on fills in anyone who times in later that day.

**Architecture:** A new `PayrollDayFiller` service fills one log's empty punches after the first time-in and marks today as payroll day in `settings`. A new payroll-group route calls it for everyone. `AttendancePunchService::punch` calls it after a time-in when today is payroll day. The wizard gets two props and one button.

**Tech Stack:** Laravel 13 / PHP 8.3, Inertia + React 19, PHPUnit (sqlite in memory).

**Spec:** `docs/superpowers/specs/2026-11-13-payroll-day-fill-design.md`

## Global Constraints

- Timezone `Asia/Manila`; "today" is `today()`.
- Who: `Employee::canProcessPayroll()` (admin and `EMP-0003` Katherine). The route goes in the existing `['auth', 'payroll']` group in `routes/web.php`.
- When: only when `today()` equals `PayrollCutoffPeriod::suggest($month, $cutoff)['to']` (the last weekday of the cutoff), and never in mockup mode.
- Office (four-punch) fill: `am_time_out` = setting `lunch_start` (12:00), `pm_time_in` = `lunch_end` (13:00), `pm_time_out` = the shift end used by `DtrLog::computeHoursAndStatus()`: the personal shift's `end`, else `16:00` on Fridays, else setting `shift_end` (17:00).
- Store (two-punch) fill: `pm_time_out` = `EmployeeSchedule::shiftFor(...)['end']`.
- Never overwrite a punch that is already there. Never change the time-in.
- Skip: no time-in today, `hasActiveAbsence()`, and non-workdays.
- Afternoon-only day (only `pm_time_in`): fill `pm_time_out` only.
- Times are stored as `H:i:s`. Recompute with `computeHoursAndStatus()` and save. The punch path runs inside its existing `DB::transaction`; the bulk fill is wrapped in its own `DB::transaction`.
- Setting key: `payroll_day`, with value `Y-m-d`. It counts as on only when it equals today.
- New PHP files start with `declare(strict_types=1);`, validation goes in a Form Request, and Pint must be clean. Log the change under `## [Unreleased]` in `CHANGELOG.md`.

## Review Focus

1. Someone times in, the button is pressed, and the punch screen is still open. Their next punch attempt must get a refresh or conflict message, not a second time-out. The version hash already covers punches; the test below checks that `getNextPunchSlot()` is `null` after the fill.
2. Pressing the button twice must change nothing the second time. Add test `test_pressing_twice_changes_nothing`.
3. If someone already clocked out early (all punches set), the fill must not touch the row. Covered by the "never overwrite" test.
4. A time-in on a normal day must not fill anything, even if an old `payroll_day` value is still stored. Add test `test_old_payroll_day_does_not_fill_today`.
5. Katherine is not an admin. She must be able to press the button; a regular employee must get 403. Covered in Task 2.

---

### Task 1: `PayrollDayFiller` service and the punch hook

**Files:**
- Create: `app/Services/PayrollDayFiller.php`
- Modify: `app/Services/AttendancePunchService.php` (inside `punch()`, after `$log->computeHoursAndStatus(); $log->save();` around line 109)
- Test: `tests/Feature/PayrollDayFillerTest.php`

**Interfaces:**
- Produces:
  - `PayrollDayFiller::isOn(): bool`: `Setting::get('payroll_day') === today()->toDateString()`.
  - `PayrollDayFiller::fillLog(DtrLog $log): bool`: fills empty later punches per Global Constraints. Returns true if it changed the row. It does not check `isOn()`.
  - `PayrollDayFiller::start(): int`: inside `DB::transaction`, runs `Setting::set('payroll_day', today()->toDateString())`, then `fillLog` on each of today's `DtrLog` rows for active staff (`is_staff`, `status` active) that have `am_time_in` or `pm_time_in`. Returns how many rows changed.
- In `punch()`: when the slot just written is `am_time_in` or `pm_time_in`, `$log->date->isToday()` and `isOn()`, call `fillLog($log)` before building the response, so the returned attendance already shows the full day.

- [ ] **Step 1: Write the failing tests** (`Carbon::setTestNow('2026-11-13 09:00:00')`, a Friday; use `DtrLog::factory()` and `EmployeeSchedule::create` as in `tests/Feature/DtrPayrollAttendanceCalculatorTest.php`):
  - `test_start_fills_office_staff_with_lunch_and_friday_end`: log `am_time_in` `08:05:00` → after `start()`: `am_time_in` `08:05:00`, `am_time_out` `12:00:00`, `pm_time_in` `13:00:00`, `pm_time_out` `16:00:00`, `getNextPunchSlot()` null; `start()` returns 1; `Setting::get('payroll_day')` is `'2026-11-13'`.
  - `test_monday_to_thursday_office_end_is_five`: same on `2026-11-12 09:00` → `pm_time_out` `17:00:00`.
  - `test_store_staff_get_their_own_clock_out`: two-punch schedule `06:00`–`18:00`, every day, `am_time_in` `05:58:00` → `pm_time_out` `18:00:00`, `am_time_out` and `pm_time_in` stay null.
  - `test_afternoon_only_day_gets_only_the_clock_out`: only `pm_time_in` `13:10:00` → `pm_time_out` `16:00:00`, AM punches stay null.
  - `test_never_overwrites_and_skips_people_not_timed_in`: one log with all four punches (`pm_time_out` `15:00:00`) is unchanged; an employee with no log still has no log; a log with only an absence notice (no time-in) is unchanged. `start()` returns 0.
  - `test_pressing_twice_changes_nothing`: second `start()` returns 0 and the punches are the same.
  - `test_time_in_after_start_fills_the_day`: call `start()`, then `Carbon::setTestNow('2026-11-13 10:00:00')` and punch `am_time_in` through `AttendancePunchService::punch()`, the way `tests/Feature/DtrPunchFlowTest.php` does → the saved log has all four punches and `pm_time_out` `16:00:00`.
  - `test_old_payroll_day_does_not_fill_today`: `Setting::set('payroll_day', '2026-11-12')`, punch `am_time_in` on the 13th → only `am_time_in` is set.

- [ ] **Step 2: Run them and see them fail**

Run: `php artisan test --filter=PayrollDayFillerTest`
Expected: FAIL (class `PayrollDayFiller` not found)

- [ ] **Step 3: Implement `PayrollDayFiller` and the hook in `punch()`** per the Interfaces above. For the office shift end, reuse the exact rule from `DtrLog::computeHoursAndStatus()` (lines 171–173) instead of copying different numbers.

- [ ] **Step 4: Run the tests and see them pass**

Run: `php artisan test --filter='PayrollDayFillerTest|DtrPunchFlowTest|DtrPunchIntegrityTest|TwoPunchShiftTest|AlwaysPresentAttendanceFillerTest'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/Services/PayrollDayFiller.php app/Services/AttendancePunchService.php tests/Feature/PayrollDayFillerTest.php
git commit -m "feat(dtr): payroll day fills the rest of the day after a time-in"
```

### Task 2: Route, request and wizard button

**Files:**
- Create: `app/Http/Requests/Admin/StartPayrollDayRequest.php`
- Modify: `routes/web.php` (payroll group, next to `payroll.store`): `Route::post('/payroll/payday', [PayrollController::class, 'startPayday'])->name('payroll.payday');`, placed **before** `/payroll/{payroll}`
- Modify: `app/Http/Controllers/Admin/PayrollController.php` (new `startPayday`)
- Modify: `app/Services/PayrollWizard.php` (`preview()` props)
- Modify: `resources/js/Components/PayrollWizard/StepDtrCheck.jsx`, `resources/js/Pages/Admin/PayrollWizard.jsx` (pass the props through, and add `payday_available` and `payday_on` to the `only` list in `refreshDtr`)
- Modify: `CHANGELOG.md`
- Test: `tests/Feature/PayrollDayFillerTest.php` (add)

**Interfaces:**
- Consumes: `PayrollDayFiller::start(): int` and `isOn(): bool` from Task 1.
- `StartPayrollDayRequest`: `authorize()` returns `canProcessPayroll()`. Rules: `month` `required|date_format:Y-m`, `cutoff` `required|in:first,second`. In `after()`, add error `payday` "Payroll day can only be started on the last weekday of the cutoff." unless `today()` equals `PayrollCutoffPeriod::suggest(month, cutoff)['to']`.
- `startPayday(StartPayrollDayRequest, PayrollDayFiller): RedirectResponse`: `back()->with('success', "Payroll day is on. {$n} DTR days filled in; anyone who times in later today is filled in automatically.")`.
- `preview()` props: `payday_available` = `! $mock && today()->toDateString() === PayrollCutoffPeriod::suggest($month, $cutoff)['to']->toDateString()`, and `payday_on` = `PayrollDayFiller::isOn()`.
- UI on step 2, shown only when `payday_available`: a `Button` labelled "Payroll day: fill in today's DTR". It posts with `router.post('/admin/payroll/payday', { month, cutoff }, { preserveScroll: true, onSuccess: () => onRefresh() })` and is disabled while sending. After it is on, show a green status line: "Payroll day is on: everyone who timed in today, or times in later today, gets a full day." Show `errors.payday` under the button.

- [ ] **Step 1: Write the failing tests**
  - `test_admin_and_katherine_can_start_payroll_day_on_the_last_weekday`: at `2026-11-13 09:00`, POST `/admin/payroll/payday` `{month: '2026-11', cutoff: 'first'}` as the admin → redirect, session `success`, the log is filled. The same as an `EMP-0003` employee → redirect. As a regular employee → 403.
  - `test_payroll_day_is_refused_on_other_days`: at `2026-11-12 09:00` → session error `payday`, `Setting::get('payroll_day')` null.
  - `test_wizard_shows_the_payroll_day_button_only_on_the_last_weekday`: GET `/admin/payroll/create?month=2026-11&cutoff=first` at the 13th → `payday_available` true and `payday_on` false; at the 12th → false; with `mock=1` on the 13th → false.

- [ ] **Step 2: Run them and see them fail**

Run: `php artisan test --filter=PayrollDayFillerTest`
Expected: FAIL (route not found / missing props)

- [ ] **Step 3: Implement** the request, route, controller method, props and button per the Interfaces above. Add a CHANGELOG `### Added` line: "Payroll day button on payroll step 2 (admin and Katherine, last weekday of the cutoff only): fills in today's DTR for everyone who timed in (office 12:00 / 1:00 / 5:00, or 4:00 on Fridays; store staff their own clock-out), and anyone who times in later that day is filled in automatically."

- [ ] **Step 4: Run tests and build**

Run: `php artisan test` then `npm run build` then `vendor/bin/pint --test`
Expected: everything passes except the 5 local GD-only signature tests; the build succeeds; Pint passes.

- [ ] **Step 5: Commit**

```bash
git add app routes resources/js tests CHANGELOG.md public/build
git commit -m "feat(payroll): payroll day button on the DTR check step"
```

### Task 3: Deploy and log

- [ ] **Step 1:** Deploy per AGENTS.md section 7 (no migrations, so no backup needed). On live, check: HEAD matches, login returns 200, and `payday_available` is true for the November first cutoff if it is still the 13th.
- [ ] **Step 2:** Add a `DEPLOYMENTS.md` entry and commit it. Pressing the button on live is HR's in-app work, so it is not logged; if Claude presses it for Kurt, log it as a data change.
