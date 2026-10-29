<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DtrEditRequest;
use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DtrEditRequestController extends Controller
{
    public function index(Request $request): Response
    {
        abort_if(! $request->user()->canViewDtrRequests(), 403, 'You do not have permission to view DTR edit requests.');

        $requests = DtrEditRequest::with(['employee', 'dtrLog'])
            ->orderByRaw("CASE status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 WHEN 'declined' THEN 3 ELSE 4 END")
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'employee_name' => $r->employee->full_name,
                'employee_id' => $r->employee->employee_id,
                'date' => $r->dtrLog->date->format('M d, Y'),
                'two_punch' => $r->dtrLog->isTwoPunch(),
                'original_am_time_in' => $r->original_am_time_in,
                'original_am_time_out' => $r->original_am_time_out,
                'original_pm_time_in' => $r->original_pm_time_in,
                'original_pm_time_out' => $r->original_pm_time_out,
                'requested_am_time_in' => $r->requested_am_time_in,
                'requested_am_time_out' => $r->requested_am_time_out,
                'requested_pm_time_in' => $r->requested_pm_time_in,
                'requested_pm_time_out' => $r->requested_pm_time_out,
                'reason' => $r->reason,
                'status' => $r->status,
                'admin_note' => $r->admin_note,
                'submitted_at' => $r->created_at->diffForHumans(),
            ]);

        $pendingCount = DtrEditRequest::where('status', 'pending')->count();

        return Inertia::render('Admin/DtrEditRequests', [
            'requests' => $requests,
            'pendingCount' => $pendingCount,
        ]);
    }

    public function approve(Request $request, DtrEditRequest $editRequest): RedirectResponse
    {
        abort_if(! $request->user()->canManageDtrRequests(), 403, 'You do not have permission to approve DTR edit requests.');

        $request->validate([
            'admin_note' => ['nullable', 'string', 'max:500'],
        ]);

        $resolution = DB::transaction(function () use ($editRequest, $request): ?array {
            $lockedEmployee = Employee::query()->whereKey($editRequest->employee_id)->lockForUpdate()->firstOrFail();
            $lockedRequest = DtrEditRequest::query()->lockForUpdate()->findOrFail($editRequest->id);
            abort_unless((int) $lockedRequest->employee_id === (int) $lockedEmployee->id, 409);

            if (! $lockedRequest->isPending()) {
                return null;
            }

            $log = DtrLog::query()->lockForUpdate()->findOrFail($lockedRequest->dtr_log_id);
            $log->am_time_in = $lockedRequest->requested_am_time_in;
            $log->am_time_out = $lockedRequest->requested_am_time_out;
            $log->pm_time_in = $lockedRequest->requested_pm_time_in;
            $log->pm_time_out = $lockedRequest->requested_pm_time_out;
            $log->computeHoursAndStatus();
            $log->save();

            $lockedRequest->update([
                'status' => 'approved',
                'admin_note' => $request->admin_note,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            return [
                'employee_id' => (int) $lockedRequest->employee_id,
                'date_label' => $log->date->format('M d, Y'),
                'note' => $request->admin_note,
            ];
        });

        if ($resolution === null) {
            return back()->withErrors(['error' => 'This request has already been resolved.']);
        }

        EmployeeNotification::send(
            employeeId: $resolution['employee_id'],
            type: 'dtr_edit_approved',
            title: 'DTR edit request approved',
            message: "Your DTR edit request for {$resolution['date_label']} has been approved."
                .($resolution['note'] ? " Note: {$resolution['note']}" : ''),
            link: '/employee/dtr',
        );

        return back()->with('success', 'Edit request approved.');
    }

    public function decline(Request $request, DtrEditRequest $editRequest): RedirectResponse
    {
        abort_if(! $request->user()->canManageDtrRequests(), 403, 'You do not have permission to decline DTR edit requests.');

        $request->validate([
            'admin_note' => ['nullable', 'string', 'max:500'],
        ]);

        $resolution = DB::transaction(function () use ($editRequest, $request): ?array {
            $lockedRequest = DtrEditRequest::query()->lockForUpdate()->findOrFail($editRequest->id);

            if (! $lockedRequest->isPending()) {
                return null;
            }

            $lockedRequest->update([
                'status' => 'declined',
                'admin_note' => $request->admin_note,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            $log = DtrLog::query()->findOrFail($lockedRequest->dtr_log_id);

            return [
                'employee_id' => (int) $lockedRequest->employee_id,
                'date_label' => $log->date->format('M d, Y'),
                'note' => $request->admin_note,
            ];
        });

        if ($resolution === null) {
            return back()->withErrors(['error' => 'This request has already been resolved.']);
        }

        EmployeeNotification::send(
            employeeId: $resolution['employee_id'],
            type: 'dtr_edit_declined',
            title: 'DTR edit request declined',
            message: "Your DTR edit request for {$resolution['date_label']} was declined."
                .($resolution['note'] ? " Reason: {$resolution['note']}" : ''),
            link: '/employee/dtr',
        );

        return back()->with('success', 'Edit request declined.');
    }
}
