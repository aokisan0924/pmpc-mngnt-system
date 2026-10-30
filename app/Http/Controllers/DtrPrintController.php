<?php

namespace App\Http\Controllers;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\Setting;
use App\Services\AlwaysPresentAttendanceFiller;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class DtrPrintController extends Controller
{
    /**
     * Employee prints their own DTR
     */
    public function employeePrint(Request $request): Response
    {
        $employee = $request->user();
        $month = $request->get('month', now()->format('Y-m'));

        return $this->generatePdf($employee, $month);
    }

    /**
     * Admin prints any employee's DTR
     */
    public function adminPrint(Request $request, Employee $employee): Response
    {
        $month = $request->get('month', now()->format('Y-m'));

        return $this->generatePdf($employee, $month);
    }

    /**
     * Admin exports every active employee's DTR for the month as one zip of PDFs named Surname_DTR_YYYY-MM.pdf
     */
    public function adminExportAll(Request $request): BinaryFileResponse
    {
        $month = Carbon::parse($request->get('month', now()->format('Y-m')))->format('Y-m');
        $path = tempnam(sys_get_temp_dir(), 'dtr');
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::OVERWRITE);

        $used = [];
        foreach (Employee::where('is_staff', true)->where('status', 'active')->orderBy('last_name')->orderBy('first_name')->get() as $employee) {
            $surname = $this->surnameFor($employee);
            $name = "{$surname}_DTR_{$month}";
            // Two people with the same surname must not overwrite each other.
            if (isset($used[$name])) {
                $name = "{$surname}_{$employee->employee_id}_DTR_{$month}";
            }
            $used[$name] = true;
            $zip->addFromString("{$name}.pdf", $this->buildPdf($employee, $month)->output());
        }
        $zip->close();

        return response()->download($path, "DTR_All_{$month}.zip")->deleteFileAfterSend(true);
    }

    private function generatePdf(Employee $employee, string $month): Response
    {
        $surname = $this->surnameFor($employee);

        return $this->buildPdf($employee, $month)->download("{$surname}_DTR_{$month}.pdf");
    }

    /** Surname for file names: keeps capitals, replaces anything unsafe with an underscore. */
    private function surnameFor(Employee $employee): string
    {
        return trim((string) preg_replace('/[^A-Za-z0-9]+/', '_', Str::ascii((string) $employee->last_name)), '_') ?: 'Employee';
    }

    private function buildPdf(Employee $employee, string $month): \Barryvdh\DomPDF\PDF
    {
        app(AlwaysPresentAttendanceFiller::class)->fill();

        $from = Carbon::parse($month)->startOfMonth();
        $to = Carbon::parse($month)->endOfMonth();

        $logs = DtrLog::where('employee_id', $employee->id)
            ->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->get();

        $keyedLogs = $logs->keyBy(fn ($l) => Carbon::parse($l->date)->toDateString());

        $calendar = [];
        $current = $from->copy();
        while ($current->lte($to)) {
            $log = $keyedLogs->get($current->toDateString());
            $calendar[] = [
                'date' => $current->copy(),
                'day_name' => $current->format('D'),
                'is_weekend' => ! Employee::isWorkDay($employee->id, $current),
                'am_time_in' => $log?->am_time_in,
                'am_time_out' => $log?->am_time_out,
                'pm_time_in' => $log?->pm_time_in,
                'pm_time_out' => $log?->pm_time_out,
                'hours' => $log?->hours_rendered,
                'status' => $log?->displayStatus() ?? DtrLog::fallbackStatus($employee->id, $current),
                'absence_reason' => $log?->hasActiveAbsence() ? $log->absence_reason : null,
            ];
            $current->addDay();
        }

        $summary = [
            'days_present' => DtrLog::displayDaysPresentBetween($employee->id, $from, $to, $logs),
            'days_late' => collect($calendar)->where('status', 'late')->count(),
            'days_absent' => DtrLog::absentDaysBetween($employee->id, $from->toDateString(), $to->toDateString(), $logs),
            'half_days' => collect($calendar)->where('status', 'half_day')->count(),
            'hours_rendered' => round($logs->sum('hours_rendered'), 2),
        ];

        // Load settings from DB
        $settings = Setting::getMany([
            'coop_name',
            'coop_address',
            'signatory_1_name',
            'signatory_1_role',
            'signatory_2_name',
            'signatory_2_role',
        ]);

        $pdf = Pdf::loadView('dtr.print', [
            'employee' => $employee,
            'month' => $from->format('F Y'),
            'calendar' => $calendar,
            'twoPunch' => DtrLog::twoPunchLayout($employee->id, $logs),
            'summary' => $summary,
            'settings' => $settings,
        ])->setPaper('a4', 'portrait');

        return $pdf;
    }
}
