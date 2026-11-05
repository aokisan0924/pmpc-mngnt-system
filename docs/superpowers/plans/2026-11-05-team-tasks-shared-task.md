# One shared task for several people Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins can create one shared task for several chosen people: one status, done once, movable by any of them.

**Architecture:** A pivot `task_assignees` (and `recurring_task_assignees` for repeat rules) lists the people. A shared task has `employee_id` and `office` both null (`Task::isShared()`). Every per-person and per-office query adds an EXISTS (`whereHas`) branch on the pivot, so one task stays one row and every count counts it once. The form gets a copy-or-shared choice; the edit form edits the people.

**Tech Stack:** Laravel 13, PHPUnit (sqlite), MariaDB in production, Inertia/React 19, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-05-team-tasks-shared-task-design.md`

## Global Constraints

- Admin routes stay in the existing `super_admin` group; no new routes. Route names used: `team-tasks`, `team-tasks.store`, `team-tasks.update`, `team-tasks.status`, `team-tasks.destroy`, `employee.planner`, `employee.planner.status`, `employee.planner.toggle`, `employee.planner.update`, `employee.planner.destroy`.
- Never join the pivot in a counted or listed query: use `whereHas` / `orWhereHas` only (EXISTS), so nothing is counted twice.
- Every query serialised to Inertia eager loads `assignees`; no per-task query.
- Multi-row writes (task + pivot, rule + pivot, generator create + sync, edit + sync) in `DB::transaction`; notify after commit.
- Never create a task with both `employee_id` and `office` null except a shared task.
- Existing tests stay unchanged and green (copies, single person, whole office, repeats).
- `declare(strict_types=1);` in new PHP files; `vendor/bin/pint` on PHP; `npm run build` after frontend edits and commit `public/build`.
- Every code change gets a line under `## [Unreleased]` in `CHANGELOG.md` (Task 8).
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- No deploy, no migration on any shared database. The user approves deploys separately.

## Review Focus

- Visibility leaks: a shared task must not reach a same-office colleague who is not on it, nor employees with no office (notifier `where('payroll_office', null)` becomes `IS NULL`).
- `whole` filter and "Whole office" chip must not pick up shared tasks (`employee_id` null).
- Double counting: status cards, overview, Late only count a shared task once; a pill counts it once per person; office tabs once per office.
- N+1: board, Planner, `people()`, `offices()`, generator all eager load `assignees`.
- Repeat generation: rerun creates no duplicate task and no duplicate pivot row; a failure between create and sync leaves nothing half-made.
- Migration `down()` on MariaDB: drops whole tables (no lone unique-index drop), refuses while shared tasks exist.
- Edit: `employee_ids` still ignored for non-shared tasks; inactive people already on the task do not block a save.

---

### Task 1: Migration and models

**Files:**
- Create: `database/migrations/2026_11_05_120000_create_task_assignees_tables.php`
- Modify: `app/Models/Task.php`, `app/Models/RecurringTask.php`
- Test: `tests/Feature/SharedTaskModelTest.php` (new)

**Interfaces:**
- Tables exactly as in the spec "Data model" (`task_assignees`: `task_id` FK `tasks` cascade, `employee_id` FK `employees` cascade, composite primary key `[task_id, employee_id]` and no `id` column, so `assignees:id,...` eager loads never hit an ambiguous `id`; `recurring_task_assignees`: same with `recurring_task_id` FK `recurring_tasks` cascade). No timestamps.
- `down()`: `if (DB::table('task_assignees')->exists()) throw new RuntimeException('Delete the shared tasks before rolling this migration back.');` then `Schema::dropIfExists('recurring_task_assignees'); Schema::dropIfExists('task_assignees');`.
- `Task::assignees(): BelongsToMany` (`belongsToMany(Employee::class, 'task_assignees')->orderBy('first_name')->orderBy('last_name')`), `Task::isShared(): bool`, `Task::isOfficeWide()` now `employee_id === null && office !== null`.
- `RecurringTask::assignees(): BelongsToMany` (`belongsToMany(Employee::class, 'recurring_task_assignees')`).
- `Task::toPlannerArray()` adds `'is_shared' => $this->isShared()` and `'assignees' => $this->isShared() && $this->relationLoaded('assignees') ? $this->assignees->map(fn (Employee $e) => ['id' => $e->id, 'name' => trim($e->first_name.' '.$e->last_name), 'office' => $e->payroll_office, 'active' => $e->status === 'active'])->values()->all() : []`.

