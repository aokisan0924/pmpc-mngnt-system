# PMPC WorkForce Design System

## Direction

Calm operational workspace for recurring HR work. The interface prioritizes the next accountable action, then the supporting records needed to complete it.

## Color and Theme

Light mode is the only application theme for consistent daylight office and mobile use. Old browser dark-mode preferences are reset to light. Employee actions use PMPC green; administrator actions use deep purple. Status colors communicate state, not portal identity.

## Typography

Manrope provides a compact, highly legible operational voice for interface text and headings without competing with attendance and payroll data.

## Layout

Desktop uses a persistent role-aware sidebar and compact contextual header. Mobile uses a concise top bar and employee bottom navigation. Page content uses a centered operational canvas with generous outer spacing and denser related groups.

## Components

Cards have a restrained surface, 16px radius, and low elevation. Buttons are rounded, high-contrast actions. Forms and tables share semantic border and field tokens. Focus is always visible.

## Content Hierarchy

Employee pages lead with attendance and personal work. Administrator pages group operations into command center, personal workspace, people and attendance, compensation and reports, and administration.

## Mobile Attendance Actions

The next required DTR punch remains persistently available above the employee bottom navigation on narrow screens. On larger screens, the same single action appears within the primary DTR Command Console so the required task precedes supporting records without duplicating the mutation control.

## Employee Portal Visual Architecture & Tokens

### 1. DTR Hero Workstation & Employee Page Headers
- **Theme & Surface**: Signature `#0F6E56` pine emerald surface (`bg-[#0F6E56] border border-[#0D5C48] text-white`) with targeted radial depth lighting (`radial-gradient(ellipse 90% 70% at 20% 20%, rgba(20, 138, 108, 0.45), transparent 75%), radial-gradient(ellipse 70% 60% at 85% 85%, rgba(6, 46, 36, 0.65), transparent)`).
- **Emblem & Texture**: Authentic grayscale brightness-boosted PMPC watermark emblem (`opacity-[0.08] filter grayscale brightness-200 contrast-125`) with soft radial edge masking, accompanied by a subtle swiss-grid texture overlay (`opacity-[0.08]`).
- **Precision Typography**: Compact operational Manrope headings (`font-heading font-bold tracking-tight text-white`), uppercase tracking badges (`tracking-[0.16em] text-emerald-300`), and tabular figures (`tnum`).
- **Tactile Primary Actions**: High-contrast crisp white action buttons (`bg-white hover:bg-emerald-50 active:bg-emerald-100 text-[#0F6E56] font-extrabold shadow-md cursor-pointer transition-all`) with clear semantic SVG icons (never emojis).

### 2. Standardized Page Shell & Toolbars
- **Shell**: `.employee-page-shell` (`width: min(100%, 90rem); margin-inline: auto; padding: 0.875rem sm:1.25rem lg:1.5rem; space-y-5`) ensuring consistent responsive canvas boundaries across all pages.
- **Toolbars & Filter Tabs**: `.employee-toolbar` (`border: 1px solid color-mix(in srgb, #0F6E56 16%, var(--color-border)); border-radius: 1rem; background: color-mix(in srgb, var(--color-panel) 94%, #ECF8F4);`) with high-contrast active capsules (`bg-white text-[#0F6E56] font-bold shadow-xs border border-emerald-200/80 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800`).
- **Workspace Cards**: `.employee-workspace-card` with subtle emerald-tinted border mix (`color-mix(in srgb, #0F6E56 16%, var(--color-border))`) and low elevation.

### 3. Page Harmonization Status
- **Dashboard (`/employee/dashboard`)**: DTR command console, Asia/Manila live clock, 4-step sequential punch controller, non-redundant attendance telemetry, and tabbed action hub.
- **Attendance Archive (`/employee/dtr`)**: Standardized shell, signature emerald page header, white print button, monthly attendance metrics, and tactile month stepper.
- **Task Planner (`/employee/planner`)**: Standardized shell, signature emerald page header, white "New Task" button, toolbar filter tabs, brand emerald date numerals, and day agenda.
- **Payslips (`/employee/payslips`)**: Standardized shell, signature emerald page header, career metrics, pay period list with active emerald indicators, and net compensation highlight banner.
- **Profile (`/employee/profile`)**: Standardized max-5xl shell, signature emerald page header with white/emerald avatar and daily rate pill, toolbar tabs, and emerald input focus states.
- **Notifications (`/employee/notifications`)**: Standardized shell, signature emerald page header, white "Mark All Read" button, 4-column metric grid, and unread cards with brand emerald pulse beacons.

## Admin Portal Visual Architecture & Tokens

