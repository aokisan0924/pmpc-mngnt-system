# Team tasks redesign: three clear zones (short design)

Date: 2026-11-05. Builds on the people strip, status cards and office tabs designs. Page: admin Team tasks (the shared card also appears on the employee My tasks board).

## Why
The page grew in pieces and some of them contradict each other: "All 20" and "Everyone 20" show the same number; a red "7 late" chip and the "7 late" under To do count different things; cards carry an unlabeled grey tag; four separate bars stack above the board. The user said things "don't make sense or are not connected" and look unpleasing, and chose mockup A (tidy, three zones).

## What to build
Top to bottom: header, **Zone 1 summary**, **Zone 2 filter box**, **Zone 3 board or calendar**.

- **Zone 1:** the To do / Doing / Done cards and progress bar, unchanged (the To do note "N late" stays).
- **Zone 2, one rounded box** holding everything that filters, in three rows:
  1. Office tabs: All N, then each office. The red late chip is removed from here.
  2. A "People" label and the person pills (with the late badge per person). The "Everyone" pill is removed (the All or office tab already means everyone); clicking the selected pill clears it. The Whole office pill stays inside an office.
  3. Toolbar: Priority select, "Late only (N)" checkbox, "Show old completed" checkbox, and the Board / Calendar switch on the right. In board view a short quiet hint "Drag cards between columns" sits at the left end of this row (the separate hint line is gone).
- **One late count:** "Late only (N)" shows the late count for the current scope, the same number as the To do card's "N late" (both use `status_counts.late`). The old late chip and its separate count are removed; the late filter itself (`overdue=1`) is unchanged.
- **Cards** (shared `TaskBoard`):
  - the owner shows as a name with initials ("AF Alexander Feria Jr."), or "Whole office" with the office;
  - the old grey tag becomes a labeled tag "List: Xander" (the card's `category`), shown only when there is one;
  - the due date reads as plain text with a colour hint: "2 days late" (red), "Due today", "Due tomorrow", otherwise the date; the separate "Overdue" badge goes away;
  - View stays as a visible button; Edit and Delete move into a "⋯" menu (keyboard operable: Enter/Space opens, arrows move, Escape closes).
- Text colours use the theme tokens so contrast passes in light and dark.

## Server
No new data. `status_counts.late` already carries the scope-matching late number. `overview.overdue` is no longer used by the page; the builder may drop it and its test assertions, or leave it.

## Constraints
Admin accent `#26215C`; no thick coloured side borders; phone width: the filter box wraps, the toolbar wraps, no horizontal page scroll; the "⋯" menu works by keyboard and touch; the employee My tasks board gets the same card changes and must still work (move buttons, View).

## My calls (change any)
- The "⋯" menu change also applies to the employee board.
- The drag hint is shown only in board view.
- Task cards keep the visible View button; clicking the title still opens the detail view.
- No change to the calendar, the header banner, the account-setup notice, or the detail window.

## Not doing
The shared task (step two, next), moving the filter box into a side panel, a People dropdown replacing the pills (mockup B).

## Approaches
1. **Regroup the existing pieces and fix the cards (chosen).** Reuses all components and server data; mostly layout and wording.
2. Compact one-row toolbar with a People dropdown (mockup B). Rejected by the user in favour of A.

## Tests
Server: unchanged behaviour (existing tests stay green). Frontend has no test runner, so check in the browser on seeded data: no duplicate All/Everyone; Late only (N) equals the To do late number and filters the board; selected person pill clears on a second click; cards show owner initials, the labeled list tag and the due text; "⋯" menu opens by keyboard and mouse and Edit/Delete work; employee My tasks board still works; phone-width wrap; dark mode.
