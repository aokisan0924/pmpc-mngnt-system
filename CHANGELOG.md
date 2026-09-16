# Changelog

## [Unreleased]

### Added
- Login usability indicators: Caps Lock active warning indicator on password input.
- Input icon prefixes: Added subtle SVG leading icons (ID badge and security lock) for login identifier and password fields.
- Interactive loading spinner: Added inline SVG spinner on submit button during active Inertia requests.

### Changed
- Unified login page green: standardized on signature PMPC deep teal/emerald (`#0F6E56`) across both light and dark modes for hero panel, primary action button, and interactive controls.
- Replaced single-pixel input focus outlines with soft, layered focus ring glow (`focus:ring-2 focus:ring-[#0F6E56]/20`).
- Enhanced brand hero section with an ambient radial gradient vignette behind the cooperative crest.

### Removed
- Auxiliary portal destination badges (`Employee Portal` and `HR & Admin Console`) and ambient system status badge (`System Active • Asia/Manila (GMT+8)`) from the login page for a streamlined, minimal interface.

### Fixed
- Enforce atomic database transaction and duplicate employee validation during payroll batch creation.
- Aligned login helper text with system-generated employee ID format (`e.g. EMP-0001 or name@pmpc.coop`), resolving Known Issue 5.4 in `AGENTS.md`.

### Security

## [0.1.0] - 2026-09-16

### Added

- Initial documented state at start of changelog tracking
