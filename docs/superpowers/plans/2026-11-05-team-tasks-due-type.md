# "When is it due?" and tasks with no due date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The admin New Task form asks "When is it due?" (Has a due date / Recurring / No due date). Undated tasks are real data (`tasks.due_date` nullable), shown as "No due date", sorted last and never late. Recurring tasks get their first date from the schedule.

**Architecture:** One migration makes `tasks.due_date` nullable. Every PHP and JSX reader of `due_date` handles null (SQL `<` comparisons already skip NULL; only PHP readers, sorting and display change). `TeamTaskRequest` gains a create-only `due_type` field and a `firstRepeatDate()` helper built on `RecurringTask::nextDueAfter`; `TeamTaskController::store` fills `due_date` from it for Recurring, so `createTask` stays unchanged. A request without `due_type` behaves exactly as today.

**Tech Stack:** Laravel 13, PHPUnit (sqlite in memory), MariaDB in production, Inertia/React 19, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-05-team-tasks-due-type-design.md`

## Global Constraints

- No new routes. Route names used: `team-tasks`, `team-tasks.store`, `team-tasks.update`, `team-tasks.status`, `employee.planner`, `employee.planner.update`, `employee.dashboard`.
- "Today" is always Asia/Manila (`now('Asia/Manila')` / `CarbonImmutable::now('Asia/Manila')`). Tests freeze time with `Carbon::setTestNow(...)`.
- Sorting undated last: `->orderByRaw('due_date IS NULL')->orderBy('due_date')` (MariaDB and sqlite both accept it). No `NULLS LAST` (MariaDB lacks it).
- The employee Planner form and `TaskController::store/update` validation do not change (due date stays required there).
- Repeat fields and `due_type` are create-only. A repeat copy (`recurring_task_id` not null) keeps a required due date on edit.
- Existing request shapes (employee form, single person, copies, shared, whole office, old repeat payload with `due_date`) keep working. Existing tests stay unchanged and green; none asserts that the admin form always needs a due date, so none is edited.
- `declare(strict_types=1);` in new PHP files; `vendor/bin/pint` on touched PHP; `npm run build` after frontend edits and commit `public/build`.
- Every code change gets a line under `## [Unreleased]` in `CHANGELOG.md` (Task 5).
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- No deploy, no migration on any shared or live database. The user approves the deploy separately; it needs a database backup first, and the migration must be tried up / down / up on a scratch MariaDB before release.

## Review Focus

- Null crashes: every `->due_date->` in `app/` is null-safe or provably on a dated task (generator, rule creation). `grep -rn "due_date->" app` after Task 2 lists only safe uses.
- Late counts: an undated task never adds to `status_counts.late`, `overview.overdue`, an office tab's `late`, a people pill's `late`, or the Late only list.
- Recurring first date: `nextDueAfter(today - 1 day)` gives "on or after today"; Stop after before it is refused; nothing is half-created on refusal.
- Back-compat: a request without `due_type` still requires `due_date` and, with `repeat`, still uses it as the first occurrence (`RecurringTaskAdminTest` unchanged).
- Edit: blank due date clears it for ordinary and shared tasks; refused for a repeat copy; `due_type` / `repeat` on edit never create a rule.
- Migration: `down()` refuses while undated rows exist; the `(recurring_task_id, due_date)` unique index survives the sqlite rebuild (generator duplicate tests stay green).

---

### Task 1: Migration, model and notifier handle a missing due date

**Files:**
- Create: `database/migrations/2026_11_05_130000_make_task_due_date_nullable.php`
- Modify: `app/Models/Task.php` (`isOverdue`, `toPlannerArray`), `app/Services/TaskAssignmentNotifier.php` (message)
- Test: `tests/Feature/TaskNoDueDateTest.php` (new), `tests/Feature/TaskAssignmentNotificationTest.php` (add one test)

**Interfaces:**
- Migration (`declare(strict_types=1);`, anonymous class like `2026_11_05_120000_create_task_assignees_tables.php`):
  - `up()`: `Schema::table('tasks', function (Blueprint $table) { $table->date('due_date')->nullable()->change(); });`
  - `down()`: `if (DB::table('tasks')->whereNull('due_date')->exists()) { throw new RuntimeException('Give every task a due date before rolling this migration back.'); }` then `Schema::table('tasks', function (Blueprint $table) { $table->date('due_date')->nullable(false)->change(); });`
  - Docblock: one line, "Tasks may have no due date (ongoing work)."
