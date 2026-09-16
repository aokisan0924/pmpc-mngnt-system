# Changelog

## [Unreleased]

### Added
- Direct 1-Tap Quick Punch action on Employee Dashboard (`POST /employee/dtr/punch`) with loading spinner and dynamic state transitions.
- Live semi-monthly cutoff badge (`1st Cutoff (1–15)` / `2nd Cutoff (16–EOM)` with days remaining) in the welcome banner.
- Live elapsed shift time calculation during active morning and afternoon work periods.
- Contextual target progress bars on Dashboard StatCards (Cutoff attendance vs workdays target, on-time rate, hours rendered vs cutoff target).
- Interactive Employee Action Hub with dual tabs for Priority Tasks (with 1-click completion toggle via `PATCH /employee/planner/{task}/toggle`) and Alerts & Notices.
- Latest Payslip Voucher card with period net pay summary and direct 1-click PDF voucher download link.
- Official PMPC emblem branding (`/pmpc_ems.png`) integrated into the brand hero panel and responsive mobile header.
- Elevated glassmorphic form card container with rounded-2xl geometry, subtle border, and soft elevation depth.
- Tactile form inputs: Quick-clear button (`✕`) on identifier input and automatic whitespace trimming (`.trim()`) on blur.
- Custom accessible animated SVG checkbox for "Remember me on this device" with brand teal accent.
- WCAG 2.1 AA accessibility improvements: `aria-live="polite"` feedback on Caps Lock warning and password visibility toggle, with high-contrast text ratios.
- Micro-animation error shake (`.animate-shake`) triggered on credential validation failure.
- Installed specialized frontend engineering skills in `.agents/skills/`: `frontend-developer`, `ui-ux-designer`, `tailwind-design-system`, `react-modernization`, `react-state-management`, `frontend-mobile-development-component-scaffold`, `accessibility-compliance-accessibility-audit`, `ui-visual-validator`, `frontend-security-coder`, `e2e-testing-patterns`, and `playwright-component-testing`.
- Login usability indicators: Caps Lock active warning indicator on password input.
- Input icon prefixes: Added subtle SVG leading icons (ID badge and security lock) for login identifier and password fields.
- Interactive loading spinner: Added inline SVG spinner on submit button during active Inertia requests.

### Changed
- Replaced abstract 3-circle vector icon with official high-resolution PMPC crest emblem (`/pmpc_ems.png`) in `EmployeeLayout.jsx` desktop sidebar and `MobileHeader.jsx`.
- Unified login page green: standardized on signature PMPC deep teal/emerald (`#0F6E56`) across both light and dark modes for hero panel, primary action button, and interactive controls.
- Replaced single-pixel input focus outlines with soft, layered focus ring glow (`focus:ring-2 focus:ring-[#0F6E56]/20`).
- Enhanced brand hero section with an ambient radial gradient vignette behind the cooperative crest.

### Removed
- Auxiliary portal destination badges (`Employee Portal` and `HR & Admin Console`) and ambient system status badge (`System Active • Asia/Manila (GMT+8)`) from the login page for a streamlined, minimal interface.

### Fixed
- Fixed typographic spacing glitch before greeting comma in employee dashboard banner.
- Added `aria-live="off"` on live ticking clock element to prevent screen-reader interruptions.
- Fixed PHP 8.4 deprecation warning for implicit nullable parameter in `EmployeeNotification::send()`.
- Enforce atomic database transaction and duplicate employee validation during payroll batch creation.
- Aligned login helper text with system-generated employee ID format (`e.g. EMP-0001 or name@pmpc.coop`), resolving Known Issue 5.4 in `AGENTS.md`.

### Security

## [0.1.0] - 2026-09-16

### Added

- Initial documented state at start of changelog tracking
