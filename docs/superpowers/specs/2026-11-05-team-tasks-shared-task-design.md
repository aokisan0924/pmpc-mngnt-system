# Team tasks: one shared task for several people (design)

Date: 2026-11-05. Step 2 of 2 of multi-assign. Step 1 (own copies) shipped in `TeamTaskController::store`, `PeoplePicker.jsx`, `TaskFormModal.jsx`.

## Intent
Some work is one job for a group (count the vault together, prepare one report). Today the admin can only give each person their own copy, so the board shows the same job several times and "done" has to be ticked several times. A shared task is one task, one status, done once, seen by every person on it.

## Goals
- When creating with "Specific people" and at least two people chosen, the admin picks "Each person gets their own copy" (existing, default) or "One shared task".
- One task row, one status. Any person on it may move it between To do / Doing / Done. Who moved it is not recorded.
- Each person on it gets one assignment notification; the admin does not.
- Admin board: one card listing every person's name; counted once in the status cards; each person's people pill counts it; an office tab counts it once if any person on it is in that office; All counts it once.
- The admin can change who is on a shared task from the edit form.
- A repeating shared task produces one new shared task per occurrence with the same people.
- Employees see it on My tasks (board and calendar list) and on the dashboard, can move it, cannot edit or delete it.

## Non-goals
- Converting a shared task to copies or to a single person, or the reverse, on edit (delete and create again).
- Recording who moved it, per-person progress, comments.
- Shared tasks created by employees for each other.
- Editing the repeat rule (title, people, schedule) from a task. Edits stay on that task only, as today.

## Constraints
- Laravel 13, MariaDB in production, PHPUnit on sqlite in memory. Asia/Manila dates.
- Thin controller, Form Request validation (`TeamTaskRequest`), `DB::transaction` for multi-row writes, eager loading for everything serialised to Inertia.
- Admin accent `#26215C`, theme tokens, labelled controls, keyboard operable, phone width usable.
- Existing copies, single-person and whole-office flows keep working and their tests stay green unchanged.

## Decisions (owner, final)
Listed in Goals; data is a pivot table (one row per person per shared task), no single owner, no JSON column, no copy syncing.

## Approaches considered
1. **Pivot `task_assignees`, shared task has `employee_id` and `office` both null (chosen).** One row per task, so every existing count (`count()`, status cards, overview) counts it once without change; per-person and per-office views use `whereHas` (an EXISTS subquery, never a join, so no duplicate rows).
2. JSON `assignee_ids` column. Rejected by owner; also not indexable for visibility.
3. Copies kept in sync. Rejected by owner; status sync is fragile.
4. An explicit `is_shared` boolean column on `tasks`. Not needed: "no employee and no office" is a state no current path creates (whole-office tasks require an office; `withOffice` only fills, never clears). Derived marker means one less ALTER on the big table. Builder must not create tasks with both null for any other purpose.

## Data model
Migration `database/migrations/2026_11_05_120000_create_task_assignees_tables.php`:

```php
Schema::create('task_assignees', function (Blueprint $table) {
    $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
    $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
    $table->primary(['task_id', 'employee_id']); // no id column: eager loads select employees.id without a clash
});
Schema::create('recurring_task_assignees', function (Blueprint $table) {
    $table->foreignId('recurring_task_id')->constrained('recurring_tasks')->cascadeOnDelete();
    $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
    $table->primary(['recurring_task_id', 'employee_id']);
});
```

- No timestamps (nothing reads them).
- `down()`: if `task_assignees` has rows, throw `RuntimeException('Delete the shared tasks before rolling this migration back.')` (rolling back would leave tasks with no owner and no office, seen by nobody; same pattern as `2026_11_04_130000_add_office_to_tasks_table`). Otherwise `Schema::dropIfExists('recurring_task_assignees'); Schema::dropIfExists('task_assignees');`. Dropping the whole table drops its foreign keys and the unique index together, so the MySQL "index needed by a foreign key" ordering trap (see the recurring-tasks migration) does not arise. Never drop the unique index alone.
- MariaDB: all ids are `bigint unsigned` (`id()` / `foreignId()`), InnoDB; the unique index backs the `task_id` key, MariaDB adds its own index for `employee_id`.

Models:
- `Task::assignees(): BelongsToMany` = `belongsToMany(Employee::class, 'task_assignees')->orderBy('first_name')->orderBy('last_name')`.
- `Task::isShared(): bool` = `employee_id === null && office === null`.
- `Task::isOfficeWide()` becomes `employee_id === null && office !== null` (today it is true for shared tasks too).
- `RecurringTask::assignees(): BelongsToMany` = `belongsToMany(Employee::class, 'recurring_task_assignees')`. A shared rule has `employee_id` and `office` null.

## Authorization
| Who | View | Move | Edit / delete |
|---|---|---|---|
| Person on the task (any status) | Yes (Planner, dashboard) | Yes (`planner.status`, `planner.toggle`) | No (403, `authorizeTask` already checks `employee_id`) |
| Anyone else, same office | No | No (403) | No |
| Super admin | Yes (Team tasks) | Yes | Yes (`assigned_by` is always set) |

`TaskController::authorizeMove` gains: `|| ($task->isShared() && $task->assignees()->whereKey($user->id)->exists())`.

