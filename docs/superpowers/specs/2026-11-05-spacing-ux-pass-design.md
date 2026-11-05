# Spacing and UX pass: task form, Team tasks board, My tasks

**Status:** Approved scope from the owner's review of the live screens (2026-11-05). This file settles the open design choices so the build needs no further decisions.
**Plan:** `docs/superpowers/plans/2026-11-05-spacing-ux-pass.md`

## Intent

The three task screens work, but they waste height and hide things. The New Task form is a narrow column where the people list traps the mouse wheel and the main button scrolls out of view. Board cards take five rows. The top of Team tasks is about 190px of banner and counters before the first card. The employee calendar has tall, mostly empty cells and cuts titles off after a dozen characters. This pass fixes layout and spacing only.

## Goals

1. New Task form: the admin chooses who, then when it is due, then writes the details. The form is wider on desktop, has no scroll trap there, and Cancel / Add Task are always visible.
2. Board cards are at least 15% shorter (median) on Team tasks. Whole-office and shared cards line up with person cards. Done cards stay readable.
3. The Team tasks summary takes one compact row and still shows every number it shows today.
4. My tasks calendar: shorter cells, up to two lines of each title with the full title on hover, and the agenda uses View plus the "⋯" menu.

## Non-goals

- No database, route, controller, request, validation or count changes. No PHP changes at all.
- No change to filters, counts, drag and drop, move rules, permissions or what is sent to the server. The form posts exactly the same fields in every mode.
- `AdminPageHeader` and `EmployeePageHeader` are not changed. They are shared by every page in each portal (see Decision D6).
- `TeamTaskCalendar.jsx` (the admin calendar), `TaskDetailModal.jsx`, `TeamPeopleStrip.jsx` and the filter box are not changed, apart from the spacing tweak described in Phase 2.
- No new components and no new dependencies. Icons are inline SVG paths that already exist in this codebase.

## Constraints (all phases)

- **Tokens:** text uses `text-text` and `text-sub`. Use `text-dim` only for decoration, never for information. Surfaces use `bg-panel`, `bg-field`, `border-border` and `hover:bg-hover`. The admin accent is `#26215C` (indigo focus rings) and the employee accent is `#0F6E56` (emerald focus rings). Do not add thick coloured side borders; a 1px neutral `border-border` divider is fine.
- **Dark mode:** the app uses the `.dark` class variant (`@custom-variant dark` in `resources/css/app.css`). Every new colour class has a `dark:` partner, or is a token that already switches.
- **Phone width 375px:** no horizontal page scroll (`document.documentElement.scrollWidth <= innerWidth`), and nothing is cut off inside dialogs.
- **Touch targets:** every button touched in this pass (View, "⋯", move buttons) is at least 36px tall (`h-9`). The card title button is a text link and is exempt.
- **Accessibility:** every field keeps a visible label, or an `sr-only` label where one exists today. DOM order equals visual order. Focus rings stay. `CardMenu` keeps its ARIA and keyboard behaviour exactly as it is.
- **Stacking:** cards that hold a `CardMenu` keep `relative focus-within:z-30`. A card that holds a menu must not use `opacity-*`, `transform`, `filter` or `overflow-hidden`, and no ancestor of the menu up to the column or panel may use `overflow-*` (the menu would be clipped or trapped under the next card).
- **Shared components:** `TaskBoard` is used by admin Team tasks (`showOwner`, `showMoveButtons={false}`, indigo) and by employee My tasks (no owner line, move buttons, emerald). `TaskFormModal` is used by admin create, admin edit (single person, shared, whole office) and the employee form (no `employees` prop). `CardMenu` is used by the board and, from Phase 3, the agenda. Each phase checks every one of these uses.
- **Build:** run `npm run build` and commit `public/build`. Add a line to `CHANGELOG.md` under `## [Unreleased]` > Changed in each phase.

---

## Phase 1: New Task / Edit Task form

Files: `resources/js/Components/TaskFormModal.jsx`, `resources/js/Components/PeoplePicker.jsx`.

### Before

