<?php

namespace App\Http\Controllers;

use App\Models\DtrLog;
use App\Models\DtrEditRequest;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DtrController extends Controller
{
     // ── DTR page ───────────────────────────────────────────

    public function index(Request $request): Response {
        $employee = $request->user();
        $month    = $request->get('month', now()->format('Y-m'));

        $startOfMonth = Carbon::parse($month)->startOfMonth();
        $endOfMonth   = Carbon::parse($month)->endOfMonth();

        $logs = DtrLog::where('employee_id', $employee->id)
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->with('pendingEditRequest')
            ->orderBy('date', 'desc')
            ->get()
            ->map(fn($log) => $this->formatLog($log));

        // Today's log
        $today = DtrLog::firstOrCreate(
            ['employee_id' => $employee->id, 'date' => today()],
            ['status' => 'absent']
        );

        // Monthly summary
        $summary = [
            'days_present'  => DtrLog::where('employee_id', $employee->id)
                ->whereBetween('date', [$startOfMonth, $endOfMonth])
                ->whereNotIn('status', ['absent'])
                ->count(),
            'days_late'     => DtrLog::where('employee_id', $employee->id)
                ->whereBetween('date', [$startOfMonth, $endOfMonth])
                ->where('status', 'late')
                ->count(),
            'hours_rendered' => DtrLog::where('employee_id', $employee->id)
                ->whereBetween('date', [$startOfMonth, $endOfMonth])
                ->sum('hours_rendered'),
            'pending_edits' => DtrEditRequest::where('employee_id', $employee->id)
                ->where('status', 'pending')
                ->count(),
        ];

        return Inertia::render('Employee/Dtr', [
            'logs'       => $logs,
            'today'      => $this->formatLog($today),
            'summary'    => $summary,
            'month'      => $month,
            'next_punch' => $today->getNextPunchSlot(),
        ]);
    }

    // ── Clock in / out ─────────────────────────────────────

    public function punch(Request $request): RedirectResponse {
        $employee = $request->user();

        $log = DtrLog::firstOrCreate(
            ['employee_id' => $employee->id, 'date' => today()],
            ['status' => 'absent']
        );

        $slot = $log->getNextPunchSlot();

        if (! $slot) {
            return back()->withErrors(['punch' => 'All punches for today are already recorded.']);
        }

        $log->$slot = now()->format('H:i:s');
        $log->ip_address = $request->ip();
        $log->computeHoursAndStatus();
        $log->save();

        return back();
    }

    // ── Edit request ───────────────────────────────────────

    public function requestEdit(Request $request, DtrLog $dtrLog): RedirectResponse {
        $request->validate([
            'requested_am_time_in'  => ['nullable', 'date_format:H:i'],
            'requested_am_time_out' => ['nullable', 'date_format:H:i'],
            'requested_pm_time_in'  => ['nullable', 'date_format:H:i'],
            'requested_pm_time_out' => ['nullable', 'date_format:H:i'],
            'reason'                => ['required', 'string', 'max:500'],
        ]);

        // Block if there's already a pending request for this log
        if ($dtrLog->pendingEditRequest()->exists()) {
            return back()->withErrors(['edit' => 'A pending edit request already exists for this entry.']);
        }

        // Block edits older than 7 days
        if ($dtrLog->date->diffInDays(today()) > 7) {
            return back()->withErrors(['edit' => 'Edit requests are only allowed within 7 days of the entry.']);
        }

        DtrEditRequest::create([
            'dtr_log_id'            => $dtrLog->id,
            'employee_id'           => $request->user()->id,
            'original_am_time_in'   => $dtrLog->am_time_in,
            'original_am_time_out'  => $dtrLog->am_time_out,
            'original_pm_time_in'   => $dtrLog->pm_time_in,
            'original_pm_time_out'  => $dtrLog->pm_time_out,
            'requested_am_time_in'  => $request->requested_am_time_in,
            'requested_am_time_out' => $request->requested_am_time_out,
            'requested_pm_time_in'  => $request->requested_pm_time_in,
            'requested_pm_time_out' => $request->requested_pm_time_out,
            'reason'                => $request->reason,
        ]);

        return back()->with('success', 'Edit request submitted successfully.');
    }

    // ── Format helper ──────────────────────────────────────

    private function formatLog(DtrLog $log): array {
        return [
            'id'             => $log->id,
            'date'           => $log->date->format('Y-m-d'),
            'date_label'     => $log->date->format('M d, D'),
            'am_time_in'     => $log->am_time_in,
            'am_time_out'    => $log->am_time_out,
            'pm_time_in'     => $log->pm_time_in,
            'pm_time_out'    => $log->pm_time_out,
            'hours_rendered' => $log->hours_rendered,
            'status'         => $log->status,
            'has_pending_edit' => $log->pendingEditRequest !== null,
            'next_punch'     => $log->getNextPunchSlot(),
        ];
    }
}
