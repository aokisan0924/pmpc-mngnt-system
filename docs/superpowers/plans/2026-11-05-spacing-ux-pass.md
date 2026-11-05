# Spacing and UX pass (task form, Team tasks board, My tasks) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In three independently shippable phases:
1. Phase 1: rebuild the New/Edit Task form shell (wider, two columns on desktop, sticky footer, due choice before the details).
2. Phase 2: make board cards shorter and aligned, and the Team tasks summary one compact row.
3. Phase 3: make the My tasks calendar denser with readable chips, and give the agenda View plus the "⋯" menu.

**Architecture:** Frontend only. No PHP, routes, database or request changes. Most edits are class and JSX-placement changes inside existing components. The exceptions are one new prop (`PeoplePicker.listClassName`), one helper rule change (`Planner.buildMonthGrid` fills to whole weeks) and one shared trigger size (`CardMenu` becomes 36×36). No JS test runner exists for components. The check for each task is a set of browser measurements, using the exact JS snippets M1, M2, M2b and M3 below, run with `mcp__Claude_Browser__javascript_tool` against the local scratch database.

**Tech Stack:** Inertia/React 19, Tailwind 4 (`.dark` class variant), Vite 8. Laravel 13 / PHPUnit for the regression run only.

**Spec:** `docs/superpowers/specs/2026-11-05-spacing-ux-pass-design.md`. Every class, measurement and decision (D1–D6) referred to below is defined there. Read it first.

## Global Constraints

- Branch `feature/spacing-ux-pass` off `main`. Each phase is merged to `main` only at its deploy task, after the owner approves.
- Do not change PHP, migrations, routes or the fields the form posts. `useForm` keys, `transform`, `submit`, `chooseRepeat`, `chooseDueType`, input `id`s and error rendering in `TaskFormModal` stay exactly as they are. Blocks move; they are not rewritten or duplicated.
- No new components or dependencies. Icons come from inline SVG paths already in the repo (spec Phase 2).
- Tokens: `text-text` and `text-sub` for information (`text-dim` only for decoration); `bg-panel`, `bg-field`, `border-border`. Admin accent `#26215C` with indigo focus rings; employee accent `#0F6E56` with emerald rings. Every new colour has a `dark:` partner. No thick coloured side borders.
- Touch targets: View, "⋯" and move buttons are `h-9` (36px) or taller.
- Stacking: a card or agenda item with a `CardMenu` keeps `relative focus-within:z-30`. Neither it nor any ancestor up to the column or panel may have `opacity-*`, `transform`, `filter` or `overflow-*`.
- Phone 375px: no horizontal page scroll. Dialogs show no clipped content.
- Shared users that must keep working in every phase:
  - `TaskBoard`: admin Team tasks and employee My tasks board;
  - `TaskFormModal`: admin create, admin edit (person / shared / whole office) and the employee form;
  - `CardMenu`: the board and the agenda.
- After frontend edits run `npm run build` and commit `public/build` in a separate `build:` commit. PHP is untouched, so `vendor/bin/pint --test` must still pass and `php artisan test` must stay green (only the known JPEG error in `EmployeeSignatureTest` is allowed).
- Each phase adds lines under `## [Unreleased]` > `### Changed` in `CHANGELOG.md`. Assign no version.
- Commit messages are conventional (`feat(tasks): …`, `build: …`, `docs: …`) and end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Put the before/after numbers from the measurement snippets in the body of each feature commit.
- Do not deploy without the owner's separate approval for that phase. Do not touch the live database. Browser checks run only on `127.0.0.1` against `database/taskboard-preview.sqlite`.

## Review Focus

- Form: every mode posts the same payload as before. Due choice before Title in admin create. Add Task is always visible. The body does not scroll at 1440×900 in the default state. The employee form's date rules are unchanged (required for new and dated tasks, optional when editing an undated one).
- Cards: inline View and "⋯" only when `showMoveButtons` is false. The employee board keeps its move buttons, View, read-only whole-office and shared cards, and undated text. Owner badges line up. Done cards have no opacity, and only the title is struck through.
- Menu stacking: no `opacity`, `transform` or `overflow` on a menu's card or its ancestors. The hit test passes in the Done column and on the last agenda item.
- Summary row: the same numbers and wording as before (late note, "% finished", "last 30 days" / "all time").
- Calendar: whole-week rows, `title` on chips, two-line clamp, today highlighted, the "No date" strip kept. The agenda never shows Edit or Delete for `employee_id === null`.
- Accessibility: labels kept, DOM order equals visual order, focus rings kept, `CardMenu` ARIA and keys unchanged.

