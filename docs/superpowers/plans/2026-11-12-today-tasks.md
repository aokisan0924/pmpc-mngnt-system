# Today's Tasks and Today Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Employees open My tasks on a "Today" list, and both task boards get a "Today & late" first column with quieter cards.

**Architecture:** The server adds one field (`done_on`) to each task. All grouping lives in one plain JS module, `resources/js/Components/taskGroups.js`, tested with `node --test`. `TaskBoard.jsx` and a new `TodayView.jsx` only render what that module returns.

**Tech Stack:** Laravel 13 / PHPUnit, React 19 + Inertia 3, Tailwind 4, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-12-today-tasks-design.md`

## Global Constraints

- "Today" is the Asia/Manila date: `new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })` (as `TeamTasks.jsx` already does).
- Late / due today come from the server's `due_in_days` (already Manila-based): `< 0` late, `0` today, `1` tomorrow.
- Employee accent `#0F6E56`, admin accent `#26215C`; every new surface needs dark-mode classes like its neighbours.
- No migration. No change to create, edit, repeat or save behaviour.
- Log every change under `## [Unreleased]` in `CHANGELOG.md`.
- Run `npm run build` after the frontend changes; built assets in `public/build` are committed.

## Review Focus

1. A card dragged to Done on Team tasks updates optimistically with `done_on` still `null`. It must show in Done at once, not vanish until reload. Treat `status === 'done' && done_on === null` as done today (Task 2 test).
2. A task with no due date must never appear in Today or the Today & late column. It stays in To do / Doing (Task 2 test).
3. A multi-day task that is past its end date is late, not "still running" (Task 2 test).
4. Dropping a To do or Doing card on the Today & late column must not save anything (Task 3, manual check in the browser).
5. Just after midnight Manila time (still the previous day in UTC), "today" must be the Manila date. The server side is already covered by `TaskDueInDaysTest`; the client helper takes `todayKey` as a parameter, so its tests pin it.

---

### Task 1: Send `done_on` with every task

**Files:**
- Modify: `app/Models/Task.php` (`toPlannerArray()`, around line 170)
- Test: `tests/Feature/TaskDoneOnTest.php`

**Interfaces:**
- Produces: `toPlannerArray()['done_on']`: `string|null`, `Y-m-d` in Asia/Manila, from `updated_at` when `status === 'done'`, else `null`.

- [ ] **Step 1: Write the failing test** `TaskDoneOnTest`, in the style of `TaskDueInDaysTest` (RefreshDatabase, `Carbon::setTestNow`, reset in `tearDown`).
  - `test_done_tasks_say_the_manila_date_they_were_finished`: set now to `2026-11-12 07:00` Asia/Manila (still Nov 11 in UTC), create a task with `status => 'done'`. Assert `toPlannerArray()['done_on'] === '2026-11-12'`.
  - `test_open_tasks_have_no_done_date`: `status => 'pending'`. Assert `done_on` is `null`.
- [ ] **Step 2: Run, expect failure:** `php artisan test --filter=TaskDoneOnTest`, which fails with an undefined index or null mismatch.
- [ ] **Step 3: Add the field** `'done_on' => $this->status === 'done' ? $this->updated_at?->timezone('Asia/Manila')->format('Y-m-d') : null,` next to `is_overdue`.
- [ ] **Step 4: Run, expect PASS:** `php artisan test --filter=TaskDoneOnTest`
- [ ] **Step 5: Commit** `feat(tasks): send the date a task was finished`

### Task 2: Grouping helper

**Files:**
- Create: `resources/js/Components/taskGroups.js`
- Test: `tests/js/taskGroups.test.js`

