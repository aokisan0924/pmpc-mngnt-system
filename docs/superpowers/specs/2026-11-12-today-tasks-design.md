# Today's tasks and a clearer task board — design

Date: 2026-11-12
Size: small change (about one day; frontend plus one extra field from the server, no migration)

## Why

Staff open My tasks and admins open Team tasks mainly to find what is due today or late. Today the
board mixes those cards with tasks due weeks later, every card carries up to six badges, and the
Done column keeps 30 days of cards, so the urgent work does not stand out.

## Goals

1. Employees land on a "Today" list of what needs doing today.
2. Both boards (My tasks and Team tasks) show today's and late work first, in its own column.
3. Cards are quieter: less to read per card.

## Non-goals

- No Today view for admins yet (a possible follow-up once the employee view is in use).
- No change to how tasks are created, assigned, repeated or saved.
- No new database column or migration.

## Anti-goals

- Today must never lose a task that is still due today or late and not done.
- Dragging cards must keep working the way people already know.

## Approaches considered

For where employees see "Today's tasks":

- A. Panel at the top of My tasks. Always visible, but pushes the calendar down.
- **B. "Today" as the first view of My tasks (picked).** Full room for the list, opens by default,
  Calendar and Board one click away.
- C. Card on the employee Dashboard. Seen after punching in, but too small for the full list.

For making the board show what is due:

- Group cards inside each column by Late / Today / This week / Later. Rejected by the user in favour
  of a dedicated place for today's work.
- Row: a "Today & late" lane across the top of the three columns. Recommended by Claude because a
  card keeps its status column.
- **Column: a fourth "Today & late" column on the left (picked by the user).**

## Design

### 1. Employee "Today" view (My tasks)

- The view switch becomes **Today | Calendar | Board**, and the page opens on **Today**.
- Groups, in order, each hidden when empty, each with a count:
  1. **Late**: due date before today, not done.
  2. **Due today**: due date is today, not done.
  3. **Still running**: multi-day tasks (has `start_date`) where start ≤ today < due date, not done.
     Shows the existing time-used bar (`SpanProgress`) and "ends <date>".
  4. **Coming up tomorrow**: due tomorrow, or a span starting tomorrow, not done. Shown faded.
  5. **Done today**: done tasks whose done date is today, ticked, at the bottom.
- Inside a group: high, then medium, then low priority.
- Each row: tick box (uses the existing `/employee/planner/{task}/toggle`), title (opens the
  existing detail window), priority badge, late/due text, and the existing "Whole office" /
  "Shared" badge for tasks the employee does not own. Edit and Delete stay in the detail window.
- Tasks with no due date are left out (they already show in the Calendar's undated strip).
- Empty state: "Nothing due today" with a **+ New task** button; the "Coming up tomorrow" group
  still shows beneath it when it has tasks.
- Calendar view and its "Today's Agenda" panel stay as they are.

### 2. "Today & late" column on both boards (`TaskBoard.jsx`)

- Columns become **Today & late | To do | Doing | Done** on Team tasks and My tasks.
- **Today & late** holds every task that is not done and is late or due today (including a
  multi-day task ending today). Late first, then priority. The column has a light amber tint.
  Each card shows a small "To do" or "Doing" status label.
- **To do** and **Doing** hold every other not-done task.
- **Drag rule (user's decision):** a card in Today & late stays there until it is done. Dropping
  it on To do or Doing changes its status and its label; it does not leave the column. Dropping it
  on Done marks it done and moves it to Done. Dropping a To do / Doing card on the Today column
  does nothing (the column is not a status).
- **Done** shows tasks done in the last 7 days, with a **Show older (n)** button that reveals the
  rest already loaded. (Team tasks' "Old completed" filter still loads beyond 30 days.)
- With 4 columns: 4 across on wide screens, 2×2 on tablets, stacked on phones with Today & late
  first.

### 3. Quieter cards (both boards)

- Card face keeps: title, owner line (admin board only), due text, priority badge, status label
  (Today column only), and the time-used bar for spans.
- Moved to the detail window only: "List: …", "↻ Repeats", "Upcoming", and the "Shared" /
  "Whole office" badge on admin cards (the owner line already says it, so it showed twice).
  The employee board keeps the "Whole office" / "Shared" badge, because it explains why Edit is
  missing.
- Late and today due text uses a tinted pill (red for late, amber for today) instead of a coloured
  side border.

### 4. Server change

- `Task::toPlannerArray()` adds `done_on` (Asia/Manila date string, `Y-m-d`), set from
  `updated_at` when the status is `done`, otherwise `null`.
- Claude's call: no `completed_at` column. Team tasks already treats `updated_at` as the
  completion time for its 30-day window. Limitation: editing a done task moves its done date.
  Upgrade to a real `completed_at` column if that becomes a problem.

## What is left to the builder

- Component split (for example a `TodayView` component for the Planner) and exact Tailwind classes,
  following the employee teal (`#0F6E56`) and admin indigo (`#26215C`) accents and dark mode.
- Keyboard and screen-reader labels for the new column and view tab, matching the existing patterns
  (`aria-pressed` on view buttons, `aria-label` on sections).
- Tests: a feature test that `done_on` is sent; `npm run build` must pass.
- `CHANGELOG.md` entry under `## [Unreleased]` (Added: Today view, Today & late column; Changed:
  card badges, Done column window).
