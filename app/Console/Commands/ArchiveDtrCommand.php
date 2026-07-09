<?php

namespace App\Console\Commands;

use App\Models\DtrLog;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class ArchiveDtrCommand extends Command
{
    protected $signature   = 'dtr:archive {--month= : Month to archive in Y-m format (defaults to last month)}';
    protected $description = 'Generate and zip DTR PDFs for all employees for the given month';

    public function handle(): void {
        $month    = $this->option('month') ?? now()->subMonth()->format('Y-m');
        $from     = Carbon::parse($month)->startOfMonth();
        $to       = Carbon::parse($month)->endOfMonth();
        $label    = $from->format('Y-m');
        $zipDir   = storage_path("app/dtr_archives/{$label}");
        $zipPath  = storage_path("app/dtr_archives/{$label}.zip");

        if (! is_dir($zipDir)) {
            mkdir($zipDir, 0755, true);
        }

        $employees = Employee::where('role', 'employee')
            ->where('status', 'active')
            ->get();

        $this->info("Archiving DTR for {$label} — {$employees->count()} employees");
        $bar = $this->output->createProgressBar($employees->count());
        $bar->start();

        foreach ($employees as $employee) {
            $logs = DtrLog::where('employee_id', $employee->id)
                ->whereBetween('date', [$from, $to])
                ->orderBy('date')
                ->get();

            // Build calendar
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

            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('dtr.print', [
                'employee' => $employee,
                'month'    => $from->format('F Y'),
                'calendar' => $calendar,
                'summary'  => $summary,
            ])->setPaper('a4', 'portrait');

            $filename = "{$zipDir}/{$employee->employee_id}_{$label}_DTR.pdf";
            file_put_contents($filename, $pdf->output());

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        // Zip all PDFs
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
            foreach (glob("{$zipDir}/*.pdf") as $file) {
                $zip->addFile($file, basename($file));
            }
            $zip->close();
            $this->info("Archive created: {$zipPath}");
        } else {
            $this->error('Failed to create zip archive.');
        }

        // Clean up individual PDFs
        foreach (glob("{$zipDir}/*.pdf") as $file) {
            unlink($file);
        }
        rmdir($zipDir);

        $this->info('Done.');
    }
}