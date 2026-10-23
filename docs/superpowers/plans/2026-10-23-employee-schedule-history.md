# Employee Schedule History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep each employee's shift and workdays as dated history, let HR choose when a change starts (past or future), and set the schedule when adding an employee.

**Architecture:** A new `employee_schedules` table (one row per change) replaces the `employee_shift_{id}` settings and the `employees.work_days` column. One memoized lookup answers "which schedule applies on this date"; every existing reader switches to it. A service saves a schedule row and, when backdated, recomputes the saved hours and status of the affected DTR logs in the same transaction.

**Tech Stack:** Laravel 13 / PHP 8.3, Eloquent, PHPUnit feature tests (`RefreshDatabase`), React 19 + Inertia 3 `useForm`, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-10-23-employee-schedule-history-design.md`

## Global Constraints

- Work on a new branch `feat/schedule-history` cut from the current `preview/live-data` HEAD (it is 12 commits ahead of `main`).
- `declare(strict_types=1);` and explicit types in new PHP files; validation only in Form Requests; multi-write mutations in `DB::transaction`.
- Timezone `Asia/Manila`; dates as `Y-m-d`, times as `H:i`.
- Schedule types are exactly `standard`, `two_punch`, `custom`. Default workdays `Employee::DEFAULT_WORK_DAYS` = `[1, 2, 3, 4, 5]` (0 = Sunday … 6 = Saturday).
- `standard` = 4 punches, global hours (`shift_start` setting, 16:00 Friday / `shift_end` other days), its own workdays. `two_punch` = time in / time out, own hours, may end after midnight. `custom` = 4 punches, own hours, end after start.
- No row on or before a date means standard, Monday–Friday.
- Backdating stops after the `period_to` of the latest **finalized** payroll that has a `payroll_items` row for this employee.
- Backdated saves recompute only `hours_rendered` and `status`; punches are never changed. No preview, no notification.
- Each task's commit adds its line to `## [Unreleased]` in `CHANGELOG.md` (Added / Fixed). Run `vendor/bin/pint` on changed PHP before each commit; run `npm run build` and commit `public/build` in tasks that touch JSX.
- Admin UI uses the admin accent `#26215C` and existing input classes in `EmployeeShow.jsx`.

## Review Focus

1. **A backdated change when a later row already exists** — only days from the new row's start to the day before the next row are recomputed; later days keep their status. (Task 3, `test_backdated_save_stops_at_the_next_schedule_row`.)
2. **Saving twice with the same "Starts on"** — replaces that row instead of failing on the unique index; choosing Standard on today's row removes the personal shift. (Task 3, `test_same_start_date_replaces_the_row`.)
3. **Start date exactly on a finalized cutoff's last day** — rejected; the next day is accepted. (Task 3, `test_cannot_backdate_into_a_finalized_cutoff`.)
4. **A month that spans a two-punch → standard change** — two-punch days still show In/Out as `missing_out` when unclosed, and an HR correction on an old two-punch day still rejects lunch punches. (Task 2, `test_old_two_punch_days_keep_their_rules_after_switching_to_standard`.)
5. **Deploying onto existing data** — every employee's statuses for October are identical before and after the data migration. (Task 5 round-trip test, plus the live comparison in Task 6.)

---

### Task 1: `employee_schedules` table, model and date lookup

**Files:**
- Create: `database/migrations/2026_10_23_000001_create_employee_schedules_table.php`
- Create: `app/Models/EmployeeSchedule.php`
- Modify: `app/Models/Employee.php` (add `schedules()` relation)
- Test: `tests/Feature/EmployeeScheduleLookupTest.php`

