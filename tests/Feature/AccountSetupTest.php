<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountSetupRequest;
use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\PayrollItem;
use App\Services\OfficePayrollCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AccountSetupTest extends TestCase
{
    use RefreshDatabase;

    private function details(Employee $employee): array
    {
        return ['first_name' => 'Confirmed', 'middle_name' => 'M', 'last_name' => 'Employee', 'name_suffix' => 'Jr.', 'email' => $employee->email, 'phone' => '09171234567', 'payroll_office' => 'gen_mdse', 'employment_confirmed' => true];
    }

    public function test_login_prompts_setup_without_blocking_attendance(): void
    {
        $employee = Employee::factory()->create();
        $this->post('/login', ['login' => $employee->employee_id, 'password' => 'password123'])->assertRedirect(route('employee.setup'));
        $this->get('/employee/dtr')->assertOk();
        $this->get('/employee/setup')->assertInertia(fn (AssertableInertia $page) => $page->component('Employee/AccountSetup')->has('offices', 3));
    }

    public function test_setup_requires_hr_approval_and_preserves_identity_password_compensation_and_dtr(): void
    {
        $employee = Employee::factory()->create();
        $admin = Employee::factory()->superAdmin()->create();
        $password = $employee->password;
        $code = $employee->employee_id;
        $name = $employee->first_name;
        $dtr = DtrLog::create(['employee_id' => $employee->id, 'date' => '2026-09-01', 'status' => 'on_time']);
        $this->actingAs($employee)->post('/employee/setup', [...$this->details($employee), 'role' => 'super_admin', 'daily_rate' => 9999, 'password' => 'changed'])->assertSessionHasNoErrors();
        $this->assertSame($name, $employee->fresh()->first_name);
        $this->assertNull($employee->fresh()->payroll_office);
        $this->assertDatabaseCount('employee_government_ids', 0);
        $submission = AccountSetupRequest::firstOrFail();
        $this->patch('/admin/account-setups/'.$submission->id, ['decision' => 'approved'])->assertRedirect(route('employee.dashboard'));
        $this->actingAs($admin)->patch('/admin/account-setups/'.$submission->id, ['decision' => 'approved'])->assertSessionHasNoErrors();
        $employee->refresh();
        $this->assertSame('Confirmed M Employee Jr.', $employee->full_name);
        $this->assertSame('gen_mdse', $employee->payroll_office);
        $this->assertTrue($employee->hasVerifiedPayrollOffice());
        $this->assertSame($password, $employee->password);
        $this->assertSame($code, $employee->employee_id);
        $this->assertSame('employee', $employee->role);
        $this->assertEquals(610, $employee->daily_rate);
        $this->assertSame($employee->id, $dtr->fresh()->employee_id);
        $this->assertSame($admin->id, $employee->office_verified_by);
        $this->get('/admin/payroll/create?period_from=2026-09-01&period_to=2026-09-15&cutoff=first')->assertInertia(fn (AssertableInertia $page) => $page
            ->where('employees', fn ($employees) => collect($employees)->contains(fn ($entry) => $entry['id'] === $employee->id && $entry['payroll_office'] === 'gen_mdse' && $entry['paid_days_basis'] === 15 && $entry['office_verified'])));
        $this->actingAs($employee)->post('/employee/setup', $this->details($employee))->assertSessionHasErrors('setup');
    }

    public function test_rejected_setup_can_be_corrected_but_pending_submission_cannot_be_duplicated(): void
    {
        $employee = Employee::factory()->create();
        $admin = Employee::factory()->superAdmin()->create();
        $this->actingAs($employee)->post('/employee/setup', $this->details($employee))->assertSessionHasNoErrors();
        $this->post('/employee/setup', $this->details($employee))->assertSessionHasErrors('setup');
        $submission = AccountSetupRequest::firstOrFail();
        $this->actingAs($admin)->patch('/admin/account-setups/'.$submission->id, ['decision' => 'rejected'])->assertSessionHasErrors('review_note');
        $this->patch('/admin/account-setups/'.$submission->id, ['decision' => 'rejected', 'review_note' => 'Confirm your office.'])->assertSessionHasNoErrors();
        $this->assertNull($employee->fresh()->setup_completed_at);
        $this->actingAs($employee)->post('/employee/setup', [...$this->details($employee), 'payroll_office' => 'cubao'])->assertSessionHasNoErrors();
        $this->assertDatabaseCount('account_setup_requests', 2);
    }

    public function test_unverified_office_and_tampered_verified_office_cannot_be_saved_to_payroll(): void
    {
        $employee = Employee::factory()->create();
        $admin = Employee::factory()->superAdmin()->create();
        $payload = ['period_from' => '2026-09-01', 'period_to' => '2026-09-15', 'period_label' => 'September first', 'cutoff' => 'first', 'items' => [[
            'employee_id' => $employee->id, 'payroll_office' => 'cubao', 'paid_days_basis' => 11, 'absence_days' => 0, 'tardiness_deduction' => 0, 'deductions_reviewed' => true,
            'compensation_signature' => app(OfficePayrollCalculator::class)->compensationSignature($employee), 'deductions' => array_fill_keys(OfficePayrollCalculator::DEDUCTIONS, 0),
        ]]];
        $this->actingAs($admin)->post('/admin/payroll', $payload)->assertSessionHasErrors('items');
        $employee->forceFill(['payroll_office' => 'gen_mdse', 'setup_completed_at' => now(), 'office_verified_at' => now()])->save();
        $this->post('/admin/payroll', $payload)->assertSessionHasErrors('items');
        $this->assertDatabaseCount('payrolls', 0);
    }

    public function test_only_hr_can_transfer_office_and_saved_payroll_office_is_unchanged(): void
    {
        $employee = Employee::factory()->create();
        $employee->forceFill(['payroll_office' => 'cubao', 'setup_completed_at' => now(), 'office_verified_at' => now()])->save();
        $item = PayrollItem::factory()->create(['employee_id' => $employee->id, 'payroll_office' => 'cubao']);
        $payload = ['payroll_office' => 'fort_magsaysay', 'review_note' => 'Approved office transfer'];
        $this->actingAs($employee)->patch('/admin/employees/'.$employee->id.'/payroll-office', $payload)->assertRedirect(route('employee.dashboard'));
        $this->actingAs(Employee::factory()->superAdmin()->create())->patch('/admin/employees/'.$employee->id.'/payroll-office', $payload)->assertSessionHasNoErrors();
        $this->assertSame('fort_magsaysay', $employee->fresh()->payroll_office);
        $this->assertSame('cubao', $item->fresh()->payroll_office);
        $this->assertSame('office_transfer', AccountSetupRequest::firstOrFail()->details['type']);
    }

    public function test_employee_signature_is_optional_and_uses_private_owner_endpoint(): void
    {
        Storage::fake('local');
        $employee = Employee::factory()->create();
        $this->actingAs($employee)->post('/employee/setup', $this->details($employee))->assertSessionHasNoErrors();
        $this->assertNull($employee->fresh()->signature_path);
        $this->post('/employee/setup/signature', ['signature' => UploadedFile::fake()->image('signature.png', 200, 60)])->assertSessionHasNoErrors();
        $this->actingAs($employee->fresh())->get('/employee/setup/signature')->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $this->actingAs(Employee::factory()->create())->get('/employee/setup/signature')->assertNotFound();
        $this->actingAs($employee)->delete('/employee/setup/signature')->assertSessionHasNoErrors();
        $this->assertNull($employee->fresh()->signature_path);
    }

    public function test_employee_cannot_bypass_hr_name_review_through_profile_update(): void
    {
        $employee = Employee::factory()->create();
        $this->actingAs($employee)->patch('/employee/profile/info', ['first_name' => 'Unverified', 'last_name' => $employee->last_name])->assertSessionHasErrors('first_name');
        $this->assertNotSame('Unverified', $employee->fresh()->first_name);
        $this->patch('/employee/profile/info', ['first_name' => $employee->first_name, 'last_name' => $employee->last_name, 'middle_name' => 'Unverified', 'name_suffix' => 'III', 'phone' => '09175551234'])
            ->assertSessionHasNoErrors();
        $this->assertNull($employee->fresh()->middle_name);
        $this->assertNull($employee->fresh()->name_suffix);
        $this->assertSame('09175551234', $employee->fresh()->phone);
        $this->actingAs(Employee::factory()->superAdmin()->create())->patch('/admin/employees/'.$employee->id, [
            'first_name' => $employee->first_name, 'last_name' => $employee->last_name,
            'email' => $employee->email, 'status' => 'active', 'middle_name' => 'Verified', 'name_suffix' => 'Jr.',
        ])->assertSessionHasNoErrors();
        $this->assertSame('Verified', $employee->fresh()->middle_name);
        $this->assertSame('Jr.', $employee->fresh()->name_suffix);
    }
}