- The panel is `max-w-md` (448px at most; about 390px of content). The whole panel scrolls (`max-h-[92vh] overflow-y-auto`), so the footer buttons scroll with it.
- Admin create order: who toggle, people picker (list `max-h-56`, 224px, scrolls inside the scrolling panel), "How to give it", Title (autofocused), Description, Priority (full width), Category (full width), then the "When is it due?" fieldset last.
- Recurring opens five more fields at the bottom, so the form is usually taller than the screen and Add Task is off screen.

### Field order: decision D1

Admin create (both columns read top to bottom, left column first):

1. **Who is it for**: Specific people / Whole office, then the people picker and "How to give it" (when two or more people are picked), or the Office select.
2. **When is it due?**: Has a due date / Recurring / No due date, with the date field or the schedule fields.
3. **Task Title**
4. **Description**
5. **Priority | Category**, side by side.

Why this order:
- The owner asked that the admin first chooses whether the task is recurring or has a due date. "Who" stays above it because it is the assignment, not the content, and on desktop it sits in its own column, so "When is it due?" is the first thing in the content column.
- "When is it due?" changes which fields appear (a date, five schedule fields, or nothing). Deciding it before typing means the fields the admin fills next do not jump when Recurring opens.
- Recurring or not also shapes how the title is worded ("Monthly remittance report" compared with "Fix the printer").
- Priority and Category are optional refinements and go last, side by side.

Not chosen: "When is it due?" above "Who". It would split the who-choice (left column) from the people list, and the owner's wording places the due choice first among the content choices, not before the assignment.

Focus on open: admin create autofocuses the "Specific people" toggle (the first choice). Every other mode keeps autofocus on Task Title, as today.

Admin edit and the employee form keep their current order: (Employee / shared picker / Office), Title, Description, [Due Date | Priority], Category.

### Layout: decision D2

The panel becomes a three-part column: a fixed header, a scrolling body and a fixed footer.

