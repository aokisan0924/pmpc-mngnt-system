<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminPersonalWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_open_my_attendance_and_my_tasks(): void
    {
        $admin = Employee::factory()->create(['role' => 'super_admin']);

        $this->actingAs($admin)->get('/employee/dtr')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Employee/Dtr'));

        $this->actingAs($admin)->get('/employee/planner')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Employee/Planner'));
    }
}
