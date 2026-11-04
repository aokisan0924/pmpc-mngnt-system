# Employee screens: compact header and text cleanup (design)

Date: 2026-11-04. Status: awaiting approval. Size: medium frontend change. Admin screens are a separate, later round.

## Intent
Staff use the employee screens all day. Today every page opens with a tall green banner that repeats what the sidebar and breadcrumb already
say, then adds eyebrow labels, descriptions and sub-lines. Real content starts low and the screens feel alike. Make each page lead with
what matters, with less text and no repetition.

## Goals
- **Compact green header (mockup option B):** one slim row: title, at most one status chip, and the page's main action. Roughly half the
  current height. The green identity and the logo stay.
- **Text cleanup on every employee screen:** remove words that do not help the user act or understand.
- **Intentional placement:** on each page the order is what needs me, then the main content, then history or details.

## Cleanup rules (apply to every employee screen)
1. Page identity lives in the sidebar and breadcrumb, so the header has no eyebrow label ("Personal Workspace", "Compensation Archive"…) and no description line.
2. A number appears once per screen. If the header chip says "3 open", the tabs and cards do not repeat it.
3. A metric's sub-text stays only if it adds information (a period, a unit, a comparison). Remove sub-text that restates the label
   (for example "Disbursed vouchers", "Pending HR closure").
4. A section gets a description only when something is non-obvious. Never a sentence that describes the obvious ("Your recent tasks.").
5. Status is shown as short text plus colour, never as a long sentence.
6. Empty states are one short line plus the action, if any.

## Non-goals
- No change to DTR rules, attendance logic, payroll figures, URLs, roles, or what data each page shows.
- No change to which days the attendance log lists (the 2026-10-16 decision in `DESIGN.md` is kept: every calendar day). Future days may be
  styled quieter, not removed.
- No new fonts, libraries or dark theme. Mobile bottom navigation stays.
- Admin screens, login and password pages are not part of this round.

## Anti-goals
- Do not hide information staff rely on: punch times, net pay, daily rate, status, due dates.
- Do not shrink touch targets below 44px, drop visible focus, or lower contrast.
- Do not make screens look unrelated to the admin portal's structure (same layout system, different accent).

## Approaches considered
A. Slim title bar with no green banner (most space saved, but loses the strong green identity staff know).
B. **Compact green header (chosen by Kurt).** Least change, keeps the brand feel, about half the height.
C. Title row plus a "what needs me" figures strip. Not the base frame; may be used on individual pages (dashboard, payslips, tasks) where one
   number clearly matters, if the builder finds it earns its space.

## Design
- Change `EmployeePageHeader.jsx` once: smaller padding and title, single row, `eyebrow` and `description` no longer rendered (remove them
  from the pages that pass them), chip and action kept. Keep `leading` for the Profile avatar, at a smaller size.
- Pages using it: Attendance (`Dtr`), Notifications, Payslips, My tasks (`Planner`), Profile. The Dashboard has its own hero and is
  tidied by the same rules rather than the shared header.
- Profile keeps employee ID, department/position and daily rate, but as one compact line and one small figure instead of a banner plus a second box.
- Then walk each page against the cleanup rules, and fix placement where the order is wrong.

## Verification
Before/after screenshots of every employee screen at desktop (1440px) and phone (390px) width, `npm run build`, and the existing test
suite. Check keyboard focus and contrast where touched.

## Calls made (change any of these)
- Profile's avatar stays, smaller; "Active Staff" chip stays only if it is not the default state (decide while building).
- The Dashboard hero is trimmed, not replaced, because the punch controls must stay where staff expect them.
- Rollout is one deploy of all employee screens, after your review of the screenshots.
