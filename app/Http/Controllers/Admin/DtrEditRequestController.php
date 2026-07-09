<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DtrEditRequest;
use App\Models\EmployeeNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DtrEditRequestController extends Controller
{
    public function index(): Response
    {
        $requests = DtrEditRequest::with(['employee', 'dtrLog'])
            ->orderByRaw("FIELD(status, 'pending', 'approved', 'declined')")
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($r) => [
                'id'                    => $r->id,
                'employee_name'         => $r->employee->full_name,
                'employee_id'           => $r->employee->employee_id,
                'date'                  => $r->dtrLog->date->format('M d, Y'),
                'original_am_time_in'   => $r->original_am_time_in,
                'original_am_time_out'  => $r->original_am_time_out,
                'original_pm_time_in'   => $r->original_pm_time_in,
                'original_pm_time_out'  => $r->original_pm_time_out,
                'requested_am_time_in'  => $r->requested_am_time_in,
                'requested_am_time_out' => $r->requested_am_time_out,
                'requested_pm_time_in'  => $r->requested_pm_time_in,
                'requested_pm_time_out' => $r->requested_pm_time_out,
                'reason'                => $r->reason,
                'status'                => $r->status,
                'admin_note'            => $r->admin_note,
                'submitted_at'          => $r->created_at->diffForHumans(),
            ]);

        $pendingCount = DtrEditRequest::where('status', 'pending')->count();

        return Inertia::render('Admin/DtrEditRequests', [
            'requests'     => $requests,
            'pendingCount' => $pendingCount,
        ]);
    }

    public function approve(Request $request, DtrEditRequest $editRequest): RedirectResponse {
        $request->validate([
            'admin_note' => ['nullable', 'string', 'max:500'],
        ]);

        if (! $editRequest->isPending()) {
            return back()->withErrors(['error' => 'This request has already been resolved.']);
        }

        $log = $editRequest->dtrLog;
        $log->am_time_in  = $editRequest->requested_am_time_in;
        $log->am_time_out = $editRequest->requested_am_time_out;
        $log->pm_time_in  = $editRequest->requested_pm_time_in;
        $log->pm_time_out = $editRequest->requested_pm_time_out;
        $log->computeHoursAndStatus();
        $log->save();

        $editRequest->update([
            'status'      => 'approved',
            'admin_note'  => $request->admin_note,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // Notify employee
        EmployeeNotification::send(
            employeeId: $editRequest->employee_id,
            type:       'dtr_edit_approved',
            title:      'DTR edit request approved',
            message:    "Your DTR edit request for {$log->date->format('M d, Y')} has been approved."
                . ($request->admin_note ? " Note: {$request->admin_note}" : ''),
            link:       '/employee/dtr',
        );

        return back()->with('success', 'Edit request approved.');
    }

    public function decline(Request $request, DtrEditRequest $editRequest): RedirectResponse {
        $request->validate([
            'admin_note' => ['nullable', 'string', 'max:500'],
        ]);

        if (! $editRequest->isPending()) {
            return back()->withErrors(['error' => 'This request has already been resolved.']);
        }

        $editRequest->update([
            'status'      => 'declined',
            'admin_note'  => $request->admin_note,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // Notify employee
        EmployeeNotification::send(
            employeeId: $editRequest->employee_id,
            type:       'dtr_edit_declined',
            title:      'DTR edit request declined',
            message:    "Your DTR edit request for {$editRequest->dtrLog->date->format('M d, Y')} was declined."
                . ($request->admin_note ? " Reason: {$request->admin_note}" : ''),
            link:       '/employee/dtr',
        );

        return back()->with('success', 'Edit request declined.');
    }
}