---

## Measurement snippets

Run each one with `mcp__Claude_Browser__javascript_tool` (`action: "javascript_exec"`). Each snippet is a single expression that returns a JSON object. Paste it as is.

**M1: task form.** Open the form first.

```js
(() => {
  const dlg = document.querySelector('[role=dialog][aria-labelledby=task-form-title]');
  const panel = dlg.firstElementChild;
  const title = panel.querySelector('#task-form-title-input');
  const scrollers = [panel, ...panel.querySelectorAll('*')].filter(e => ['auto', 'scroll'].includes(getComputedStyle(e).overflowY));
  const body = scrollers.find(e => e.contains(title));
  const list = scrollers.find(e => e !== body && e.querySelector('input[type=checkbox]'));
  const add = panel.querySelector('button[type=submit]');
  const vis = () => { const r = add.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; };
  body.scrollTop = 0; const addVisibleTop = vis();
  body.scrollTop = body.scrollHeight; const addVisibleBottom = vis(); body.scrollTop = 0;
  const legend = [...panel.querySelectorAll('legend')].find(l => /When is it due/.test(l.textContent));
  return {
    panelW: Math.round(panel.getBoundingClientRect().width),
    bodyScrolls: body.scrollHeight > body.clientHeight + 1,
    bodyH: [body.scrollHeight, body.clientHeight],
    listH: list ? Math.round(list.getBoundingClientRect().height) : null,
    listMaxH: list ? getComputedStyle(list).maxHeight : null,
    addVisibleTop, addVisibleBottom,
    dueBeforeTitle: legend ? Boolean(legend.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING) : null,
    unlabelled: [...panel.querySelectorAll('input,select,textarea')].filter(el => el.type !== 'hidden' && !el.labels?.length && !el.getAttribute('aria-label')).map(el => el.id || el.name || el.type),
    focused: document.activeElement?.id || document.activeElement?.textContent?.trim().slice(0, 30),
    hOverflow: document.documentElement.scrollWidth > innerWidth || panel.scrollWidth > panel.clientWidth,
  };
})()
```

**M2: board and summary.** Board view must be showing.

```js
(() => {
  const cards = [...document.querySelectorAll('section[aria-label$=" tasks"] article')];
  const h = cards.map(a => Math.round(a.getBoundingClientRect().height)).sort((x, y) => x - y);
  const small = cards.flatMap(a => [...a.querySelectorAll('button[aria-label^="View task"], button[aria-haspopup=menu], button[aria-label^="Move "]')])
    .filter(b => b.offsetParent && b.getBoundingClientRect().height < 36).map(b => b.getAttribute('aria-label'));
  const owner = cards.map(a => [a, a.querySelector(':scope > p')]).filter(([, p]) => p?.firstElementChild?.getAttribute('aria-hidden') === 'true')
    .map(([a, p]) => { const r = a.getBoundingClientRect(), b = p.firstElementChild.getBoundingClientRect(); return `${Math.round(b.left - r.left)}@${Math.round(b.width)}x${Math.round(b.height)}`; });
  const ownerless = cards.filter(a => { const p = a.querySelector(':scope > p'); return p && /Whole office|,|No one yet/.test(p.textContent) && p.firstElementChild?.getAttribute('aria-hidden') !== 'true'; }).length;
  const done = [...document.querySelectorAll('section[aria-label="Done tasks"] article')].map(a => ({ opacity: getComputedStyle(a).opacity, title: getComputedStyle(a.querySelector('button, p')).textDecorationLine }));
  const ov = document.querySelector('section[aria-label="Task status overview"]');
  const todo = document.querySelector('section[aria-label="To do tasks"]');
  return {
    count: cards.length, min: h[0], median: h[Math.floor(h.length / 2)], max: h.at(-1), heights: h,
    small, ownerOffsets: [...new Set(owner)], ownerless, done,
    overview: ov ? Math.round(ov.getBoundingClientRect().height) : null,
    boardTop: todo ? Math.round(todo.getBoundingClientRect().top + scrollY) : null,
    hOverflow: document.documentElement.scrollWidth > innerWidth,
  };
})()
```

