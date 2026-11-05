# Team tasks redesign (three zones) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Regroup admin Team tasks into summary / one filter box / board, remove the duplicate and mismatched counters, and clean up the task cards.

**Architecture:** Mostly frontend. `Task::toPlannerArray` gains `due_in_days` (Manila-based) so cards can say "2 days late". `TeamPeopleStrip` loses the late chip and the Everyone pill; `TeamTasks.jsx` wraps the strip and the toolbar in one box and adds a "Late only (N)" checkbox fed by `status_counts.late`. `TaskBoard` cards get an owner with initials, a labeled list tag, due text, and a "⋯" menu for Edit and Delete.

**Tech Stack:** Laravel 13, PHPUnit (sqlite), Inertia/React 19, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-05-team-tasks-redesign-design.md`

## Global Constraints

- Today = Asia/Manila; `due_in_days = due_date - today` in whole days (negative = late, 0 = today).
- No change to filters or counts on the server besides the new field.
- `TaskBoard` is shared with the employee My tasks board (`Planner.jsx`): every change must keep working there (move buttons, View, whole-office read-only cards, no `showOwner`).
- Theme text tokens (`text-text`, `text-sub`); avoid `text-dim` for information that matters; accent `#26215C`; no thick coloured side borders; phone width wraps without horizontal page scroll.
- The "⋯" menu: button with `aria-haspopup="menu"` and `aria-expanded`; menu items `role="menuitem"`; Enter/Space opens, ArrowUp/Down move, Escape closes and returns focus, click outside closes.
- `vendor/bin/pint` on PHP, `npm run build` after frontend edits, commit `public/build`. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Late wording: card says "N days late" only for open tasks; done tasks never show late text.
- "Late only (N)" equals the To do card's late number in every scope and still filters the board.
- Employee My tasks board: cards, move buttons, View, whole-office read-only cards and the "⋯" menu (only shown when Edit/Delete exist) still work.
- Selected person pill clears on a second click; All tab with no office clears person and whole.
- "⋯" menu works with keyboard and touch and does not trigger the card's drag or the card click (open detail).
- Plural/edge text: "1 day late", "Due today", "Due tomorrow", far future shows the date.

---

### Task 1: `due_in_days` on planner tasks

**Files:**
- Modify: `app/Models/Task.php` (`toPlannerArray`)
- Test: `tests/Feature/TaskBoardTest.php` (add a test; reuse its style) or a new `tests/Feature/TaskDueInDaysTest.php`

**Interfaces:**
- Produces `due_in_days: int` in `toPlannerArray()`: `CarbonImmutable::now('Asia/Manila')->startOfDay()->diffInDays($this->due_date->startOfDay(), false)`, cast to int.

- [ ] **Step 1: Write the failing test:** with `Carbon::setTestNow('2026-11-05 10:00 Asia/Manila')` create tasks due `2026-11-03`, `2026-11-05`, `2026-11-06`, `2026-11-20` and assert `toPlannerArray()['due_in_days']` is `-2`, `0`, `1`, `15`.
- [ ] **Step 2: Run** `php artisan test --filter=<new test>`. Expected: FAIL (key missing).
- [ ] **Step 3: Implement** the field. **Step 4: Run** `php artisan test --filter='TeamTask|TaskBoard|OfficeTasks|Recurring'`; Expected: pass. `vendor/bin/pint app tests`.
- [ ] **Step 5: Commit** `feat(tasks): days until due on planner tasks`.

### Task 2: Task card cleanup and "⋯" menu

**Files:** Modify `resources/js/Components/TaskBoard.jsx`; create `resources/js/Components/CardMenu.jsx`.

**Interfaces:**
- Consumes `task.due_in_days`, `task.status`, `task.category`, `task.employee_name`, `task.office_label`.
- Produces `export default function CardMenu({ label, items })` where `items` is `[{ label, onClick, danger? }]`; renders the "⋯" trigger (`aria-label={label}`) and the menu.