- `Task::isOverdue(): bool` → `return $this->due_date !== null && $this->due_date->toDateString() < now('Asia/Manila')->toDateString() && ! $this->isDone();`
- `Task::toPlannerArray()`:
  - `'due_date' => $this->due_date?->format('Y-m-d'),`
  - `'due_label' => $this->due_date?->format('M d, Y') ?? 'No due date',`
  - `'due_in_days' => $this->due_date === null ? null : (int) now('Asia/Manila')->startOfDay()->diffInDays($this->due_date->copy()->startOfDay(), false),`
- `TaskAssignmentNotifier::notify` message:
  ```php
  $message = implode(' · ', array_filter([
      $task->title,
      $task->due_date ? 'due '.$task->due_date->format('M d, Y') : null,
      'Assigned by '.trim($actor->first_name.' '.$actor->last_name),
  ]));
  ```
  Same text as today when there is a date.

- [ ] **Step 1: Write failing tests** in `TaskNoDueDateTest` (`RefreshDatabase`, `Carbon::setTestNow('2026-11-05 10:00', 'Asia/Manila')` in `setUp`, `tearDown` resets):
  - `test_a_task_can_be_saved_without_a_due_date`: `Task::create(['employee_id' => $e->id, 'title' => 'Ongoing', 'priority' => 'low', 'status' => 'pending'])` → `assertNull($task->fresh()->due_date)`.
  - `test_planner_array_of_an_undated_task_says_no_due_date`: `toPlannerArray()` → `due_date` null, `due_label` `'No due date'`, `due_in_days` null, `is_overdue` false.
  - `test_an_undated_open_task_is_never_overdue`: `assertFalse($task->isOverdue())` for status `pending` and `doing`.
  - `test_a_dated_task_keeps_its_planner_fields`: due `2026-11-04` → `due_date` `'2026-11-04'`, `due_label` `'Nov 04, 2026'`, `due_in_days` `-1`, `is_overdue` true.
  - `test_rollback_refuses_while_undated_tasks_exist`: one undated task; `$this->expectException(RuntimeException::class); (require base_path('database/migrations/2026_11_05_130000_make_task_due_date_nullable.php'))->down();`
  - In `TaskAssignmentNotificationTest` add `test_the_message_leaves_out_the_due_part_when_there_is_no_date`: admin Kurt Boss, active Maria; `Task::create([... 'assigned_by' => $admin->id, 'employee_id' => $maria->id, 'title' => 'Watch the page', 'priority' => 'low', 'status' => 'pending'])` with no `due_date`; `app(TaskAssignmentNotifier::class)->notify($task, $admin)` → Maria's `EmployeeNotification` `message` === `'Watch the page · Assigned by Kurt Boss'`. Then a dated task (`2026-11-20`) → `'... · due Nov 20, 2026 · Assigned by Kurt Boss'`. (Use the file's own admin/employee helpers and names if they differ; assert the exact strings the helpers produce.)
- [ ] **Step 2: Run** `php artisan test --filter='TaskNoDueDateTest|TaskAssignmentNotificationTest'`. Expected: FAIL (NOT NULL constraint on save; null `format()` crashes).
- [ ] **Step 3: Implement** the migration, model and notifier changes above.
- [ ] **Step 4: Run** `php artisan test --filter='TaskNoDueDate|TaskAssignment|TaskDueInDays|RecurringTask|SharedTaskModel'`. Expected: all pass (generator duplicate tests prove the unique index survived the sqlite rebuild). `vendor/bin/pint app database tests`.
- [ ] **Step 5: Commit** `feat(tasks): a task may have no due date`.

### Task 2: Boards, counts, Planner and dashboard read undated tasks

**Files:**
- Modify: `app/Http/Controllers/TeamTaskController.php` (`index` sort, `offices`, `people`), `app/Http/Controllers/TaskController.php` (`index` sort), `app/Http/Controllers/EmployeeDashboardController.php` (recent tasks)
- Test: `tests/Feature/TaskNoDueDateBoardTest.php` (new; helpers in the style of `TeamTaskStatusCountsTest` / `TeamTaskPeopleTest`, `Carbon::setTestNow('2026-11-04 10:00', 'Asia/Manila')`)

