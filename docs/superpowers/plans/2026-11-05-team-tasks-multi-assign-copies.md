# Assign one task to several people (own copies) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the admin New Task form, pick several people and create one separate task per person.

**Architecture:** `TeamTaskRequest` accepts an `employee_ids` array on create; `TeamTaskController::store` loops over it inside one transaction using the same per-person creation (task, optional repeat rule) and notifies each person afterwards. A new `PeoplePicker` component (searchable, grouped by office) replaces the single Employee select when creating; editing is unchanged.

**Tech Stack:** Laravel 13, PHPUnit (sqlite), Inertia/React 19, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-05-team-tasks-multi-assign-copies-design.md`

## Global Constraints

- Admin-only endpoint (existing `super_admin` route group); employees' own My tasks form is untouched (it passes no `employees`).
- At most 25 people per submit; ids distinct and active.
- Each copy: office = that employee's `payroll_office` (existing `withOffice` rule); `assigned_by` = the admin.
- All-or-nothing: one `DB::transaction`; notify only after commit.
- The existing single-person (`employee_id`), whole-office (`office` only) create and edit paths keep working unchanged.
- No shared-task option in the UI in this step.
- Theme tokens, accent `#26215C`, labelled controls, keyboard operable, phone width usable.
- `vendor/bin/pint` on PHP, `npm run build` after frontend edits, commit `public/build`. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- One inactive or unknown id in the list: nothing created, error on `employee_ids.N`.
- Duplicate ids, empty array, 26 ids rejected.
- `employee_ids` together with `office`/`employee_id`: the array wins, no extra whole-office task.
- Repeat with several people: one rule and one first copy per person, no duplicates.
- Notification count equals people count and none go to the admin.
- Editing a task still rejects `employee_ids` being used (ignored) and keeps its single owner.

---

### Task 1: Multi-person create

**Files:**
- Modify: `app/Http/Requests/TeamTaskRequest.php`, `app/Http/Controllers/TeamTaskController.php` (`store`)
- Test: `tests/Feature/TeamTaskMultiAssignTest.php` (new; style of `RecurringTaskAdminTest`)

**Interfaces:**
- Request: `employee_ids` (`array`, `min:1`, `max:25`), `employee_ids.*` (`integer`, `distinct`, exists active employee). `employee_id` and `office` stay; the "required" rule becomes: one of `employee_id`, `office`, `employee_ids` must be present. Used for create only: `update` ignores `employee_ids`.
- Response: redirect back with flash `success` = "Task added." for one task or "Task added for {N} people." for several.

- [ ] **Step 1: Write failing tests** in `TeamTaskMultiAssignTest` (super admin posts to `/admin/team-tasks`):
  - `test_several_people_each_get_their_own_task_in_their_own_office`: two people from different offices → 2 tasks, matching `employee_id` and `office`, same title/due date/priority, `assigned_by` the admin, status `pending`.
  - `test_each_person_is_notified_once_and_the_admin_is_not`: `EmployeeNotification` count equals people count (reuse the assertion style in `TaskAssignmentNotificationTest`).
  - `test_a_repeat_makes_a_rule_and_first_copy_per_person`: `RecurringTask::count()` and `Task::count()` both equal the people count, rules tied to their tasks.
  - `test_nothing_is_created_when_one_person_is_invalid`: an inactive employee in the list → session error on `employee_ids.1`, zero tasks, zero rules, zero notifications.
  - `test_the_list_must_be_distinct_non_empty_and_at_most_25`.
  - `test_the_array_wins_over_office_and_employee_id`: posting `employee_ids` plus `office` creates only per-person tasks.
  - `test_the_success_message_names_the_count`.
  - `test_editing_ignores_employee_ids`: `PATCH` with `employee_ids` keeps the single owner.
- [ ] **Step 2: Run** `php artisan test --filter=TeamTaskMultiAssignTest`. Expected: FAIL (validation/behaviour missing).
- [ ] **Step 3: Implement.** In the request: add the array rules and switch `employee_id`/`office` to `required_without_all`. In `store`: build the list of owner ids (`employee_ids` or the single `employee_id`/whole-office case as one entry), wrap everything in one `DB::transaction` that creates, per entry, the optional `RecurringTask` and the `Task` (extract the existing per-task block into a private method `createTask(Request, array $data, array $fields): Task`), then notify each created task with `TaskAssignmentNotifier::notify($task, $request->user())` after the transaction.
- [ ] **Step 4: Run** `php artisan test --filter='TeamTask|Recurring|AdminDashboard|TaskAssignment'`. Expected: all pass; `vendor/bin/pint app tests`.
- [ ] **Step 5: Commit** `feat(admin): create a task for several people at once`.

### Task 2: People picker and form

**Files:**
- Create: `resources/js/Components/PeoplePicker.jsx`
- Modify: `resources/js/Components/TaskFormModal.jsx`

**Interfaces:**
- Consumes the `employees` prop (`[{id, name, office}]`) and `offices` (`[{key, label}]`) the form already gets, and Task 1's `employee_ids` field.
- Produces `export default function PeoplePicker({ employees, offices, value, onChange, error })`: `value` is an array of ids, `onChange(nextIds)`.

- [ ] **Step 1: Build `PeoplePicker`:** a search input (labelled "Search people"), a scrollable list (`max-h-56 overflow-y-auto`) grouped by office with a heading and a "Select all" / "Clear" button per group, each person a labelled checkbox; selected people shown as removable chips above the list with a count ("3 selected"); filtered by the search text; shows `error` below.
- [ ] **Step 2: Edit `TaskFormModal`:** when `employees` is passed and the form is creating (no `task`): add form field `employee_ids: []`; add a "For" segmented control (People | Whole office, `aria-pressed`). People shows `PeoplePicker` and hides the old Employee/Office selects; Whole office shows only the Office select (existing) and sends no ids. On submit send `employee_ids` only in People mode (and no `employee_id`/`office`), otherwise the existing fields. Editing (`task` set) keeps the current Employee and Office selects. Field errors for `employee_ids` and `employee_ids.*` show in the picker.
- [ ] **Step 3: Verify** `npm run build`; run against the scratch sqlite (`database/taskboard-preview.sqlite`, ADM-0001 / `password123`, localhost only; reseed if empty) and check in Chrome: open New Task, search, select people from two offices, remove a chip, submit, and confirm one task per person on the board with the right office and the flash message; whole office still works; Edit still shows the single select; console clean; screenshot.
- [ ] **Step 4: Commit** `feat(admin): people picker in the new task form`, then `build: rebuild assets for the people picker`.

### Task 3: Docs and final checks

- [ ] **Step 1:** In `CHANGELOG.md` (Unreleased > Added) add: admins can give a new task to several people at once (searchable list grouped by office); each person gets their own copy with their own progress, notification and repeat. Run `vendor/bin/pint --test app tests`, `php artisan test` (only the known JPEG error allowed), `npm run build`.
- [ ] **Step 2: Commit** `docs: changelog for assigning to several people`. Do not deploy; the user approves that separately.
