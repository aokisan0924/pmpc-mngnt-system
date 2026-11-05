# Team tasks: status overview cards (short design)

Date: 2026-11-04. Builds on `2026-11-04-team-tasks-people-strip-design.md`. Page: admin Team tasks.

## Why
After the people strip shipped, the admin asked for the overview back: how many tasks are To do, Doing and Done, with the people pills kept, and a better organized page. They chose mockup A (three status cards with a progress bar).

## What to build
Order from top to bottom: header, status cards, people pills, one toolbar row (Board/Calendar, Office, Priority, older-completed checkbox), then the board or calendar.

- **Three cards**: To do, Doing, Done. Each shows a big count and a one-line note: To do shows "N late" in red when any are late, otherwise "waiting"; Doing shows "in progress"; Done shows "N% finished".
- **Progress bar** under the cards: green for done, amber for doing, share of the total. Decorative; the numbers carry the meaning (`aria-hidden`, with the percentage in the Done card text).
- **Cards are not buttons.** The board columns and the Late/people chips already filter; cards only inform.
- **Scope of the counts** (my call): the cards follow the person or office-group chip, the Office and Priority filters and the "older" checkbox, so choosing Alexander shows Alexander's To do / Doing / Done. They ignore the Late chip, so To do and Done stay meaningful. With no filter they cover everything admin-assigned.
- **Done count** (my call, user did not answer): same rule as the board, finished in the last 30 days, or all finished tasks when "Show completed over 30 days old" is ticked. The note under Done says "last 30 days" or "all time".
- The earlier Everyone chip keeps showing total open tasks.

## Server
`TeamTaskController::index` returns `status_counts: {todo, doing, done, late}` for the current filters, computed with the same filter rules as the task list but without the `overdue` filter. `late` is open tasks due before today (Asia/Manila). The task list itself is unchanged.

## Constraints
Admin accent `#26215C`; use app theme tokens for text (no low-contrast greys); cards stack on a phone (one or three columns with small text, no horizontal scroll); no thick colored side borders.

## Not doing
Clickable cards, per-person breakdown inside cards, trend charts.

## Approaches
1. **Server returns `status_counts` for the current filters (chosen).** Counts stay correct when done tasks are cut by the 30-day rule.
2. Count in the browser from the loaded tasks. Rejected for the late-filter case: with Late chosen the loaded list is only late tasks, so To do and Done would be wrong.

## Tests
Feature tests: counts per status; late count; done limited to 30 days and all-time with `older=1`; counts follow `employee_id`, `group`, `office`, `priority`; counts ignore `overdue=1`; personal tasks never counted; zero tasks gives zeros.
