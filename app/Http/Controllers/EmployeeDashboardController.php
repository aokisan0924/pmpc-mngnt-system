<?php

namespace App\Http\Controllers;

use App\Models\DtrEditRequest;
use App\Models\DtrLog;
use App\Models\EmployeeNotification;
use App\Models\PayrollItem;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $employee = $request->user();

        $now = now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();

        // Determine Semi-Monthly Cutoff Info
        $isFirstCutoff = $now->day <= 15;
        if ($isFirstCutoff) {
            $cutoffName = '1st Cutoff';
            $cutoffStart = $now->copy()->startOfMonth();
            $cutoffEnd = $now->copy()->day(15)->endOfDay();
            $cutoffLabel = '1st Cutoff ('.$cutoffStart->format('M 1').'–15)';
        } else {
            $cutoffName = '2nd Cutoff';
            $cutoffStart = $now->copy()->day(16)->startOfDay();
            $cutoffEnd = $now->copy()->endOfMonth();
            $cutoffLabel = '2nd Cutoff ('.$cutoffStart->format('M 16').'–'.$cutoffEnd->format('d').')';
        }

        // Days remaining until cutoff ends (inclusive of today)
        $daysRemaining = max(0, $now->copy()->startOfDay()->diffInDays($cutoffEnd->copy()->startOfDay(), false));

        // Count workdays (Monday-Friday) in cutoff period
        $workdaysInCutoff = 0;
        $cursor = $cutoffStart->copy()->startOfDay();
        $endCursor = $cutoffEnd->copy()->startOfDay();
        while ($cursor->lte($endCursor)) {
            if (! $cursor->isWeekend()) {
                $workdaysInCutoff++;
            }
            $cursor->addDay();
        }
        $targetHours = $workdaysInCutoff * 8;

        // Cutoff attendance metrics
        $cutoffDaysPresent = DtrLog::where('employee_id', $employee->id)
            ->whereBetween('date', [$cutoffStart->toDateString(), $cutoffEnd->toDateString()])
            ->whereNotIn('status', ['absent'])
            ->count();

        $cutoffHoursRendered = round(
            (float) DtrLog::where('employee_id', $employee->id)
                ->whereBetween('date', [$cutoffStart->toDateString(), $cutoffEnd->toDateString()])
                ->sum('hours_rendered'),
            1
        );

        // Monthly & Cutoff summary
        $summary = [
            'days_present' => $cutoffDaysPresent,
            'cutoff_workdays' => $workdaysInCutoff,
            'days_late' => DtrLog::where('employee_id', $employee->id)
                ->whereBetween('date', [$cutoffStart->toDateString(), $cutoffEnd->toDateString()])
                ->where('status', 'late')
                ->count(),
            'hours_rendered' => $cutoffHoursRendered,
            'cutoff_target_hours' => $targetHours,
            'pending_edits' => DtrEditRequest::where('employee_id', $employee->id)
                ->where('status', 'pending')
                ->count(),
            'monthly_days_present' => DtrLog::where('employee_id', $employee->id)
                ->whereBetween('date', [$startOfMonth, $endOfMonth])
                ->whereNotIn('status', ['absent'])
                ->count(),
            'monthly_hours' => round(
                (float) DtrLog::where('employee_id', $employee->id)
                    ->whereBetween('date', [$startOfMonth, $endOfMonth])
                    ->sum('hours_rendered'),
                1
            ),
        ];

        $cutoffInfo = [
            'name' => $cutoffName,
            'label' => $cutoffLabel,
            'period_from' => $cutoffStart->format('M d, Y'),
            'period_to' => $cutoffEnd->format('M d, Y'),
            'days_remaining' => $daysRemaining,
            'workdays' => $workdaysInCutoff,
            'target_hours' => $targetHours,
        ];

        // Today's DTR log
        $today = DtrLog::firstOrCreate(
            ['employee_id' => $employee->id, 'date' => today()],
            ['status' => 'absent']
        );

        // Recent notifications (last 5)
        $recentNotifications = EmployeeNotification::where('employee_id', $employee->id)
            ->whereNull('read_at')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,
                'title' => $n->title,
                'message' => $n->message,
                'type' => $n->type,
                'link' => $n->link,
                'created_at' => $n->created_at->diffForHumans(),
            ]);

        // Recent tasks (up to 5)
        $recentTasks = Task::where('employee_id', $employee->id)
            ->orderByRaw("CASE WHEN status = 'done' THEN 1 ELSE 0 END")
            ->orderBy('due_date')
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
            ->limit(5)
            ->get()
            ->map(fn ($task) => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'due_date' => $task->due_date->format('Y-m-d'),
                'due_label' => $task->due_date->isToday() ? 'Today' : ($task->due_date->isTomorrow() ? 'Tomorrow' : $task->due_date->format('M d')),
                'priority' => $task->priority,
                'status' => $task->status,
                'is_overdue' => $task->due_date->isPast() && ! $task->due_date->isToday() && $task->status !== 'done',
            ]);

        // Latest finalized payslip
        $latestItem = PayrollItem::where('employee_id', $employee->id)
            ->whereHas('payroll', fn ($q) => $q->where('status', 'finalized'))
            ->with('payroll')
            ->latest('id')
            ->first();

        $latestPayslip = null;
        if ($latestItem && $latestItem->payroll) {
            $periodMonth = Carbon::parse($latestItem->payroll->period_from)->format('Y-m');
            $latestPayslip = [
                'month' => $periodMonth,
                'month_label' => Carbon::parse($periodMonth.'-01')->format('F Y'),
                'cutoff' => $latestItem->cutoff === 'first' ? '1st Cutoff' : '2nd Cutoff',
                'net_pay' => (float) $latestItem->net_pay,
                'gross_pay' => (float) $latestItem->gross_pay,
                'period_label' => $latestItem->payroll->period_from->format('M d').' – '.$latestItem->payroll->period_to->format('M d, Y'),
            ];
        }

        // 5-Day Weekly Attendance Strip (Monday - Friday of current week)
        $weekStart = $now->copy()->startOfWeek(Carbon::MONDAY);
        $weekDates = [];
        for ($i = 0; $i < 5; $i++) {
            $weekDates[] = $weekStart->copy()->addDays($i)->toDateString();
        }

        $weekLogs = DtrLog::where('employee_id', $employee->id)
            ->whereIn('date', $weekDates)
            ->get()
            ->keyBy(fn ($log) => Carbon::parse($log->date)->toDateString());

        $weeklyStrip = collect($weekDates)->map(function ($dateStr) use ($weekLogs, $now) {
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
                'status' => $log ? $log->status : ($isFuture ? 'scheduled' : 'absent'),
                'punches_count' => $punchesCount,
                'hours_rendered' => $log ? (float) $log->hours_rendered : 0.0,
                'has_log' => (bool) $log,
                'am_time_in' => $log?->am_time_in,
                'pm_time_out' => $log?->pm_time_out,
            ];
        })->values()->all();

        return Inertia::render('Employee/Dashboard', [
            'employee' => [
                'id' => $employee->id,
                'employee_id' => $employee->employee_id,
                'first_name' => $employee->first_name,
                'full_name' => $employee->full_name,
                'initials' => $employee->initials,
                'department' => $employee->department,
                'position' => $employee->position,
            ],
            'summary' => $summary,
            'cutoff' => $cutoffInfo,
            'today' => [
                'am_time_in' => $today->am_time_in,
                'am_time_out' => $today->am_time_out,
                'pm_time_in' => $today->pm_time_in,
                'pm_time_out' => $today->pm_time_out,
                'status' => $today->status,
                'hours_rendered' => $today->hours_rendered,
                'next_punch' => $today->getNextPunchSlot(),
            ],
            'notifications' => $recentNotifications,
            'recentNotifications' => $recentNotifications,
            'recentTasks' => $recentTasks,
            'latestPayslip' => $latestPayslip,
            'weeklyStrip' => $weeklyStrip,
        ]);
    }
}