### 1. Operations Command Workstation & Admin Page Headers
- **Theme & Surface**: Signature `#26215C` deep purple surface (`bg-[#26215C] border border-[#201B4D] text-white`) with targeted dual radial depth lighting (`radial-gradient(ellipse 90% 70% at 20% 20%, rgba(64, 56, 120, 0.45), transparent 75%), radial-gradient(ellipse 70% 60% at 85% 85%, rgba(19, 16, 47, 0.65), transparent)`).
- **Emblem & Texture**: Authentic grayscale brightness-boosted PMPC watermark emblem (`opacity-[0.08] filter grayscale brightness-200 contrast-125`) with soft radial edge masking, accompanied by a subtle swiss-grid texture overlay (`opacity-[0.08]`).
- **Precision Telemetry**: Integrated Asia/Manila live clock (`LiveClock`) with live seconds and date, synchronized with standard Philippine labor operational time.
- **Tactile Direct Actions**: High-contrast crisp white action buttons (`bg-white hover:bg-indigo-50 active:bg-indigo-100 text-[#26215C] font-extrabold shadow-md cursor-pointer transition-all`) with clear semantic SVG icons (never emojis).
- **Tactical Command Deck**: Embedded within the operations console to provide instant cycle management, cutoff progress, days remaining, and direct payroll actions.

### 2. Standardized Admin Layout & Navigation
- **Sidebar**: Seamless deep purple column (`bg-[#26215C] text-white border-r border-white/15`) with branded white PMPC logo card, live status beacon, and crisp uppercase section headers (`text-white/60`).
- **Active Navigation**: High-contrast white active pills (`.admin-sidebar-active-pill bg-white text-[#26215C] font-bold shadow-xs`) with contrasting text and icons. Inactive links feature smooth hover elevation (`text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-0.5`).
- **Pending Badge Indicator**: Distinct amber capsule (`bg-amber-400 text-[#26215C] font-bold`) alerting to pending DTR edit requests.
- **User Footer**: Frosted dark card (`bg-black/20 border border-white/15`) with white avatar badge (`bg-white text-[#26215C] font-bold ring-2 ring-white/20`), admin initials, full name, monospace employee ID, and signout action.

### 3. Page Harmonization Status
- **Operations Dashboard (`/admin/dashboard`)**: Operations overview console, Manila live clock, payroll cutoff tactical deck, workforce telemetry stat cards, pending DTR edit requests triage with accessible decline dialog, and real-time attendance search roster.
- **Admin Page Header (`AdminPageHeader.jsx`)**: Standardized with authentic PMPC watermark emblem, dual radial depth lighting, swiss-grid texture, and high-contrast action buttons.

Last updated: 2026-09-29 - Removed the user-selectable dark theme and made existing dark preferences resolve to light.

## Payroll workspace

Refined operational ledger: preserve Manrope, deep purple `#26215C`, semantic panel/field/border tokens, and tabular currency. Use compact section labels and whitespace to distinguish preparation, employee review, and saved reports.

- Preparation uses a 280px searchable review queue beside one employee editor; mobile stacks the queue above the editor. Search and review filters do not remove employees from the submitted batch.
- Group the editor into office and attendance basis, overtime and earnings, and statutory/cooperative deductions. A persistent bottom action shows batch net payout and remaining review count. Edits invalidate that employee's review confirmation.
- Saved batches use responsive employee summaries with native expandable earnings/deduction details. Downloads and signatory selection follow the ledger; discard is separated from finalization.
- Controls use a minimum 44px height, visible native focus, named inputs, and text status indicators. No new animation or font dependencies; existing reduced-motion behavior remains in effect.
- Components: `PayrollSummary`, `PayrollCreate` employee queue/editor, `PayrollShow` expandable ledger, and `PayrollExcelExport` signatory fields.

Last updated: 2026-10-02 - Organized payroll review and reporting with the frontend-god-mode skill.

### Payroll progressive review

- Saved batches are the main payroll landing view; new-batch setup opens on demand and is initially visible for an empty ledger.
- Employee review shows one of three sections at a time: Pay basis, Earnings, Deductions. Numbered buttons allow direct access; Continue advances the review. Confirmation remains in the deductions section and all original fields remain in the form.
- Switching employees returns to pay basis; server errors select the affected employee and review section.

Last updated: 2026-10-02 - Reduced simultaneous payroll controls with progressive employee review and on-demand batch setup.

Last updated: 2026-10-02 - New payroll offers exactly three offices: Fort Magsaysay, Cubao Satelite Office, and General Merchandise. Main Office is historical export compatibility only.

## Account setup and payroll release

- One-time confirmation collects identity, contact and office information, with employment review and optional government IDs in a disclosure. Signatures are a separate optional private upload. Pending/rejected/approved status is explicit; attendance remains available.
- HR review uses a pending queue and employee detail office-transfer history. Payroll shows the verified office as read-only, flags unverified staff, and preserves every employee in the batch.
- Employee payslip totals and PDFs include finalized cutoffs only; the remaining cutoff is absent until released.

Last updated: 2026-10-02 - Added account setup, HR verification, automatic payroll offices and finalized-only employee payslips.
