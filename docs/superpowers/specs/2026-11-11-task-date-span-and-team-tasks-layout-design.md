# Task date spans and a tidier Team tasks page

Date: 2026-11-11
Status: draft, awaiting approval

## Intent

Admins want a task to cover a stretch of days (start date to due date), not only a single due day, and they want the Team tasks page (`/admin/team-tasks`) to look more organized while still looking good. Employees should be able to give their own tasks a span in My Planner as well.

## Goals

1. Any task can have an optional **start date** in addition to its due date.
2. Creating a task (admin Team tasks and employee My Planner) offers a **Date span** choice that asks for Start and Due.
3. A task whose start date is still in the future stays visible and shows a purple **Upcoming** tag.
4. Spanned tasks show their range ("Nov 10 → Nov 20") and a thin progress bar that fills as days pass.
5. On the Team tasks calendar, a spanned task appears on every day from start to due.
6. Team tasks is redesigned per mockup **A, tidy board**, with **dropdowns with counts** for office and person.

## Non-goals

- Spans on recurring tasks. A recurring rule still makes single-due-date copies.
- A date-range *filter* (pick From/To to filter the list). Not asked for.
- Redesigning My Planner's layout. It only gains the span field, range text, Upcoming tag and bar.
- Changing what "late", "due today", sorting, or reminder notifications mean. They all keep using `due_date`.

## Anti-goals

- Breaking existing tasks. Every current task has no start date and must look and behave exactly as today.
- Losing the at-a-glance late signal entirely. The header keeps a Late count and the filter row keeps a "Late only" chip.

## Constraints

- Laravel 13 / React 19 / Inertia 3 / Tailwind 4. Admin accent `#26215C`, employee accent `#0F6E56`.
- `Asia/Manila` for every "today" comparison.
- Validation lives in Form Requests (`TeamTaskRequest` for admin). The employee `TaskController` currently validates inline; adding `start_date` there follows that existing code (moving it to a Form Request is optional, builder's call).
- Migration must be rollback-safe (nullable column, drop on down). A database backup is taken before deploying, per AGENTS.md.
- `CHANGELOG.md` `[Unreleased]` entry; `npm run build` and committed `public/build`; Pint.

## Approaches considered

**Storage (one sensible way, chosen):** a nullable `start_date` date column on `tasks`.
- Rejected: using `created_at` as the start. The admin cannot choose it.
- Rejected: a separate spans table. More code for no extra ability.

**Person/office filter in the new layout:**
- **Chosen: dropdowns with counts.** Office dropdown ("All offices · 16") and person dropdown whose options show "4 open · 1 late". Tidiest page, one row, good on phones. Trade-off: per-person late counts are one click away instead of always visible.
- Rejected: keep chips, folded to one row with "+N more". Keeps counts visible but the page stays busier.

## What was decided

### Data
- `tasks.start_date` nullable date, added to `$fillable` and cast as `date`.
- Rule: `start_date` must be on or before `due_date`, and requires a `due_date`. If start equals due, save `start_date` as null (it is a plain one-day task).
- `Task::toPlannerArray()` adds: `start_date` (Y-m-d or null), `span_label` ("Nov 10 → Nov 20" or null), `is_upcoming` (start date after today, not done), `span_progress` (0–100, days elapsed / span length, clamped; null when no span).

### New Task form (`TaskFormModal.jsx`, shared by admin and employee)
- Admin "When is it due?" choices become: Has a due date, **Date span**, Recurring, No due date. Date span shows Start → Due inputs and a "N days" note.
- Employee form (today: a single due date input) gains the same Date span option, in a simple way: a "Date span" toggle/choice that reveals a Start input beside Due.
- Edit form (admin and employee): shows a Start field next to Due, so a span can be added, changed or cleared on an existing non-recurring task. Copies created by a repeat rule do not show the Start field.

### Cards (`TaskBoard.jsx`, used by both portals)
- Spanned task: date text shows the range; a thin bar below the meta row shows `span_progress`. Late / Due today wording still wins when it applies (e.g. "2 days late" replaces the range text once past due).
- Upcoming task: purple **Upcoming** tag and "Starts Nov 18 → Dec 5".
- Task detail modal shows Start and Due.

### Team tasks page (`Pages/Admin/TeamTasks.jsx`), mockup A
- Purple header (`AdminPageHeader`) holds the title, the four counts (to do, doing, done, late — late in rose) and **+ New Task**. `TeamStatusOverview` is folded into this.
- One filter row below: Office dropdown (with open counts), Person dropdown (Everyone, Whole office tasks, each person with "N open · N late"), Priority dropdown, then chips **Late only (N)**, **Upcoming (N)**, **Old completed**, and the Board / Calendar switch at the right.
- `TeamPeopleStrip` chips are replaced by the two dropdowns. Same filter params as today (`office`, `employee_id`, `whole`), plus new `upcoming=1`.
- Server: `upcoming` filter = `start_date > today` and not done. `status_counts` gains `upcoming`.
- Board columns and drag-and-drop unchanged.

### Calendar (`TeamTaskCalendar.jsx`)
- A spanned task's chip appears on each day from start to due (clipped to the visible month). One-day tasks unchanged. Undated strip unchanged.

### Calls made by Claude (not discussed with the user; check these)
- **Employees editing spans:** an employee can already edit the due date of an admin-assigned task they own (`TaskController::update` only checks ownership). Start date follows the same rule: they can change or clear it. Submitting the edit form always sends `start_date`, so nothing is wiped by accident.
- **Upcoming tasks still count as open.** They stay in the header "to do" count and in the office/person dropdown "open" counts. The Upcoming chip's own count says how many of those have not started.
- **Late only and Upcoming chips cancel each other** (the two sets never overlap); turning one on turns the other off.
- **Progress bar:** the start day counts as day 1; a done task shows no bar. Past start dates are allowed when creating.
- **Mockups** are at `.superpowers/brainstorm/14550-1794364774/content/team-tasks-layout.html` (section A) and `people-filter.html` (option 1). That folder is gitignored and local only; this document is the source of truth, the mockups are a visual guide.

## Left to the builder

- Exact Tailwind classes, spacing, dark-mode colors for the Upcoming tag and progress bar (follow existing Badge variants; `violet` if a variant exists, otherwise add one).
- Whether the dropdowns are native `<select>` (with counts in option text) or a small custom listbox. Native is fine if counts read clearly; must stay keyboard and screen-reader accessible.
- Whether calendar span chips render as continuous bars or a repeated chip per day.
- Test coverage: feature tests for create/edit with span (admin and employee), the validation rule, the `upcoming` filter and count, and `toPlannerArray` span fields.
