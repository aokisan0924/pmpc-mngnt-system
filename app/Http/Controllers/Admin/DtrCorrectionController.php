<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CorrectDtrRequest;
use App\Models\DtrEditRequest;
use App\Models\DtrLog;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DtrCorrectionController extends Controller
{
    /** Final DTR check: correct, add or clear a day; recorded as an approved edit without notifying the employee. */
    public function store(CorrectDtrRequest $request, Employee $employee): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $employee, $request): void {
            $lockedEmployee = Employee::query()->whereKey($employee->id)->lockForUpdate()->firstOrFail();
            $log = DtrLog::where('employee_id', $lockedEmployee->id)->whereDate('date', $validated['date'])->lockForUpdate()->first()
                ?? DtrLog::create(['employee_id' => $lockedEmployee->id, 'date' => $validated['date'], 'status' => 'absent']);

            if ($log->pendingEditRequest()->exists()) {
                throw ValidationException::withMessages(['date' => 'This day has a pending employee edit request. Approve or decline it first.']);
            }

            $original = [];
            foreach (CorrectDtrRequest::SLOTS as $slot) {
                $original["original_$slot"] = $log->{$slot};
                $log->{$slot} = filled($validated[$slot] ?? null) ? $validated[$slot] : null;
            }
            $log->ip_address = 'hr-correction';
            $log->computeHoursAndStatus();
            $log->save();

            DtrEditRequest::create([
                ...$original,
                'dtr_log_id' => $log->id,
                'employee_id' => $employee->id,
                'requested_am_time_in' => $log->am_time_in,
                'requested_am_time_out' => $log->am_time_out,
                'requested_pm_time_in' => $log->pm_time_in,
                'requested_pm_time_out' => $log->pm_time_out,
                'reason' => $validated['reason'],
                'status' => 'approved',
                'admin_note' => 'Corrected by HR during final DTR check',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
        });

        return back()->with('success', 'DTR corrected for '.$validated['date'].'.');
    }
}
