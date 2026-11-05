# Team tasks: office tabs with people row (short design)

Date: 2026-11-04. Replaces the chip layout of `2026-11-04-team-tasks-people-strip-design.md`. Page: admin Team tasks.

## Why
The people and office pills shared one wrapping row and looked unorganized. The Cubao Office chip was missing because office chips only existed for whole-office tasks (tasks naming no person), and every Cubao task names a person. The user chose mockup B: office tabs, then a people row that narrows to the chosen office.

## What to build
Top to bottom: header, status cards (unchanged), **office tabs**, **people row**, toolbar (Board/Calendar, Priority, older-completed checkbox; the Office dropdown is removed), board or calendar.

- **Office tabs** (one row, segmented look): `All N`, then `Cubao Office N`, `Fort Magsaysay Office N`, `UPI Main Office N` (all three always shown, even with 0), then the red `N late` chip. A tab count is the open admin-assigned tasks in that office, people's tasks and whole-office tasks together. Selecting a tab sets the existing `office` filter; selecting it again goes back to All.
- **People row**:
  - With All selected: `Everyone N` and one chip per active person with open tasks (as today), folded after 8 with "+N more".
  - With an office selected: `Everyone in <office> N`, the people who have open tasks in that office (counts are for that office only), and a `Whole office N` chip when whole-office tasks exist in that office.
  - Chips keep the late badge. Sorted by late desc, open desc, name.
- **Whole-office filter**: new query flag `whole=1`, honoured only with an `office`: tasks with no person in that office. It replaces the `group` parameter from the previous release (`group` is removed).
- Choosing a different office tab clears the chosen person and `whole`.
- **Counts**: the tab counts ignore every filter. The people row follows the chosen office only (not person, whole, priority or late). The status cards follow office, person, whole, priority and the older checkbox, not Late (as before).

## Server
`TeamTaskController::index` returns `offices`: `[{key, label, open, late}]` for the three offices, and `people` computed for the chosen office. `filters` gains `whole` and drops `group`. Whole-office chips come from the people list as `{type: 'whole', key: <office>, ...}` only when an office is chosen.

## Constraints
Admin accent `#26215C`; theme tokens for text; tabs and chips are `<button>` with `aria-pressed`, visible focus ring; the tab row wraps or scrolls on a phone without horizontal page scroll; no thick colored side borders.

## Not doing
Multi-select of offices, drag between chips, a person chip for people with no open tasks.

## Approaches
1. **Office tabs set the existing `office` filter and the server narrows `people` to it (chosen).** One filter model, stable counts.
2. Keep both the dropdown and tabs. Rejected: two controls for one filter.
3. Group people under office headings in one long row. Rejected in the mockup review (option A): longer, and the user picked B.

## Tests
Offices summary has all three offices with open and late counts and ignores filters; people list narrows to the chosen office and counts only that office's tasks; `Whole office` chip appears only with an office and when whole tasks exist; `whole=1` shows only no-person tasks of that office and is ignored without an office; status cards follow `whole`; the old `group` parameter is gone.