- [ ] **Step 1: Write failing tests** in `SharedTaskModelTest`:
  - `test_a_task_with_no_person_and_no_office_is_shared_and_not_office_wide`: assert `isShared()` true, `isOfficeWide()` false; an office task is office-wide and not shared; a person task is neither.
  - `test_assignees_are_ordered_by_name_and_go_away_with_the_task`: attach two, assert names order; `$task->delete()` → `DB::table('task_assignees')->count() === 0`.
  - `test_the_same_person_cannot_be_on_a_task_twice`: second `attach` of the same id throws `QueryException`.
  - `test_planner_array_lists_assignees_only_when_loaded`: `load('assignees')` → `is_shared` true and `assignees` = `[{id,name,office,active}]` with an inactive one `active` false; without loading → `[]`.
  - `test_rule_assignees_relation_works`: attach to a `RecurringTask`, count 2.
  - `test_rollback_refuses_while_shared_tasks_exist`: `(require base_path('database/migrations/2026_11_05_120000_create_task_assignees_tables.php'))->down()` with one pivot row → `expectException(RuntimeException::class)`.
- [ ] **Step 2: Run** `php artisan test --filter=SharedTaskModelTest`. Expected: FAIL (table/methods missing).
- [ ] **Step 3: Implement** the migration and model methods above.
- [ ] **Step 4: Run** `php artisan test --filter='SharedTaskModel|Task|Office|Recurring'`. Expected: all pass; `vendor/bin/pint app database tests`.
- [ ] **Step 5: Commit** `feat(tasks): shared task assignees tables and model`.

### Task 2: Employee visibility and moving

**Files:**
- Modify: `app/Models/Task.php` (`scopeVisibleTo`), `app/Http/Controllers/TaskController.php` (`index`, `authorizeMove`)
- Test: `tests/Feature/SharedTaskEmployeeTest.php` (new; helpers in the style of `OfficeTasksTest::plannerTitles`)

**Interfaces:**
- `scopeVisibleTo`: inside the existing group add `$q->orWhereHas('assignees', fn (Builder $a) => $a->where('employees.id', $employee->id));`.
- `TaskController::index` eager loads `['assigner', 'recurringTask', 'assignees']`.
- `authorizeMove`: allowed also when `$task->isShared() && $task->assignees()->whereKey($user->id)->exists()`. `authorizeTask` unchanged (shared → 403).

- [ ] **Step 1: Write failing tests** (shared task made with `Task::create([... 'employee_id' => null, 'office' => null, 'assigned_by' => $admin->id])` + `assignees()->attach`):
  - `test_each_person_on_a_shared_task_sees_it_and_nobody_else_does`: Maria (cubao) and Juan (main_office) on it see it in Planner; Ana (cubao, not on it) and Pedro (`payroll_office` null) do not.
  - `test_planner_task_says_it_is_shared_with_the_names`: props `tasks.0.is_shared` true, `tasks.0.assignees` has 2 names.
  - `test_a_person_on_it_can_move_it_and_toggle_it`: `PATCH /employee/planner/{id}/status` `doing` → 302, status `doing`; `PATCH .../toggle` → `done`.
  - `test_someone_not_on_it_cannot_move_it`: Ana → 403, status unchanged.
  - `test_a_person_on_it_cannot_edit_or_delete_it`: `PATCH /employee/planner/{id}` and `DELETE` → 403, task unchanged.
  - `test_employee_dashboard_lists_the_shared_task_for_people_on_it_only`: `/employee/dashboard` prop `recentTasks` (use the prop name in `EmployeeDashboardController`) contains the title for Maria, not for Ana.