`ownerless` counts whole-office and shared cards without a badge. Its expected value after Phase 2 is 0. On the employee board, `owner`, `ownerless` and `overview` are empty or null; that is expected.

**M2b: menu hit test.** Set `COL` to `"Done tasks"`, `"To do tasks"` or `"agenda"`.

```js
await (async (COL = 'Done tasks') => {
  const host = COL === 'agenda'
    ? [...document.querySelectorAll('button[aria-label^="View task"]')].map(v => v.closest('.rounded-xl')).filter(i => i.querySelector('button[aria-haspopup=menu]'))
    : [...document.querySelectorAll(`section[aria-label="${COL}"] article`)].filter(a => a.querySelector('button[aria-haspopup=menu]'));
  if (!host.length) return { error: 'no card with a menu' };
  const target = host.length > 1 ? host[host.length - 2] : host[0];
  target.scrollIntoView({ block: 'center' });
  target.querySelector('button[aria-haspopup=menu]').click();
  await new Promise(r => setTimeout(r, 80));
  const items = [...target.querySelectorAll('[role=menuitem]')];
  const last = items.at(-1);
  const r = last.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.bottom - 3);
  const result = { menuItems: items.map(i => i.textContent), topmost: last === hit || last.contains(hit) };
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  return result;
})()
```

If the selected card is the last one in its column, the menu has nothing below it to collide with, so the snippet picks the second-to-last card when there is one.

**M3: My tasks calendar and agenda.** Calendar view, current month.

```js
(() => {
  const cells = [...document.querySelectorAll('button[aria-pressed]')].filter(b => / \d+ tasks?(,|$)/.test(b.getAttribute('aria-label') || ''));
  const rows = []; for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  const emptyRows = rows.filter(r => r.every(c => / 0 tasks/.test(c.getAttribute('aria-label'))));
  const chips = cells.flatMap(c => [...c.querySelectorAll('span')]).filter(s => s.offsetParent && s.className.includes('rounded-md'));
  const todayNum = document.querySelector('button[aria-current=date] > span');
  const items = [...document.querySelectorAll('button[aria-label^="View task"]')].map(v => v.closest('.rounded-xl'));
  const list = items[0]?.parentElement;
  return {
    rows: rows.length, gridH: Math.round(cells[0].parentElement.getBoundingClientRect().height),
    emptyRowMax: emptyRows.length ? Math.max(...emptyRows.map(r => Math.round(r[0].getBoundingClientRect().height))) : null,
    chips: chips.length,
    badChips: chips.filter(s => s.title !== s.textContent.trim() || getComputedStyle(s).webkitLineClamp !== '2').length,
    countPills: cells.filter(c => [...c.querySelectorAll('span')].some(s => s.offsetParent && s.className.includes('rounded-full') && /^\d+$/.test(s.textContent) && !s.className.includes('w-6'))).length,
    todayFilled: todayNum ? getComputedStyle(todayNum).backgroundColor === 'rgb(15, 110, 86)' : null,
    agendaItems: items.length,
    agendaScrolls: list ? ['auto', 'scroll'].includes(getComputedStyle(list).overflowY) : null,
    agendaOldButtons: document.querySelectorAll('button[aria-label^="Edit task"], button[aria-label^="Delete task"]').length,
    readOnlyWithMenu: items.filter(i => /Whole office|Shared ·/.test(i.textContent) && i.querySelector('button[aria-haspopup=menu]')).length,
    smallButtons: items.flatMap(i => [...i.querySelectorAll('button[aria-label^="View task"], button[aria-haspopup=menu]')]).filter(b => b.getBoundingClientRect().height < 36).length,
    undatedStrip: Boolean(document.querySelector('section[aria-label="Tasks with no due date"]')),
    hOverflow: document.documentElement.scrollWidth > innerWidth,
  };
})()
```