**Interfaces:**
- `TeamTaskController::index`: replace `->orderBy('due_date')` with `->orderByRaw('due_date IS NULL')->orderBy('due_date')`; the priority `orderByRaw` stays after it. Overdue filter, `statusCounts()`, `overview()`: no change.
- `offices()`: `'late' => $mine->filter(fn (Task $t) => $t->isOverdue())->count(),` (the query already selects only open tasks; `status` must be in the selected columns for `isOverdue()`: change `get(['id', 'employee_id', 'office', 'due_date'])` to `get(['id', 'employee_id', 'office', 'due_date', 'status'])`).
- `people()`: `$chips[$id]['late'] += $task->isOverdue() ? 1 : 0;` and add `'status'` to its `get([...])` columns likewise. Remove the now-unused `$today` variables in both methods.
- `TaskController::index`: same `orderByRaw('due_date IS NULL')->orderBy('due_date')`.
- `EmployeeDashboardController` recent tasks: after `->orderByRaw("CASE WHEN status = 'done' THEN 1 ELSE 0 END")` add `->orderByRaw('due_date IS NULL')`, keep `->orderBy('due_date')`; map:
  - `'due_date' => $task->due_date?->format('Y-m-d'),`
  - `'due_label' => match (true) { $task->due_date === null => 'No due date', $task->due_date->isToday() => 'Today', $task->due_date->isTomorrow() => 'Tomorrow', default => $task->due_date->format('M d') },`
  - `'is_overdue' => $task->isOverdue(),` (same meaning as the old `isPast() && ! isToday() && status !== 'done'`).

- [ ] **Step 1: Write failing tests** (admin, Maria in cubao; `task()` helper creates admin-assigned tasks; an undated task is created by omitting `due_date`):
  - `test_the_board_lists_undated_tasks_after_dated_ones`: tasks due `2026-11-20` ("Later"), undated ("Ongoing"), due `2026-11-01` ("Earlier") → `tasks` titles `['Earlier', 'Later', 'Ongoing']`; the "Ongoing" row has `due_date` null, `due_label` `'No due date'`, `is_overdue` false.
  - `test_an_undated_task_is_never_counted_late`: Maria has one late (`2026-11-01`) and one undated open task → `status_counts.todo` 2, `status_counts.late` 1, `overview.open` 2, `overview.overdue` 1, office tab `cubao` `open` 2 `late` 1, Maria's people pill `open` 2 `late` 1.
  - `test_late_only_leaves_out_undated_tasks`: `GET /admin/team-tasks?overdue=1` → titles only the late one.
  - `test_the_planner_lists_undated_tasks_last`: Maria `GET /employee/planner` with an undated and a dated task assigned to her → `tasks.0` dated, `tasks.1` undated with `due_label` `'No due date'`.
  - `test_the_dashboard_shows_no_due_date`: Maria `GET /employee/dashboard` → in `recentTasks` the undated task comes after the dated open task and has `due_date` null, `due_label` `'No due date'`, `is_overdue` false.
- [ ] **Step 2: Run** `php artisan test --filter=TaskNoDueDateBoardTest`. Expected: FAIL (sort puts NULL first; `offices()` / `people()` / dashboard crash on null).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `php artisan test --filter='TaskNoDueDate|TeamTask|TaskBoard|OfficeTasks|SharedTask|AuditFixRegression'`. Expected: all pass (`TeamTaskPeopleTest`, `TeamTaskStatusCountsTest`, `TeamTaskOverviewTest` unchanged). `grep -rn "due_date->" app` shows only null-guarded uses and dated-only code (`RecurringTaskGenerator`, `TeamTaskController::createTask` via `$fields`). Pint.
- [ ] **Step 5: Commit** `feat(tasks): undated tasks sort last and are never late`.

### Task 3: Create with "When is it due?" and edit an optional date

**Files:**
- Modify: `app/Http/Requests/TeamTaskRequest.php`, `app/Http/Controllers/TeamTaskController.php` (`store` only)
- Test: `tests/Feature/TeamTaskDueTypeTest.php` (new; `payload()` helper like `TeamTaskMultiAssignTest`; `Carbon::setTestNow('2026-11-05 10:00', 'Asia/Manila')`, a Thursday)

