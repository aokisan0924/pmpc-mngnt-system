---
name: inertia-react-modern
description: >-
  Use this skill when building or refactoring React frontend components, Inertia.js pages,
  form handling, data tables, modals, charts, or Tailwind CSS styling in the PMPC WorkForce app.
---

# Modern Inertia.js + React 19 + Tailwind CSS Guidelines

This skill enforces best practices for frontend development using Inertia.js React, React 19, and Tailwind CSS 4.

## 1. Inertia Form Handling & State Management

- **Use Inertia's `useForm`**:
  - Always prefer `useForm` from `@inertiajs/react` over manual `useState` for form payloads.
  - Destructure `{ data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors }`.
  - Disable submit buttons while `processing` is true to prevent duplicate submissions.
  - Show field-level validation errors immediately under inputs (`{errors.first_name && <p className="text-rose-500 text-xs mt-1">{errors.first_name}</p>}`).
- **Preserve State & Scroll on Partial Updates**:
  - When filtering or paginating data tables, use `router.get(url, params, { preserveState: true, preserveScroll: true })`.

## 2. PMPC Design System & Visual Hierarchy

The application consists of two distinct portals with specific accent color palettes:
- **Employee Portal (`/employee/*`)**:
  - Primary Accent: Teal (`#0F6E56` / `emerald-700` / `teal-700`).
  - Tone: Clean, approachable, self-service, clear mobile-friendly buttons for clocking in/out.
- **Admin Portal (`/admin/*`)**:
  - Primary Accent: Deep Purple (`#26215C` / `indigo-900` / `purple-900`).
  - Tone: High-density data presentation, actionable tables, badge indicators, analytics cards.

### UI Guidelines:
- **Status Badges**:
  - `on_time` / `approved` / `finalized` / `active`: Soft Emerald (`bg-emerald-50 text-emerald-700 border-emerald-200`).
  - `late` / `undertime` / `pending`: Soft Amber (`bg-amber-50 text-amber-700 border-amber-200`).
  - `absent` / `declined` / `rejected`: Soft Rose (`bg-rose-50 text-rose-700 border-rose-200`).
  - `draft` / `neutral`: Soft Slate (`bg-slate-100 text-slate-700 border-slate-200`).
- **Formatting**:
  - Currency: Always format Philippine Pesos using `new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)` or a shared helper (`₱1,250.00`).
  - Dates: Standardize using `Intl.DateTimeFormat` or readable formats (e.g., `MMM DD, YYYY`).

## 3. React 19 Performance & Purity

- **Avoid `useEffect` for Derived State**:
  - Compute filtered lists, totals, and calculations inline using `useMemo` or plain variable derivation instead of syncing state with `useEffect`.
- **Component Decomposition**:
  - Keep page files focused on layout and data coordination.
  - Extract reusable UI components (Modals, StatCards, FormInputs, ConfirmationDialogs) into `resources/js/Components/`.
- **Recharts Best Practices**:
  - Wrap charts in `<ResponsiveContainer width="100%" height={...}>`.
  - Format tooltip values cleanly with currency or count units.
  - Handle zero/empty data gracefully with a pleasant empty-state placeholder.

## 4. Frontend Verification

- Test frontend bundle compilation after making React or CSS changes:
  ```powershell
  npm run build
  ```