To size the viewport, use `mcp__Claude_Browser__resize_window`: `{width:1440,height:900}`, `{width:1366,height:768}`, `{width:1024,height:768}`, `{width:768,height:1024}`, then `preset:"mobile"` (375×812; reload the page afterwards), and finally `preset:"desktop"`. Dark mode is the app's own theme toggle; for a quick check you can run `document.documentElement.classList.add('dark')`.

---

### Task 0: Branch, scratch preview and baselines

**Files:** `.claude/launch.json` (untracked local config; add one entry). No product files change.

- [ ] **Step 1:** `git switch -c feature/spacing-ux-pass main`. `git status --short` must show only the existing untracked files.
- [ ] **Step 2:** Add this configuration to `.claude/launch.json`, next to `payroll-preview`. Keep the others unchanged; only one can run on port 8000 at a time.
  ```json
  {
    "name": "taskboard-preview",
    "runtimeExecutable": "cmd",
    "runtimeArgs": ["/c", "set DB_CONNECTION=sqlite&& set DB_DATABASE=C:/xampp/htdocs/pmpc-mngnt-system/database/taskboard-preview.sqlite&& set SESSION_DRIVER=file&& C:\\Users\\Kurtong\\.config\\herd-lite\\bin\\php.exe artisan serve --host=127.0.0.1 --port=8000"],
    "port": 8000
  }
  ```
- [ ] **Step 3:** Bring the scratch file up to date. Use that file only; never the default or the live database:
  ```powershell
  $env:DB_CONNECTION='sqlite'; $env:DB_DATABASE='C:/xampp/htdocs/pmpc-mngnt-system/database/taskboard-preview.sqlite'; php artisan migrate --force
  ```
  Expected: "Nothing to migrate" or the due-type migration runs.
- [ ] **Step 4:** Start it with `mcp__Claude_Browser__preview_start` `{name:"taskboard-preview"}`. Log in as ADM-0001 with the password used in earlier plans for this file. If login fails, set a new test password for ADM-0001 on this scratch file only (`php artisan tinker` with the same env vars), and record it in your report, not in chat or a committed file. Do the same for one staff employee, Maria (or any active staff employee in an office).
- [ ] **Step 5: Test data.** On the scratch database, through the admin UI, make sure all of these exist in the current month:
  - person tasks with and without notes;
  - a whole-office task;
  - a shared task for 2 people including the employee from Step 4;
  - at least 2 Done tasks (so M2b has a card above another);
  - one late task;
  - one undated task;
  - one task with a title of 30 or more characters on a day that has a second task;
  - a day with 3 or more tasks.

  Create only what is missing.
- [ ] **Step 6: Baselines** on the current build (unchanged `public/build`):
  - M1 at 1440×900 (admin create, people mode) and at 375×812;
  - M2 and M2b (`Done tasks`) at 1440×900 as admin, and M2 at 1440×900 as the employee on the My tasks board;
  - M3 at 1440×900 as the employee.

  Save the JSON results in a gitignored scratch file inside the repo (for example `storage/app/ux-pass-baseline.json`; check that `git check-ignore` confirms it is ignored). Take screenshots of the form, the board and the calendar. No commit.

## Phase 1: Task form

### Task 1: Form shell, order and two columns

**Files:**
- Modify: `resources/js/Components/TaskFormModal.jsx`, `resources/js/Components/PeoplePicker.jsx`

**Interfaces:**
- `PeoplePicker({ employees, offices, value, onChange, error, listClassName = 'max-h-56' })`. The list box class becomes `` `${listClassName} overflow-y-auto rounded-xl border border-border bg-field/40 p-2 space-y-3` ``. There are no other changes.
- `TaskFormModal` props are unchanged. Width per mode: `adminCreate` gets `max-w-2xl lg:max-w-4xl`; every other mode gets `max-w-lg`.