**Interfaces:**
- Consumes: task objects from `toPlannerArray()` (`status`, `priority`, `due_in_days`, `start_date`, `due_date`, `done_on`).
- Produces:
  - `manilaToday(): string`: today as `YYYY-MM-DD`.
  - `isTodayOrLate(task): boolean`: not done, `due_in_days !== null && due_in_days <= 0`.
  - `boardColumns(tasks, todayKey): { today: Task[], pending: Task[], doing: Task[], doneRecent: Task[], doneOlder: Task[] }`
    - `today`: `isTodayOrLate`, sorted by `due_in_days` ascending, then priority (high, medium, low).
    - `pending` / `doing`: the remaining not-done tasks by status, in their incoming order.
    - Done tasks: `doneRecent` if `(done_on ?? todayKey) >= todayKey minus 6 days`, else `doneOlder`.
  - `todayGroups(tasks, todayKey): { late, dueToday, running, tomorrow, doneToday }`, each a `Task[]` sorted by priority, except `late`, which sorts by `due_in_days` first.
    - `late`: not done, `due_in_days < 0`.
    - `dueToday`: not done, `due_in_days === 0`.
    - `running`: not done, `start_date && start_date <= todayKey && due_in_days > 0`.
    - `tomorrow`: not done, not in `running`, and (`due_in_days === 1` or `start_date === todayKey + 1 day`).
    - `doneToday`: done, `(done_on ?? todayKey) === todayKey`.
    - Undated tasks appear in none of these groups.
  - `PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }`. Unknown priority sorts last.

- [ ] **Step 1: Write the failing tests** in `tests/js/taskGroups.test.js` (`node:test`, `assert/strict`). Use `todayKey = '2026-11-12'` and a small `t(overrides)` factory.
  - `boardColumns puts late and due-today open tasks in today, late first`: tasks due -3 (low), 0 (high), 0 (low), 5 → `today` ids `[-3, 0-high, 0-low]`, `pending` holds the +5 task.
  - `a doing task due today stays in today`: `{status:'doing', due_in_days:0}` → in `today`, not in `doing`.
  - `undated open tasks stay in their status column`: `due_in_days:null` → in `pending`, not `today`.
  - `done this week vs older`: `done_on` `'2026-11-06'` → `doneRecent`; `'2026-11-05'` → `doneOlder`.
  - `a just-finished task with no done_on counts as done today`: `{status:'done', done_on:null}` → `doneRecent`, and in `todayGroups(...).doneToday`.
  - `todayGroups splits late, today, running, tomorrow`:
    - due -1 → `late`.
    - due 0 → `dueToday`.
    - start `'2026-11-10'`, due +3 → `running`.
    - due +1 → `tomorrow`.
    - start `'2026-11-13'`, due +4 → `tomorrow`.
  - `an overdue span is late, not running`: start `'2026-11-01'`, due -2 → `late` only.
  - `manilaToday returns the Manila date`: matches `/^\d{4}-\d{2}-\d{2}$/`.
- [ ] **Step 2: Run, expect failure:** `node --test tests/js/taskGroups.test.js`, which fails because the module isn't found.
- [ ] **Step 3: Implement** `taskGroups.js` with the signatures above. Do the date shifts on `YYYY-MM-DD` keys via `new Date(key + 'T00:00:00')` plus or minus days, then format with `toKey` the way `Planner.jsx` does.
- [ ] **Step 4: Run, expect PASS:** `node --test tests/js/`, all files green.
- [ ] **Step 5: Commit** `feat(tasks): group tasks into today, late and board columns`

### Task 3: "Today & late" column and quieter cards on both boards

**Files:**
- Modify: `resources/js/Components/TaskBoard.jsx`
- Modify: `resources/js/Pages/Admin/TeamTasks.jsx` (`moveTask` optimistic update: also set `done_on: status === 'done' ? today : null`)

**Interfaces:**
- Consumes: `boardColumns`, `manilaToday`, `isTodayOrLate` from Task 2.
- Produces: no new props. `TaskBoard`'s signature is unchanged.

