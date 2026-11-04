# Team tasks overview, calendar and repeating tasks: implementation plan

> Executed inline (native). Spec: `docs/superpowers/specs/2026-11-04-team-tasks-overview-calendar-recurring-design.md`.

**Goal:** Overview strip + Calendar tab on admin Team tasks, and repeating tasks on a fixed schedule created from a repeat rule.
**Architecture:** `recurring_tasks` rule table + `tasks.recurring_task_id`; a `RecurringTaskGenerator` service run by a daily command, a once-per-day guard on admin page opens, and on rule creation; copies are normal tasks.
**Tech:** Laravel 13, Inertia/React, PHPUnit (sqlite), Pint, Vite.

## Global constraints
Asia/Manila dates; `declare(strict_types=1)` and Form Requests in new PHP; reuse `EmployeeNotification::send` via one shared notifier; copies capped at 31 per rule per run and only for due dates within the last 31 days; unique index (`recurring_task_id`, `due_date`); same cleanup rules for UI text; Calendar and Overview ignore nothing the board already hides except overview covers all admin-assigned tasks.

## Review focus
No duplicate copies on repeated runs; month-end rules (31st, Feb, last day) correct; stopping keeps copies; overview numbers match the board; employees cannot stop repeats; notification fires once per copy and never for the rule owner.

### Task 1: rules, generator, command (backend core)
Files: 2 migrations, `app/Models/RecurringTask.php`, `app/Services/RecurringTaskGenerator.php`, `app/Services/TaskAssignmentNotifier.php` (extracted from `TeamTaskController`), `app/Console/Commands/GenerateRecurringTasks.php`, `routes/console.php`, `app/Models/Task.php` (relation, fillable), tests `RecurringTaskGeneratorTest`.
- [ ] Tests first (RED): next-date maths (daily/weekly/monthly incl. 31st and last day/yearly incl. Feb 29), lead window, catch-up within 31 days and skipping older, cap, ends_on, inactive, idempotent, notification once and not to owner, once-per-day guard.
- [ ] Implement; run tests (GREEN); commit.

### Task 2: create, stop, delete from the admin endpoints
Files: `TeamTaskRequest`, `TeamTaskController` (store creates rule + first copy; `stopRepeat`; `destroy` with `stop_repeat`), routes, `Task::toPlannerArray` (`repeat_label`, `repeat_active`), tests.
- [ ] Tests first; implement; commit.

### Task 3: overview numbers
Files: `TeamTaskController::index` returns `overview` (overdue, due_this_week, open, done_this_week, by_owner), guarded generator call on index and the admin dashboard; tests.
- [ ] Tests first; implement; commit.

### Task 4: frontend
Files: `TeamTasks.jsx` (overview strip, Board | Calendar), new `TeamTaskCalendar.jsx`, `TaskFormModal.jsx` (Repeats fields, create only), `TaskDetailModal.jsx` (repeat line + Stop repeating), delete dialog checkbox, ↻ marks.
- [ ] Build; check in the browser (Chrome extension on live after deploy, local pane unavailable); commit.

### Task 5: final checks
- [ ] Pint, full tests, Node tests, build, changelog, commits, ask before deploy (migrations need a database backup first).
