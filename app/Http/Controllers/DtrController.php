<?php

namespace App\Http\Controllers;

use App\Events\DtrEditRequestCreated;
use App\Http\Requests\DtrEditRequestSubmissionRequest;
use App\Http\Requests\ReportAbsenceRequest;
use App\Models\DtrEditRequest;
use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeNotification;
use App\Services\DtrAbsenceService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DtrController extends Controller
{
    // ── DTR page ───────────────────────────────────────────

    public function index(Request $request): Response
    {
        $employee = $request->user();
        $month = $request->get('month', now()->format('Y-m'));

        $startOfMonth = Carbon::parse($month)->startOfMonth();
        $endOfMonth = Carbon::parse($month)->endOfMonth();

        $entries = DtrLog::where('employee_id', $employee->id)
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->with(['pendingEditRequest', 'latestEditRequest'])
            ->orderBy('date', 'desc')
            ->get()
            ->keyBy(fn (DtrLog $log): string => $log->date->toDateString());

        $logs = collect();
        // Oldest to newest: the 1st at the top, month end at the bottom.
        for ($day = $startOfMonth->copy(); $day->lte($endOfMonth); $day->addDay()) {
            $log = $entries->get($day->toDateString()) ?? new DtrLog([
                'employee_id' => $employee->id, 'date' => $day->toDateString(), 'status' => 'absent',
            ]);
            $log->setRelation('pendingEditRequest', $log->exists ? $log->pendingEditRequest : null);
            $log->setRelation('latestEditRequest', $log->exists ? $log->latestEditRequest : null);
            $logs->push($this->formatLog($log));
        }

        // Today's log
        $today = DtrLog::forPunch($employee->id);

        // Monthly summary
        $summary = [
            'days_present' => DtrLog::displayDaysPresentBetween($employee->id, $startOfMonth, $endOfMonth, $entries),
            'days_absent' => DtrLog::absentDaysBetween($employee->id, $startOfMonth, $endOfMonth),
            'days_late' => $logs->where('status', 'late')->count(),
            'hours_rendered' => DtrLog::where('employee_id', $employee->id)
                ->whereBetween('date', [$startOfMonth, $endOfMonth])
                ->sum('hours_rendered'),
            'pending_edits' => DtrEditRequest::where('employee_id', $employee->id)
                ->where('status', 'pending')
                ->count(),
        ];

        // Full Monday-Sunday week, including individual rest days.
        $now = now();
        $weekStart = $now->copy()->startOfWeek(Carbon::MONDAY);
        $weekDates = [];
        for ($i = 0; $i < 7; $i++) {
            $weekDates[] = $weekStart->copy()->addDays($i)->toDateString();
        }

        $weekEnd = $weekStart->copy()->addDays(6)->endOfDay();
        $weekLogs = DtrLog::where('employee_id', $employee->id)
            ->whereBetween('date', [$weekStart->copy()->startOfDay(), $weekEnd])
            ->get()
            ->keyBy(fn ($log) => Carbon::parse($log->date)->toDateString());

        $weeklyStrip = collect($weekDates)->map(function ($dateStr) use ($weekLogs, $now, $employee) {
            $cDate = Carbon::parse($dateStr);
            $log = $weekLogs->get($dateStr);
            $isToday = $cDate->isToday();
            $isPast = $cDate->lt($now->copy()->startOfDay());
            $isFuture = $cDate->gt($now->copy()->startOfDay());

            $punchesCount = 0;
            if ($log) {
                if ($log->am_time_in) {
                    $punchesCount++;
                }
                if ($log->am_time_out) {
                    $punchesCount++;
                }
                if ($log->pm_time_in) {
                    $punchesCount++;
                }
                if ($log->pm_time_out) {
                    $punchesCount++;
                }
            }

            return [
                'date' => $dateStr,
                'day_name' => $cDate->format('D'),
                'day_short' => $cDate->format('M d'),
                'day_number' => $cDate->format('j'),
                'is_today' => $isToday,
                'is_past' => $isPast,
                'is_future' => $isFuture,
                'status' => $log?->displayStatus() ?? DtrLog::fallbackStatus($employee->id, $cDate),
                'punches_count' => $punchesCount,
                'hours_rendered' => $log ? (float) $log->hours_rendered : 0.0,
                'has_log' => (bool) $log,
                'am_time_in' => $log?->am_time_in,
                'pm_time_out' => $log?->pm_time_out,
            ];
        })->values()->all();

        return Inertia::render('Employee/Dtr', [
            'logs' => $logs,
            'today' => $this->formatLog($today),
            'summary' => $summary,
            'month' => $month,
            'next_punch' => $today->getNextPunchSlot(),
            'two_punch' => DtrLog::twoPunchLayout($employee->id, $entries),
            'weeklyStrip' => $weeklyStrip,
        ]);
    }

    // ── Clock in / out ─────────────────────────────────────

    public function punch(Request $request): RedirectResponse
    {
        $employee = $request->user();
        DB::transaction(function () use ($employee, $request): void {
            Employee::whereKey($employee->id)->lockForUpdate()->firstOrFail();
            $log = DtrLog::forPunch($employee->id);

            if ($log->hasActiveAbsence()) {
                throw ValidationException::withMessages(['punch' => 'Cancel your absence notice in My Attendance before clocking in.']);
            }

            $slot = $log->getNextPunchSlot();

            if (! $slot) {
                throw ValidationException::withMessages(['punch' => 'All punches for today are already recorded.']);
            }

            $log->$slot = now()->format('H:i:s');
            $log->ip_address = $request->ip();
            $log->computeHoursAndStatus();
            $log->save();
        });

        return back();
    }

    public function reportAbsence(ReportAbsenceRequest $request, DtrAbsenceService $absences): RedirectResponse
    {
        $data = $request->validated();
        $absences->report($request->user(), $data['date'], $data['reason']);

        return back()->with('success', 'Absence reported. This notice is not an approved leave.');
    }

    public function cancelAbsence(Request $request, DtrLog $dtrLog, DtrAbsenceService $absences): RedirectResponse
    {
        $absences->cancel($request->user(), $dtrLog);

        return back()->with('success', 'Absence notice cancelled. You can clock in normally.');
    }

    // ── Edit request ───────────────────────────────────────

    public function requestEdit(DtrEditRequestSubmissionRequest $request, DtrLog $dtrLog): RedirectResponse
    {
        abort_if(! $request->user()->canRequestDtrEdits(), 403, 'You do not have permission to submit DTR edit requests.');
        abort_if($dtrLog->employee_id !== $request->user()->id, 403, 'Unauthorized access to this attendance record.');

        $validated = $request->validated();

        // Block if there's already a pending request for this log
        if ($dtrLog->pendingEditRequest()->exists()) {
            return back()->withErrors(['edit' => 'A pending edit request already exists for this entry.']);
        }

        $user = $request->user();

        DB::transaction(function () use ($dtrLog, $user, $validated) {
            $editRequest = DtrEditRequest::create([
                'dtr_log_id' => $dtrLog->id,
                'employee_id' => $user->id,
                'original_am_time_in' => $dtrLog->am_time_in,
                'original_am_time_out' => $dtrLog->am_time_out,
                'original_pm_time_in' => $dtrLog->pm_time_in,
                'original_pm_time_out' => $dtrLog->pm_time_out,
                'requested_am_time_in' => $validated['requested_am_time_in'] ?? null,
                'requested_am_time_out' => $validated['requested_am_time_out'] ?? null,
                'requested_pm_time_in' => $validated['requested_pm_time_in'] ?? null,
                'requested_pm_time_out' => $validated['requested_pm_time_out'] ?? null,
                'reason' => $validated['reason'],
            ]);

            // Notify super admins
            $admins = Employee::where('role', 'super_admin')->get();
            foreach ($admins as $admin) {
                EmployeeNotification::send(
                    employeeId: $admin->id,
                    type: 'dtr_edit_requested',
                    title: 'New DTR edit request',
                    message: "{$user->full_name} requested a DTR edit for {$dtrLog->date->format('M d, Y')}.",
                    link: '/admin/edit-requests',
                );
            }

            DtrEditRequestCreated::dispatch($editRequest);
        });

        return back()->with('success', 'Edit request submitted successfully.');
    }

    // ── Format helper ──────────────────────────────────────

    private function formatLog(DtrLog $log): array
    {
        $status = $log->displayStatus();

        return [
            'id' => $log->id,
            'date' => $log->date->format('Y-m-d'),
            'date_label' => $log->date->format('M d, D'),
            'week' => $log->date->copy()->startOfWeek(Carbon::MONDAY)->toDateString(),
            'absence_reason' => $log->hasActiveAbsence() ? $log->absence_reason : null,
            'can_cancel_absence' => $log->hasActiveAbsence() && ! $log->date->lt(today()),
            'am_time_in' => $log->am_time_in,
            'am_time_out' => $log->am_time_out,
            'pm_time_in' => $log->pm_time_in,
            'pm_time_out' => $log->pm_time_out,
            'hours_rendered' => $log->hours_rendered,
            'status' => $status,
            'has_pending_edit' => $log->pendingEditRequest !== null,
            'edit_request' => $log->latestEditRequest?->logSummary(),
            'next_punch' => $log->getNextPunchSlot(),
        ];
    }
}
