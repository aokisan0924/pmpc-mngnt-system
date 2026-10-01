<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UploadEmployeeSignatureRequest;
use App\Models\Employee;
use App\Services\EmployeeSignatureService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class EmployeeSignatureController extends Controller
{
    public function store(UploadEmployeeSignatureRequest $request, Employee $employee, EmployeeSignatureService $service): RedirectResponse
    {
        $service->replace($employee, $request->file('signature'));

        return back()->with('success', 'Employee signature uploaded.');
    }

    public function show(Employee $employee): BinaryFileResponse
    {
        abort_unless($employee->signature_path && Storage::disk('local')->exists($employee->signature_path), 404);

        return response()->file(Storage::disk('local')->path($employee->signature_path), ['Content-Type' => 'image/png', 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function destroy(Employee $employee, EmployeeSignatureService $service): RedirectResponse
    {
        $service->remove($employee);

        return back()->with('success', 'Employee signature removed.');
    }
}
