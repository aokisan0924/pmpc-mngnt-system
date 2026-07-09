<?php

namespace App\Http\Controllers;

use App\Models\DtrLog;
use App\Models\DtrEditRequest;
use App\Models\EmployeeNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeDashboardController extends Controller
{
    public function index(Request $request): Response {
        $employee = $request->user();

        $startOfMonth = now()->startOfMonth();
        $endOfMonth   = now()->endOfMonth();

        // Monthly summary
        $summary = [
            'days_present'   => DtrLog::where('employee_id', $employee->id)
                ->whereBetween('date', [$startOfMonth, $endOfMonth])
                ->whereNotIn('status', ['absent'])
                ->count(),
            'days_late'      => DtrLog::where('employee_id', $employee->id)
                ->whereBetween('date', [$startOfMonth, $endOfMonth])
                ->where('status', 'late')
                ->count(),
            'hours_rendered' => round(
                DtrLog::where('employee_id', $employee->id)
                    ->whereBetween('date', [$startOfMonth, $endOfMonth])
                    ->sum('hours_rendered'),
                1
            ),
            'pending_edits'  => DtrEditRequest::where('employee_id', $employee->id)
                ->where('status', 'pending')
                ->count(),
        ];

        // Today's DTR log
        $today = DtrLog::firstOrCreate(
            ['employee_id' => $employee->id, 'date' => today()],
            ['status' => 'absent']
        );

        // Recent notifications (last 3 unread)
        $recentNotifications = EmployeeNotification::where('employee_id', $employee->id)
            ->whereNull('read_at')
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get()
            ->map(fn($n) => [
                'id'         => $n->id,
                'title'      => $n->title,
                'message'    => $n->message,
                'type'       => $n->type,
                'link'       => $n->link,
                'created_at' => $n->created_at->diffForHumans(),
            ]);

        return Inertia::render('Employee/Dashboard', [
            'employee' => [
                'id'          => $employee->id,
                'employee_id' => $employee->employee_id,
                'first_name'  => $employee->first_name,
                'full_name'   => $employee->full_name,
                'initials'    => $employee->initials,
                'department'  => $employee->department,
                'position'    => $employee->position,
            ],
            'summary' => $summary,
            'today'   => [
                'am_time_in'  => $today->am_time_in,
                'am_time_out' => $today->am_time_out,
                'pm_time_in'  => $today->pm_time_in,
                'pm_time_out' => $today->pm_time_out,
                'status'      => $today->status,
            ],
            'recentNotifications' => $recentNotifications,
        ]);
    }
}