- [ ] **Step 2: Run** `php artisan test --filter=SharedTaskEmployeeTest`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `php artisan test --filter='SharedTask|OfficeTasks|TaskBoard|TaskDueInDays'`. Expected: pass; pint.
- [ ] **Step 5: Commit** `feat(planner): people on a shared task see and move it`.

### Task 3: Notifier shared branch

**Files:**
- Modify: `app/Services/TaskAssignmentNotifier.php`
- Test: `tests/Feature/TaskAssignmentNotificationTest.php` (add tests)

**Interfaces:**
- `public function notify(Task $task, Employee|int $actor, ?array $onlyEmployeeIds = null): void`. Recipients: if `$task->isShared()` → `$task->assignees()->where('status', 'active')->get()`, else the existing two branches. The shared branch must be checked first. When `$onlyEmployeeIds !== null`, keep only those ids. Actor still rejected. Existing callers unchanged.

- [ ] **Step 1: Write failing tests:**
  - `test_a_shared_task_notifies_each_active_person_on_it_once`: two active + one inactive on it → counts `[1, 1, 0]`, admin 0.
  - `test_a_shared_task_never_notifies_people_without_an_office`: an active employee with `payroll_office` null not on the task → 0.
  - `test_only_the_given_people_are_notified_when_a_list_is_passed`: `notify($task, $admin, [$juan->id])` → Maria 0, Juan 1.
- [ ] **Step 2: Run** `php artisan test --filter=TaskAssignmentNotificationTest`. Expected: new tests FAIL (the no-office one shows the leak).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `php artisan test --filter='TaskAssignment|Recurring|TeamTask'`. Expected: pass; pint.
- [ ] **Step 5: Commit** `feat(tasks): notify the people on a shared task`.

### Task 4: Create and edit a shared task

**Files:**
- Modify: `app/Http/Requests/TeamTaskRequest.php`, `app/Http/Controllers/TeamTaskController.php` (`store`, `createTask`, `update`)
- Test: `tests/Feature/TeamTaskSharedTest.php` (new; same `payload()` / `create()` helpers as `TeamTaskMultiAssignTest`)

**Interfaces:**
- Request: `$task = $this->route('task'); $sharedEdit = $task?->isShared() ?? false; $shared = $this->boolean('shared') || $sharedEdit;`
  - `'shared' => [Rule::excludeIf(fn () => $task !== null), 'nullable', 'boolean']`.
  - `'employee_ids' => [Rule::excludeIf(fn () => $task !== null && ! $sharedEdit), Rule::requiredIf($shared), 'nullable', 'array', $shared ? 'min:2' : 'min:1', 'max:25']`.
  - `'employee_ids.*'`: same exclude; `integer`, `distinct`, exists in `employees` where `status = active` OR id in `$sharedEdit ? $task->assignees()->pluck('employees.id')->all() : []` (`->when($ids, fn ($q) => $q->orWhereIn('id', $ids))`).
  - `messages()`: `'employee_ids.min' => $shared ? 'A shared task needs at least two people.' : 'Choose at least one person.'`; `'employee_ids.required' => 'A shared task needs at least two people.'`.
