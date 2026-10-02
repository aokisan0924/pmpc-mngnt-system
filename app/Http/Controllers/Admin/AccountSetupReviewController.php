<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReviewAccountSetupRequest;
use App\Http\Requests\Admin\UpdatePayrollOfficeRequest;
use App\Models\AccountSetupRequest;
use App\Models\Employee;
use App\Services\AccountSetupService;
use App\Services\OfficePayrollCalculator;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AccountSetupReviewController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/AccountSetupReviews', [
            'submissions' => AccountSetupRequest::with('employee:id,employee_id,first_name,last_name,middle_name,name_suffix,position,department,date_hired,status,payroll_office')
                ->where('status', 'pending')->orderBy('id')->get(),
            'offices' => OfficePayrollCalculator::OFFICES,
        ]);
    }

    public function review(ReviewAccountSetupRequest $request, AccountSetupRequest $submission, AccountSetupService $service): RedirectResponse
    {
        $service->review($submission, $request->user(), $request->validated());

        return back()->with('success', 'Account setup review recorded.');
    }

    public function transfer(UpdatePayrollOfficeRequest $request, Employee $employee, AccountSetupService $service): RedirectResponse
    {
        $service->transfer($employee, $request->user(), $request->validated());

        return back()->with('success', 'Verified office updated. Saved payroll assignments remain unchanged.');
    }
}