**Interfaces:**
- Produces:
  - Table `employee_schedules`: `id`, `employee_id` (FK → employees, cascade), `effective_from` date, `type` string(20), `shift_start` string(5) null, `shift_end` string(5) null, `work_days` string(20) (comma list, e.g. `1,2,3,4,5`), `created_by` nullable FK → employees nullOnDelete, timestamps; unique (`employee_id`, `effective_from`).
  - `EmployeeSchedule::forDate(int $employeeId, CarbonInterface $date): ?EmployeeSchedule` — latest row with `effective_from <= $date`, null if none.
  - `EmployeeSchedule::shiftFor(int $employeeId, CarbonInterface $date): ?array` — `null` for no row or `standard`; else `['start' => 'H:i', 'end' => 'H:i', 'two_punch' => bool]` (same shape `Setting::employeeShiftForDate` returns today).
  - `EmployeeSchedule::workDaysFor(int $employeeId, CarbonInterface $date): array<int>` — the row's days, else `Employee::DEFAULT_WORK_DAYS`.
  - `$schedule->workDays(): array<int>`; casts `effective_from` to `date`; `$fillable` all data columns.
  - `Employee::schedules(): HasMany` ordered by `effective_from`.

- [ ] **Step 1: Write the failing tests** in `EmployeeScheduleLookupTest`:

```php
public function test_lookup_uses_the_row_in_effect_on_each_date(): void
{
    $e = Employee::factory()->create();
    EmployeeSchedule::create(['employee_id' => $e->id, 'effective_from' => '2026-10-01', 'type' => 'custom', 'shift_start' => '07:00', 'shift_end' => '16:00', 'work_days' => '1,2,3,4,5']);
    EmployeeSchedule::create(['employee_id' => $e->id, 'effective_from' => '2026-10-17', 'type' => 'two_punch', 'shift_start' => '19:00', 'shift_end' => '07:00', 'work_days' => '0,6']);

    $this->assertNull(EmployeeSchedule::shiftFor($e->id, Carbon::parse('2026-09-30')));
    $this->assertSame([1, 2, 3, 4, 5], EmployeeSchedule::workDaysFor($e->id, Carbon::parse('2026-09-30')));
    $this->assertSame(['start' => '07:00', 'end' => '16:00', 'two_punch' => false], EmployeeSchedule::shiftFor($e->id, Carbon::parse('2026-10-16')));
    $this->assertSame(['start' => '19:00', 'end' => '07:00', 'two_punch' => true], EmployeeSchedule::shiftFor($e->id, Carbon::parse('2026-10-17')));
    $this->assertSame([0, 6], EmployeeSchedule::workDaysFor($e->id, Carbon::parse('2026-10-18')));
}

public function test_standard_row_keeps_global_hours_but_its_own_workdays(): void
{
    // standard row with work_days '0,6' → shiftFor() null, workDaysFor() [0, 6]
}

public function test_lookup_sees_a_row_saved_after_an_earlier_lookup(): void
{
    // call shiftFor() once (null), create a row effective the same date, call again → row's shift
}
```

- [ ] **Step 2: Run** `php artisan test --filter=EmployeeScheduleLookupTest` — Expected: FAIL (class `EmployeeSchedule` not found).

- [ ] **Step 3: Implement** the migration and model. Memoize all rows with `once(fn () => static::query()->orderBy('effective_from')->get()->groupBy('employee_id'))`, same as `Employee::workDaysFor` does today; in `booted()`, call `Illuminate\Support\Once::flush()` on `saved` and `deleted` so the third test passes.

- [ ] **Step 4: Run** the filter again — Expected: PASS (3 tests).

- [ ] **Step 5: Commit** — `feat(schedule): add dated employee schedule table and lookup`.

---

### Task 2: Every reader uses the schedule in effect on the date

**Files:**
- Modify: `app/Models/Setting.php` (delete `employeeShiftForDate`)
- Modify: `app/Models/Employee.php:95-120` (`workDaysFor`, `isWorkDay`, `hasTwoPunchShift`, `hasCustomWorkDays`; drop `work_days` from `$fillable`)
- Modify: `app/Models/DtrLog.php` lines 62, 83, 93, 127, 155, 346
- Modify: `app/Http/Controllers/Admin/AdminDashboardController.php:349`, `app/Http/Controllers/EmployeeDashboardController.php:108`, `app/Http/Requests/Admin/CorrectDtrRequest.php:40`, `app/Http/Controllers/Admin/PayrollController.php:72`
- Modify: `app/Http/Controllers/Admin/EmployeeController.php:88-89` and `updateCompensation` (lines 147-163)
- Modify tests that seed old storage: `EmployeeShiftTest`, `TwoPunchShiftTest`, `AfternoonHalfDayTest`, `EmployeeWorkDaysTest`, `AuditFixRegressionTest:299`
- Test: `tests/Feature/EmployeeScheduleHistoryTest.php`