- Controller:
  - `createTask(Request $request, array $data, array $assigneeIds = []): Task`: unchanged fields; when `$assigneeIds` is non-empty, `$rule?->assignees()->attach($assigneeIds)` and `$task->assignees()->attach($assigneeIds)`.
  - `store`: if `$request->boolean('shared')`: `$ids = array_map('intval', $data['employee_ids'])`; `DB::transaction` → `createTask($request, [...Arr::except($data, ['employee_ids', 'employee_id', 'office', 'shared']), 'employee_id' => null, 'office' => null], $ids)` (no `withOffice`); then notify once; flash `"Shared task added for ".count($ids)." people."`. Otherwise the existing code, untouched.
  - `update`: if `$task->isShared()`: `DB::transaction` → `$task->update(Arr::only($request->validated(), ['title', 'description', 'due_date', 'category', 'priority']))`, `$changes = $task->assignees()->sync(array_map('intval', $request->validated('employee_ids')))`; after commit, if `$changes['attached']` non-empty → `notify($task, $request->user(), $changes['attached'])`; flash `Task updated.`; return. Non-shared path unchanged. The repeat rule is not touched.

- [ ] **Step 1: Write failing tests:**
  - `test_shared_makes_one_task_with_every_person_on_it`: 3 people, `shared => true` → `Task::count() === 1`, `employee_id` and `office` null, `assigned_by` admin, 3 pivot rows; flash `Shared task added for 3 people.`.
  - `test_shared_needs_at_least_two_people`: one id → error `employee_ids` with message `A shared task needs at least two people.`; zero tasks.
  - `test_shared_ignores_office_and_employee_id`: with `office` and `employee_id` posted → still one shared task, `office` null.
  - `test_each_person_is_notified_once_and_the_admin_is_not` (shared): counts `[1,1,0]`.
  - `test_an_invalid_person_creates_nothing`: inactive id → error `employee_ids.1`, zero tasks, zero pivot rows, zero notifications.
  - `test_a_repeating_shared_task_makes_one_rule_with_the_same_people`: `repeat => monthly`, `repeat_day_of_month => 5` → 1 rule, rule `employee_id`/`office` null, `rule->assignees` = the 2 ids, 1 task with the 2 ids.
  - `test_without_shared_the_copies_path_is_unchanged`: two ids without `shared` → 2 tasks, 0 pivot rows.
  - `test_admin_changes_who_is_on_a_shared_task_and_only_new_people_are_told`: on [A,B], PATCH with [B,C] → assignees [B,C], C notified once, A and B not; `employee_id`/`office` still null.
  - `test_editing_a_shared_task_needs_two_people_and_keeps_inactive_people_valid`: PATCH [A] → error; B deactivated, PATCH [A,B] → no errors.
  - `test_editing_a_normal_task_still_ignores_employee_ids`: existing behaviour holds with `employee_ids` posted.
  - `test_editing_people_does_not_change_the_repeat_rule`: rule assignees unchanged after PATCH.
- [ ] **Step 2: Run** `php artisan test --filter=TeamTaskSharedTest`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `php artisan test --filter='TeamTask|Recurring|TaskAssignment'`. Expected: all pass (including `TeamTaskMultiAssignTest` unchanged); pint.
- [ ] **Step 5: Commit** `feat(admin): create and edit a shared task`.

### Task 5: Admin board queries (filters, pills, tabs, counts)

**Files:**
- Modify: `app/Models/Task.php` (two scopes), `app/Http/Controllers/TeamTaskController.php` (`index`, `offices`, `people`)
- Test: `tests/Feature/TeamTaskSharedBoardTest.php` (new; helpers like `TeamTaskPeopleTest`, `Carbon::setTestNow('2026-11-04 10:00', 'Asia/Manila')`)

