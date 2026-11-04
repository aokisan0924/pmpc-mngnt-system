# Office Tasks and Google Tasks Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chosen) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tasks can belong to an office (seen by the whole office) or to a named member; admins manage them on Team tasks with an Office filter; 19 Google Tasks are imported as 21 tasks.

**Architecture:** `tasks.office` (nullable) and nullable `tasks.employee_id`. A `Task::visibleTo(Employee)` scope drives the employee Planner and dashboard. Office members may move office tasks but not edit or delete them. A committed artisan command (`tasks:import-office-lists`, dry run by default) does the import.

**Tech Stack:** Laravel 13 / PHP 8.3, Inertia 3 + React 19, PHPUnit (sqlite), Pint.

**Spec:** `docs/superpowers/specs/2026-11-04-office-tasks-design.md` (builds on `2026-11-04-task-board-design.md`).

## Global Constraints
- New PHP: `declare(strict_types=1);`, Form Requests for validation, eager-load `employee`, Asia/Manila.
- Office keys are exactly `cubao`, `fort_magsaysay`, `main_office`; labels `Cubao Office`, `Fort Magsaysay Office`, `UPI Main Office`. Payroll labels (`OfficePayrollCalculator::OFFICES`) are NOT changed. `gen_mdse` is not a task office.
- A task must have an employee or an office. An office task with no employee is seen by employees whose `payroll_office` equals the task office; a task with an employee is seen only by that employee.
- Admin routes still only touch tasks with `assigned_by` set (404 otherwise).
- Run Pint and `npm run build` before finishing. Deploy and import to live only after the user confirms.

## Review Focus
- An employee never sees another office's task or another person's task (including a named-member task in their own office).
- An office-wide task with `employee_id` null does not break `toPlannerArray()`, the dashboard, or the admin board.
- Office members can move an office task; non-members and other offices get 403; edit/delete of an office task by a member is refused.
- Admin form: neither employee nor office is refused; employee only fills office from the employee's own office.
- The import is idempotent (second run creates nothing) and aborts without writing if any named employee is missing.

---

### Task 1: Schema, visibility and employee-side rules
**Files:** Create `database/migrations/2026_11_05_000000_add_office_to_tasks_table.php`; Modify `app/Models/Task.php`, `app/Http/Controllers/TaskController.php`, `app/Http/Controllers/EmployeeDashboardController.php`; Test `tests/Feature/OfficeTasksTest.php`.
**Interfaces:** Produces `Task::OFFICES` (key => label), `Task::scopeVisibleTo(Builder, Employee): Builder`, `Task::officeLabel(): ?string`, and `toPlannerArray()` gains `office` and `office_label`.
- [ ] Tests (RED first): own task visible; office-wide task visible to same-office employee; hidden from other-office employee; named-member task in my office hidden from me; office member can PATCH `/employee/planner/{task}/status` and `/toggle` on an office task; other-office employee gets 403; member cannot update or delete an office task (403); employee dashboard `recentTasks` includes an office task.
- [ ] Migration: `employee_id` nullable (change), `office` string(30) nullable after `employee_id`; `down()` deletes nothing, restores NOT NULL only if no null rows (otherwise throw a clear exception).
- [ ] Implement scope, constant, `toPlannerArray` additions, `TaskController::index` using `visibleTo`, status/toggle allowed for owner or office member via `authorizeMove()`, edit/delete stay owner-only via existing `authorizeTask`; dashboard uses `visibleTo`.
- [ ] Run `php artisan test --filter='OfficeTasksTest|TaskBoardTest|AuditFixRegressionTest'` → PASS. Commit.

### Task 2: Admin side
**Files:** Modify `app/Http/Requests/TeamTaskRequest.php`, `app/Http/Controllers/TeamTaskController.php`; Test `tests/Feature/TeamTasksTest.php` (extend).
**Interfaces:** Consumes Task 1. Produces Inertia props `offices` (`[{key,label}]`) and `filters.office` on `Admin/TeamTasks`; `employees` entries gain `office`.
- [ ] Tests (RED first): admin creates office-wide task (no employee, office set) → `employee_id` null, `assigned_by` set; neither employee nor office → validation error; employee only → office copied from employee's `payroll_office`; invalid office key refused; `?office=cubao` filters (office-wide and named tasks of that office); board `employee_name` null and `office_label` set for office-wide tasks.
- [ ] Implement: rules `employee_id` nullable + required_without:office (active or current owner), `office` nullable + required_without:employee_id + `Rule::in(array_keys(Task::OFFICES))`; controller derives office, filters by `office`, passes `offices`.
- [ ] Run `php artisan test --filter=TeamTasksTest` → PASS. Commit.

### Task 3: Frontend
**Files:** Modify `resources/js/Components/TaskFormModal.jsx`, `resources/js/Components/TaskBoard.jsx`, `resources/js/Pages/Admin/TeamTasks.jsx`, `resources/js/Pages/Employee/Planner.jsx` (office badge on cards).
- [ ] Form: Employee select optional ("Whole office" first option) plus Office select (disabled with value shown when an employee is chosen? no: editable, defaults to employee's office); error text for both.
- [ ] Board card shows `employee_name` or `Whole office · <office_label>`; Team tasks adds an Office filter select.
- [ ] Verify in browser on the local scratch database (admin creates office-wide task; employee of that office sees it and can move it; other-office employee does not). `npm run build` passes. Commit.

### Task 4: Import command
**Files:** Create `app/Console/Commands/ImportOfficeTaskLists.php`; Test `tests/Feature/ImportOfficeTaskListsTest.php`.
**Interfaces:** `php artisan tasks:import-office-lists [--apply]` prints the planned rows and creates nothing without `--apply`; with `--apply` creates them in one transaction; assigned by employee code `EMP-0002`; owners found by `employee_id` code: `2022-00003` Xander, `EMP-0001` Reynold, `EMP-0003` Kath, `EMP-0002` Kurt, `2026-00025` Yvonne, `2026-00026` Jerome, `2026-00028` Diana, `2026-00027` Mariel.
- [ ] Tests (RED first): dry run creates 0 rows and reports 21; `--apply` creates 21 (named-pair tasks once per person; office-wide ones with null employee and the right office); second `--apply` creates 0; a missing employee code aborts with nothing written.
- [ ] Implement with the 19 tasks' titles and notes copied exactly from the spec mapping (undated tasks due `2026-11-04`, `category` = original list name, priority `medium`, status `pending`).
- [ ] Run the new tests and the full suite → PASS (JPEG failure in `EmployeeSignatureTest` is environmental). Commit.

### Task 5: Final checks
- [ ] `vendor/bin/pint --test app tests routes database`; `php artisan test`; `npm run build`; changelog entry; commit build.
- [ ] Stop and ask the user before deploying or running the import on live.
