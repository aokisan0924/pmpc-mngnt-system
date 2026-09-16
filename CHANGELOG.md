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

#### Frontend Engineering & UI/UX Skills
- **Frontend Skills Package**: Installed 11 specialized agent engineering skills into `.agents/skills/`:
  - `frontend-developer`, `ui-ux-designer`, `tailwind-design-system`, `react-modernization`, `react-state-management`, `frontend-mobile-development-component-scaffold`, `accessibility-compliance-accessibility-audit`, `ui-visual-validator`, `frontend-security-coder`, `e2e-testing-patterns`, and `playwright-component-testing`.

### Changed

- **Mouse Hold Highlight Suppression**: Disabled accidental text selection and ghost dragging (`user-select: none; -webkit-user-drag: none;`) across non-content UI chrome (buttons, navigation links, sidebars, headers, table headers, status badges, StatCard metadata, punch timeline steps, and quick action cards) while strictly preserving full text selection (`user-select: text`) for table data, form inputs, and copyable text.
- **Portal Branding Uniformity**: Replaced abstract 3-circle vector icon with official high-resolution PMPC crest emblem (`/pmpc_ems.png`) across `EmployeeLayout.jsx`, `AdminLayout.jsx` desktop sidebar, and `MobileHeader.jsx`.
- **Palette Standardization**: Standardized login portal on authentic cooperative deep teal/emerald (`#0F6E56`) across both light and dark themes.
- **Focused Input Outlines**: Upgraded input focus outlines with soft, layered focus glow rings (`focus:ring-2 focus:ring-[#0F6E56]/20`).
- **Hero Vignette**: Enhanced login brand hero section with an ambient radial gradient vignette behind the institutional crest.

### Removed

- **Login Badges**: Removed redundant portal badges (`Employee Portal`, `HR & Admin Console`) and system status pill (`System Active • Asia/Manila (GMT+8)`) from the login page for a cleaner presentation.

### Fixed

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