**Interfaces:**
- `scopeForPerson(Builder $query, int $employeeId): Builder` → `$query->where(fn ($q) => $q->where('employee_id', $employeeId)->orWhereHas('assignees', fn ($a) => $a->where('employees.id', $employeeId)))`.
- `scopeInOffice(Builder $query, string $office): Builder` → `$query->where(fn ($q) => $q->where('office', $office)->orWhereHas('assignees', fn ($a) => $a->where('payroll_office', $office)))`.
- `index` `$scoped`: `->when($employeeId, fn ($q) => $q->forPerson($employeeId))`, `->when($office, fn ($q) => $q->inOffice($office))`, `->when($whole, fn ($q) => $q->whereNull('employee_id')->whereNotNull('office'))`. Board `with([...'assignees'])`.
- `offices()`: `->with('assignees:id,payroll_office')->get(['id', 'employee_id', 'office', 'due_date'])`; per key `$tasks->filter(fn (Task $t) => $t->office === $key || ($t->isShared() && $t->assignees->contains('payroll_office', $key)))`.
- `people(?string $office)`: `->when($office, fn ($q) => $q->inOffice($office))`, `->with(['employee:id,first_name,last_name,status', 'assignees:id,first_name,last_name,status,payroll_office'])`; for a shared task, bump `employee:{id}` for each assignee with `status === 'active'` and (`! $office` or `payroll_office === $office`); never the whole chip. Extract the chip bump into a local closure `$bump(string $id, array $chip, Task $task)`.
- `overview()`, `statusCounts()`: no code change.

- [ ] **Step 1: Write failing tests** (one shared task on Maria (cubao) and Juan (main_office), open, late, plus one plain cubao copy for Maria):
  - `test_board_shows_the_shared_task_once_with_all_names`: `tasks` has it once, `assignees` 2 names.
  - `test_status_cards_and_overview_count_it_once`: `status_counts.todo === 2`, `status_counts.late` counts it once, `overview.open === 2`.
  - `test_each_persons_pill_counts_it`: Maria `open 2`, Juan `open 1`, both `late` include it; no `whole` chip in `?office=cubao` from it.
  - `test_with_an_office_chosen_only_that_offices_people_get_the_pill`: `?office=cubao` → Maria chip yes, Juan chip no.
  - `test_office_tabs_count_it_for_each_office_of_its_people`: cubao `open 2`, main_office `open 1`, fort_magsaysay 0; sum > `overview.open`.
  - `test_person_and_office_filters_include_it_and_whole_does_not`: `?employee_id={juan}` → it; `?office=main_office` → it; `?office=cubao&whole=1` → not it.
  - `test_inactive_people_get_no_pill_but_the_task_still_counts`: deactivate Juan → no Juan chip, main_office tab still 1.
  - `test_the_board_loads_assignees_without_a_query_per_task`: warm-up `GET /admin/team-tasks`; `DB::enableQueryLog()`, GET with 2 shared tasks → count; add 4 more shared tasks; GET again → `assertSame` query counts.
- [ ] **Step 2: Run** `php artisan test --filter=TeamTaskSharedBoardTest`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `php artisan test --filter='TeamTask|OfficeTasks'`. Expected: all pass (`TeamTaskPeopleTest`, `TeamTaskStatusCountsTest`, `TeamTasksTest` unchanged); pint.
- [ ] **Step 5: Commit** `feat(admin): shared tasks in pills, office tabs and counts`.

### Task 6: Repeats carry the people

**Files:**
- Modify: `app/Services/RecurringTaskGenerator.php`
- Test: `tests/Feature/RecurringTaskGeneratorTest.php` (add tests, reuse its rule helper)

**Interfaces:**
- `run()`: `RecurringTask::where('active', true)->with('assignees:id')->orderBy('id')->each(...)`.
- `generateFor`: `$ids = $rule->assignees->pluck('id')->all();` wrap `firstOrCreate` and, when `$task->wasRecentlyCreated && $ids !== []`, `$task->assignees()->sync($ids)` in one `DB::transaction(fn () => ...)` that returns the task; notify after it as now. Rule `employee_id`/`office` (null) copy through unchanged.

- [ ] **Step 1: Write failing tests:**
  - `test_a_shared_rule_makes_one_shared_task_per_date_with_the_same_people`: rule with 2 assignees, run → 1 task, `employee_id`/`office` null, assignees = the 2 ids.
  - `test_running_a_shared_rule_twice_adds_no_task_and_no_pivot_row`: run twice → task count and `task_assignees` count unchanged.
  - `test_each_person_on_a_shared_copy_is_notified_once_and_the_admin_never`: counts `[1,1,0]`.