- Overlay: `fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs` (the phone gutter goes from 16px to 8px to gain width).
- Panel: `flex w-full max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl`, with a width that depends on the mode:
  - admin create: `max-w-2xl lg:max-w-4xl` (672px at a 16px root, 784px at the app's 14px root, from 1024px wide);
  - every other mode (admin edit, employee create and edit): `max-w-lg` (512px).
- Header: `shrink-0 flex items-center justify-between border-b border-border px-5 py-4 sm:px-6`. It holds the same title and close button as today.
- `<form>`: `flex min-h-0 flex-1 flex-col`, wrapping the body and the footer, so Enter still submits and Add Task stays a submit button.
- Body: `min-h-0 flex-1 overflow-y-auto space-y-4 px-5 py-4 sm:px-6`.
- Footer: `shrink-0 flex items-center justify-end gap-3 border-t border-border bg-panel px-5 py-3 sm:px-6`, holding the same Cancel and Add Task / Update Task buttons.

Two columns for admin create from `lg` (1024px):
- Body content: `space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0`.
- Left column `space-y-4 lg:border-r lg:border-border lg:pr-6`: the who toggle and its picker, share radios or Office select.
- Right column `space-y-4`: "When is it due?", Title, Description, then Priority | Category.
- Below `lg` the same two blocks stack in that order: who, then due, then details.

Scroll trap fix:
- `PeoplePicker` gets one new prop, `listClassName = 'max-h-56'`, which replaces the hard-coded `max-h-56` on the list box.
- Admin create passes `listClassName="max-h-56 lg:max-h-[min(26rem,50vh)]"`. On desktop the list fills the left column (up to 364px at the app's 14px root, or half the window height), and the body does not need to scroll in the default state (people mode, Has a due date). With nothing else scrolling, the wheel over the list never fights the form.
- The admin shared-edit picker keeps the default `max-h-56` (it is a single column, and edit has no due block).
- Do not add `overscroll-contain` to the list. It would stop the wheel from passing to the form when the list reaches its end, which makes the trap worse.

Side by side:
- Admin create: Priority and Category in `grid grid-cols-1 sm:grid-cols-2 gap-3`.
- Other modes: keep the existing `[Due Date | Priority]` `grid grid-cols-2 gap-3`, with Category full width below it (unchanged).

Measurements at 1440×900, admin create, people mode, Has a due date, nothing picked:
- the panel is 784px wide (the app's root text size is 14px, so max-w-4xl renders 784px, not 896px);
- the body does not scroll (`scrollHeight <= clientHeight + 1`);
- Add Task is inside the viewport;
- the people list is at most 364px tall (26rem at a 14px root).

At 1366×768 the same conditions hold, with the list at most 384px. With Recurring, monthly, the body may scroll, but the footer stays visible.

At 375×812 every mode is single column, the panel is 359px wide (375 minus 2 × 8px), there is no horizontal overflow, and Add Task stays visible when the body is scrolled to the top or to the bottom.

### Unchanged

`useForm` fields, `transform`, `submit`, `chooseRepeat`, `chooseDueType`, every input `id`, error rendering, the Escape handler and the click-outside-to-close. The JSX blocks keep their contents and only move. Write each block once and place it in a layout; do not duplicate fields.

---

## Phase 2: Team tasks board and top area

Files: `resources/js/Components/TaskBoard.jsx`, `resources/js/Components/CardMenu.jsx`, `resources/js/Components/TeamStatusOverview.jsx`. Optionally `resources/js/Pages/Admin/TeamTasks.jsx` (spacing classes only). `TeamPeopleStrip.jsx` is unchanged.

### Cards: before

An admin card has five rows: title; owner line (24px initials badge); notes (two lines); due / priority / list / repeat row; View and "⋯" row (`mt-3`, buttons about 26px tall). That is about 138px without notes and 174px with notes.

Whole-office and shared cards have no badge, so their text starts 30px further left than person cards.

Done cards use `opacity-60` on the whole card and strike through the title.

### Cards: after (decision D3)

- **Inline actions when there are no move buttons.** `const inlineActions = !showMoveButtons`.
  - Admin (`inlineActions`): one meta row, `mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-2`, holds the due text, priority, list tag, read-only and repeat badges, and then `<div className="ml-auto flex shrink-0 items-center gap-1.5">` with View and "⋯". When the column is narrow, the action group wraps to its own line, right-aligned. No content is lost.
  - Employee (`showMoveButtons`): the meta row holds only the badges, as today. The action row (`mt-2 flex items-center gap-2`) holds the move buttons (`flex-1`), View and "⋯", as today.
- **Notes** use `line-clamp-1` (was `line-clamp-2`). The detail window shows the full notes.
- **Touch targets:** View is `inline-flex h-9 items-center rounded-lg border border-border bg-panel px-3 text-xs font-semibold text-text hover:bg-hover`, with the existing focus ring. Move buttons are `h-9`. The `CardMenu` trigger becomes `inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-panel text-sm font-bold leading-none text-sub hover:bg-hover hover:text-text focus-visible:outline-2 ${focusRing}`. This is the only `CardMenu` change.
- **Owner badge for every card** (admin `showOwner` only): the same 24px slot, `inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[#26215C] dark:bg-indigo-950 dark:text-indigo-200`, `aria-hidden="true"`.
  - Person task: the initials, as today.
  - Whole office: an office-building icon, `h-3.5 w-3.5`. Use the SVG path from `resources/js/Pages/Admin/Settings.jsx` line 26 (`M19 21V5a2 2 0 00-2-2H7…`), `strokeWidth={1.8}`.
  - Shared: a people icon, `h-3.5 w-3.5`. Use the path from `resources/js/Pages/Admin/PayrollAnalytics.jsx` line 165 (`M17 20h5v-2a3 3 0 00-5.356-1.857…`), `strokeWidth={1.8}`.
  - The text and the "Shared" badge after it are unchanged.
- **Done cards:** remove `opacity-60`. A done card uses `bg-field/60` in place of `bg-panel` (same border, no shadow). Only the title is `line-through` and `text-sub` (was `text-dim`). Everything else keeps its normal colours. Keep `relative focus-within:z-30` on every card.

Target heights at 1440×900 (3 columns, each about 400px wide), measured on the same data before and after:
- admin card, one-line title, no notes: at most 120px (from about 138px);
- admin card with notes: at most 140px (from about 174px);
- median admin card at least 15% shorter.

Employee board cards: no taller than before by more than 4px on the same data. The 36px move buttons add about 10px; the one-line notes take about 16px away.

### Top area: before

The banner is about 68px. Below it are three cards (about 108px: label, 30px number, note, and "last 30 days" on its own line), then a gap and a 6px bar. The first card sits about 220px below the banner top, before the filter box.

### Top area: after (decision D4)

`TeamStatusOverview` becomes one panel:

```
<section aria-label="Task status overview" class="rounded-2xl border border-border bg-panel px-3 py-2.5 sm:px-4">
  <div class="grid grid-cols-3 gap-2 sm:gap-4">
    per stat: <div class="min-w-0">
      <p class="text-xs font-bold uppercase tracking-wider text-sub">To do</p>
      <p class="flex flex-wrap items-baseline gap-x-2"><span class="font-heading text-xl sm:text-2xl font-extrabold tnum text-text">12</span><span class="text-xs {noteClass}">3 late</span></p>
    </div>
  </div>
  <div aria-hidden="true" class="mt-2 flex h-1.5 overflow-hidden rounded-full bg-field"> …same two bars… </div>
</section>
```

- Notes keep the same wording: "N late" or "waiting", "in progress", and "N% finished · last 30 days" or "N% finished · all time". The old separate `sub` line joins the Done note with " · ".
- The late note keeps `text-rose-600 dark:text-rose-400 font-semibold`.
- Targets: at most 76px tall at 1440 wide, at most 100px at 375 wide (notes wrap under the number).
- The board's top edge moves up by at least 40px on the same data.

The filter box and the board are unchanged. In `TeamTasks.jsx`, `space-y-4 sm:space-y-5` may become `space-y-3 sm:space-y-4`. This is the only allowed page change.

### Decision D6: the banner stays

`AdminPageHeader` is the shared header of about 20 admin pages and is already a single 64–68px row: its height is set by the 40px New Task button. Making only this page's banner smaller would make it the odd one out. Making all of them smaller is outside this scope. The height comes back from the summary row instead, about 50px. **The owner should confirm** (see Open questions).

---

## Phase 3: Employee My tasks

Files: `resources/js/Pages/Employee/Planner.jsx`. Phase 2's `CardMenu` change is already in place. `UndatedTaskStrip.jsx` is unchanged (its chips already wrap, carry `title` and are fine).

### Calendar: before

There are always six rows (42 cells). Cells are `min-h-[72px] sm:min-h-[100px]`. Chips are `truncate`, with no `title`. Done chips use `opacity-50`.

### Calendar: after (decision D5)

- `buildMonthGrid` fills to a whole week only: `while (cells.length % 7 !== 0)` (the same rule as `TeamTaskCalendar`). Most months show five rows; some show four or six.
- Cell: `min-h-[52px] sm:min-h-[80px]`, with padding unchanged.
- Chips (from `sm` up): `line-clamp-2 break-words rounded-md px-1.5 py-0.5 text-[12px] leading-4 font-medium`, plus `title={t.title}`. Do not put `block` or `truncate` on them; `line-clamp-2` sets the display itself. Show at most two chips plus "+N more", as today.
- Done chip: `line-through bg-field text-sub` (no opacity).
- Phones (below `sm`): the chip list is `hidden sm:flex`. Show a count instead: `{dayTasks.length > 0 && <span className="sm:hidden self-start rounded-full bg-[#0F6E56]/10 px-1.5 text-xs font-bold tnum text-[#0F6E56] dark:text-emerald-300">{dayTasks.length}</span>}`. The cell's `aria-label` already says "N tasks". At 375px a cell is about 42px wide, and two lines of 3–4 letters help no one; the agenda below lists the titles.
- Today keeps its filled `#0F6E56` number. The selected day keeps its emerald ring. The "No date" strip stays under the grid.

Targets at 1440×900 in a month with at most two tasks a day:
- the month grid is at least 20% shorter than before;
- a row with no tasks is at most 82px tall;
- every chip's `title` equals its full task title;
- no chip ends in an ellipsis when its title fits in two lines.

### Agenda panel: after

- Each item: `relative focus-within:z-30 rounded-xl border p-3`. Open items: `border-border bg-panel shadow-2xs hover:border-emerald-500/30`. Done items: `border-border/60 bg-field/60`. Remove `opacity-60`.
- The title button uses `line-clamp-2 break-words` in place of `truncate`. A done title is `line-through text-sub`.
- The right side changes from a column of three buttons to `flex shrink-0 items-center gap-1.5`:
  - View, styled as today but `h-9`;
  - when `task.employee_id !== null`, `<CardMenu label={`More actions for "${task.title}"`} focusRing="focus-visible:outline-emerald-600" items={[{ label: 'Edit', onClick: () => startEdit(task) }, { label: 'Delete', onClick: () => confirmDelete(task), danger: true }]} />`.
  - Whole-office and shared tasks (`employee_id === null`) show View only, the same rule as today.
- The agenda list loses `max-h-[500px] overflow-y-auto pr-1`. A scrolling box would clip the menu of the last task, and shorter items make the inner scroll unnecessary; the page scrolls instead.

Board view and the All / Pending / Done filter are unchanged.

---

## Risks

1. **Menu clipping or stacking (Phases 2 and 3).** Any `overflow-*`, `opacity` or `transform` on a card or its ancestors brings back the old bug. The acceptance check takes a hit test at the menu's last item.
2. **Two-column form at 1024–1279px.** The columns are about 400px each, and the Recurring fields (`grid-cols-2`) get tight. The check at 1024×768 must show no clipped labels.
3. **`max-h` with `min()` in Tailwind 4.** The `lg:max-h-[min(26rem,50vh)]` class must appear literally in the source (it does, in `TaskFormModal.jsx`). The check reads the computed `max-height`.
4. **The `autoFocus` move.** Keyboard users who expect the caret in Title on admin create now land on the who toggle. This follows the new order, so the owner should confirm it.
5. **The employee form.** The same component changes its shell. A regression would hit every employee. The check covers create and edit of an undated task (date optional) and a dated task (date required).
6. **The calendar's row count changes per month.** That is expected, but the page below moves between months.

## Left to the builder

- How the moved JSX is arranged (for example `const who = (…)`, `const due = (…)`, `const details = (…)`), as long as each field is written once.
- Exact gap values within ±1 Tailwind step where a measurement target is met. The targets and the listed classes win over taste.
- Whether `TeamTasks.jsx` spacing moves to `space-y-3 sm:space-y-4`.

## Open questions for the owner

1. The field order in D1, including focus starting on "Specific people".
2. D6: keep the shared purple banner as it is, and take the height back from the summary row instead.
3. On phones, calendar days show a task count instead of cut-off chips (D5).

## Gap-check resolutions (orchestrator calls, 2026-11-05)
1. **Owner confirmations:** the five owner-facing calls (field order with "who" first and focus on "Specific people", banner unchanged, phone calendar shows a count per day, agenda list without an inner scroll box, 36px employee buttons) are presented to the owner for approval together with this design; building starts only after that approval.
2. **Scroll trap with people already picked:** the scroll-trap fix is guaranteed for the first view (nothing picked) at 1366x768 and above. Once chips and the "How to give it" choices are added the form body may scroll; the sticky footer keeps Cancel and Add Task reachable and the chips wrap above the list. The list keeps a fixed height and is the only inner scroller. The two-column desktop layout is kept.
3. **Employee card height:** admin cards must be at least 15% shorter. Employee cards may grow by at most 8px (touch targets win), and cards with two-line notes must not grow.
4. **Deploys:** each phase ends with a review and then the owner is asked before deploying; each deploy is verified read-only on the live page and logged in `DEPLOYMENTS.md` (no database change, no backup needed).
5. **The plan file is the plan.** Keep its measurement scripts (M1, M2, M2b, M3).
6. **Done cards stay readable:** no card-level opacity and no extra background tint: Done cards use the normal card background (`bg-panel`), the title is struck through in `text-sub`, and the other text uses `text-sub`.
7. **Factual corrections:** `AdminPageHeader` is used by 17 page files (not "about 20"); the edit form does show a Due Date field (without the "When is it due?" box); the employee meta row holds the due text as well as the badges today. `TaskDetailModal` imports `sharedNames` from `TaskBoard.jsx`, so that export must stay; `CardMenu` is used only by `TaskBoard`.

## Browser acceptance checklist

Run each check against the local scratch database `database/taskboard-preview.sqlite`, served on localhost (see the plan, Task 0). Use the in-app browser (`mcp__Claude_Browser__*`) and run each JS snippet with `javascript_tool`. Record the before and after numbers in the phase's commit message body. The snippets are in the plan (M1–M3).

**Phase 1:**
- [ ] 1440×900, admin create: M1 gives `panelW` 784, `bodyScrolls` false, `addVisibleTop` and `addVisibleBottom` true, `listMaxH` "min(26rem, 50vh)" (or its pixel value), `dueBeforeTitle` true, `unlabelled` [], `hOverflow` false.
- [ ] The same at 1366×768 and 1024×768. At 1024 with Recurring, monthly: no clipped labels (screenshot).
- [ ] 375×812: admin create in each due choice, admin edit, and employee create: `hOverflow` false, `addVisibleTop` and `addVisibleBottom` true. Screenshots of admin create (Recurring) and the employee form.
- [ ] Keyboard: Tab order runs toggle, search, people, share, due radios, due fields, title, description, priority, category, Cancel, Add Task. Escape closes the form.
- [ ] One real create per mode on the scratch DB (copies with 2 people, shared, whole office, each due choice) succeeds. The board shows the result. Edit of a person task, a shared task and a whole-office task opens with the old fields. Employee: a new task needs a date; editing an undated task keeps the date optional.
- [ ] Dark mode screenshot of the form. Console has no errors.

**Phase 2:**
- [ ] 1440×900 Team tasks: M2 gives `small` [], one value in `ownerOffsets` (every badge at the same left offset and 24×24), every `done[].opacity` "1" with the title struck through, median down at least 15% against the before value, the size targets met, `overview` at most 76, `boardTop` up at least 40px, and `hOverflow` false.
- [ ] M2b (menu hit test) gives `topmost` true in the Done column and the To do column. Edit from the menu opens the form, and Delete opens the confirmation (cancel it).
- [ ] 768 and 375 widths: `hOverflow` false and `overview` at most 100 at 375. Action groups wrap right-aligned without overlapping (screenshot).
- [ ] Employee My tasks board: move buttons work, View opens the detail, whole-office and shared cards have no "⋯", undated cards say "No due date", M2 `small` [] (as employee), and card height is no more than 4px above the before value.
- [ ] Filters, Late only (N), people pills, drag a card between columns: all unchanged. Dark mode screenshot. Console has no errors.

**Phase 3:**
- [ ] 1440×900 My tasks calendar: M3 gives `badChips` 0, `gridH` at least 20% below the before value, `emptyRowMax` at most 82, `todayFilled` true, `agendaScrolls` false, `agendaOldButtons` 0, `readOnlyWithMenu` 0, `smallButtons` [], and `hOverflow` false.
- [ ] Hovering a chip shows the full title (the `title` attribute). The "No date" strip shows when there are undated tasks.
- [ ] Agenda: "⋯" then Edit opens the form, and "⋯" then Delete opens the confirmation (cancel it). The checkbox still toggles done. M2b-style hit test on the last agenda item's menu gives `topmost` true.
- [ ] 375×812: `hOverflow` false, count pills show on days with tasks, and selecting a day lists its tasks. Screenshot.
- [ ] Board tab and the All / Pending / Done filters still work. Dark mode screenshot. Console has no errors.
