<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeProfileController extends Controller
{
    // ── Profile page ───────────────────────────────────────

    public function index(Request $request): Response {
        $employee = $request->user();

        return Inertia::render('Employee/Profile', [
            'employee' => [
                'id'         => $employee->id,
                'employee_id'=> $employee->employee_id,
                'first_name' => $employee->first_name,
                'last_name'  => $employee->last_name,
                'email'      => $employee->email,
                'phone'      => $employee->phone,
                'address'    => $employee->address,
                'department' => $employee->department,
                'position'   => $employee->position,
                'date_hired' => $employee->date_hired?->format('Y-m-d'),
            ],
            'govIds' => $employee->governmentIds ? [
                'sss_no'        => $employee->governmentIds->sss_no,
                'philhealth_no' => $employee->governmentIds->philhealth_no,
                'tin_no'        => $employee->governmentIds->tin_no,
                'pagibig_no'    => $employee->governmentIds->pagibig_no,
            ] : null,
        ]);
    }

    // ── Update personal info ───────────────────────────────

    public function updateInfo(Request $request): RedirectResponse {
        $employee = $request->user();

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name'  => ['required', 'string', 'max:100'],
            'phone'      => ['nullable', 'string', 'max:20'],
            'address'    => ['nullable', 'string', 'max:500'],
        ]);

        $employee->update($validated);

        return back()->with('success', 'Personal information updated.');
    }

    // ── Update government IDs ──────────────────────────────

    public function updateGovIds(Request $request): RedirectResponse {
        $employee = $request->user();

        $validated = $request->validate([
            'sss_no'        => ['nullable', 'string', 'max:50'],
            'philhealth_no' => ['nullable', 'string', 'max:50'],
            'tin_no'        => ['nullable', 'string', 'max:50'],
            'pagibig_no'    => ['nullable', 'string', 'max:50'],
        ]);

        $employee->governmentIds()->updateOrCreate(
            ['employee_id' => $employee->id],
            $validated
        );

        return back()->with('success', 'Government IDs updated.');
    }

    // ── Change password ────────────────────────────────────

    public function updatePassword(Request $request): RedirectResponse {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'confirmed', Password::min(8)],
        ]);

        $employee = $request->user();

        if (! Hash::check($request->current_password, $employee->password)) {
            return back()->withErrors([
                'current_password' => 'The current password is incorrect.',
            ]);
        }

        $employee->update([
            'password' => Hash::make($request->password),
        ]);

        return back()->with('success', 'Password changed successfully.');
    }
}