**Interfaces:**
- Consumes: `EmployeeSchedule::shiftFor`, `EmployeeSchedule::workDaysFor` (Task 1).
- Produces:
  - `Employee::workDaysFor(int $id, CarbonInterface $date): array<int>` (date now required); `Employee::isWorkDay(int $id, CarbonInterface $date): bool` unchanged signature.
  - `Employee::hasCustomWorkDays(int $id, CarbonInterface $from, CarbonInterface $to): bool` — true when any day in the range uses non-default workdays.
  - `DtrLog::twoPunchLayout(int $employeeId, iterable $logs): bool` — when logs exist: every log `isTwoPunch()` and has no lunch punches; when empty: `Employee::hasTwoPunchShift($employeeId)` (today).
  - Until Task 3, `updateCompensation` writes the shift/workdays as an `EmployeeSchedule` row effective today (via `updateOrCreate` on `employee_id` + today), only when they differ from today's schedule — the current behaviour, new storage.

- [ ] **Step 1: Write the failing tests** in `EmployeeScheduleHistoryTest`:

```php
public function test_changing_workdays_keeps_past_absences_and_rest_days(): void
{
    // Mon–Fri row from 2026-10-01, Sat–Sun row from 2026-10-20; no DTR logs.
    // travelTo 2026-10-23 10:00.
    $this->assertSame('absent', DtrLog::fallbackStatus($e->id, Carbon::parse('2026-10-13')));   // Tue, old schedule
    $this->assertSame('rest_day', DtrLog::fallbackStatus($e->id, Carbon::parse('2026-10-18'))); // Sun, old schedule
    $this->assertSame('rest_day', DtrLog::fallbackStatus($e->id, Carbon::parse('2026-10-21'))); // Wed, new schedule
}

public function test_old_two_punch_days_keep_their_rules_after_switching_to_standard(): void
{
    // two_punch 07:00–19:00 from 2026-10-01; standard from 2026-10-20.
    // Log 2026-10-10 with am_time_in 07:00 only → displayStatus() 'missing_out', isTwoPunch() true.
    // Log 2026-10-21 is four-punch: isTwoPunch() false.
    // twoPunchLayout() over logs dated Oct 10–12 → true; over Oct 21 → false.
    // As super admin, correcting 2026-10-10 with am_time_out set → assertSessionHasErrors (lunch punches not allowed).
}

public function test_payroll_paid_days_follow_the_schedule_in_the_cutoff(): void
{
    // Sat–Sun row from 2026-10-01 → hasCustomWorkDays(id, 2026-10-01, 2026-10-15) true and
    // the payroll create preview for that cutoff shows paid days = 4 (Oct 4, 5, 11, 12).
}
```

- [ ] **Step 2: Run** `php artisan test --filter=EmployeeScheduleHistoryTest` — Expected: FAIL (old storage still read).

- [ ] **Step 3: Switch every reader** listed under Files to the new lookups, with the log's own `$this->date` wherever a log is involved. Replace `Setting::employeeShiftForDate(...)` with `EmployeeSchedule::shiftFor(...)` one-for-one (same return shape). Line 127 (`afternoonStartNow`) and the dashboards keep using today. In `EmployeeController::show`, pass `work_days` and `shift` for today.

- [ ] **Step 4: Update the old fixtures** to create `EmployeeSchedule` rows instead of `Setting::set("employee_shift_…")` / `'work_days' => …`. `EmployeeShiftTest::test_malformed_or_inactive_shift_settings_fall_back_to_existing_rules` loses its malformed-JSON cases (no JSON any more); keep its "row starts after the date" case. `EmployeeWorkDaysTest`'s compensation tests now assert on `EmployeeSchedule` rows instead of `employees.work_days` / `Setting::employeeShiftForDate`.

- [ ] **Step 5: Run** `php artisan test` — Expected: all pass.