- [ ] **Step 1: Columns.** Replace `COLUMNS` rendering with four sections from `boardColumns(tasks, manilaToday())`:
  - `Today & late` (key `today`, no status).
  - `To do` (`pending`), `Doing` (`doing`), `Done` (`doneRecent`).
  - Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4`.
  - The Today section gets an amber tint: `bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900`.
  - Section `aria-label`s: `"Today and late tasks"`, `"To do tasks"`, `"Doing tasks"`, `"Done tasks"`.
- [ ] **Step 2: Drag rule.**
  - Dropping on the Today section does nothing: no `onDragOver` highlight and no `onMove`.
  - Dropping on To do, Doing or Done keeps the current `handleDrop` (calls `onMove` when the status differs). A today card dropped on To do or Doing therefore stays in Today with a new label.
  - The employee move buttons (`showMoveButtons`) are unchanged.
- [ ] **Step 3: Done window.** Under Done, when `doneOlder.length > 0`, show a `Show older (n)` button, local `useState(false)`, that appends `doneOlder`.
- [ ] **Step 4: Card face.**
  - Remove the badges for `List:`, `↻ Repeats` and `Upcoming`, and the admin-only `Shared` badge next to the owner name.
  - Keep the `readOnly(task)` Whole office / Shared badge (employee board).
  - Cards in the Today column get a status label: Badge `slate`, `"To do"` or `"Doing"`.
  - Due text for late and today becomes a pill: late `bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300`, today `bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300`, `rounded px-1.5 font-semibold`.
  - Confirm `TaskDetailModal.jsx` still shows the list, repeat and shared info. If any is missing there, add it in the same commit.
- [ ] **Step 5: Optimistic `done_on`** in `TeamTasks.jsx` `moveTask`, as listed under Files.
- [ ] **Step 6: Verify.**
  - `npm run build` passes.
  - `php artisan test --filter=Task` is green.
  - In the browser, on `/admin/team-tasks` and `/employee/planner` (Board view):
    - A today card dragged to Doing stays in Today labelled "Doing".
    - The same card dragged to Done moves to Done immediately.
    - A To do card dropped on Today does not move.
    - Dark mode looks right.
    - At 375px width, the Today column comes first.
- [ ] **Step 7: Commit** `feat(tasks): today and late column, quieter task cards`

### Task 4: Employee "Today" view

**Files:**
- Create: `resources/js/Components/TodayView.jsx`
- Modify: `resources/js/Pages/Employee/Planner.jsx`

**Interfaces:**
- Consumes: `todayGroups`, `manilaToday` from Task 2.
- Produces: `TodayView({ tasks, onToggle(task), onOpen(task), onNew() })`.

- [ ] **Step 1: `TodayView`.** Render the groups in order, each hidden when empty:
  1. `Late` (rose heading).
  2. `Due today` (amber).
  3. `Still running` (teal; row shows `SpanProgress` and `ends <due_label>`).
  4. `Coming up tomorrow` (faded, `opacity-60`).
  5. `Done today` (ticked, struck through).

  Headings show their count.
  - Each row has:
    - The tick box, copied from the Planner agenda's `role="checkbox"` button. It calls `onToggle`.
    - The title button, which calls `onOpen`.
    - The priority badge and the late/today pill from Task 3.
    - For `employee_id === null`, the Whole office / Shared badge.
  - Empty state, when `late`, `dueToday` and `running` are all empty: "Nothing due today" plus a `+ New task` button (`onNew`). Tomorrow and Done today still render below it.
  - Wrap it in `Card` with the `employee-workspace-card` class, titled `Today · <weekday, Month day>`.
- [ ] **Step 2: Planner wiring.**
  - The view switch becomes `[['today','Today'],['calendar','Calendar'],['board','Board']]`, with `useState('today')`.
  - The month nav and filter group stay `calendar`-only.
  - Render `<TodayView tasks={tasks} onToggle={toggleDone} onOpen={t => setDetailId(t.id)} onNew={() => openNewTaskForm(todayKey)} />` when `view === 'today'`.
- [ ] **Step 3: Verify.**
  - `npm run build` passes.
  - In the browser at `/employee/planner`:
    - The page opens on Today.
    - Ticking a task moves it to Done today, at the bottom.
    - Unticking moves it back.
    - An employee with no tasks sees the empty state.
    - Dark mode and 375px width look right.
- [ ] **Step 4: Commit** `feat(planner): Today view opens My tasks`

### Task 5: Changelog and build

**Files:**
- Modify: `CHANGELOG.md`, `public/build/*`

- [ ] **Step 1:** Under `## [Unreleased]`:
  - Added: "Today view on My tasks: late, due today, still running, tomorrow and done today."
  - Added: "Today & late column on the task boards."
  - Changed: "Task cards show only due date and priority; Done shows the last 7 days with Show older."
- [ ] **Step 2:** Run `npm run build`, `node --test tests/js/` and `php artisan test`. All three must be green.
- [ ] **Step 3: Commit** `docs(changelog): today view and today column` including the rebuilt `public/build`.
