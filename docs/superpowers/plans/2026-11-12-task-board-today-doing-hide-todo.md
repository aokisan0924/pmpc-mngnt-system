# Task Board: Today → Doing, Hideable To do — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Due-today tasks can be dragged into Doing (keeping their amber Today look), and the To do column can be hidden, with late tasks then shown at the top of Today.

**Architecture:** Column grouping stays a pure function (`boardColumns` in `taskGroups.js`) with a new `hideTodo` option. The hidden choice lives in browser storage through a tiny hook used by both pages, which pass it to the shared `TaskBoard`, so Team tasks' header counts and the board use the same value.

**Tech Stack:** React 19 + Inertia 3, Tailwind 4, `node:test` for `tests/js`.

**Spec:** `docs/superpowers/specs/2026-11-12-task-board-today-doing-hide-todo-design.md`

## Global Constraints

- No server, database or status changes; "late" and "due today" still come from `due_date` vs the Manila date (`manilaToday()`).
- Both boards use the shared `TaskBoard.jsx`: Team tasks (`Pages/Admin/TeamTasks.jsx`) and My tasks (`Pages/Employee/Planner.jsx`).
- Team tasks header counts must equal what the columns show.
- Browser storage is wrapped in try/catch; when unavailable, To do shows.
- Changelog entry under `## [Unreleased]` in `CHANGELOG.md`; `npm run build` must pass and `public/build` is committed.

## Review Focus

1. A late task already in Doing while To do is hidden → stays in Doing, not pulled into Today. (Task 1 test)
2. A due-today task marked done → Done column, never Today or Doing. (Task 1 test)
3. An undated To do task while To do is hidden → not in Today; counted in "Show To do (N)". (Task 1 test)
4. Dropping a card that is not due today onto Today → becomes To do and lands in the To do column. (Task 2 manual check)
5. Browser storage blocked (private mode) → board renders with To do shown, no crash. (Task 2 hook try/catch, manual check)

---

### Task 1: Column grouping

**Files:**
- Modify: `resources/js/Components/taskGroups.js` (`boardColumns`, lines 35-46)
- Test: `tests/js/taskGroups.test.js`

**Interfaces:**
- Produces: `boardColumns(tasks, todayKey, { hideTodo = false } = {}) → { late, today, pending, doing, doneRecent, doneOlder }`
  - `today`: status `pending` and due today, high priority first.
  - `late`: when `hideTodo`, status `pending` with due date before today, most late first (then priority); otherwise `[]`.
  - `pending`: status `pending`, not due today, and (when `hideTodo`) not late. It is the hidden column's content, used for the "Show To do (N)" count.
  - `doing`: status `doing`, whatever the due date (due-today included).
  - `doneRecent` / `doneOlder`: unchanged.

- [ ] **Step 1: Update and add tests in `tests/js/taskGroups.test.js`**
  - Rename and flip `'a doing task due today stays in today'` → `'a doing task due today moves to doing'`: `ids(cols.doing)` equals `[doing.id]`, `cols.today` equals `[]`.
  - Keep `'boardColumns puts only due-today open tasks in today…'` assertions as they are (default `hideTodo` false); add `assert.deepEqual(cols.late, [])`.
  - New `'hidden To do: late not-started tasks go to late, most late first; late doing stays in doing'`: tasks `late3 = t({due_in_days:-3})`, `late1High = t({due_in_days:-1, priority:'high'})`, `late1Low = t({due_in_days:-1})`, `lateDoing = t({due_in_days:-2, status:'doing'})`, `later = t({due_in_days:4})`, `undated = t()`. With `{ hideTodo: true }`: `ids(cols.late)` equals `[late3.id, late1High.id, late1Low.id]`; `ids(cols.doing)` equals `[lateDoing.id]`; `ids(cols.pending)` equals `[later.id, undated.id]`.
  - New `'a done task due today goes to done, not today or doing'`: `t({ status:'done', due_in_days:0, done_on: todayKey })` → in `doneRecent`, `today` and `doing` empty.

- [ ] **Step 2: Run to see the new/changed tests fail**

