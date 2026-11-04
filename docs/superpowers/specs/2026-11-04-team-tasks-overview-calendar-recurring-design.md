# Team tasks: overview, calendar and repeating tasks (design)

Date: 2026-11-04. Status: awaiting approval. Size: project (one new table, one job, three UI pieces). Builds on the Team tasks design
(`2026-11-04-task-board-design.md`) and the office tasks design.

## Intent
Kurt enters bills and reminders himself and wants the ones that come round again (monthly bills, remittances, a weekly chore) to
appear on a fixed schedule without re-typing them. He also wants an at-a-glance view of the team's tasks and a calendar for the admin Team
tasks page, like the one employees already have.

## Goals
1. **Overview strip** at the top of Team tasks (chosen layout "A"): Overdue, Due this week, Open, Done this week, and a "by person (open)" list.
2. **Calendar tab** next to the Board (Board | Calendar): a month grid of the same tasks, with the owner's name on each chip, red for overdue,
   a ↻ mark on tasks that came from a repeat, click a chip to open the existing detail window.
3. **Repeating tasks on a fixed schedule:** an admin sets "Repeats" on a task. New copies appear automatically on schedule whether or not the
   previous copy was ticked off. Overdue copies simply stay overdue.

## Non-goals
- No "repeat after I tick it done" mode, no every-2-weeks or custom intervals, no end-after-N-times (end date only), no skipping holidays or
  weekends, no employee-created repeating tasks (admins only), no bulk editing of past copies.
- No Google Calendar sync.

## Anti-goals
- Never create the same copy twice, and never flood: a long outage must not produce hundreds of tasks.
- Stopping a repeat never deletes copies that already exist.
- Employees' personal tasks are not affected, and employees cannot stop or change a repeat.

## Constraints
- Laravel 13, Inertia/React; follow the existing patterns (Form Requests, `assignedByAdmin` scope, `Task::toPlannerArray`, `EmployeeNotification::send`).
- Asia/Manila dates. Admin accent indigo. Same cleanup rules as the rest of the admin screens: no filler text.
- **The server scheduler is not reliably running.** The `schedule:run` cron cannot be inspected from the shell (it is configured in Hostinger's
  panel), and the evidence says the 6pm attendance job did not run on Nov 3 (those rows were created by an admin opening a page the next
  morning). So repeat generation must not depend on cron alone (see Design).

## Approaches considered (decided with Kurt)
A. **A separate "repeat rule" row behind each series (chosen).** Copies are normal tasks, so the board, calendar, notifications and detail
   window work unchanged. B. Repeat fields on the task itself (editing or stopping a series is awkward). C. Show future copies without
   saving them (cannot tick off, assign or notify).
Overview layout: **A** (strip always on top, then Board | Calendar).

## Design

### Data
- New table `recurring_tasks`: `id`, `created_by` (admin, FK), `employee_id` nullable (FK), `office` nullable, `title`, `description`, `category`,
  `priority`, `frequency` (`daily|weekly|monthly|yearly`), `day_of_week` (0-6, weekly), `day_of_month` (1-31, monthly and yearly),
  `last_day_of_month` boolean (monthly; "last day"), `month` (1-12, yearly), `lead_days` (default 7), `starts_on` date, `ends_on` date nullable,
  `active` boolean, `last_due_date` date nullable (the due date of the newest copy), timestamps.
- `tasks` gets `recurring_task_id` nullable FK (null on delete). A unique index on (`recurring_task_id`, `due_date`) makes duplicates impossible.

### Creating and stopping a repeat
- The Team tasks form gets a "Repeats" choice: Doesn't repeat, Daily, Weekly (pick a weekday), Monthly (pick a day of the month or "last day"),
  Yearly (pick month and day); "Show it __ days before it is due" (default 7); optional "Stop after" date.
- Saving a repeating task creates the rule and the **first copy immediately** (its due date is the date entered); later copies come from the rule.
- Each copy keeps the series' title, notes, owner or office, priority, category and `assigned_by`.
- A copy's detail window shows "Repeats monthly on the 5th" and, for admins, a **Stop repeating** button (sets the rule inactive; existing copies stay).
  To change a schedule, stop it and create a new one. Editing a copy changes only that copy.

### Generating copies
- A service computes, for every active rule, each due date after `last_due_date` (and on or after `starts_on`, not after `ends_on`) whose
  appear date (`due date - lead_days`) is today or earlier, and creates a task for each, **capped at 31 copies per rule per run**.
  Missed days are caught up (the copy appears already overdue); the unique index and `last_due_date` make it safe to run repeatedly.
- Each created copy notifies its owner(s) through the existing assignment notification (the admin who owns the rule is skipped).
- It runs from three places so it works without cron: (1) a scheduled command `tasks:generate-recurring` daily at 06:00 Manila (works if the
  Hostinger cron is set to run `schedule:run`); (2) a once-per-day guarded call when an admin opens Team tasks or the Operations dashboard,
  as the attendance fill already does; (3) manually with the command.

### Overview
- `TeamTaskController::index` also returns `overview`: `overdue`, `due_this_week` (due today through the next 6 days, not done), `open`,
  `done_this_week` (done with `updated_at` in the current Monday-to-Sunday week), and `by_owner` (open counts per employee or whole-office
  group, largest first). It covers all admin-assigned tasks regardless of the board filters.

### Calendar
- A Calendar tab renders a month grid from the same task list the board uses (so the board's Employee / Office / Priority filters apply), with
  previous/next month, Today, chips as above, "+N more" when a day is full. Completed tasks older than 30 days follow the existing "show
  completed" option.

### Settled during review (my calls)
- **Catch-up and the 31-copy cap:** after an outage the generator catches up oldest first, but only for due dates within the last 31 days;
  older missed dates are skipped and `last_due_date` moves past them. The 31-per-rule-per-run cap is a safety net on top. So a daily rule can
  never bring back more than about a month of overdue copies, while a monthly bill missed during an outage is not lost.
- **The date you type vs the schedule:** the date entered is the first copy's due date and the series' `starts_on`. The form pre-fills the
  weekday or day of month from that date (editable). If the entered date does not match the rule, the first copy still uses the entered date and
  later copies follow the rule from the next matching date after it.
- **Repeats is chosen when creating a task only.** Editing a task never converts it into a series and never edits the schedule. A copy's edit form
  shows the repeat as read-only text with the Stop repeating button. To repeat an existing one-off task, create a new repeating one.
- **Deleting copies:** when you delete a copy of an active series, the delete dialog has an "Also stop repeating" checkbox, so a series made by
  mistake can be removed straight away. Deleting without it leaves the series running.
- **Lead time defaults depend on how often it repeats** (all editable): daily 0 days, weekly 2, monthly 7, yearly 14. So a daily rule does not
  open seven copies at once.
- **Once-per-day guard** is new code: a cache key per calendar day, checked when an admin opens Team tasks or the Operations dashboard.

## Left to the builder
Exact form layout and copy; the date maths for "last day of month" and Feb 29 yearly rules; tests for the generator (idempotency, catch-up
cap, end date, inactive rules, last-day-of-month), the overview numbers, the guarded call, and that stopping keeps copies.

## Calls made (change any of these)
- Lead time defaults by frequency (daily 0, weekly 2, monthly 7, yearly 14 days). Overdue copies are never auto-closed.
- Monthly "31st" on a short month falls on that month's last day.
- Stopping a series is done from a copy, and there is no separate "all repeats" screen in this version.
- Kurt should also set the Hostinger cron (`php artisan schedule:run` every minute) so the 18:00 attendance job and the 06:00 repeat job run on time; the app still works without it.