**Interfaces:**
- `TeamTaskRequest::rules()` (add at the top: `$dueType = $task === null ? $this->input('due_type') : null;`):
  - `'due_type' => [Rule::excludeIf(fn () => $task !== null), 'nullable', Rule::in(['date', 'recurring', 'none'])],`
  - `'due_date' => [Rule::excludeIf(in_array($dueType, ['recurring', 'none'], true)), Rule::requiredIf($task === null || $task->recurring_task_id !== null), 'nullable', 'date'],`
  - `'repeat' => ['nullable', Rule::requiredIf($dueType === 'recurring'), Rule::prohibitedIf($dueType === 'none'), Rule::in(RecurringTask::FREQUENCIES)],`
  - `'repeat_until' => ['nullable', 'date', ...($dueType !== 'recurring' && $this->filled('due_date') ? ['after_or_equal:due_date'] : [])],`
  - All other rules unchanged.
- `TeamTaskRequest::messages()` add `'repeat.required' => 'Choose how often it repeats.'`.
- New method on the request:
  ```php
  /** The first date on the chosen schedule on or after today (Manila), or null when "Stop after" comes first. */
  public function firstRepeatDate(): ?CarbonImmutable
  {
      $frequency = $this->input('repeat');

      return (new RecurringTask([
          'frequency' => $frequency,
          'day_of_week' => $this->input('repeat_day_of_week'),
          'day_of_month' => $this->input('repeat_day_of_month'),
          'last_day_of_month' => $frequency === 'monthly' && $this->boolean('repeat_last_day'),
          'month' => $this->input('repeat_month'),
          'ends_on' => $this->input('repeat_until'),
      ]))->nextDueAfter(CarbonImmutable::now('Asia/Manila')->subDay());
  }
  ```
- New `after()` hook on the request (Laravel FormRequest `after(): array`):
  ```php
  /** @return array<int, \Closure(Validator): void> */
  public function after(): array
  {
      return [function (Validator $validator): void {
          if ($this->route('task') === null && $this->input('due_type') === 'recurring'
              && $validator->errors()->isEmpty() && $this->firstRepeatDate() === null) {
              $validator->errors()->add('repeat_until', 'The repeat would stop before its first date.');
          }
      }];
  }
  ```
  Imports: `Carbon\CarbonImmutable`, `Illuminate\Validation\Validator`.
- `TeamTaskController::store`: right after `$data = $request->validated();` add
  ```php
  // Recurring has no date field: the first copy is the next date on its schedule.
  if ($request->input('due_type') === 'recurring') {
      $data['due_date'] = $request->firstRepeatDate()->toDateString();
  }
  ```
  `createTask` and `update` unchanged.

- [ ] **Step 1: Write failing tests** in `TeamTaskDueTypeTest` (admin Kurt; Maria and Juan active in cubao):
  - `test_no_due_date_works_for_copies_shared_and_whole_office`: `due_type=none` with `employee_ids=[maria, juan]` → 2 tasks, both `due_date` null; with `shared=true` → 1 more task, null; with `office=cubao, employee_id=''` (no `employee_ids`) → 1 more, null; `RecurringTask::count() === 0`; `assertSessionHasNoErrors()` each time.
  - `test_no_due_date_ignores_a_posted_date`: `due_type=none, due_date=2026-11-20` → task `due_date` null.
  - `test_no_due_date_cannot_repeat`: `due_type=none, repeat=monthly, repeat_day_of_month=5` → errors `repeat`; `Task::count() === 0`.
  - `test_recurring_sets_the_first_date_from_today`: weekly `repeat_day_of_week=5` with a posted `due_date=2026-12-25` → task `due_date` `2026-11-06`; rule `starts_on` and `last_due_date` `2026-11-06`; task `recurring_task_id` = rule id.
  - `test_recurring_starts_today_when_today_is_on_the_schedule`: daily → `2026-11-05`; weekly Thursday (`4`) → `2026-11-05`; monthly day 5 → `2026-11-05` (three posts, assert by title).
  - `test_recurring_monthly_last_day_and_later_day`: `repeat_last_day=true` → `2026-11-30`; monthly day 10 → `2026-11-10`.
  - `test_a_far_first_date_is_still_created_now_and_notified`: yearly `repeat_month=3, repeat_day_of_month=15` for Maria → task due `2027-03-15` exists now; Maria has 1 `task_assigned` notification.
  - `test_recurring_needs_a_frequency`: `due_type=recurring, repeat=''` → errors `repeat`; 0 tasks, 0 rules.
  - `test_recurring_that_stops_before_its_first_date_is_refused`: monthly day 10, `repeat_until=2026-11-08` → errors `repeat_until`; 0 tasks, 0 rules.
  - `test_recurring_shared_task_keeps_its_people`: `shared=true`, `employee_ids=[maria, juan]`, weekly Friday → 1 rule with 2 assignees, 1 task due `2026-11-06` with 2 assignees.
  - `test_has_a_due_date_still_needs_one`: `due_type=date`, no `due_date` → errors `due_date`.
  - `test_the_old_payload_without_due_type_still_needs_a_date`: no `due_type`, no `due_date` → errors `due_date`; 0 tasks.
  - `test_an_admin_can_clear_and_set_a_due_date_by_editing`: dated person task; `PATCH /admin/team-tasks/{id}` with `due_date=''` (plus title, priority, employee_id) → `due_date` null; PATCH `2026-11-30` → `2026-11-30`. Same clear for a shared task (`employee_ids` = its two people).
  - `test_a_repeat_copy_keeps_a_required_due_date`: create via `due_type=recurring` monthly day 10; PATCH the copy with `due_date=''` → errors `due_date`; `due_date` still `2026-11-10`.
  - `test_editing_cannot_start_a_series`: undated task; PATCH with `due_type=recurring, repeat=daily, due_date=''` → no errors, `RecurringTask::count() === 0`, `recurring_task_id` null, `due_date` null.
  - `test_the_employee_planner_form_still_needs_a_due_date`: Maria `POST /employee/planner` `['title' => 'Mine', 'priority' => 'low']` → errors `due_date`.
