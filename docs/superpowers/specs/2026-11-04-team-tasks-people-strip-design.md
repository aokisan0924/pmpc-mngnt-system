# Team tasks: people strip (short design)

Date: 2026-11-04. Page: admin Team tasks (`resources/js/Pages/Admin/TeamTasks.jsx`, `app/Http/Controllers/TeamTaskController.php`).

## Why
Admin opened Team tasks and could not see where the overview was. The three number pills ("0 overdue", "20 due this week", "20 open") were weak: the last two were the same number, only one was clickable, and the pills, tabs, filters and drag hint pushed the board down the screen. The admin's first question is who is behind. The user chose the "people strip" option from the mockups.

## What to build
A strip of chips replaces the Employee dropdown and the three pills.

- **Everyone chip** (first): total open admin-assigned tasks. Selected when no person or group is chosen.
- **Late chip** (second, red, only when there is at least one late task): count of all late open tasks. It is the existing `overdue` filter.
- **One chip per person who has at least one open task**, sorted by late count (desc), then open count (desc), then name. Shows name and open count, plus a red "N late" when they have late tasks.
- **One chip per whole-office group that has open tasks** (tasks with no person), for example "Cubao Office · 3", after the people chips, same late marker. Shown with a small "office" visual distinction (an icon or lighter fill).
- If chips do not fit in one row, show the first ones and a "+N" chip that opens a small list with the rest.
- Clicking a chip sets the filter; clicking the selected chip again clears it. One person or office-group chip at a time. The Late chip combines with a chip (late tasks of that person).

The toolbar is one row: Board / Calendar tabs, Office, Priority, "show completed over 30 days old". The drag hint stays under the tabs, board view only. The "due this week" figure is dropped. The chips filter both the Board and the Calendar.

## Counts and filters (server)
- `TeamTaskController::index` returns `people`: an array of chips `{type: 'employee'|'office', key, label, open, late}`. Counts come from admin-assigned open tasks and **ignore** the person, office-group and priority filters, so chips do not vanish while filtering.
- Late = open and `due_date` before today (Asia/Manila), same rule as `overview()`. The Everyone and Late totals can keep using `overview()` (`open`, `overdue`).
- New query value `group=<office key>` filters to tasks with `employee_id` null and that office. Existing `employee_id`, `office`, `priority`, `overdue`, `older` keep working. `employee_id` and `group` together: `group` is ignored when `employee_id` is set.
- Only active employees appear, as the employee list does today.

## Constraints
Dual-portal admin accent `#26215C`. Use `useForm`/Inertia router as the page does now. No thick colored side borders on cards (design hook). Chips need keyboard focus, `aria-pressed` and a visible focus ring. Works at phone width (strip scrolls or wraps; no horizontal page scroll).

## Not doing
Per-card urgency labels (option C), "needs attention" cards (option B), a due-this-week count, drag-to-reassign between chips.

## Approaches
1. **Server sends a people summary that ignores the filters (chosen).** Counts stay stable while filtering. One extra grouped query.
2. Client counts from the loaded tasks. Rejected: counts break as soon as a person filter is on.

## Tests
Feature tests in `TeamTaskOverviewTest` or a new file: people summary sorted and counted correctly; late counted per person; whole-office group chip counted and filterable with `group`; summary unchanged when filters are on; personal (non-admin-assigned) tasks and done tasks not counted; inactive employees left out. Visual check on the live page layout after build.

## Left to the builder
Chip visual details, the overflow list behavior, the exact wording of the office chip, and where the total shows when there are no open tasks (show "Everyone · 0").
