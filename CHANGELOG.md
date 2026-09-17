# Changelog

All notable changes to the PMPC WorkForce (People's Multi-Purpose Cooperative Management System) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Non-Atomic Employee Account Creation**: Wrapped employee profile and government ID creation inside `DB::transaction(...)` in `EmployeeController.php`, ensuring accounts are not created in an inconsistent state if secondary government ID writes fail.
- **Sequential Employee ID Arithmetic Corruption**: Refactored `Employee::generateEmployeeId()` to explicitly query the highest numeric ID matching the `EMP-%` prefix, preventing string slicing arithmetic errors (`-27`) and ID collisions caused by date-formatted IDs like `2026-00028` and `2023-00010`.
- **Payroll Period Validation & Duplicate Batch Creation**: Enforced `after_or_equal:period_from` on payroll batch save and added duplicate validation in `StorePayrollRequest.php`, strictly rejecting duplicate batches for the same period and cutoff.
- **Non-Atomic Multi-Record Mutations**: Wrapped DTR dispute resolutions (`dtr_logs`, `dtr_edit_requests`, `employee_notifications`) in `DtrEditRequestController.php` and 13th month batch employee loops in `ThirteenthMonthController.php` in `DB::transaction(...)` to guarantee all-or-nothing data consistency.
- **N+1 Database Query Overhead**: Eager loaded `governmentIds` using `loadMissing('governmentIds')` in `EmployeeController.php` and `EmployeeProfileController.php`, and batch preloaded submitted employees in `PayrollController.php` (`whereIn('id', $employeeIds)->keyBy('id')`) to eliminate per-row database roundtrips.
- **Payroll Batch Ledger Rental Deduction Calculation**: Added missing `item.rental_deduction` and safe numeric float casting to the itemized row deductions breakdown in `PayrollShow.jsx`, reconciling the display with `PayrollCreate.jsx` and preventing financial ledger discrepancies.
- **Full-Page Browser Reloads on Admin Back Navigation**: Replaced raw `<a>` tags with Inertia `<Link>` components in `EmployeeShow.jsx`, `ThirteenthMonthCompute.jsx`, and `ThirteenthMonthShow.jsx`, ensuring smooth client-side SPA navigation without tearing down application state.
- **Invalid HTML Interactive Element Nesting**: Removed `<Button>` nested inside `<Link>` in `Payroll.jsx` (which violated HTML specifications and generated hydration warnings) and replaced it with a styled Inertia `<Link>`.
- **Shared State Contamination in DTR Dispute List**: Keyed supervisor decision notes by request ID (`adminNotes[req.id]`) in `DtrEditRequests.jsx`, preventing notes typed on one dispute card from inadvertently being submitted to another.
- **Accessibility & ARIA Tab Semantics**: Added explicit `role="tablist"`, `role="tab"`, and `aria-selected` attributes to status filter pills and navigation tabs in `Employees.jsx`, `EmployeeShow.jsx`, `Settings.jsx`, and `PayrollAnalytics.jsx`, added `role="radiogroup"` to tranche controls in `ThirteenthMonth.jsx`, and explicitly linked labels to input `id`s across `Settings.jsx`, `Archives.jsx`, and `EmployeeFormModal.jsx`.
- **Employee Action Hub Keyboard Navigation Crash**: Fixed undefined `ACTION_HUB_TABS` in `Dashboard.jsx` that caused an uncaught `ReferenceError` when navigating tabs with arrow keys.
- **Card Component Prop Handling & Missing Headers**: Enhanced `Card.jsx` to natively accept and render `title`, `description`, and `action` props into a `CardHeader`, restoring missing headers and action buttons on `Planner.jsx`, `Profile.jsx`, and `Payslips.jsx`.
- **StatCard Subtitles & Theme Colors**: Fixed `StatCard` prop mismatches in `Notifications.jsx` (`sub` → `subtitle`, `color` → `accent`), restoring dropped subtitles and fixing fallback to Admin indigo.
- **Profile Submit Button Theme**: Updated submit buttons in `Profile.jsx` from Admin indigo (`variant="primary"`) to Employee emerald (`variant="emerald"`).
- **Mobile Header & Bottom Navigation Design Tokens**: Replaced legacy theme tokens (`bg-brand`, `text-teal`, `bg-red`) with standard Tailwind emerald/rose utilities in `MobileHeader.jsx` and `BottomNav.jsx`, and added `aria-haspopup="dialog"`.
- **DTR Dead Code & Element Cleanup**: Removed dead hidden `StatCard` and hidden weekly strip `<div>` in `Dtr.jsx`, and standardized the punch action button to `<Button variant="emerald">`.
- **Task Planner Cleanup & Standard Button**: Replaced ad-hoc "+ New Task" button with `<Button variant="emerald">` and removed redundant global router event listeners in `Planner.jsx`.
- **Timezone Compliance**: Added explicit `{ timeZone: 'Asia/Manila' }` formatting to `LiveClock` in `Dashboard.jsx`.
- **Accessibility & Spacing Consistency**: Added ARIA tablist, tab, and tabpanel semantics to `Profile.jsx`, linked `aria-controls` in `Notifications.jsx`, and standardized container padding across all employee portal pages.

### Changed

- **Employee Form Modal Standard Tailwind Architecture**: Refactored `EmployeeFormModal.jsx` away from legacy ad-hoc JavaScript color dictionaries (`const C = { ... }`), runtime `<style>` injection, and inline styles into standard Tailwind CSS classes, modern modal layout, and shared `<Button>` components.
- **Design Tokens & Status Badges Standardization**: Standardized status badges across `Dashboard.jsx` and `DtrShow.jsx` to use the centralized `<Badge>` component with built-in status mapping, replaced legacy arbitrary color utilities (`bg-violet`, `text-teal`, `bg-blue/10`, `text-emerald`, `text-rose`) in `EmployeeShow.jsx`, `PayrollAnalytics.jsx`, `ThirteenthMonthCompute.jsx`, and `ThirteenthMonthShow.jsx` with consistent semantic Tailwind tokens, and standardized buttons to shared UI `<Button>` variants.

### Removed

- **Dead Personal Navigation Configuration**: Removed unused `My DTR` and `My tasks` entries under section `'Personal'` and the redundant filter in `AdminLayout.jsx`.
- **Redundant Nested Containers**: Removed redundant `min-h-screen` and duplicate `bg-bg` background wrappers across `EmployeeShow.jsx`, `PayrollAnalytics.jsx`, `ThirteenthMonth.jsx`, `ThirteenthMonthCompute.jsx`, `ThirteenthMonthShow.jsx`, `Archives.jsx`, and `Settings.jsx`.
- **Dead Comments & Unused Imports**: Cleaned up dead comments and removed unused `Button` import in `PayrollAnalytics.jsx`.


### Added

- **Admin Personal Navigation**: Added **My DTR** and **My Task Planner** links to the Admin Portal sidebar, giving super administrators direct desktop access to their own attendance record, punch controls, and task planner.

- **Real-Time Auto-Refresh for DTR Edit Requests & Portals**: Integrated Inertia's native `usePoll` background polling across `Admin/DtrEditRequests.jsx`, `Admin/Dashboard.jsx`, `AdminLayout.jsx`, and `Employee/Dtr.jsx`. Administrators now see incoming attendance edit requests immediately without manual page refreshes, and employees see instant live updates when their requests are approved or declined.
- **Real-Time DTR Edit Request Broadcast Event**: Created `DtrEditRequestCreated` event dispatched on employee edit request submissions, broadcasting on `dtr-edit-requests` channel with instant push notification integration.
- **Dedicated Form Requests Layer**: Created `StoreEmployeeRequest`, `UpdateEmployeeRequest`, `UpdateCompensationRequest`, `CreatePayrollRequest`, `StorePayrollRequest`, `StoreThirteenthMonthRequest`, and `DtrEditRequestSubmissionRequest` to enforce strict validation rules and strict typing across all administrative and attendance endpoints.

- **PMPC Navigation Loader** — replaced the generic Inertia/Laravel progress indicator with a branded, accessible PMPC WorkForce loading overlay that appears for meaningful page transitions.

- **Frontend Visual Review Tooling** — added the local `@playwright/cli` development dependency and Chromium browser support for repeatable localhost snapshots and screenshot-based UI validation.

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
- **1-Click Missed Punch Dispute Link & Modal**: Added a direct, accessible `"Missed a punch? Request adjustment"` trigger button inside the dashboard DTR punch action bar. Clicking the link opens `DtrEditRequestModal` pre-populated with attendance timestamps, allowing 1-click dispute and timestamp correction without navigating away from the dashboard (`Employee/Dashboard.jsx`).
- **Multi-Day Adjustment Selection in Edit Request Modal**: Upgraded `DtrEditRequestModal` to accept recent eligible attendance logs (`availableLogs`) spanning the past 7 days. Employees can seamlessly toggle between today and prior workdays via an inline date selector dropdown, inspect current recorded times for the selected date, specify corrected timestamps with required justification, and detect existing pending reviews with warning alerts (`DtrEditRequestModal.jsx`, `EmployeeDashboardController.php`).
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

- **Admin Portal Consistency Pass** — standardized compact page canvases, spacing, and header hierarchy across workforce, DTR, payroll, archive, settings, employee-detail, and 13th-month workflows. The legacy 13th-month drill-down pages now use the same Admin indigo controls and typography as the rest of the portal.

- **Admin Dashboard Simplification** — refocused the executive dashboard on cutoff action, operational KPIs, priority DTR triage, and today’s attendance. Removed redundant turnout visualizations, historical charts, department reporting, payroll forecasting, and duplicated dashboard-only detail already available in dedicated admin modules.

- **DTR PDF Presentation** — redesigned the DomPDF Daily Time Record with a formal document header, structured employee and summary panels, readable attendance table, and organized certification section for clearer A4 print output.

- **Employee Payslip Detail Readability** — expanded the selected-period header, projected-net panel, cutoff cards, and empty cutoff state to improve dark-theme contrast, spacing, and legibility.

- **Employee Payslip State Clarity** — separated finalized compensation from in-progress payroll in the employee archive: summary values now count only official payslips, draft periods receive clear guidance and projected labels, and PDF download is offered only after monthly finalization.

- **Employee Payslip Layout Organization** — regrouped pay-period browsing into a labeled, sticky desktop selector; reduced repeated card copy and excess spacing; and tightened the selected-period header, cutoff cards, and monthly breakdown for clearer scanning at every viewport.

- **Employee Payslips Frontend Refinement** — aligned archive spacing, typography, summary cards, cutoff indicators, and download action with the employee portal design system; corrected summary-card API usage and made year filtering consistently select a visible payslip.

- **Employee DTR Interface Refinement** — clarified each punch action, locked the live display to Manila time, simplified the weekly attendance strip and mobile records, removed the redundant pending-edits stat from the visible summary, and aligned all employee DTR states with the teal/amber/rose portal palette.
- **DTR Edit Request Modal Simplification** — removed unused multi-date selection logic so each row opens a concise, single-entry adjustment form.

- **Employee Dashboard Action Clarity**: Added a shared soft-emerald button treatment for task-detail, DTR, task-planner, notification, and payslip actions for consistent hierarchy and interactive states.
- **Employee Portal Visual System**: Standardized the Latest Payslip card on the employee teal palette, strengthened employee warning/error color tokens, and refined body and heading line heights. Increased dashboard greeting and payslip-value typography to reinforce the intended hierarchy.
- **Project-Wide Typography and Employee Color System**: Applied the Inter/Plus Jakarta Sans typography rules to native form controls and tabular values, added complete employee warning/error token scales, and replaced remaining direct employee indigo/chart accents with the teal, amber, and rose system.
- **Employee Dashboard Simplification**: Removed duplicate payday countdown and attendance-status messaging, the redundant days-present metric, duplicate Action Hub navigation links, and separate payslip PDF/archive actions. Renamed accrued pay to **Estimated Cutoff Pay** and consolidated the payslip action into a single archive link. Removed unused weekly-strip, monthly-summary, and duplicate notification payload generation from `EmployeeDashboardController.php`.

- **Global Pro-SaaS Scale Compaction**: Set root html font-size to 14px (`resources/css/app.css`), proportionally reducing font sizing, padding, card geometry, and layout scale by ~12.5% across both Employee and Admin portals. This resolves visual overwhelming and brings extensive tables and dashboards into standard laptop viewport visibility without distortion.
- **Layout Sidebars & Top Headers Compaction**: Reduced desktop navigation sidebar width from `w-64` to `w-56 lg:w-60`, mobile top bar from `h-16` to `h-13`, desktop sticky header from `h-16` to `h-13`, and brand crest emblem container from `w-10 h-10` to `w-8 h-8` across `EmployeeLayout.jsx` and `AdminLayout.jsx`.
- **DTR Page Density & Visual Hierarchy Polish**: Scaled down container padding, live clock font size (`text-2xl sm:text-3xl`), punch button padding, 4-punch step circle sizes (`w-8.5 h-8.5`), and monthly attendance table cell padding (`py-2 sm:py-2.5 font-mono text-xs`) and action button sizing in `Employee/Dtr.jsx`.
- **Weekly Attendance Strip Relocation**: Relocated the 5-Day Monday–Friday attendance sanity check strip from the Employee Dashboard (`Employee/Dashboard.jsx`) into the dedicated Daily Time Record page (`Employee/Dtr.jsx`) directly inside the Hero Punch Card. This keeps the primary employee dashboard minimal and hyper-focused on the 4-punch state machine while placing the weekly Mon–Fri audit grid where attendance logs are managed and inspected.
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

- **Duplicate Admin Page Summaries** — removed repeated dashboard-style metric tiles from Employee Management, DTR Edit Requests, DTR Archives, and 13th Month Pay. Their status counts remain available in the page filters, records, and dedicated analytics where they are actionable.

- **Admin Portal Personal Navigation** — removed employee-only personal DTR and task-planner links from the shared Admin Portal sidebar, keeping administrative navigation focused on workforce and payroll operations.

- **Dashboard Punch-Adjustment Shortcut**: Removed the dashboard correction button, modal wiring, and editable-DTR payload; employees now use the dedicated DTR page for all attendance adjustments.

- **Redundant Quick Navigation Shortcuts**: Removed redundant Quick Shortcuts cards and action grids from both the Employee Dashboard (`Employee/Dashboard.jsx`) and Admin Executive Dashboard (`Admin/Dashboard.jsx`), eliminating visual clutter since all actions and pages are already directly accessible from the persistent sidebar navigation.
- **Employee Dashboard Declutter Pass**: Removed 12 redundant or unnecessary elements from the Employee Dashboard (`Employee/Dashboard.jsx`): "Asia/Manila Time" badge (redundant with live clock), Employee ID label (visible in sidebar), filler subtitle ("Here is your live attendance sequence..."), duplicate "Open Full DTR →" header button (sidebar has DTR link), punch step period labels ("Morning Shift Start", etc.), "All 4 attendance punches recorded" confirmation text (already conveyed by green checkmarks and "Day Complete" badge), all 4 StatCard subtitle strings (progress bars communicate the same info), and verbose empty-state helper paragraphs across Tasks, Alerts, and Latest Payslip cards.
- **Employee DTR Page Declutter Pass**: Removed 10 redundant elements from the Employee DTR page (`Employee/Dtr.jsx`): "Attendance Portal" badge, filler subtitle, verbose "All 4 Punches Completed Today" banner (replaced with compact "Day Complete" badge), "Monday to Friday punch check" helper text, 3-dot color legend on weekly strip, "Upcoming" text on future days (replaced with em-dash), all 4 StatCard subtitles, "Itemized chronological punches…" card description, and simplified "Calendar Date" column header to "Date" and empty-state text. Cleaned up unused `CardDescription` import.
- **Login Subtitle Text**: Removed the explanatory subtitle ("Use your employee ID or email. We'll open the correct portal for your account.") below the sign-in header for a cleaner, more concise form layout (`Login.jsx`).
- **Login Badges**: Removed redundant portal badges (`Employee Portal`, `HR & Admin Console`) and system status pill (`System Active • Asia/Manila (GMT+8)`) from the login page for a cleaner presentation.

### Fixed

- **Employee Dashboard Empty Payslip Alignment**: Matched the empty Latest Payslip card height and centered its empty-state message and archive link for consistent alignment with the adjacent Action Hub (`Employee/Dashboard.jsx`).

- **DTR Weekly Strip & Date Query Compatibility**: Replaced exact date match `whereIn('date', ...)` with `whereBetween('date', [$startOfDay, $endOfDay])` in `DtrController.php` and `EmployeeDashboardController.php`, resolving MySQL `datetime` storage (`YYYY-MM-DD 00:00:00`) query mismatches so Monday–Friday attendance entries render accurately.
- **DTR DomPDF Export Log Lookup**: Fixed broken `$logs->firstWhere('date', $current->toDateString())` in `DtrPrintController.php` where Carbon date instances caused strict inequality against date strings, restoring full timesheet printing on official Form 48 DTR PDFs.
- **Today's In-Progress Attendance Status Badge**: Updated `formatLog()` in `DtrController.php` to identify morning-checked-in employees whose day is still underway as `in_progress` rather than prematurely labeling them as `absent`. Added active pulsing `In Progress` status badge support in `Employee/Dtr.jsx`.
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
