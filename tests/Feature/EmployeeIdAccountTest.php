<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Services\AccountSetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EmployeeIdAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_two_distinct_employee_id_accounts_without_email_and_they_can_login(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        foreach (['Malana', 'Cibal'] as $lastName) {
            $this->actingAs($admin)->post('/admin/employees', [
                'first_name' => 'Store Keeper', 'last_name' => $lastName, 'email' => '',
                'password' => 'TemporaryPass123!', 'password_confirmation' => 'TemporaryPass123!',
                'department' => 'General Merchandise', 'position' => 'Store Keeper', 'status' => 'active',
            ])->assertSessionHasNoErrors()->assertRedirect(route('admin.employees'));
        }
        $employees = Employee::whereNull('email')->get();
        $this->assertCount(2, $employees);
        $this->assertCount(2, $employees->pluck('employee_id')->unique());
        foreach ($employees as $employee) {
            $this->assertNotNull($employee->governmentIds);
            $this->assertNull($employee->date_hired);
            $this->assertTrue(Hash::check('TemporaryPass123!', $employee->password));
            $this->post('/logout');
            $this->post('/login', ['login' => $employee->employee_id, 'password' => 'TemporaryPass123!'])->assertSessionHasNoErrors();
            $this->assertAuthenticatedAs($employee);
        }
    }

    public function test_optional_email_still_rejects_invalid_and_duplicate_addresses(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $data = ['first_name' => 'Store Keeper', 'last_name' => 'Test', 'password' => 'TemporaryPass123!',
            'password_confirmation' => 'TemporaryPass123!', 'status' => 'active'];
        foreach (['invalid-address', $admin->email] as $email) {
            $this->actingAs($admin)->post('/admin/employees', [...$data, 'email' => $email])->assertSessionHasErrors('email');
        }
    }

    public function test_hr_can_approve_setup_for_multiple_accounts_without_email(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        foreach (range(1, 2) as $index) {
            $employee = Employee::factory()->create(['email' => null]);
            $submission = $employee->accountSetupRequests()->create(['details' => [
                'first_name' => $employee->first_name, 'last_name' => $employee->last_name,
                'email' => null, 'phone' => '09000000000', 'payroll_office' => 'gen_mdse',
            ]]);
            app(AccountSetupService::class)->review($submission, $admin, ['decision' => 'approved']);
            $this->assertNotNull($employee->fresh()->setup_completed_at);
            $this->assertNull($employee->fresh()->email);
        }
    }
}
