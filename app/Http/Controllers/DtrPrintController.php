<?php

namespace App\Http\Controllers;

use App\Models\DtrLog;
use App\Models\Employee;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DtrPrintController extends Controller
{
    /**
     * Employee prints their own DTR
     */
    public function employeePrint(Request $request): Response {
        $employee = $request->user();
        $month    = $request->get('month', now()->format('Y-m'));

        return $this->generatePdf($employee, $month);
    }

    /**
     * Admin prints any employee's DTR
     */
    public function adminPrint(Request $request, Employee $employee): Response {
        $month = $request->get('month', now()->format('Y-m'));
        return $this->generatePdf($employee, $month);
    }

    private function generatePdf(Employee $employee, string $month): Response {
        $from = Carbon::parse($month)->startOfMonth();
        $to   = Carbon::parse($month)->endOfMonth();

        $logs = DtrLog::where('employee_id', $employee->id)
            ->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->get();

        $calendar = [];
        $current  = $from->copy();
        while ($current->lte($to)) {
            $log = $logs->firstWhere('date', $current->toDateString());
            $calendar[] = [
                'date'        => $current->copy(),
                'day_name'    => $current->format('D'),
                'is_weekend'  => $current->isWeekend(),
                'am_time_in'  => $log?->am_time_in,
                'am_time_out' => $log?->am_time_out,
                'pm_time_in'  => $log?->pm_time_in,
                'pm_time_out' => $log?->pm_time_out,
                'hours'       => $log?->hours_rendered,
                'status'      => $log?->status ?? ($current->isWeekend() ? 'rest_day' : 'absent'),
            ];
            $current->addDay();
        }

        $summary = [
            'days_present'   => $logs->whereNotIn('status', ['absent'])->count(),
            'days_late'      => $logs->where('status', 'late')->count(),
            'days_absent'    => $logs->where('status', 'absent')->count(),
            'half_days'      => $logs->where('status', 'half_day')->count(),
            'hours_rendered' => round($logs->sum('hours_rendered'), 2),
        ];

        // Load settings from DB
        $settings = \App\Models\Setting::getMany([
            'coop_name',
            'coop_address',
            'signatory_1_name',
            'signatory_1_role',
            'signatory_2_name',
            'signatory_2_role',
        ]);

        $pdf = Pdf::loadView('dtr.print', [
            'employee' => $employee,
            'month'    => $from->format('F Y'),
            'calendar' => $calendar,
            'summary'  => $summary,
            'settings' => $settings,
        ])->setPaper('a4', 'portrait');

        $filename = "DTR_{$employee->employee_id}_{$month}.pdf";
        return $pdf->download($filename);
    }
}