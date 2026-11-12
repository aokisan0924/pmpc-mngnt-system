# Task board: Today tasks move to Doing, To do can be hidden

Date: 2026-11-12. Size: small change. Applies to both boards that use `resources/js/Components/TaskBoard.jsx`: Team tasks (admin) and My tasks → Board (employee).

## Why

A task due today cannot really be started from the board today: dragging it to Doing only changes a small tag and the card stays in Today. People also want to focus on what needs doing now without the long To do list in view.

## What changes

1. **Today holds due-today tasks that are not started** (status To do). A due-today task in Doing shows in the Doing column; a done one in Done.
2. **A due-today card in Doing keeps the Today look**: amber background and border, and its "Due today" pill. You can still tell at a glance it is due today.
3. **Dragging**: Today → Doing moves the card into Doing (status Doing). Doing → To do, or Doing → Today, sends a due-today card back to Today (status To do). Dropping on Today sets status To do; for a card that is not due today, it lands in To do as usual. The "Move to" control for touch screens behaves the same.
4. **Hide To do**: a button in the To do column header hides the column. In its place a "Show To do (N)" button, N being the number of cards in To do, brings it back.
5. **Late tasks while To do is hidden**: late tasks that are not started show at the top of the Today column under a small "Late" label, most late first, keeping their red "days late" pill. Late tasks in Doing stay in Doing. Showing To do again puts them back in To do.
6. **The choice is remembered per person per device** (browser storage). It survives a reload and does not affect anyone else. If browser storage is unavailable, To do simply shows.

## Non-goals

- No server change, no new database setting, no change to statuses or what "late" and "due today" mean (still the due date, Asia/Manila).
- The Today view, Calendar and the header counts stay as they are, except that counts must still match the columns.

## Approaches considered

- **Chosen: change the column grouping (`boardColumns` in `taskGroups.js`) and the board component; keep the hidden choice in browser storage.** Smallest change, both boards updated at once.
- Save the hidden choice on the server per user: follows the person across devices, but needs a migration and an endpoint for a view preference. Not worth it now.
- A separate Late column when To do is hidden: keeps late tasks apart but makes the board wider just to replace the hidden column.

## Left to the builder

- Exact wording and icon of the hide/show buttons; keep them keyboard reachable with a clear accessible name.
- Layout when To do is hidden (three columns instead of four on wide screens).
- Update `tests/js/taskGroups.test.js` for the new grouping, including the hidden-To-do case and late ordering.
- Keep the header counts on Team tasks and My tasks equal to what the columns show.