- [ ] **Step 2: Run** `php artisan test --filter=RecurringTaskGeneratorTest`. Expected: new tests FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `php artisan test --filter='Recurring|TeamTask|TaskAssignment'`. Expected: pass; pint.
- [ ] **Step 5: Commit** `feat(tasks): repeating shared tasks keep their people`.

### Task 7: Frontend (form, board, detail, calendar, planner)

**Files:**
- Modify: `resources/js/Components/TaskFormModal.jsx`, `resources/js/Components/TaskBoard.jsx`, `resources/js/Components/TaskDetailModal.jsx`, `resources/js/Components/TeamTaskCalendar.jsx`, `resources/js/Pages/Employee/Planner.jsx`

**Interfaces:**
- Consumes `task.is_shared` and `task.assignees` (`[{id, name, office, active}]`) from Tasks 1 and 5, and the `shared` / `employee_ids` request fields from Task 4.
- Helper (local in each file that needs it, or exported from `TaskBoard.jsx` as `sharedNames(task)`): `task.assignees.map(a => a.active ? a.name : `${a.name} (inactive)`).join(', ') || 'No one yet'`.

- [ ] **Step 1: `TaskFormModal`:** add state `share` (`'copies' | 'shared'`, default `'copies'`). In "Specific people" create mode, when `data.employee_ids.length >= 2`, show a `fieldset` with legend "How to give it" and two labelled radios: "Each person gets their own copy" / "One shared task" (hint under shared: "One task for everyone on it; any of them can move it."). Transform in people mode adds `shared: share === 'shared' && d.employee_ids.length >= 2`. For an edit of a shared task (`task?.is_shared`): initial `employee_ids` = `task.assignees.map(a => a.id)`; show `PeoplePicker` with `employees` plus inactive assignees appended (`{ id, name: `${name} (inactive)`, office }`); hide the Employee and Office selects. Errors for `employee_ids` / `employee_ids.*` show in the picker (existing expression).
- [ ] **Step 2: `TaskBoard`:** with `showOwner` and `task.is_shared`, the owner line shows `sharedNames(task)` with a `Badge` "Shared"; for employees (`readOnly`), the badge reads "Shared" instead of "Whole office" when `task.is_shared`.
- [ ] **Step 3: `TaskDetailModal`:** `wholeOffice = !task.is_shared && task.employee_id === null`; when shared, `<Detail label="Shared with">{sharedNames(task)}</Detail>` for admin and employee. `TeamTaskCalendar.ownerOf`: shared → first assignee's first name plus ` +${n - 1}` when more, `'No one'` when empty. `Planner.jsx` list badge: shared → "Shared · N people", else the existing "Whole office" badge.
- [ ] **Step 4: Verify** `npm run build`; against the scratch sqlite (`database/taskboard-preview.sqlite`, ADM-0001 / `password123`, localhost only; reseed if empty) in Chrome: create a shared task for 3 people from two offices, check one card with three names, pills and tabs counts, edit it (remove one, add one), log in as one of the people and move it to Doing, log in as a same-office colleague not on it and confirm it is absent; the copies choice still makes copies; console clean; screenshot at phone width.
- [ ] **Step 5: Commit** `feat(admin): shared task option and display`, then `build: rebuild assets for shared tasks`.

### Task 8: Docs and final checks

- [ ] **Step 1:** In `CHANGELOG.md` (Unreleased > Added) add: admins can give one shared task to several people; any of them can move it, one status for everyone, each is notified, repeats keep the same people; the admin can change who is on it. Under AGENTS.md section 4 nothing changes. Run `vendor/bin/pint --test app database tests`, `php artisan test` (only the known JPEG error allowed), `npm run build`.
- [ ] **Step 2: Commit** `docs: changelog for shared tasks`. Do not deploy; the user approves that separately. The deploy needs a database backup first (new migration).
