# Changelog

All notable changes to the PMPC WorkForce (People's Multi-Purpose Cooperative Management System) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Admin Dashboard & Executive Operations (`Dashboard.jsx`)
- **Executive Command Banner & Cutoff Milestone Tracker**:
  - Designed in signature Admin Portal deep indigo theme (`#26215C` via `#1E1B4B` to `indigo-950`).
  - Integrated real-time Manila clock and shift phase indicator (`Pre-Shift Window`, `Morning Shift Active`, `Lunch Break Interval`, `Afternoon Shift Active`, `Evening / Post-Shift`).
  - Semi-Monthly Cutoff milestone badge indicating current cycle (`1st Cutoff (1–15)` or `2nd Cutoff (16–EOM)`), calendar date bounds, and countdown of days remaining until cutoff finalization.
  - Cutoff payroll batch status badge (`Not Started`, `Draft`, `Finalized`) and direct 1-click **Process Payroll** action button linking to `/admin/payroll/create` with pre-filled cutoff parameters.
- **1-Click DTR Edit Requests Triage Hub**:
  - Built an inline administrative triage hub on the dashboard for instant resolution of pending attendance adjustment requests.
  - Direct 1-click Approve (`POST /admin/edit-requests/{id}/approve`) and Decline with reason prompt (`POST /admin/edit-requests/{id}/decline`) actions with inline processing spinners and feedback alert notices.
  - Displays employee name, department, target date, punch slot (AM In/Out, PM In/Out), original vs requested timestamps, and employee's submitted explanation.
- **Live Staff Search & Attendance Turnout Monitor**:
  - Added real-time client-side search input filtering the attendance roster dynamically by employee name or department.
  - Combined with one-tap status filter pills (`All`, `On Time`, `Late`, `Absent`).
  - Attendance turnout breakdown summary (`Present`, `Late`, `Absent`) alongside interactive donut turnout chart.
- **Contextual Progress Bars on KPI StatCards**:
  - Total Workforce: visual progress bar tracking active workforce ratio against total registered records.
  - Present Today: dynamic turnout progress track showing percentage of workforce checked in today.
  - Late Arrivals: on-time punctuality rate progress track showing percentage of present staff who arrived within scheduled shift bounds.
  - Pending DTR Edits: status indicator displaying "Awaiting Review" when pending requests exist or "All Clear" badge when queue is empty.
- **Department Attendance & Turnout Efficiency Table**:
  - Added structured department turnout overview alongside the department distribution chart.
  - Displays department name, active headcount, present staff count today, visual percentage turnout bar, and status badge (e.g. `100% Full Turnout`, `Partial Turnout`, `0% Absent`).
- **Statutory Deduction Splits & Compensation Projections**:
  - Enhanced the Payroll Financial card with full statutory deduction splits (SSS, PhilHealth, Pag-IBIG, Withholding Tax) and average staff daily compensation metrics.
  - Built active baseline liabilities projection card when no batches are finalized yet, displaying estimated monthly payroll, average daily rate, and direct link to initiate a payroll batch.
- **Enhanced Quick Action Shortcuts**:
  - Added quick navigation cards for Process Payroll, Review DTR Edits (with pending count badge), Staff Directory, and Analytics.

#### Backend Analytics & Dashboard Data (`AdminDashboardController.php`)
- **Semi-Monthly Cutoff Engine**: Added server-side detection of active semi-monthly cutoff period (1st-15th or 16th-EOM), bounds, calendar days remaining, and check for existing payroll batch status.
- **Live Shift Phase Calculator**: Added server-side resolution of Manila shift phase (`Pre-Shift Window`, `Morning Shift Active`, `Lunch Break Interval`, `Afternoon Shift Active`, `Evening / Post-Shift`).
- **Pending DTR Edit Requests Query**: Added eager-loaded query retrieving top pending `DtrEditRequest` records with linked `employee` and department for inline dashboard review.
- **Enriched Department Attendance Metrics**: Augmented department counts with today's attendance turnout count and calculated turnout percentages per department.
- **Payroll Cost Breakdown & Statutory Engine**: Added calculation of finalized statutory deduction splits (SSS, PhilHealth, Pag-IBIG, Tax) or baseline monthly projections from active roster compensation rates.

#### Employee Dashboard & Attendance Punch Flow
- **Payday Countdown Badge & Accrued Cutoff Pay StatCard**: Added a live Next Payday countdown badge in the Welcome Banner (`Next Payday: Sep 30 (13d left)`), upgraded the 4th StatCard to **Accrued Cutoff Pay** displaying accumulated basic earnings with an interactive progress bar against projected cutoff target pay, and relocated pending DTR edit alerts to an inline badge on the attendance header (`Employee/Dashboard.jsx`).
- **5-Day Weekly Attendance Strip**: Added a compact horizontal Monday–Friday attendance sanity check strip inside the DTR card displaying weekday names, calendar day numbers, highlighted `TODAY` ring/badge, punch completion counts (`4/4`, `2/4`), rendered hours, and quick morning check-in timestamps (`Employee/Dashboard.jsx`).
- **1-Tap Direct Quick Punch**: Added a direct attendance punch button on the dashboard calling `POST /employee/dtr/punch` with real-time request handling, disabling during requests, and loading spinner animation.
- **Dynamic Punch Feedback**: Added timestamped success/error banner below the punch controls displaying the exact time and slot recorded (e.g. "Recorded AM In successfully at 08:02 AM").
- **Connected 4-Step Attendance Timeline**: Implemented visual 4-punch step cards (AM In → AM Out → PM In → PM Out) showing sequence numbers, recorded punch times, active pulsing badges for the next expected punch, and reference shift target windows.
- **Live Elapsed Shift Timer**: Added dynamic shift duration counter tracking elapsed hours and minutes during active morning and afternoon work periods (e.g. `Morning Shift Active • 4h 12m elapsed`).
- **Semi-Monthly Cutoff Indicator**: Added a live cutoff badge in the dashboard banner indicating the current semi-monthly cycle (`1st Cutoff (1–15)` or `2nd Cutoff (16–EOM)`) and countdown of days remaining until cutoff finalization.
- **Employee Action Hub**: Built a dual-tab operational hub featuring:
  - *Priority Tasks Tab*: Displays top pending assignments with priority indicators (High, Medium, Low) and due date tags ("Today", "Tomorrow", "Overdue").
  - *1-Click Task Toggle*: Instant status toggle checkbox calling `PATCH /employee/planner/{task}/toggle` with live optimistic completion.
  - *Alerts & Notices Tab*: Unread HR notifications feed with relative timestamps and direct modal/page navigation links.
- **Latest Payslip Voucher Card**: Added a dedicated payslip summary widget displaying the employee's latest finalized net pay, payroll period bounds, cutoff designation, and a direct 1-click PDF download link (`/employee/payslips/{month}`).
- **Contextual Metric Progress Bars**: Extended `StatCard` with a responsive progress track showing:
  - Days present against total cutoff workdays target (e.g., 11 workdays).
  - On-time arrival rate relative to monitored grace periods.
  - Rendered work hours against the standard semi-monthly target (88h).
  - Pending DTR adjustment request status awaiting administrative review.
- **Quick Navigation Shortcuts**: Added streamlined direct shortcuts to Daily Time Record, Task Planner, and Employee Profile records.

#### Backend Analytics & Dashboard Data (`EmployeeDashboardController.php`)
- **Cutoff Earnings & Payday Engine**: Added server-side calculation of next payday calendar date, countdown of days remaining until payday, employee daily rate, accrued basic earnings from attendance present days, and projected full-attendance cutoff basic compensation (`EmployeeDashboardController.php`).
- **Weekly Attendance Strip Engine**: Added server-side query aggregating current work week (Monday–Friday) DTR records with completion counts, hours rendered, status resolution, and check-in times (`EmployeeDashboardController.php`).
- **Semi-Monthly Cutoff Engine**: Added server-side calculation of cutoff periods, exact calendar bounds, remaining calendar days, and non-weekend working days count.
- **Cutoff-Specific Metrics**: Integrated queries for cutoff attendance days present and sum of hours rendered filtered to the active semi-monthly period.
- **Priority Tasks Query**: Added server-side query retrieving uncompleted tasks ordered by due date and priority weight.
- **Latest Finalized Payslip Query**: Added query fetching the most recent finalized `PayrollItem` with eager-loaded `payroll` metadata.
- **Next Punch Resolution**: Exposed next expected punch slot directly via `DtrLog::getNextPunchSlot()`.

#### Authentication & Login Overhaul (`Login.jsx`)
- **Official Institutional Emblem**: Integrated the official high-resolution PMPC crest logo (`/pmpc_ems.png`) into both desktop hero and mobile brand headers.
- **Elevated Glassmorphic Card**: Redesigned the sign-in panel into an elevated card container with rounded-2xl geometry, subtle borders, and soft elevation shadows.
- **Tactile Identifier Clear Button (`✕`)**: Added a 1-click input clear button when typing an employee ID or email.
- **Automatic Whitespace Trimming**: Added `.trim()` on credential field blur to prevent failed logins from pasted whitespace.
- **Custom Animated Checkbox**: Built an accessible, custom animated SVG checkbox for "Remember me on this device".
- **Caps Lock Detection**: Added a real-time warning banner on the password field when Caps Lock is active.
- **Input Icon Prefixes**: Added SVG leading icons (employee badge and security padlock) to credential input fields.
- **Form Submission Spinner**: Added inline SVG loading spinner to the primary sign-in button during active Inertia requests.
- **Validation Error Shake**: Added CSS keyframe micro-animation (`.animate-shake`) triggered on authentication error.

#### Component Library Enhancements (`StatCard.jsx`)
- **Progress Prop Support**: Added optional `progress` prop accepting `{ value, max, label, color }` or a raw percentage number.
- **Dynamic Progress Bar**: Built an accessible progress bar with fluid CSS transitions and theme-aware accent colors.
- **Login Emblem Watermark**: Added a subtle radial-gradient masked institutional emblem watermark (`/pmpc_ems.png`) behind the brand hero message on the green pillar of the login page (`Login.jsx`).

#### Frontend Engineering & UI/UX Skills
- **Frontend Skills Package**: Installed 11 specialized agent engineering skills into `.agents/skills/`:
  - `frontend-developer`, `ui-ux-designer`, `tailwind-design-system`, `react-modernization`, `react-state-management`, `frontend-mobile-development-component-scaffold`, `accessibility-compliance-accessibility-audit`, `ui-visual-validator`, `frontend-security-coder`, `e2e-testing-patterns`, and `playwright-component-testing`.

### Changed

- **Employee Dashboard DTR Flow Hierarchy**: Reordered the Employee Dashboard (`Employee/Dashboard.jsx`) layout to position "Today's 4-Punch Attendance Flow" directly beneath the Welcome Banner and above the KPI summary cards, bringing the immediate daily clock-in/out state machine directly into primary operational view.
- **Compact UI Scaling Across Portals**: Scaled down visual density across both Employee and Admin Dashboards (`Employee/Dashboard.jsx`, `Admin/Dashboard.jsx`, `StatCard.jsx`):
  - Reduced outer container padding from `p-6`–`p-8` to `p-3.5 sm:p-5 lg:p-6` with tighter `space-y-4` vertical rhythm.
  - Compacted Welcome and Executive Command banners, live Manila clocks, shift phase indicators, and Action Hub cards.
  - Reduced `StatCard` padding from `p-5` to `p-3.5 sm:p-4`, icon boxes to `w-9 h-9`, and numeric values from `text-3xl` to `text-xl sm:text-2xl`.
  - Scaled Admin Recharts container heights down (performance trends to 190px, department and payroll financial charts to 135px–140px) to eliminate vertical scrolling fatigue and keep critical metrics within standard laptop viewport view.
- **Mouse Hold Highlight Suppression**: Disabled accidental text selection and ghost dragging (`user-select: none; -webkit-user-drag: none;`) across non-content UI chrome (buttons, navigation links, sidebars, headers, table headers, status badges, StatCard metadata, punch timeline steps, and quick action cards) while strictly preserving full text selection (`user-select: text`) for table data, form inputs, and copyable text.
- **Portal Branding Uniformity**: Replaced abstract 3-circle vector icon with official high-resolution PMPC crest emblem (`/pmpc_ems.png`) across `EmployeeLayout.jsx`, `AdminLayout.jsx` desktop sidebar, and `MobileHeader.jsx`.
- **Palette Standardization**: Standardized login portal on authentic cooperative deep teal/emerald (`#0F6E56`) across both light and dark themes.
- **Focused Input Outlines**: Upgraded input focus outlines with soft, layered focus glow rings (`focus:ring-2 focus:ring-[#0F6E56]/20`).
- **Hero Vignette**: Enhanced login brand hero section with an ambient radial gradient vignette behind the institutional crest.

### Removed

- **Employee DTR Card Explanatory & Target Text**: Removed redundant sequential locking subtitle ("Strict sequential locking: punches must follow AM In → AM Out → PM In → PM Out order."), target times ("Target: 08:00 AM", etc.), and bottom action helper text ("Next action: ... Punches are officially timestamped to Asia/Manila server time.") from the attendance card on the Employee Dashboard for a cleaner, decluttered presentation (`Employee/Dashboard.jsx`).
- **Login Subtitle Text**: Removed the explanatory subtitle ("Use your employee ID or email. We'll open the correct portal for your account.") below the sign-in header for a cleaner, more concise form layout (`Login.jsx`).
- **Login Badges**: Removed redundant portal badges (`Employee Portal`, `HR & Admin Console`) and system status pill (`System Active • Asia/Manila (GMT+8)`) from the login page for a cleaner presentation.

### Fixed

- **Task Planner Modal Dialog & Accessibility**: Upgraded task creation and editing modal with standard WAI-ARIA dialog attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="task-form-title"`), added keyboard `Escape` key dismiss listener, linked form labels to inputs via explicit `id` and `htmlFor` pairings, and replaced Admin Indigo submit button styling with Employee Portal emerald (`variant="emerald"` in `Employee/Planner.jsx`).
- **Task Planner Accessible Task Deletion**: Replaced native blocking `window.confirm()` with the accessible, non-blocking `<ConfirmModal>` component (`ConfirmModal.jsx`) featuring theme-aware styling, keyboard dismissal, and screen reader announcements (`Employee/Planner.jsx`).
- **Task Planner Month Navigation & Calendar Semantics**: Added explicit `type="button"` and accessible `aria-label`s to previous/next month and today navigation controls, fixed month title formatter spacing (`${month} ${year}`), added `role="tablist"` and `role="tab"` to status filter pills, added descriptive `aria-label`s to calendar day cells with date and task count context, and enhanced day agenda task checkboxes with `role="checkbox"` and `aria-checked` (`Employee/Planner.jsx`).
- **Employee Notifications Category Filtering & Accessibility**: Added interactive category filter tabs (`All`, `Unread`, `Approved`, `Declined`) with full `role="tablist"`, `role="tab"`, and `aria-selected` semantics, enabled loading spinner prop on the "Mark All Read" button, replaced Admin Indigo notice badges with Employee Portal design tokens, added `<span className="sr-only">Unread notification</span>` for non-visual accessibility, and added contextual `aria-label`s on delete buttons and "Open Record" links (`Employee/Notifications.jsx`).
- **Payroll Create Dark Mode & Form Accessibility**: Eliminated hardcoded pure-white table and header backgrounds in `PayrollCreate.jsx`, migrating all layout elements, formula callouts, and table structures to Admin Indigo design tokens (`bg-panel`, `bg-field`, `border-border`, `text-text`). Added `aria-label` to weekday and weekend overtime numeric inputs, added `scope="col"`/`scope="colgroup"` to headers, wrapped totals in `useMemo`, and upgraded the breadcrumb to Inertia `<Link>`.
- **Payroll Show Ledger Modernization**: Modernized `PayrollShow.jsx` from hardcoded white metric boxes to elevated `<Card>` components with high-contrast typography in both light and dark modes. Replaced raw `<a>` tags with Inertia `<Link>`, added table scopes, and upgraded action buttons.
- **ConfirmModal Rounded Geometry**: Added `rounded-2xl` to the modal dialog card and `rounded-xl` to the cancel button in `ConfirmModal.jsx`, fixing sharp 90-degree corners and adding dark-mode compatible icon background variants (`dark:bg-indigo-950/60`, `dark:bg-rose-950/60`).
- **Payroll Batch Archive Form Controls**: Associated From and To date labels with `id`/`htmlFor`, added `role="radiogroup"` and `aria-checked` to cutoff selector pills, declared `scope="col"` on archive table headers, and labeled batch links in `Admin/Payroll.jsx`.
- **DTR Isolated Live Clock**: Extracted `<DtrLiveClock />` component in `Employee/Dtr.jsx` to isolate the 1-second interval timer state and eliminate 60 re-renders per minute across the 31-day attendance ledger and summary cards.
- **DTR Punch Button Attributes**: Added explicit `type="button"`, accessible `aria-label`, and `aria-hidden="true"` on the loading spinner in `Employee/Dtr.jsx`.
- **DTR Table Header & Action Semantics**: Added `scope="col"` across all table headers and contextual `aria-label={`Request edit for ${log.date_label}`}` on dispute triggers in `Employee/Dtr.jsx`.
- **DTR Edit Request Modal Accessibility & Theming**: Modernized `DtrEditRequestModal.jsx` from hardcoded inline hex styles to Tailwind semantic tokens (`bg-panel`, `border-border`, `text-text`). Added `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape key listener, and explicit `id`/`htmlFor` pairings across all punch time inputs and the reason textarea.
- **Admin DTR Ledger Memoization & Accessibility**: Wrapped `monthLabel` in `useMemo`, added `type="button"` and `aria-label` to month navigation controls, linked filter labels with `htmlFor`/`id`, added `scope="col"` to table header cells, replaced hard reloads with Inertia `<Link>` for view log, and added contextual row action labels (`Admin/Dtr.jsx`).
- **Admin DTR Employee View Theming & SPA Navigation**: Replaced legacy raw `<a>` tag with Inertia `<Link>` for back navigation, replaced non-standard color classes (`bg-teal`, `text-teal`, `text-violet`) with Admin Indigo design tokens and Badge components, added `scope="col"` to headers, and added accessible labels to month buttons (`Admin/DtrShow.jsx`).
- **Admin DTR Edit Requests ARIA Tabs & Batch Memoization**: Memoized request counts and filtered collections using `useMemo`. Added `role="tablist"`, `role="tab"`, and `aria-selected` to filter pills, added `aria-expanded` and contextual labels to diff drawers, labeled supervisor note inputs, and added explicit action labels for approve/decline buttons (`Admin/DtrEditRequests.jsx`).
- **ThemeToggle Rounded Corners**: Added `rounded-lg` to the theme toggle button across both Employee and Admin portals so it matches the app-wide rounded aesthetic (`ThemeToggle.jsx`).
- **Mobile Menu Dropdown Rounding**: Added `rounded-xl` to the mobile navigation slide-down menu in `MobileHeader.jsx`.
- **Employee Punch Button Accessibility**: Added explicit accessible `aria-label` describing next punch action or recording status, and `aria-hidden="true"` on the loading spinner SVG (`Employee/Dashboard.jsx`).
- **Task Toggle Focus Ring**: Added visible focus rings (`focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1`) for keyboard accessibility on task completion checkboxes (`Employee/Dashboard.jsx`).
- **Welcome Banner Region Semantics**: Declared `role="region"` and `aria-label="Shift overview"` on the employee dashboard banner (`Employee/Dashboard.jsx`).
- **Late Arrivals Progress Bar Metric Context**: Formatted on-time rate label to clearly state "X of Y on time" rather than ambiguous 0% when zero on-time arrivals occur (`Employee/Dashboard.jsx`).
- **Stale Closure in Quick Punch**: Captured target punch slot label and current timestamp into local variables prior to Inertia post visit to prevent out-of-sync feedback text (`Employee/Dashboard.jsx`).
- **Admin Decline Workflow Accessibility**: Replaced blocking, non-stylable `window.prompt()` with an accessible, theme-styled inline modal dialog with note/reason textarea and keyboard dismiss (`Admin/Dashboard.jsx`).
- **Admin Attendance Filter Tabs**: Added `role="tablist"`, `role="tab"`, and `aria-selected` to live attendance filter pills (`Admin/Dashboard.jsx`).
- **Staff Search Input Labeling**: Added `aria-label="Search employees by name or department"` to the live search field (`Admin/Dashboard.jsx`).
- **Admin Triage Button Context**: Added contextual `aria-label` specifying the employee name for DTR edit request approval and decline actions (`Admin/Dashboard.jsx`).
- **Recharts Chart Accessibility**: Wrapped Recharts containers in accessible `<div role="img" aria-label="...">` elements with contextual summaries (`Admin/Dashboard.jsx`).
- **Chart Axis Dark Mode Contrast**: Connected axis tick colors to dynamic theme state (`isDark ? '#94A3B8' : '#64748B'`) for high contrast in dark mode (`Admin/Dashboard.jsx`).
- **Department Table Attendance Status Color**: Applied conditional emerald/rose coloring to the "Today" turnout column so 0 present reflects a warning state instead of green (`Admin/Dashboard.jsx`).
- **Admin Mobile Shortcuts Grid**: Updated shortcuts grid to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` to prevent cramped cards on mobile viewports (`Admin/Dashboard.jsx`).
- **Dashboard Component Re-render Performance**: Extracted `<LiveClock />` component in Employee Dashboard to isolate the 1-second timer state from the parent tree, and wrapped Admin Dashboard query filters and metrics in `useMemo` with `useRef` rapid-click locks (`Employee/Dashboard.jsx`, `Admin/Dashboard.jsx`).
- **Action Hub Tab Accessibility**: Added semantic ARIA tab relationships and standard keyboard navigation so assistive-technology and keyboard users can operate the employee dashboard tabs — see `Dashboard.jsx`.
- **Banner Typography**: Fixed typographical glitch with extra whitespace before greeting comma in employee dashboard (`{greeting}, {first_name}!`).
- **Ticking Clock Accessibility**: Added `aria-live="off"` to the live dashboard clock to prevent screen-reader announcement spam every second.
- **Punch Step Accessibility**: Added explicit `role="status"` and accessible labels across attendance punch steps.
- **PHP 8.4 Deprecation**: Resolved PHP 8.4 implicit nullable parameter deprecation in `EmployeeNotification::send()` by explicitly declaring `?string $link = null`.
- **Atomic Payroll Persistence**: Wrapped payroll creation and item calculations inside `DB::transaction()` to prevent partial batch persistence upon database constraint failure.
- **Login Helper Text Alignment**: Aligned login example placeholder with system-generated ID format (`EMP-0001`), resolving Known Issue 5.4 in `AGENTS.md`.

### Security

- Enforced strict user authorization checks on task toggle and modification routes (`TaskController.php`).

## [0.1.0] - 2026-09-16

### Added

- Initial documented state at start of changelog tracking
