<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeGovernmentId;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function index(): Response {
        $employees = Employee::where('is_staff', true)
            ->orderBy('first_name')
            ->get()
            ->map(fn($e) => [
                'id'          => $e->id,
                'employee_id' => $e->employee_id,
                'full_name'   => $e->full_name,
                'email'       => $e->email,
                'department'  => $e->department,
                'position'    => $e->position,
                'status'      => $e->status,
                'date_hired'  => $e->date_hired?->format('M d, Y'),
                'initials'    => $e->initials,
            ]);

        return Inertia::render('Admin/Employees', [
            'employees' => $employees,
        ]);
    }

    public function show(Employee $employee): Response {
        return Inertia::render('Admin/EmployeeShow', [
            'employee' => [
                'id'                      => $employee->id,
                'employee_id'             => $employee->employee_id,
                'first_name'              => $employee->first_name,
                'last_name'               => $employee->last_name,
                'full_name'               => $employee->full_name,
                'email'                   => $employee->email,
                'phone'                   => $employee->phone,
                'address'                 => $employee->address,
                'department'              => $employee->department,
                'position'                => $employee->position,
                'status'                  => $employee->status,
                'date_hired'              => $employee->date_hired?->format('Y-m-d'),
                'initials'                => $employee->initials,
                'daily_rate'              => $employee->daily_rate,
                'allowance'               => $employee->allowance,
                'transpo_allowance'       => $employee->transpo_allowance,
                'rep_allowance'           => $employee->rep_allowance,
                'quarterly_allowance'     => $employee->quarterly_allowance,
                'loan_deduction'          => $employee->loan_deduction,
                'capital_contribution_deduction' => $employee->capital_contribution_deduction,
                'cash_advance_deduction'  => $employee->cash_advance_deduction,
                'rental_deduction'        => $employee->rental_deduction,
                'sss_deduction'           => $employee->sss_deduction,
                'philhealth_deduction'    => $employee->philhealth_deduction,
                'pagibig_deduction'       => $employee->pagibig_deduction,
                'tax_deduction'           => $employee->tax_deduction,
                'savings_deduction'       => $employee->savings_deduction,
                'other_deductions'        => $employee->other_deductions,
            ],
            'govIds' => $employee->governmentIds ? [
                'sss_no'        => $employee->governmentIds->sss_no,
                'philhealth_no' => $employee->governmentIds->philhealth_no,
                'tin_no'        => $employee->governmentIds->tin_no,
                'pagibig_no'    => $employee->governmentIds->pagibig_no,
            ] : null,
        ]);
    }

    public function store(Request $request): RedirectResponse {
        $validated = $request->validate([
            'first_name'  => ['required', 'string', 'max:100'],
            'last_name'   => ['required', 'string', 'max:100'],
            'email'       => ['required', 'email', 'unique:employees,email'],
            'password'    => ['required', 'confirmed', Password::min(8)],
            'department'  => ['nullable', 'string', 'max:100'],
            'position'    => ['nullable', 'string', 'max:100'],
            'phone'       => ['nullable', 'string', 'max:20'],
            'address'     => ['nullable', 'string', 'max:500'],
            'date_hired'  => ['nullable', 'date'],
            'status'      => ['required', 'in:active,inactive'],
        ]);

        $employee = Employee::create([
            ...$validated,
            'employee_id' => Employee::generateEmployeeId(),
            'role'        => 'employee',
            'password'    => Hash::make($validated['password']),
        ]);

        EmployeeGovernmentId::create([
            'employee_id' => $employee->id,
        ]);

        return redirect()->route('admin.employees')
            ->with('success', "Employee {$employee->full_name} created successfully. ID: {$employee->employee_id}");
    }

    public function update(Request $request, Employee $employee): RedirectResponse {
        $validated = $request->validate([
            'first_name'  => ['required', 'string', 'max:100'],
            'last_name'   => ['required', 'string', 'max:100'],
            'email'       => ['required', 'email', "unique:employees,email,{$employee->id}"],
            'department'  => ['nullable', 'string', 'max:100'],
            'position'    => ['nullable', 'string', 'max:100'],
            'phone'       => ['nullable', 'string', 'max:20'],
            'address'     => ['nullable', 'string', 'max:500'],
            'date_hired'  => ['nullable', 'date'],
            'status'      => ['required', 'in:active,inactive'],
        ]);

        $employee->update($validated);

        return back()->with('success', 'Employee profile updated.');
    }

    public function resetPassword(Request $request, Employee $employee): RedirectResponse {
        $request->validate([
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $employee->update([
            'password' => Hash::make($request->password),
        ]);

        return back()->with('success', "Password reset for {$employee->full_name}.");
    }

    public function updateCompensation(Request $request, Employee $employee): RedirectResponse {
        $validated = $request->validate([
            'daily_rate'              => ['required', 'numeric', 'min:0'],
            'transpo_allowance'       => ['nullable', 'numeric', 'min:0'],
            'rep_allowance'           => ['nullable', 'numeric', 'min:0'],
            'quarterly_allowance'     => ['nullable', 'numeric', 'min:0'],
            'sss_deduction'           => ['nullable', 'numeric', 'min:0'],
            'philhealth_deduction'    => ['nullable', 'numeric', 'min:0'],
            'pagibig_deduction'       => ['nullable', 'numeric', 'min:0'],
            'tax_deduction'           => ['nullable', 'numeric', 'min:0'],
            'loan_deduction'          => ['nullable', 'numeric', 'min:0'],
            'capital_contribution_deduction' => ['nullable', 'numeric', 'min:0'],
            'cash_advance_deduction'  => ['nullable', 'numeric', 'min:0'],
            'rental_deduction'        => ['nullable', 'numeric', 'min:0'],
            'savings_deduction'       => ['nullable', 'numeric', 'min:0'],
            'other_deductions'        => ['nullable', 'numeric', 'min:0'],
        ]);

        $employee->update($validated);

        return back()->with('success', 'Compensation updated.');
    }
}