<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountSetupRequest;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AccountSetupService
{
    public function submit(Employee $employee, array $details): void
    {
        DB::transaction(function () use ($employee, $details): void {
            $locked = Employee::whereKey($employee->id)->lockForUpdate()->firstOrFail();
            if ($locked->setup_completed_at || $locked->accountSetupRequests()->where('status', 'pending')->exists()) {
                throw ValidationException::withMessages(['setup' => 'Your setup is already submitted. Contact HR for further changes.']);
            }
            $locked->accountSetupRequests()->create(['details' => $details]);
        });
    }

    public function review(AccountSetupRequest $submission, Employee $reviewer, array $decision): void
    {
        DB::transaction(function () use ($submission, $reviewer, $decision): void {
            $employee = Employee::whereKey($submission->employee_id)->lockForUpdate()->firstOrFail();
            $locked = AccountSetupRequest::whereKey($submission->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'pending') {
                throw ValidationException::withMessages(['setup' => 'This submission has already been reviewed.']);
            }
            if ($decision['decision'] === 'approved') {
                $details = $locked->details;
                if (Employee::where('email', $details['email'])->where('id', '!=', $employee->id)->exists()) {
                    throw ValidationException::withMessages(['setup' => 'The proposed email is now used by another employee. Return this setup for correction.']);
                }
                $employee->forceFill(collect($details)->only(['first_name', 'middle_name', 'last_name', 'name_suffix', 'email', 'phone', 'address', 'payroll_office'])->all());
                $employee->forceFill(['setup_completed_at' => now(), 'office_verified_at' => now(), 'office_verified_by' => $reviewer->id])->save();
                $ids = collect($details)->only(['sss_no', 'philhealth_no', 'tin_no', 'pagibig_no'])->filter(fn ($value) => $value !== null && $value !== '')->all();
                if ($ids) {
                    $employee->governmentIds()->updateOrCreate(['employee_id' => $employee->id], $ids);
                }
            }
            $locked->update(['status' => $decision['decision'], 'review_note' => $decision['review_note'] ?? null, 'reviewed_by' => $reviewer->id, 'reviewed_at' => now()]);
        });
    }

    public function transfer(Employee $employee, Employee $reviewer, array $details): void
    {
        DB::transaction(function () use ($employee, $reviewer, $details): void {
            $locked = Employee::whereKey($employee->id)->lockForUpdate()->firstOrFail();
            if (! $locked->setup_completed_at) {
                throw ValidationException::withMessages(['setup' => 'Approve employee account setup before changing the verified office.']);
            }
            $locked->accountSetupRequests()->create(['details' => ['previous_office' => $locked->payroll_office, 'payroll_office' => $details['payroll_office'], 'type' => 'office_transfer'], 'status' => 'approved', 'review_note' => $details['review_note'], 'reviewed_by' => $reviewer->id, 'reviewed_at' => now()]);
            $locked->forceFill(['payroll_office' => $details['payroll_office'], 'office_verified_at' => now(), 'office_verified_by' => $reviewer->id])->save();
        });
    }
}
