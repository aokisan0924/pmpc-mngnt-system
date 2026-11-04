# Task board and Team tasks (design)

Date: 2026-11-04. Status: awaiting approval. Size: small-to-medium change.

## Intent
Staff already have "My tasks" (`/employee/planner`): a list and a calendar. The president wants a TasksBoard-style board
(To do / Doing / Done) and a screen where admins see every employee's tasks. The idea started as a TasksBoard clone with
Google Calendar and Gmail; it was narrowed to what the PMPC app can do with its existing accounts.

## Goals
- Employees get a **Board** tab on My tasks with three columns: To do, Doing, Done. Moving a card changes its status.
- Super admins get a **Team tasks** screen (Admin Portal) showing everyone's tasks on one board. Each card shows the
  employee's name. Filters: employee, priority, overdue only.
- Super admins can add, edit, move and delete any employee's task from Team tasks, and choose which employee a new task belongs to.
- Employees still see and change only their own tasks.

## Non-goals
- Google sign-in, Google Calendar and Gmail. Dropped: the app already has its own calendar, and Gmail needs a paid Google audit.
- Manual ordering of cards inside a column (cards stay sorted by due date, then priority).
- Notifications to an employee when an admin adds or changes their task.
- Comments, labels, assignees other than the owner, subtasks.

## Anti-goals
- An employee must never see or change another employee's task.
- Existing tasks must not be lost or change meaning.

## Constraints
- Stack and rules from `AGENTS.md`: Laravel 13, Inertia + React 19, Tailwind 4, Form Requests for validation, Pint, `npm run build`.
- Employee portal accent is emerald `#0F6E56`; admin portal accent is indigo `#26215C`.
- Timezone `Asia/Manila`. Live site: https://peoplescoopdtr.online. Deploys follow `DEPLOYMENTS.md` (push, then pull on the server; back up the database before the migration).

## Approaches considered
1. **Add a `doing` status to the existing `status` column (chosen).** `pending` is shown as To do. One small migration; the overdue and
   dashboard logic that checks `done` / `pending` keeps working.
2. Separate "stage" column next to `status`. Two fields that can disagree; more places to change. Rejected.
3. Rebuild tasks as a new table. Risks existing data for no gain. Rejected.

For dragging: browser-native drag and drop (no new library), plus a "Move to..." menu on each card for phones.

## Design
- **Data:** migration changes `tasks.status` to allow `pending`, `doing`, `done`. Existing rows stay `pending`. Label `pending` as "To do" in the UI.
- **Employee board:** new Board tab in `Employee/Planner.jsx` next to List and Calendar. A new route `PATCH /employee/planner/{task}/status`
  takes `status` (validated by a Form Request) and uses the existing ownership check. `toggleDone` keeps working (done to pending).
- **Team tasks:** new `Admin/TeamTasks.jsx` under `/admin/team-tasks`, guarded by `role:super_admin`. A controller lists all tasks with
  `employee` eager-loaded (no N+1). Admin routes for create, update, status change and delete skip the ownership check; create takes an
  `employee_id` that must exist. Filters are applied server-side.
- **Sidebar:** add "Team tasks" to the Admin Portal navigation.
- **Mobile:** columns stack or scroll horizontally; the Move to menu replaces dragging.

## Left to the builder
- Exact card layout and empty states within the portal design system.
- Whether the employee dropdown lists only active employees (my call: active only).
- Tests: feature tests for status changes, ownership (403 for another employee's task), and admin access (non-admin refused).