- [ ] **Step 2: Run** `php artisan test --filter=TeamTaskDueTypeTest`. Expected: FAIL (`due_type` unknown; due date always required).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `php artisan test --filter='TeamTask|RecurringTask|TaskAssignment|SharedTask|OfficeTasks'`. Expected: all pass, `RecurringTaskAdminTest` and `TeamTaskMultiAssignTest` unchanged. Pint.
- [ ] **Step 5: Commit** `feat(admin): choose when a task is due, including no due date`.

### Task 4: Frontend (form, detail, calendars, dashboard)

**Files:**
- Create: `resources/js/Components/UndatedTaskStrip.jsx`
- Modify: `resources/js/Components/TaskFormModal.jsx`, `resources/js/Components/TaskDetailModal.jsx`, `resources/js/Components/TeamTaskCalendar.jsx`, `resources/js/Pages/Admin/TeamTasks.jsx`, `resources/js/Pages/Employee/Planner.jsx`, `resources/js/Pages/Employee/Dashboard.jsx`

**Interfaces:**
- Consumes `due_date` (null when undated), `due_label` (`'No due date'`), `due_in_days` (null), `repeat_label` from Tasks 1 and 2, and the `due_type` request field from Task 3.
- `UndatedTaskStrip({ tasks, onOpen, label = t => t.title, focusRing = 'focus-visible:outline-indigo-600' })`: returns `null` when `tasks` is empty; otherwise a `<section aria-label="Tasks with no due date">` with heading `No date · {tasks.length}` and one `<button type="button">` chip per task calling `onOpen(task)`, styled like the calendar chips (done: `bg-field text-dim line-through`; open: `bg-indigo-500/10 text-[#26215C] dark:text-indigo-200`), `title={label(task)}`, wrapping (`flex flex-wrap gap-1`).
- `TaskBoard.jsx`: no change (its `dueText` already returns `due_label` when `due_in_days` is not a number).