Run: `node --test tests/js/taskGroups.test.js`
Expected: FAIL on "moves to doing", "hidden To do", and `cols.late` (undefined).

- [ ] **Step 3: Implement the new `boardColumns` signature in `taskGroups.js`**

Use `daysUntil` for lateness; sort `late` by `daysUntil` ascending then `byPriority`. Update the file's top comment and `isDueToday` comment ("Late tasks are not 'today'") only if wording becomes wrong.

- [ ] **Step 4: Run tests**

Run: `node --test tests/js/*.test.js`
Expected: all pass (27 before + 2 new = 29).

- [ ] **Step 5: Commit** — `feat(tasks): due-today tasks in doing; late group for hidden To do`

---

### Task 2: Board UI, hide toggle, pages

**Files:**
- Create: `resources/js/Components/useHideTodo.js`
- Modify: `resources/js/Components/TaskBoard.jsx`
- Modify: `resources/js/Pages/Admin/TeamTasks.jsx` (line 24 and header counts lines 85-88; the `<TaskBoard` at ~121)
- Modify: `resources/js/Pages/Employee/Planner.jsx` (the `<TaskBoard` at ~256)
- Modify: `CHANGELOG.md`, `public/build` (rebuilt)

**Interfaces:**
- Consumes: `boardColumns(tasks, todayKey, { hideTodo })` from Task 1.
- Produces: `useHideTodo() → [hideTodo: boolean, setHideTodo: (boolean) => void]`, stored under localStorage key `pmpc.taskBoard.hideTodo` (`'1'` = hidden); reads and writes in try/catch, default `false`.
- `TaskBoard` gains props `hideTodo = false`, `onHideTodoChange` (optional; when absent, no hide button).

- [ ] **Step 1: Create `useHideTodo.js`** (useState initialised from storage; setter writes storage).

- [ ] **Step 2: TaskBoard changes**
  - Call `boardColumns(tasks, manilaToday(), { hideTodo })`.
  - Columns rendered: To do (skipped when `hideTodo`), Today, Doing, Done. Grid becomes `xl:grid-cols-3` when hidden.
  - Today column is a drop target with status `pending` (remove the "Dropping on Today does nothing" branch).
  - Today column, when `late.length`: a "Late" sub-label (rose text, with count) above the late cards, then due-today cards. Empty text stays "Nothing due today." only when both are empty.
  - Card look: a card whose task `isDueToday` uses the amber surface (`border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30`) wherever it sits, so it stays amber in Doing. Remove the slate status badge (Today now holds only To do cards).
  - To do header gets a small button "Hide" (`aria-label="Hide the To do column"`, `aria-pressed` not used). When hidden, a button "Show To do (N)" with N = `pending.length` sits above the grid, right-aligned, `aria-label="Show the To do column, N tasks"`. Both min height 36px, focus ring per `focusRing`.
- [ ] **Step 3: Pages** — both call `useHideTodo()` and pass `hideTodo` / `onHideTodoChange` to `TaskBoard`. TeamTasks computes `columns` with `{ hideTodo }`; header: "to do" shows `columns.pending.length`, "today" shows `columns.late.length + columns.today.length`.
- [ ] **Step 4: Build and tests**

Run: `npm run build` → `✓ built`; `node --test tests/js/*.test.js` → all pass.

- [ ] **Step 5: Browser check on the local preview (`taskboard-preview`, port 8001)** — as admin on Team tasks and as an employee on My tasks → Board:
  - Drag a Today card to Doing: it shows in Doing, amber, "Due today" pill. Drag it back to Today: To do status, back in Today.
  - Drop a card due in the future onto Today: it ends in To do.
  - Hide To do: late To do cards appear at top of Today under "Late"; "Show To do (N)" shows the right N; header counts equal the columns; reload keeps it hidden; Show brings everything back.
  - Phone width (375px): columns stack, buttons reachable, no sideways scroll.
- [ ] **Step 6: Changelog** under `### Changed` (plain words, both boards). Commit `feat(tasks): drag Today tasks to Doing; hide the To do column` including `public/build`.