- [ ] **Step 1: Verify first.** Confirm that the Task 0 baseline M1 shows `addVisibleTop: false` or `bodyScrolls: true`, and `dueBeforeTitle: false`. That is the failing state.
- [ ] **Step 2: `PeoplePicker`.** Add the `listClassName` prop as above.
- [ ] **Step 3: `TaskFormModal` shell** (spec Phase 1, D2):
  - overlay `p-2 sm:p-4`;
  - panel `flex w-full max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl` plus the width per mode; remove `overflow-y-auto`, `p-6` and `space-y-5` from it;
  - header `shrink-0 flex items-center justify-between border-b border-border px-5 py-4 sm:px-6`;
  - `<form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">`;
  - body `<div className="min-h-0 flex-1 overflow-y-auto space-y-4 px-5 py-4 sm:px-6">`;
  - footer `<div className="shrink-0 flex items-center justify-end gap-3 border-t border-border bg-panel px-5 py-3 sm:px-6">`, holding the same two `Button`s.
- [ ] **Step 4: Order and columns** (D1). Split the existing JSX, unchanged inside, into three constants and render them:
  - `who`: the toggle block (`employees && !task`), the shared-edit picker, the Employee select and the Office select, in today's order.
  - `due`: the "When is it due?" fieldset (`adminCreate` only).
  - `details`: Title, Description, then the bottom fields:
    - `adminCreate`: `<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">` with Priority and Category;
    - otherwise: the existing `[Due Date | Priority]` `grid grid-cols-2 gap-3` followed by Category.

  Render:
  ```jsx
  {adminCreate ? (
      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
          <div className="space-y-4 lg:border-r lg:border-border lg:pr-6">{who}</div>
          <div className="space-y-4">{due}{details}</div>
      </div>
  ) : (<>{who}{details}</>)}
  ```
  Pass `listClassName="max-h-56 lg:max-h-[min(26rem,50vh)]"` to the create-mode `PeoplePicker` only. Title input: `autoFocus={!adminCreate}`. The "Specific people" toggle button gets `autoFocus={key === 'people'}`.
- [ ] **Step 5:** Run `npm run build`. Expected: no errors.
- [ ] **Step 6: Verify** against the spec Phase 1 checklist:
  - M1 at 1440×900: `panelW` 896, `bodyScrolls` false, `addVisibleTop` and `addVisibleBottom` true, `listH` at most 416, `dueBeforeTitle` true, `unlabelled` [], `hOverflow` false, and `focused` is "Specific people".
  - The same M1 at 1366×768 (`listH` at most 384).
  - At 1024×768 with Recurring, monthly, ticked: footer visible and no clipped labels (screenshot).
  - At 375×812: M1 for admin create in each of the three due choices, for admin edit of a person task, a shared task and a whole-office task, and for employee create and employee edit. Every result has `hOverflow` false and `addVisibleTop` and `addVisibleBottom` true.
  - Tab order as in the spec. Escape closes the form, and a click on the backdrop closes it.
- [ ] **Step 7: Behaviour check** on the scratch DB:
  - Create one task each as copies (2 people), shared and whole office, across the three due choices.
  - Check the cards that appear and that the Network tab payload has the same keys as before (`due_type`, `employee_ids` or `office`, `shared`).
  - Edit each kind of task and save.
  - As the employee: a new task without a date shows the required error; editing an undated task saves with the date left empty.
  - Console clean. Dark-mode screenshot.
- [ ] **Step 8: Commit** `feat(tasks): wider task form with the due choice first and the buttons always visible`. Body: the M1 numbers before and after. Then run `npm run build` and commit `build: rebuild assets for the task form layout`.

### Task 2: Phase 1 done, review, deploy

- [ ] **Step 1:** Add to `CHANGELOG.md` under `## [Unreleased]` > `### Changed`:

  > The New Task form is wider on computers and shows who the task is for on the left, and when it is due, the title, notes, priority and category on the right. "When is it due?" now comes before the title. Cancel and Add Task stay visible while the form scrolls, and the people list no longer traps the mouse wheel. The employee task form gets the same fixed buttons.

  Commit `docs: changelog for the task form layout`.
