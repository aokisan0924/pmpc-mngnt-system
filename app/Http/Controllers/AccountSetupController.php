<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\SubmitAccountSetupRequest;
use App\Http\Requests\UploadOwnSignatureRequest;
use App\Services\AccountSetupService;
use App\Services\EmployeeSignatureService;
use App\Services\OfficePayrollCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AccountSetupController extends Controller
{
    public function show(Request $request): Response
    {
        $employee = $request->user();
        abort_unless($employee->isActive() && $employee->is_staff, 403);
        $employee->loadMissing('governmentIds');

        return Inertia::render('Employee/AccountSetup', [
            'employee' => [...$employee->only(['employee_id', 'first_name', 'middle_name', 'last_name', 'name_suffix', 'email', 'phone', 'address', 'position', 'department', 'status', 'payroll_office', 'setup_completed_at']), 'date_hired' => $employee->date_hired?->format('Y-m-d'), 'full_name' => $employee->full_name, 'signature_url' => $employee->signature_path ? route('employee.setup.signature.show').'?v='.$employee->signature_uploaded_at?->timestamp : null],
            'submission' => $employee->accountSetupRequests()->latest('id')->first(),
            'govIds' => $employee->governmentIds?->only(['sss_no', 'philhealth_no', 'tin_no', 'pagibig_no']),
            'offices' => OfficePayrollCalculator::OFFICES,
        ]);
    }

    public function store(SubmitAccountSetupRequest $request, AccountSetupService $service): RedirectResponse
    {
        $service->submit($request->user(), $request->validated());

        return back()->with('success', 'Account setup submitted for HR verification. Attendance remains available.');
    }

    public function signature(UploadOwnSignatureRequest $request, EmployeeSignatureService $service): RedirectResponse
    {
        $service->replace($request->user(), $request->file('signature'));

        return back()->with('success', 'Your signature was uploaded.');
    }

    public function showSignature(Request $request): BinaryFileResponse
    {
        $employee = $request->user();
        abort_unless($employee->isActive() && $employee->is_staff, 403);
        abort_unless($employee->signature_path && Storage::disk('local')->exists($employee->signature_path), 404);

        return response()->file(Storage::disk('local')->path($employee->signature_path), ['Content-Type' => 'image/png', 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff'])->setPrivate();
    }

    public function removeSignature(Request $request, EmployeeSignatureService $service): RedirectResponse
    {
        abort_unless($request->user()->isActive() && $request->user()->is_staff, 403);
        $service->remove($request->user());

        return back()->with('success', 'Your signature was removed.');
    }
}
