# Team tasks: "When is it due?" and tasks with no due date (design)

Date: 2026-11-05. Builds on the shared-task release (`TeamTaskController::store`, `TeamTaskRequest`, `TaskFormModal.jsx`).

## Intent
Some admin work has no deadline (monitor the Facebook page, keep the LRV updated). Today every task needs a due date, so admins invent one and the task turns "late" for no reason (the November import even used a placeholder date, `ImportOfficeTaskLists::UNDATED`). Repeating tasks hide their schedule behind a due date that is silently used as the first occurrence. The New Task form will ask one plain question first: when is it due?

## Goals
- The admin New Task form starts with "When is it due?": **Has a due date** (default), **Recurring**, **No due date**.
  - Has a due date: the due date field, no repeat fields.
  - Recurring: the repeat fields only (how often, weekday / day / month, "Show it days before", "Stop after"). No due date field. The app sets the first occurrence: the next date on the schedule on or after today (Asia/Manila).
  - No due date: no date at all; the task is ongoing.
- Works for every admin mode: specific people as copies, one shared task, whole office.
- An undated task is shown as "No due date", sorts after dated tasks, and is never late.
- The admin edit form shows the due date as optional for ordinary tasks (blank = no due date), so a date can be added or removed later.

## Non-goals
- The employee's own Planner form (personal tasks keep a required due date).
- Turning a task into a recurring one by editing (repeat fields stay create-only, as today).
- Editing the repeat rule from a task.
- A client-side preview of the first recurring date (the card shows it right after saving).
- Clearing the placeholder dates of the already imported tasks (an admin can now clear them by editing; no data command).
- Changing `ImportOfficeTaskLists` (one-off, already applied).

## Constraints
- Laravel 13, MariaDB in production, PHPUnit on sqlite in memory, Asia/Manila (`config/app.php` timezone).
- Form Request validation only (`TeamTaskRequest`), thin controller, `DB::transaction` for multi-row writes (unchanged paths).
- Existing request shapes keep working: employee Planner form, admin single person, copies, shared, whole office, and the old repeat payload (repeat + due date as first occurrence).
- Existing tests stay unchanged and green. A search of `tests/` found no test asserting that the admin form always requires `due_date`, so no existing test changes.
- Admin accent `#26215C`, theme tokens, labelled controls, keyboard operable, usable at phone width.