- [ ] **Step 1: `TaskFormModal`:**
  - Add `const [dueType, setDueType] = useState('date')` and `const adminCreate = Boolean(employees) && !task`.
  - `chooseDueType(value)`: `setDueType(value)`; if `value === 'recurring' && !data.repeat` call `chooseRepeat('monthly')`.
  - Date/priority grid: render the Due Date cell only when `!adminCreate`. In it, `const dateRequired = !employees || Boolean(task?.repeat_label)`; label "Due Date" + red `*` when `dateRequired`, else "Due Date (optional)"; `required={dateRequired}`; when not required show `<p className="mt-1 text-xs text-sub">Leave empty for no due date.</p>`. Employee form output stays identical.
  - Replace the `employees && !task` "Repeats" fieldset with a "When is it due?" fieldset (legend in the existing legend style). Three radios in the style of the "How to give it" radios: `name="task-form-due-type"`, values `date` "Has a due date", `recurring` "Recurring", `none` "No due date". Then:
    - `date`: the due date input (`id="task-form-due-date-input"`, `type="date"`, `required`) and `errors.due_date`.
    - `recurring`: the existing frequency select (keep `id="task-form-repeat-input"`, visible label "How often", drop the "Does not repeat" option) and the existing weekday / month / day / last-day / "Show it days before" / "Stop after" blocks unchanged; hint `<p className="text-xs text-sub">The first one is the next date on this schedule, from today.</p>`; `errors.repeat`, `errors.repeat_until` as now.
    - `none`: `<p className="text-xs text-sub">Ongoing: it stays open until someone marks it done.</p>`.
  - `submit`: for `adminCreate`, wrap the existing mode transform: `const due = d => ({ ...d, due_type: dueType, ...(dueType === 'date' ? { repeat: '' } : { due_date: '' }), ...(dueType === 'none' ? { repeat: '' } : {}) })`; `transform(d => due(mode === 'people' ? {...existing...} : (({ employee_ids, ...rest }) => rest)(d)))`.
- [ ] **Step 2: Displays:**
  - `TaskDetailModal`: `<Detail label="Due">{task.due_date ? longDate(task.due_date) : 'No due date'}</Detail>`.
  - `TeamTaskCalendar`: `const undated = useMemo(() => tasks.filter(t => !t.due_date), [tasks])`; after the day grid `<UndatedTaskStrip tasks={undated} onOpen={onOpen} label={t => `${t.title}${ownerOf(t) ? ` · ${ownerOf(t)}` : ''}`} />` (with a `mt-3` wrapper or class).
  - `TeamTasks.jsx` optimistic move: `is_overdue: status !== 'done' && t.due_date !== null && t.due_date < today`.
  - `Planner.jsx`: `const undatedTasks = useMemo(() => visibleTasks.filter(t => !t.due_date), [visibleTasks])`; directly after the 7-column day grid in the calendar panel render `<UndatedTaskStrip tasks={undatedTasks} onOpen={t => setDetailId(t.id)} focusRing="focus-visible:outline-emerald-600" />`.
  - `Employee/Dashboard.jsx` line with `Due: {task.due_label}` → `{task.due_date ? `Due: ${task.due_label}` : 'No due date'}`.
- [ ] **Step 3: Verify** `npm run build` (no errors). Against the local scratch sqlite (`database/taskboard-preview.sqlite`, ADM-0001 / `password123`, localhost only; run `php artisan migrate` on that scratch file only; reseed if empty) in Chrome: create one task per choice for each of copies (2 people), shared and whole office; check "No due date" on the cards, they sort last, the Late number and pills do not count them, the calendar shows them in the "No date" strip and opens the detail window; a Recurring weekly task gets the next weekday as its date; edit an ordinary task to clear and then re-add the date; open a repeat copy's edit and confirm the date is required; log in as Maria and check Planner calendar strip, board card and dashboard text. Console clean; screenshot at phone width (375px) of the form in each choice.
- [ ] **Step 4: Commit** `feat(admin): when-is-it-due choice and no-date displays`, then `build: rebuild assets for due type`.

### Task 5: Docs and final checks

- [ ] **Step 1:** In `CHANGELOG.md` under `## [Unreleased]` > Added: "Admins choose when a new task is due: on a date, recurring (the first date is the next one on the schedule) or no due date for ongoing work. Undated tasks show 'No due date', sort last and are never late; an admin can add or remove a task's date by editing (repeat copies keep theirs)." Under Changed: "`tasks.due_date` may be empty (migration `2026_11_05_130000_make_task_due_date_nullable`)." Run `vendor/bin/pint --test app database tests`, `php artisan test` (only the known JPEG error allowed), `npm run build` (no diff in `public/build` after the Task 4 commit).
- [ ] **Step 2: Commit** `docs: changelog for due type`. Do not deploy. The deploy (user approves separately) needs: a database backup first; the migration tried up / down / up on a scratch MariaDB copy before release; then the standard deploy in AGENTS.md section 7 and a `DEPLOYMENTS.md` entry.
