---
name: systematic-debugging
description: >-
  Use this skill when diagnosing errors, tracking down bug root causes, investigating crashes,
  or resolving unexpected behavior across backend and frontend stacks.
---

# Systematic Debugging & Root Cause Analysis

This skill guides the agent through an evidence-based, 5-phase scientific debugging method to eliminate guesswork and fix bugs at their root cause.

## Phase 1: Reproduce & Isolate
1. **Gather Exact Symptoms**:
   - What was the expected output vs the actual output?
   - Collect exact error messages, HTTP status codes, and stack traces from logs (`storage/logs/laravel.log` or browser console).
2. **Minimal Reproduction**:
   - Determine the minimum set of steps or inputs required to reliably reproduce the failure.
   - Separate symptoms from the underlying fault (e.g., an "Undefined index" in a view is often caused by a missing database query upstream).

## Phase 2: Trace & Formulate Hypotheses
1. **Trace the Data Flow**:
   - Follow the execution path backwards from the point of failure:
     $$\text{View / Inertia} \longleftarrow \text{Controller / Action} \longleftarrow \text{Model / Query} \longleftarrow \text{Database}$$
2. **Formulate Falsifiable Hypotheses**:
   - State specific causes: *"Hypothesis: The DTR punch fails because the timezone offset causes `now()` to evaluate to the previous day."*
   - Avoid random modifications. Test one variable at a time.

## Phase 3: Inspect State & Validate
1. **Inspect Variables at Key Checkpoints**:
   - Check input parameters, database state, session variables, and environment configuration.
   - Use targeted debugging without committing permanent debug statements:
     ```php
     \Illuminate\Support\Facades\Log::debug('Inspection', ['variable' => $var]);
     ```
2. **Verify Against Assumptions**:
   - Did the database return an empty collection?
   - Did a type coercion change the value?
   - Is a route middleware silently redirecting or blocking the request?

## Phase 4: Implement Minimal Surgical Fix
1. **Fix Root Cause, Not Symptoms**:
   - Address why the invalid state was reached rather than applying superficial null-checks that mask deeper architectural flaws.
2. **Preserve Surrounding Invariants**:
   - Ensure the fix does not break related workflows or change expected function signatures.

## Phase 5: Verify & Prevent Regression
1. **Run the Reproduction Case**:
   - Verify that the bug is resolved under identical test conditions.
2. **Add a Regression Test**:
   - Add a unit or feature test (`tests/Feature/...`) that would fail if this bug ever reappeared.
3. **Clean Up**:
   - Remove any temporary debug logs or breakpoints before committing.