## Decisions (owner, final)
- Three choices as in Goals; applies to all admin modes; employee form unchanged.
- "No due date" is real data: `tasks.due_date` becomes nullable. A far-future sentinel date and a separate "ongoing" flag were rejected.
- One migration, MariaDB-safe, with a working `down()` that refuses while undated rows exist.
- Recurring create: the rule and the first copy are created immediately, as today, with the computed first date; `starts_on` and `last_due_date` stay NOT NULL and are set from it. If that date is beyond the lead window, the first copy is still created now (today's behaviour for a future due date).

## Decisions taken in this design (owner to confirm)
1. **Explicit `due_type` field** (`date` | `recurring` | `none`) on create, instead of inferring "no due date" from a missing `due_date`. A missing date is then never accidental, and a request without `due_type` behaves exactly as today (due date required; repeat uses it as first occurrence).
2. **A copy made by a repeat rule (`recurring_task_id` not null) keeps a required due date on edit.** The generator, the `(recurring_task_id, due_date)` unique index and the "next after last_due_date" cursor all assume each copy has a date. Confirmed as proposed.
3. **No repeat on edit.** `due_type` is excluded on edit; repeat fields are already ignored on edit. Confirmed as proposed.
4. **"Recurring" defaults to monthly** when picked, with the day pre-filled from today. Correction from the gap check: the existing `chooseRepeat` fills from `data.due_date` and only falls back to today when that is empty, so the builder must change it to always use today in Recurring mode (the first date is computed on the server anyway; the pre-fill is only a convenience).
5. **The first-date rule lives on the server** (`RecurringTask::nextDueAfter(today - 1 day)`), not in the browser.
6. **"No due date" with a repeat is refused** (`repeat` prohibited), rather than silently dropped.
7. **Planner (employee) calendar** gets the same "No date" strip under its month grid as the admin calendar, so undated tasks are reachable from the calendar view as well as the board.

## Approaches considered
1. **Nullable `due_date` + explicit `due_type` on create (chosen).** Every reader treats null as "no date". SQL `<` comparisons already exclude NULL, so late counts in SQL need no change; only PHP readers and sorting change.
2. Far-future sentinel date (for example 9999-12-31). Rejected by owner: shows as a date, sorts oddly, breaks "due in N days".
3. `is_ongoing` boolean plus a dummy date. Rejected by owner: two sources of truth.
4. Infer "no due date" from a missing `due_date` (no `due_type`). Rejected: an old or buggy client that forgets the date would silently create an ongoing task.
5. Browser computes the first recurring date and sends it as `due_date`. Rejected: duplicates the schedule logic in JS and trusts the client.

## Data model
Migration `database/migrations/2026_11_05_130000_make_task_due_date_nullable.php`:
- `up()`: `Schema::table('tasks', fn (Blueprint $t) => $t->date('due_date')->nullable()->change());`
  - MariaDB: `ALTER TABLE tasks MODIFY due_date DATE NULL`. The unique index `(recurring_task_id, due_date)` and the foreign key backed by it stay; MariaDB allows several NULLs in a unique index.
  - sqlite (tests): Laravel rebuilds the table; indexes and foreign keys are recreated.
- `down()`: if `DB::table('tasks')->whereNull('due_date')->exists()` throw `RuntimeException('Give every task a due date before rolling this migration back.')`; else `->date('due_date')->nullable(false)->change()`.
- `recurring_tasks` unchanged (`starts_on` NOT NULL, `last_due_date` nullable as today).
- Before release: up / down / up on a scratch MariaDB copy, and a database backup before the live migrate.

## Request (`TeamTaskRequest`)
Let `$task = $this->route('task')` and `$dueType = $task === null ? $this->input('due_type') : null`.

| Field | Rules |
|---|---|
| `due_type` | `Rule::excludeIf($task !== null)`, `nullable`, `Rule::in(['date', 'recurring', 'none'])` |
| `due_date` | `Rule::excludeIf(in_array($dueType, ['recurring', 'none'], true))`, `Rule::requiredIf($task === null \|\| $task->recurring_task_id !== null)`, `nullable`, `date` |
| `repeat` | `nullable`, `Rule::requiredIf($dueType === 'recurring')`, `Rule::prohibitedIf($dueType === 'none')`, `Rule::in(RecurringTask::FREQUENCIES)` |
| `repeat_until` | `nullable`, `date`, plus `after_or_equal:due_date` only when `$dueType !== 'recurring' && $this->filled('due_date')` |
| others | unchanged |

- `after()` hook: when creating with `due_type === 'recurring'`, no errors so far, and `firstRepeatDate()` is null (Stop after comes before the first date) → error on `repeat_until`: "The repeat would stop before its first date."
- `public function firstRepeatDate(): ?CarbonImmutable`: builds an unsaved `RecurringTask` from the repeat inputs (`frequency`, `day_of_week`, `day_of_month`, `last_day_of_month` (monthly only), `month`, `ends_on` = `repeat_until`) and returns `nextDueAfter(CarbonImmutable::now('Asia/Manila')->subDay())`. `nextDueAfter` returns the first date strictly after its argument, so passing yesterday gives "on or after today".

Request shapes per mode (create; the form also sends everything it sends today):

| Form choice | Sends | Result |
|---|---|---|
| Has a due date | `due_type=date`, `due_date`, `repeat=''` | as today, one-off |
| Recurring | `due_type=recurring`, `due_date=''`, `repeat` + its fields | rule + first copy dated `firstRepeatDate()` |
| No due date | `due_type=none`, `due_date=''`, `repeat=''` | task(s) with `due_date` null, no rule |
| (old shape) no `due_type` | `due_date`, optional `repeat` | exactly as today |

These combine freely with people / copies (`employee_ids`), shared (`shared`, `employee_ids`) and whole office (`office`).

## Controller (`TeamTaskController`)
- `store`: right after `$data = $request->validated();`, if `$request->input('due_type') === 'recurring'` set `$data['due_date'] = $request->firstRepeatDate()->toDateString();`. Everything else, including `createTask`, is unchanged: `createTask` already uses `$fields['due_date']` for the task, `starts_on` and `last_due_date`. For "none", `due_date` is absent from `$data`, so `Task::create` leaves it null and no rule is made (`repeat` is empty).
- `update`: unchanged code. A blank `due_date` arrives as null (ConvertEmptyStringsToNull) and `Arr::only` writes it, clearing the date; for a repeat copy the request refuses it.

## Edit rules
- Ordinary task (person, office, shared; `recurring_task_id` null): due date optional; blank clears it, a date sets it.
- Repeat copy (`recurring_task_id` not null): due date required, as today. The form marks it required when `task.repeat_label` is set (the board always loads `recurringTask`; a deleted rule nulls `recurring_task_id`, so the two agree).
- No repeat on edit; `due_type` ignored on edit.

## Recurring first-occurrence rule
First date = `nextDueAfter(today − 1 day)` with today in Asia/Manila. Examples with today Thursday 2026-11-05: daily → 11-05; weekly Friday → 11-06; weekly Thursday → 11-05; monthly 5th → 11-05; monthly 10th → 11-10; monthly last day → 11-30; yearly March 15 → 2027-03-15 (created now, even though it is past the 14-day lead window). If `repeat_until` is before that date the request is refused.

## Every read of `due_date` and what changes

| Place | Today | Change |
|---|---|---|
| `Task::isOverdue()` | `$this->due_date->toDateString() < today` | `$this->due_date !== null && ...` |
| `Task::toPlannerArray()` | `due_date`, `due_label`, `due_in_days` from the date | `due_date` `?->format('Y-m-d')`; `due_label` `?->format('M d, Y') ?? 'No due date'`; `due_in_days` null when no date |
| `TeamTaskController::index` sort | `orderBy('due_date')` | `orderByRaw('due_date IS NULL')` then `orderBy('due_date')` (undated last; works on MariaDB and sqlite) |
| `index` `overdue` filter | `where('due_date', '<', $today)` | none (NULL never matches) |
| `statusCounts()` late, `overview()` overdue | `whereDate('due_date', '<', ...)` | none (NULL never matches) |
| `offices()` late | `$t->due_date->toDateString() < $today` (crashes on null) | `$t->isOverdue()` |
| `people()` `$bump` late | same crash | `$task->isOverdue() ? 1 : 0` |
| `TaskController::index` (Planner) sort | `orderBy('due_date')` | same `IS NULL` ordering |
| `TaskController::store/update` (employee) | required | unchanged (non-goal) |
| `EmployeeDashboardController` recent tasks | sort + `due_date`, `due_label`, `is_overdue` from the date (crash) | `IS NULL` ordering after the done ordering; `due_date` `?->format`; `due_label` `'No due date'` when null; `is_overdue` → `$task->isOverdue()` (same meaning) |
| `TaskAssignmentNotifier` message | `"title · due M d, Y · Assigned by X"` (crash) | omit the `· due ...` part when null: `"title · Assigned by X"` |
| `RecurringTaskGenerator` | sets a date on every copy | none |
| `RecurringTask` | `starts_on`, `last_due_date` | none (always set from a real date) |
| `ImportOfficeTaskLists` | placeholder date | none (non-goal) |
| `TaskBoard.jsx` `dueText` | returns `due_label` when `due_in_days` is not a number | none: shows "No due date" in the muted style |
| `TaskDetailModal.jsx` Due | `longDate(task.due_date)` (Invalid Date) | `task.due_date ? longDate(task.due_date) : 'No due date'` |
| `TeamTaskCalendar.jsx` | skips tasks without a key | add a "No date" strip under the grid listing undated tasks; each opens the detail window |
| `TeamTasks.jsx` optimistic move | `t.due_date < today` | `t.due_date !== null && t.due_date < today` |
| `Planner.jsx` calendar | skips tasks without a key | the same "No date" strip under the month grid (`visibleTasks` without a date), opening the detail window; board view already fine via `TaskBoard` |
| `Employee/Dashboard.jsx` | `Due: {task.due_label}` | `task.due_date ? \`Due: ${task.due_label}\` : 'No due date'` |
| `TaskFormModal.jsx` | due date always required | see Form behaviour |
| `TeamPeopleStrip.jsx`, `TeamStatusOverview.jsx` | read server counts | none |

## Form behaviour (`TaskFormModal.jsx`)
- Employee form (no `employees` prop): unchanged.
- Admin create: new state `dueType` (`'date'` default). The "Due Date" cell in the date/priority grid is not rendered; the old "Repeats" fieldset becomes a "When is it due?" fieldset with three labelled radios (`name="task-form-due-type"`): "Has a due date", "Recurring", "No due date". Below them:
  - Has a due date: the due date input (`id="task-form-due-date-input"`, required) and its error.
  - Recurring: the existing repeat controls; the frequency select loses "Does not repeat"; a hint "The first one is the next date on this schedule, from today." Picking Recurring with no frequency yet calls `chooseRepeat('monthly')`.
  - No due date: hint "Ongoing: it stays open until someone marks it done."
- `transform` (create) wraps the existing mode transform and adds `due_type: dueType`; for `recurring` also `due_date: ''`; for `none` `due_date: ''` and `repeat: ''`; for `date` `repeat: ''`.
- Admin edit: the Due Date cell stays; it is required (asterisk, `required`) only when `task.repeat_label`; otherwise the label reads "Due Date (optional)" with the hint "Leave empty for no due date." An undated task opens with an empty field (`task.due_date` null → `defaultDate` `''`).

## Risks
- **Employee editing an undated admin task assigned to them.** `TaskController::authorizeTask` lets the owner edit, and the Planner form requires a date and pre-fills the selected day, so saving there gives the task a date. Accepted for now (owner said the employee form is unchanged); owner to confirm.
- **sqlite `->change()`** rebuilds `tasks` in every test run; if it loses an index or foreign key, the existing `RecurringTaskGeneratorTest` duplicate tests or `SharedTaskModelTest` cascade tests fail, so the full suite is the check.
- **MariaDB ALTER** on a live table: small table, fast, but needs a backup first and the scratch up/down/up check.
- **Rollback** is blocked once anyone saves an undated task; that is intended.
- **A hand-made request** with `due_type=date` plus `repeat` still repeats (old behaviour: due date is the first occurrence). Only the form's `none` path is strict. Harmless.
- `repeat_*` sub-field `required_if:repeat,...` rules read raw input; the form sends `repeat=''` outside Recurring, so no false errors from the form.

## Left to the builder
- Exact Tailwind classes and spacing of the radios and the "No date" strip (follow the existing share radios and calendar chips).
- Placement of the strip inside `Planner.jsx` (directly after the 7-column day grid of the calendar panel).

## Tests
- Model and migration: undated task saves; planner array nulls and "No due date"; never overdue; rollback refuses with undated rows; notifier message without the due part (and unchanged with a date).
- Read paths: board and Planner sort undated last; late counts (status cards, Late only, overview, office tabs, people pills) ignore undated tasks; dashboard shows "No due date".
- Create / edit: none for copies, shared and whole office; none with a repeat refused; recurring first date for daily / weekly / monthly / last day / yearly with frozen time; far-future first copy created now and notified; Stop after before first date refused; recurring shared keeps people; `date` without a date refused; old payload without `due_type` still needs a date; edit clears and adds a date (ordinary and shared); repeat copy keeps a required date; edit cannot start a series; employee Planner form still needs a date.
- Existing tests unchanged and green.
