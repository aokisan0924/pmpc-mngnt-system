<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ExportManagementPayrollRequest;
use App\Models\Payroll;
use App\Services\ManagementPayrollExport;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ManagementPayrollExportController extends Controller
{
    public function __invoke(ExportManagementPayrollRequest $request, Payroll $payroll, ManagementPayrollExport $export): BinaryFileResponse
    {
        return response()->download(
            $export->export($payroll, $request->validated('signatories', [])),
            strtoupper($payroll->period_from->format('F Y')).' MANAGEMENT PAYROLL.xlsx',
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Cache-Control' => 'private, no-store'],
        )->deleteFileAfterSend(true);
    }
}