- [ ] **Step 6: Commit** — `fix(schedule): read shifts and workdays as of each date` (CHANGELOG Fixed: changing an employee's shift or workdays no longer changes past attendance).

---

### Task 3: Schedule editing with "Starts on", backdated recompute and history

**Files:**
- Create: `app/Services/EmployeeScheduleService.php`
- Create: `app/Http/Requests/Concerns/ValidatesSchedule.php`
- Create: `app/Http/Requests/Admin/SaveEmployeeScheduleRequest.php`
- Modify: `app/Http/Requests/Admin/UpdateCompensationRequest.php` (remove `work_days*`, `shift_*`, `two_punch` rules)
- Modify: `app/Http/Controllers/Admin/EmployeeController.php` (remove schedule code from `updateCompensation`; add `saveSchedule`, `destroySchedule`; `show` passes `schedules` and `earliestScheduleDate`)
- Modify: `routes/web.php` (next to `employees.compensation`)
- Modify: `resources/js/Pages/Admin/EmployeeShow.jsx` (move shift/workday inputs out of the compensation form into a Schedule section)
- Test: `tests/Feature/EmployeeScheduleEditTest.php`; update `EmployeeWorkDaysTest` compensation tests to the new route

**Interfaces:**
- Consumes: `EmployeeSchedule` (Task 1).
- Produces:
  - `ValidatesSchedule::scheduleRules(): array` — `schedule_type` required `in:standard,two_punch,custom`; `shift_start`/`shift_end` `required_unless:schedule_type,standard|nullable|date_format:H:i`, end `different:shift_start`, and for `custom` end must be after start; `work_days` required array min 1, `work_days.*` integer `between:0,6` distinct.
  - `SaveEmployeeScheduleRequest` = `scheduleRules()` + `effective_from` required `date_format:Y-m-d` and, when `EmployeeScheduleService::earliestEditableDate($employee)` is not null, `after_or_equal:` that date. Authorize: super admin.
  - `EmployeeScheduleService::earliestEditableDate(Employee $employee): ?CarbonImmutable` — day after the max `payrolls.period_to` where `status = 'finalized'` and a `payroll_items` row has this `employee_id`; null if none.
  - `EmployeeScheduleService::save(Employee $employee, array $data, ?Employee $admin): EmployeeSchedule` — `$data` keys: `effective_from`, `schedule_type`, `shift_start`, `shift_end`, `work_days`. In one `DB::transaction`: `updateOrCreate` on (`employee_id`, `effective_from`); hours are stored null for `standard`; `work_days` stored as sorted unique comma list. If `effective_from` < today: `Once::flush()`, then for this employee's `dtr_logs` with `date` from `effective_from` to the earlier of yesterday and (next row's `effective_from` − 1 day), call `computeHoursAndStatus()` and `save()`.
  - Routes: `PUT /admin/employees/{employee}/schedule` → `saveSchedule` named `admin.employees.schedule`; `DELETE /admin/employees/{employee}/schedule/{schedule}` → `destroySchedule` named `admin.employees.schedule.destroy` — deletes only a row of this employee with `effective_from` > today, else 403.
  - `show` props: `schedules` = `[{id, effective_from, type, shift_start, shift_end, work_days: int[], created_by_name}]` newest first; `earliestScheduleDate` = `Y-m-d|null`.

- [ ] **Step 1: Write the failing tests** in `EmployeeScheduleEditTest` (travel to `2026-10-23 10:00`; super admin acts):