- [ ] **Step 2: Gates.** Run `vendor/bin/pint --test`, `php artisan test` (only the known JPEG error) and `npm run build`. Expected: no diff in `public/build` after the build commit.
- [ ] **Step 3: Phase done browser checks.** Repeat the spec's Phase 1 checklist in full and attach screenshots: 1440 admin create, 375 admin Recurring, 375 employee form, dark.
- [ ] **Step 4: Opus review.** Dispatch `delegate:reviewer` with the spec path and the diff `main..feature/spacing-ux-pass`, the Phase 1 commits only. Fix Critical and Important findings in new commits, then re-run Steps 2–3.
- [ ] **Step 5: Deploy, only after the owner says yes to Phase 1.** Follow AGENTS.md section 7. There are no migrations, so no database backup is needed.
  1. Locally: `git switch main && git merge --ff-only feature/spacing-ux-pass && git push origin main`.
  2. Connect with `ssh -i ~/.ssh/pmpc_deploy -o IdentitiesOnly=yes -o BatchMode=yes -p 65002 u512373751@82.180.138.43`.
  3. In `~/domains/peoplescoopdtr.online/pmpc_mngnt`, `git status --short` must be empty. If it is not, stop.
  4. Run `php artisan down --retry=60 && git pull --ff-only origin main && php artisan migrate --force && php artisan optimize:clear && php artisan optimize && php artisan up`.
  5. Verify: `git log -1 --oneline` on the server equals local `main`; `curl -s -o /dev/null -w '%{http_code}' https://peoplescoopdtr.online/login` returns 200; the manifest `public/build/manifest.json` entry for `resources/js/app.jsx` matches local. Do not log in to live with any password. Ask the owner to look at the form.
  6. Add a `DEPLOYMENTS.md` entry (template in AGENTS.md / global CLAUDE.md, Asia/Manila time) and commit it with `docs(deploy): log task form layout release`, then push.

## Phase 2: Team tasks board

### Task 3: Shorter, aligned cards and a 36px menu trigger

**Files:**
- Modify: `resources/js/Components/TaskBoard.jsx`, `resources/js/Components/CardMenu.jsx`

**Interfaces:**
- `CardMenu`: the props and behaviour are unchanged. Only the trigger `className` becomes `` `inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-panel text-sm font-bold leading-none text-sub hover:bg-hover hover:text-text focus-visible:outline-2 ${focusRing}` ``.
- `TaskBoard`: the props are unchanged. The new internal value is `const inlineActions = !showMoveButtons`.

- [ ] **Step 1: Verify first.** The baseline M2 has `small` not empty (the View and "⋯" buttons are about 26px), `ownerless` above 0, and `done[].opacity` "0.6". Record `median` and `boardTop`.
- [ ] **Step 2: `CardMenu`** trigger class as above.
- [ ] **Step 3: `TaskBoard`** (spec Phase 2, D3):
  - Article: `relative focus-within:z-30 rounded-xl border border-border p-3 cursor-grab active:cursor-grabbing`, plus `done ? 'bg-field/60' : 'bg-panel shadow-2xs'`. No `opacity-*`.
  - Title (button and `<p>` forms): when done, `line-through text-sub`; otherwise `text-text`.
  - Owner line: always render the 24px badge span (`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-[#26215C] dark:bg-indigo-950 dark:text-indigo-200`, `aria-hidden="true"`). Its content:
    - `task.is_shared`: the people SVG (`className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"`, path copied from `Pages/Admin/PayrollAnalytics.jsx:165`, `strokeWidth={1.8}`);
    - otherwise `task.employee_name`: the initials;
    - otherwise: the building SVG (path from `Pages/Admin/Settings.jsx:26`, `strokeWidth={1.8}`).
  - Notes: `line-clamp-1`.
  - Meta row: `mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-2`, with the same badges as today. When `inlineActions`, add `<div className="ml-auto flex shrink-0 items-center gap-1.5">` with View and `CardMenu` at the end of the row.
  - When `!inlineActions`: a separate `mt-2 flex items-center gap-2` row with the move buttons (`flex-1 h-9 rounded-lg border border-border bg-field px-2 text-xs font-semibold text-text hover:bg-hover`), View, and `CardMenu` in a `ml-auto` wrapper, as today.
  - View: `inline-flex h-9 items-center rounded-lg border border-border bg-panel px-3 text-xs font-semibold text-text hover:bg-hover focus-visible:outline-2 ${focusRing}`. Keep `aria-haspopup="dialog"` and the `aria-label`.
  - The `CardMenu` items logic (`readOnly`, `onEdit` and `onDelete` guards) is unchanged.