- [ ] **Step 1: Build `CardMenu`** per the keyboard and ARIA constraints above (closes on outside click, Escape, and after choosing an item; menu positioned under the trigger, right-aligned, `z-20`).
- [ ] **Step 2: Edit `TaskBoard`:**
  - Owner line (when `showOwner`): a 24px round initials badge (first letters of up to two name parts) plus the name; whole-office tasks show "Whole office" plus the office label; keep the office label text on the line.
  - Replace the grey category badge with a labeled tag `List: {category}` (outlined, readable text, only when `category` exists).
  - Due text replaces `due_label` plus the Overdue badge: for not-done tasks, `due_in_days < 0` → "{n} day(s) late" in rose, `0` → "Due today", `1` → "Due tomorrow", otherwise `due_label`; done tasks show `due_label` only.
  - Actions: keep move buttons and View as they are; replace the Edit and Delete buttons by `CardMenu` (items Edit and Delete, only the ones allowed: Edit when `!readOnly(task)`, Delete when `onDelete && !readOnly(task)`); render no menu when there are no items.
  - The menu and trigger must not start a drag or open the card (card click already ignores `button`).
- [ ] **Step 3: Verify** `npm run build`; in Chrome on the scratch sqlite (`database/taskboard-preview.sqlite`, ADM-0001 / `password123`, localhost only; reseed if empty) check Team tasks cards: initials, List tag, late text, "⋯" opens by mouse and keyboard and Edit/Delete work; and the employee side (log in as a seeded employee, My tasks board): cards, move buttons, View, whole-office read-only cards.
- [ ] **Step 4: Commit** `feat(tasks): clearer task cards with a more menu`.

### Task 3: Filter box and counters

**Files:** Modify `resources/js/Components/TeamPeopleStrip.jsx`, `resources/js/Pages/Admin/TeamTasks.jsx`.

**Interfaces:** Consumes `status_counts.late`, `overview.open`, `offices`, `people` (unchanged server props). `TeamPeopleStrip` keeps its props minus the late chip.

- [ ] **Step 1: Edit `TeamPeopleStrip`:** remove the late chip and the Everyone pill; add a small "People" label at the start of the people row; keep selected-person fallback and fold; keep Whole office pill; All tab click when already selected does nothing (as now).
- [ ] **Step 2: Edit `TeamTasks.jsx`:** wrap `TeamPeopleStrip` and the toolbar in one `rounded-2xl border border-border bg-panel p-3 space-y-3` box; toolbar row: Priority select, a "Late only ({status_counts.late})" checkbox bound to `filters.overdue` (shown even at 0), the "Show old completed" checkbox, and the Board/Calendar switch pushed right with `ml-auto`; in board view show a quiet "Drag cards between columns" hint at the left of the toolbar row; remove the separate hint paragraph and the old toolbar container.
- [ ] **Step 3: Verify** `npm run build`; in Chrome: no duplicate All/Everyone; "Late only (N)" equals the To do late number in All, an office, and with a person chosen, and ticking it filters the board; second click on a selected person clears; phone-width wrap (emulate with the page zoomed or a narrow window if the pane allows; otherwise state it was not checked); dark mode; console clean; screenshot.
- [ ] **Step 4: Commit** `feat(admin): one filter box on team tasks`, then `build: rebuild assets for the team tasks redesign`.

### Task 4: Docs and final checks

- [ ] **Step 1:** In `CHANGELOG.md` (Unreleased > Changed) describe the regrouped page: one filter box, one "Late only" switch matching the To do late count, no Everyone pill, cards with owner initials, a labeled list tag, "N days late" text and a "⋯" menu (also on the employee My tasks board). Run `vendor/bin/pint --test app tests`, `php artisan test` (only the known JPEG error allowed), `npm run build`.
- [ ] **Step 2: Commit** `docs: changelog for the team tasks redesign`. Do not deploy; the user approves that separately.