```php
public function test_backdated_change_recomputes_status_but_not_punches(): void
{
    // employee, standard; log 2026-10-20 punches 07:00/12:00/13:00/16:00 saved as 'undertime' (global 08:00–17:00).
    // PUT schedule: effective_from 2026-10-17, custom 07:00–16:00, Mon–Fri.
    // → log status 'on_time'; the four punch columns unchanged.
}

public function test_backdated_save_stops_at_the_next_schedule_row(): void
{
    // existing row from 2026-10-21 (custom 09:00–18:00).
    // log 2026-10-16 (Fri) 07:00–16:00 saved 'late' (global 08:00); log 2026-10-22 saved with status 'on_time' set directly.
    // PUT effective_from 2026-10-15, custom 07:00–16:00 → Oct 16 becomes 'on_time';
    // Oct 22 is never recomputed: change its saved status to 'late' first and assert it is still 'late' after the PUT.
}

public function test_same_start_date_replaces_the_row(): void
{
    // PUT twice with effective_from 2026-10-23: custom 07:00–16:00, then standard → one row, type 'standard', shift null.
}

public function test_cannot_backdate_into_a_finalized_cutoff(): void
{
    // finalized payroll 2026-10-01..2026-10-15 with an item for the employee.
    // effective_from 2026-10-15 → assertSessionHasErrors('effective_from'); 2026-10-16 → no errors.
    // a finalized payroll WITHOUT an item for this employee does not block.
}

public function test_future_rows_can_be_deleted_past_rows_cannot(): void
{
    // row 2026-11-01 → DELETE 302 and gone; row 2026-10-01 → 403 and kept.
}

public function test_compensation_save_no_longer_touches_the_schedule(): void
{
    // PATCH employees.compensation with daily_rate only → no EmployeeSchedule rows created.
}
```

- [ ] **Step 2: Run** `php artisan test --filter=EmployeeScheduleEditTest` — Expected: FAIL (route not defined).

- [ ] **Step 3: Implement** the service, the concern, the request, the controller actions and routes per Interfaces. The controller stays thin: `saveSchedule` calls `$service->save($employee, $request->validated(), $request->user())` and redirects back with `Schedule saved.`

- [ ] **Step 4: Build the Schedule section** in `EmployeeShow.jsx` with its own `useForm` `{schedule_type, shift_start, shift_end, work_days, effective_from: today}` and `put(route('admin.employees.schedule', employee.id))`, prefilled from the current schedule. Type as three radio options labelled "Standard (8–5, 4 punches)", "2 punches (own hours)", "Custom (4 punches, own hours)"; hide the time inputs for Standard; "Starts on" date input with `min={earliestScheduleDate}`; errors under each input; submit disabled while `processing`. Below it, a history table (Starts on, Type, Hours, Days, Saved by) with a delete button only on future rows (use the existing `ConfirmModal`).

- [ ] **Step 5: Run** `php artisan test` and `npm run build` — Expected: all pass; build succeeds.

- [ ] **Step 6: Check in the browser** (preview server): on an employee, save a backdated custom shift and see the DTR month's statuses change; try a date inside a finalized cutoff and see the error under "Starts on".

- [ ] **Step 7: Commit** — `feat(schedule): choose when a schedule starts and keep its history` (CHANGELOG Added).

---

### Task 4: Schedule choice when adding an employee

**Files:**
- Modify: `app/Http/Requests/Admin/StoreEmployeeRequest.php` (use `ValidatesSchedule`)
- Modify: `app/Http/Controllers/Admin/EmployeeController.php` `store` (inside the existing transaction)
- Modify: `resources/js/Components/EmployeeFormModal.jsx`
- Test: `tests/Feature/EmployeeScheduleEditTest.php` (add tests)

**Interfaces:**
- Consumes: `ValidatesSchedule::scheduleRules()`, `EmployeeScheduleService::save()` (Task 3).
- Produces: `store` strips `schedule_type`, `shift_start`, `shift_end`, `work_days` from the `Employee::create` data and calls `save()` with `effective_from` = `date_hired` or today. A standard Monday–Friday choice still creates a row (so HR sees the start in the history).

- [ ] **Step 1: Write the failing tests:**

```php
public function test_new_weekend_two_punch_employee_gets_a_first_schedule_row(): void
{
    // POST employees.store with date_hired 2026-10-24, schedule_type two_punch, 19:00–07:00, work_days [0, 6]
    // → one row: effective_from 2026-10-24, type two_punch, work_days '0,6'.
}

public function test_new_employee_defaults_to_standard_from_today_without_hire_date(): void
{
    // schedule_type standard, work_days [1..5], no date_hired → row effective 2026-10-23, shift null.
}

public function test_custom_schedule_needs_hours_on_create(): void
{
    // schedule_type custom without shift_start → assertSessionHasErrors('shift_start'); no employee created.
}
```