- [ ] **Step 4:** Run `npm run build`.
- [ ] **Step 5: Verify:**
  - As admin at 1440×900, M2: `small` [], a single `ownerOffsets` value ending in `@24x24`, `ownerless` 0, every `done[].opacity` "1" and `done[].title` "line-through", `median` at least 15% below the baseline, cards without notes at most 120 and cards with notes at most 140 (check them against the board).
  - M2b `Done tasks` and `To do tasks`: `topmost` true and `menuItems` ["Edit","Delete"].
  - Edit from the menu opens the form; Delete opens the confirmation (cancel it). Drag a card to another column and back.
  - At 768 and 375: `hOverflow` false, and the action groups wrap right-aligned (screenshot).
  - As the employee on the My tasks board, M2: `small` [] and `median` no more than 4px above the employee baseline. Move buttons move a card. View opens the detail. Whole-office and shared cards have no "⋯". The undated card says "No due date".
  - Console clean. Dark screenshot.
- [ ] **Step 6: Commit** `feat(tasks): shorter task cards with aligned owner badges and readable done cards`. Body: M2 before and after.

### Task 4: Compact status summary

**Files:**
- Modify: `resources/js/Components/TeamStatusOverview.jsx`, optionally `resources/js/Pages/Admin/TeamTasks.jsx` (only `space-y-4 sm:space-y-5` to `space-y-3 sm:space-y-4`)

**Interfaces:** the props `counts` and `older` and every number shown are unchanged.

- [ ] **Step 1: Verify first.** The baseline M2 `overview` is above 100.
- [ ] **Step 2: Rewrite the markup** to the single panel in spec D4. Keep the `cards` array, but:
  - the Done note becomes `` `${pct}% finished · ${older ? 'all time' : 'last 30 days'}` `` and the `sub` field is removed;
  - the number is `font-heading text-xl sm:text-2xl font-extrabold tnum text-text`, inline with its note in `flex flex-wrap items-baseline gap-x-2`;
  - the progress bar moves inside the panel (`mt-2`), with the same widths and colours.
- [ ] **Step 3:** Run `npm run build`.
- [ ] **Step 4: Verify:**
  - M2 at 1440×900: `overview` at most 76, and `boardTop` at least 40 below the Task 3 value (or the baseline).
  - At 375: `overview` at most 100 and `hOverflow` false.
  - The numbers equal the column counts. The late note is red when late is above 0. Ticking "Show old completed" changes the note to "all time". Choosing a person or office updates the numbers.
  - Dark screenshot.
- [ ] **Step 5: Commit** `feat(admin): one compact status row on team tasks`. Body: `overview` and `boardTop` before and after. Then run `npm run build` and commit `build: rebuild assets for the team tasks board pass`.

### Task 5: Phase 2 done, review, deploy

- [ ] **Step 1:** Add to `CHANGELOG.md` under Unreleased > Changed:

  > Task cards are shorter: the due date, priority, list and the View and "⋯" buttons share one row on Team tasks, and notes show one line. Whole-office and shared cards get a building or people badge so every name lines up. Done cards are no longer faded; only the title is struck through. The To do, Doing and Done counts sit in one compact row. View, "⋯" and move buttons are larger for touch, on the employee board too.

  Commit `docs: changelog for the team tasks board pass`.
- [ ] **Step 2: Gates**, as in Task 2 Step 2.
- [ ] **Step 3: Phase done browser checks.** Repeat the spec's Phase 2 checklist in full: admin 1440, 768 and 375; the employee board; filters, Late only, people pills and drag unchanged; dark; console. Attach screenshots.
- [ ] **Step 4: Opus review.** `delegate:reviewer` with the spec and the Phase 2 diff (`main..feature/spacing-ux-pass`). Fix the findings and re-run Steps 2–3.
- [ ] **Step 5: Deploy, only after the owner approves Phase 2.** Same procedure as Task 2 Step 5. The `DEPLOYMENTS.md` entry commit is `docs(deploy): log team tasks board pass`.

## Phase 3: Employee My tasks

### Task 6: Denser calendar and agenda menu

**Files:**
- Modify: `resources/js/Pages/Employee/Planner.jsx`

**Interfaces:** consumes `CardMenu({ label, items, focusRing })`, already sized by Task 3. `buildMonthGrid(viewDate)` now returns whole weeks only.

