<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Payroll;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\Concerns\BuildsWizardPayroll;
use Tests\TestCase;

class PayrollProcessorAccessTest extends TestCase
{
    use BuildsWizardPayroll;
    use RefreshDatabase;

    private function processor(): Employee
    {
        config(['pmpc.payroll_processors' => ['EMP-PAY1']]);

        return Employee::factory()->create(['employee_id' => 'EMP-PAY1', 'role' => 'employee', 'status' => 'active']);
    }

    public function test_payroll_processor_can_open_save_and_export_payroll(): void
    {
        Carbon::setTestNow('2026-10-01 08:00:00');
        $katherine = $this->processor();
        $worker = Employee::factory()->create(['date_hired' => '2026-01-01']);
        $worker->forceFill(['payroll_office' => 'main_office', 'setup_completed_at' => now(), 'office_verified_at' => now()])->save();

        $this->actingAs($katherine)->get('/admin/payroll')->assertOk();
        $this->get('/admin/payroll/create?month=2026-09&cutoff=first')
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Admin/PayrollWizard')->where('auth.employee.can_process_payroll', true));
        $this->post('/admin/payroll', $this->wizardPayload([$worker]))->assertSessionHasNoErrors()->assertRedirect();
        $payroll = Payroll::firstOrFail();
        $this->get("/admin/payroll/{$payroll->id}")->assertOk();
        $this->postJson('/admin/payroll/mockup-export', $this->wizardPayload([$worker]))->assertOk();
        $this->post("/admin/payroll/{$payroll->id}/finalize")->assertSessionHasNoErrors();
        $this->assertTrue($payroll->fresh()->isFinalized());
        Carbon::setTestNow();
    }

    public function test_payroll_processor_cannot_reach_other_admin_pages(): void
    {
        $katherine = $this->processor();

        $this->actingAs($katherine)->get('/admin/employees')->assertRedirect(route('employee.dashboard'));
        $this->get('/admin/dashboard')->assertRedirect(route('employee.dashboard'));
        $this->get('/admin/payroll/analytics')->assertRedirect(route('employee.dashboard'));
        $this->get('/admin/dtr')->assertRedirect(route('employee.dashboard'));
    }

    public function test_other_employees_still_cannot_reach_payroll(): void
    {
        $this->processor();
        $other = Employee::factory()->create(['role' => 'employee']);

        $this->actingAs($other)->get('/admin/payroll')->assertRedirect(route('employee.dashboard'));
        $this->post('/admin/payroll', [])->assertRedirect(route('employee.dashboard'));
        $this->postJson('/admin/payroll/mockup-export', [])->assertForbidden();
    }

    public function test_inactive_processor_loses_access(): void
    {
        $katherine = $this->processor();
        $katherine->update(['status' => 'inactive']);

        $this->actingAs($katherine)->get('/admin/payroll')->assertRedirect();
        $this->assertGuest();
    }
}