## Queries that change
- `Task::scopeVisibleTo`: add `->orWhereHas('assignees', fn ($a) => $a->where('employees.id', $employee->id))` inside the existing group. The office branch already needs `office = payroll_office`, so shared tasks (office null) never leak to an office. Covers Planner, calendar list and `EmployeeDashboardController` recent tasks (no shape change there).
- New `Task::scopeForPerson(Builder, int $employeeId)`: `employee_id = id OR has assignee id` (grouped). Used by the Team tasks person filter.
- New `Task::scopeInOffice(Builder, string $office)`: `office = X OR has assignee with payroll_office = X` (grouped). Any assignee counts, active or not, matching how an inactive person's copy still counts in its office today.
- `TeamTaskController::index` `$scoped`: person filter uses `forPerson`, office filter uses `inOffice`, `whole` becomes `whereNull('employee_id')->whereNotNull('office')` (otherwise shared tasks would appear under "Whole office"). The board query adds `assignees` to `with(...)`. `statusCounts` and the late count reuse `$scoped`, so they follow automatically and count each task once.
- `offices()`: load `employee_id` too and `assignees:id,payroll_office`; a task counts for office K if `office === K` or it is shared and any assignee has `payroll_office === K`. Tabs can add up to more than All (accepted).
- `people()`: use `inOffice` for the office narrowing; eager load `assignees:id,first_name,last_name,status,payroll_office`. A shared task bumps the chip of each active assignee (and, with an office chosen, only assignees whose `payroll_office` is that office). It never bumps "Whole office".
- `overview()`: unchanged (one row per task, so All counts it once).
- `Task::toPlannerArray`: adds `is_shared` (bool) and `assignees` (`[{id, name, office, active}]`, empty unless shared and the relation is loaded). `TaskController::index` adds `assignees` to its eager load.
- Calendar (`TeamTaskCalendar`): shared chip label = first assignee's first name plus " +N" when more.

## Create flow
`TeamTaskRequest` gains `shared` (nullable boolean, create only). With `shared` true: `employee_ids` required, min 2, max 25; `employee_id` and `office` are ignored. `TeamTaskController::store` with `shared`: in one transaction create one task (`employee_id` null, `office` null, no `withOffice`), its rule when repeating, and attach the ids to both; after the transaction notify once. Flash: "Shared task added for N people.".

## Edit flow
- A shared task's edit form shows the people picker (pre-filled), no Employee/Office selects, no "copy vs shared" choice.
- Request on update: `employee_ids` is read only when the routed task is shared (still excluded for every other task, so the existing "editing ignores employee_ids" tests hold). Required, min 2, max 25, each id active or already on the task (so an inactive person does not block a save; mirrors the current-owner rule).
- Controller: for a shared task, update the plain fields only (never `employee_id`/`office`) and `sync` the people in one transaction; notify only the newly attached ids. Removed people are not told (same as reassigning today).
- The rule behind a repeating shared task is not changed by an edit (same as every other field today). See "owner to confirm".

## Notifications
`TaskAssignmentNotifier::notify(Task $task, Employee|int $actor, ?array $onlyEmployeeIds = null)`. Shared tasks: recipients are the active assignees (filtered to `$onlyEmployeeIds` when given), minus the actor. **Collision:** without this branch the office branch runs `where('payroll_office', null)`, which Laravel turns into `IS NULL` and would notify every active employee with no office. The new branch must come first.

## Repeats
- Shared rule: `employee_id` null, `office` null, people in `recurring_task_assignees`, attached in the same transaction as the rule.
- `RecurringTaskGenerator::run` eager loads `assignees` on the rules. In `generateFor`, `firstOrCreate` plus `assignees()->sync(ids)` run in one `DB::transaction` when the rule has assignees, and sync only when `wasRecentlyCreated`. Then notify. The existing unique `(recurring_task_id, due_date)` and `firstOrCreate` keep reruns from duplicating; sync (not attach) keeps the unique pivot index from throwing.
- Inactive people stay on the rule and are copied; the notifier skips them, the pills hide them (same as an inactive person's own rule today).

## Leaving and deactivation
- No delete-employee path exists in the app; if a row is deleted in the database, pivot rows cascade away.
- Deactivated person: stays on the task, shown as "(inactive)" in the names, hidden from people pills, gets no notifications, cannot sign in.
- Fewer than two (active) people left: the task stays shared (the marker does not depend on the count) and keeps working for whoever remains. With zero people it is visible only to admins, labelled "No one yet"; the admin fixes it by editing (min 2).

## Frontend
- `TaskFormModal`: in "Specific people" mode, when 2+ people are picked, a radio group "Each person gets their own copy" / "One shared task"; transform sends `shared: true` only when that radio is chosen and 2+ people are picked. Edit of a shared task shows `PeoplePicker` with `task.assignees` ids and appends inactive assignees to the picker list with " (inactive)".
- `TaskBoard`: shared owner line lists all names with a "Shared" badge (admin); employee side shows a "Shared" badge instead of "Whole office" (`readOnly` stays `employee_id === null`, which covers shared).
- `TaskDetailModal`: `wholeOffice` = `!is_shared && employee_id === null`; shared shows "Shared with: names" for everyone.
- `Planner.jsx` list badge: "Shared · N people" for shared, "Whole office" stays for office tasks. Edit/Delete stay hidden (`employee_id !== null`).

## Owner to confirm (my calls)
1. Editing the people on a repeating shared task changes that task only; later repeats keep the original people. Alternative: also sync the rule.
2. Office tab membership uses each person's current office, inactive people included.
3. A shared task cannot be turned into copies or a single person on edit.
4. With an office chosen, a shared task bumps only the pills of people in that office.
5. Rolling back the migration refuses while shared tasks exist.

## Left to the builder
Exact Tailwind classes and copy of the badges and radio; reuse of the `Badge` component; ordering of names in the card (relation orders by first, last name).

## Tests
Listed per task in the plan: visibility (assignee yes, same-office colleague no, no-office employee no), move allowed for assignee, edit/delete 403, board/pills/tabs/status counts counting, filters by person and office including `whole`, create/edit validation, notifications (including the no-office leak), generator copies people without duplicates, rollback guard, N+1 check on the board.