- [ ] **Step 1: Verify first.** The baseline M3 has `rows` 6, `agendaScrolls` true, and `agendaOldButtons` above 0 (or `smallButtons` above 0).
- [ ] **Step 2: Calendar** (spec D5):
  - In `buildMonthGrid`, replace `while (cells.length < 42)` with `while (cells.length % 7 !== 0)`.
  - Cell `min-h-[72px] sm:min-h-[100px]` becomes `min-h-[52px] sm:min-h-[80px]`.
  - Chip container: `hidden sm:flex flex-col gap-1 overflow-hidden w-full`.
  - Chip span: `line-clamp-2 break-words rounded-md px-1.5 py-0.5 text-[12px] leading-4 font-medium` with `title={t.title}`; remove `truncate`. Done chip: `line-through bg-field text-sub` (remove `opacity-50` and `text-dim`). The priority colours are unchanged.
  - Add the phone count pill from the spec after the chip container. Keep "+N more" inside the `sm:flex` container.
- [ ] **Step 3: Agenda:**
  - The list wrapper `space-y-3 pt-2 max-h-[500px] overflow-y-auto pr-1` becomes `space-y-3 pt-2`.
  - Each item: `relative focus-within:z-30 p-3 rounded-xl border transition-colors`, plus `done ? 'border-border/60 bg-field/60' : 'border-border bg-panel shadow-2xs hover:border-emerald-500/30'`.
  - Title button: replace `truncate` with `line-clamp-2 break-words`. When done, `line-through text-sub`.
  - Right side: `flex shrink-0 items-center gap-1.5` with View (its existing classes, but `h-9` in place of `h-8`). When `task.employee_id !== null`, add `CardMenu` with Edit and Delete exactly as in the spec. Remove the separate Edit and Delete buttons.
  - Import `CardMenu` from `@/Components/CardMenu`.
- [ ] **Step 4:** Run `npm run build`.
- [ ] **Step 5: Verify** as the employee:
  - M3 at 1440×900: `rows` 4–6 (whole weeks), `badChips` 0, `gridH` at least 20% below the baseline, `emptyRowMax` at most 82, `todayFilled` true, `agendaScrolls` false, `agendaOldButtons` 0, `readOnlyWithMenu` 0, `smallButtons` 0, `undatedStrip` true, and `hOverflow` false.
  - Select the day with 3 or more tasks: M2b `agenda` gives `topmost` true. Edit opens the form; Delete opens the confirmation (cancel it). The checkbox toggles done and back.
  - At 375×812 (reload after the resize): `hOverflow` false, `countPills` above 0, `chips` 0 (hidden), and tapping a day lists its tasks.
  - The Board tab and the All / Pending / Done filters work.
  - Console clean. Dark and phone screenshots.
- [ ] **Step 6: Commit** `feat(planner): denser calendar with readable titles and a more menu in the agenda`. Body: M3 before and after. Then run `npm run build` and commit `build: rebuild assets for the my tasks pass`.

### Task 7: Phase 3 done, review, deploy

- [ ] **Step 1:** Add to `CHANGELOG.md` under Unreleased > Changed:

  > My tasks calendar shows only the weeks of the month, with shorter day boxes, up to two lines of each title and the full title on hover. On phones each day shows how many tasks it has. The day list uses View and a "⋯" menu for Edit and Delete in place of three stacked buttons, and no longer scrolls inside the page. Whole-office and shared tasks still show View only.

  Commit `docs: changelog for the my tasks pass`.
- [ ] **Step 2: Gates**, as in Task 2 Step 2.
- [ ] **Step 3: Phase done browser checks.** Repeat the spec's Phase 3 checklist in full, plus a quick re-run of M2 on the employee board (`small` []). Attach screenshots.
- [ ] **Step 4: Opus review.** `delegate:reviewer` with the spec and the Phase 3 diff. Fix the findings and re-run Steps 2–3.
- [ ] **Step 5: Deploy, only after the owner approves Phase 3.** Same procedure as Task 2 Step 5. The `DEPLOYMENTS.md` entry commit is `docs(deploy): log my tasks pass`. Then remove the `taskboard-preview` server you started (`preview_stop`) and the baseline scratch file.