- [ ] **Step 2: Run** the filter — Expected: FAIL.

- [ ] **Step 3: Implement** the request and `store` changes.

- [ ] **Step 4: Add the Schedule section** to `EmployeeFormModal`: the same three radio options (default Standard), time inputs when not Standard, weekday checkboxes defaulting to Mon–Fri plus a "Sat–Sun" quick pick button; errors under each input.

- [ ] **Step 5: Run** `php artisan test` and `npm run build` — Expected: pass.

- [ ] **Step 6: Commit** — `feat(accounts): choose the schedule when adding an employee` (CHANGELOG Added).

---

### Task 5: Move existing shifts and workdays into history

**Files:**
- Create: `database/migrations/2026_10_23_000002_move_shifts_and_work_days_to_employee_schedules.php`
- Test: `tests/Feature/ScheduleDataMigrationTest.php`

**Interfaces:**
- Consumes: table from Task 1. Uses `DB` / query builder only (no models) inside the migration.
- Produces: after `up()`, no `employees.work_days` column and no `settings` rows with key `employee_shift_%`.

**Row rules in `up()`**, per employee (start date = `date_hired`, else `created_at` date):
- Valid shift setting (same checks the old `Setting::employeeShiftForDate` made: `effective_from` `Y-m-d`, times `H:i`, start ≠ end, start < end unless `two_punch`) → row at its `effective_from`: type `two_punch` or `custom`, its hours, the employee's current workdays (`work_days` or `1,2,3,4,5`).
- Non-null `work_days` and (no valid shift, or shift `effective_from` > start date) → `standard` row at start date with those workdays.
- Neither → no row.

`down()`: re-add `work_days` (nullable string 20) filled from each employee's latest row when not `1,2,3,4,5`, and re-create `employee_shift_{id}` from the latest non-standard row (`{effective_from, start, end, two_punch}` JSON); then clear `employee_schedules`.

- [ ] **Step 1: Write the failing round-trip test:** require the migration file, call `down()`, seed old storage for four employees — (a) nothing, (b) `work_days '0,6'`, (c) shift `{2026-10-17, 19:00, 07:00, two_punch}` + `work_days '0,6'`, hired 2026-09-01, (d) malformed shift JSON — capture `DtrLog::fallbackStatus` and `displayStatus()` for each day of October 2026 using the Task-2 code path *after* calling `up()`, and assert:
  - (a) no rows; (b) one standard row at its start date; (c) standard `0,6` row at 2026-09-01 and two_punch row at 2026-10-17; (d) no rows;
  - `Schema::hasColumn('employees', 'work_days')` false and no `employee_shift_%` settings;
  - expected statuses (a hard-coded list per employee for Oct 1–23, written from the pre-change behaviour) match.

- [ ] **Step 2: Run** `php artisan test --filter=ScheduleDataMigrationTest` — Expected: FAIL (file missing).

- [ ] **Step 3: Implement** the migration.

- [ ] **Step 4: Run** `php artisan test` and, locally, `php artisan migrate:fresh --seed` then `php artisan migrate:rollback --step=1` and `php artisan migrate` — Expected: all pass, no errors.

- [ ] **Step 5: Commit** — `feat(schedule): move existing shifts and workdays into schedule history`.

---

### Task 6: Verify against a copy of live data, then hand over for deploy

- [ ] **Step 1:** With the user's OK, copy the live database to local (`mysqldump` over the deploy SSH key) into a scratch database, check out the commit before Task 1, and record every employee's `displayStatus`/`fallbackStatus` for 2026-09-01..2026-10-23 to a JSON file in the scratchpad.
- [ ] **Step 2:** Check out the branch head, run `php artisan migrate` on the same copy, record again, and diff. Expected: no differences. Any difference is a migration bug: fix in Task 5 before continuing.
- [ ] **Step 3:** `vendor/bin/pint --test`, `php artisan test`, `npm run build` — all clean.
- [ ] **Step 4:** Stop and ask the user before merging to `main` and deploying. The deploy itself follows AGENTS.md §7 (backup first, migrations) and gets a `DEPLOYMENTS.md` entry with the before/after diff as "Verified".
