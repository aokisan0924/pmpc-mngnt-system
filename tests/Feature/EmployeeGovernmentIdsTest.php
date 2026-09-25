<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeGovernmentIdsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_employee_government_ids(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create();

        $response = $this->actingAs($admin)->patch(route('admin.employees.government-ids', $employee), [
            'sss_no' => '34-1234567-8',
            'philhealth_no' => '12-345678901-2',
            'tin_no' => '123-456-789-000',
            'pagibig_no' => '1234-5678-9012',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('employee_government_ids', [
            'employee_id' => $employee->id,
            'sss_no' => '34-1234567-8',
            'philhealth_no' => '12-345678901-2',
            'tin_no' => '123-456-789-000',
            'pagibig_no' => '1234-5678-9012',
        ]);
    }

    public function test_non_admin_cannot_update_employee_government_ids(): void
    {
        $regularEmployee = Employee::factory()->create();
        $targetEmployee = Employee::factory()->create();

        $response = $this->actingAs($regularEmployee)->patch(route('admin.employees.government-ids', $targetEmployee), [
            'sss_no' => '34-1234567-8',
        ]);

        $response->assertRedirect(route('employee.dashboard'));
    }
}
