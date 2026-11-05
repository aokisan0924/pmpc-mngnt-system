<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\EmployeeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskAssignmentMessageEncodingTest extends TestCase
{
    use RefreshDatabase;

    public function test_assignment_messages_are_valid_utf8_with_a_proper_middle_dot_for_dated_and_undated_tasks(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['first_name' => 'Kurt', 'last_name' => 'Boss']);
        $maria = Employee::factory()->create();

        foreach ([['Dated', '2026-11-06'], ['Ongoing', '']] as [$title, $due]) {
            $this->actingAs($admin)->post('/admin/team-tasks', ['title' => $title, 'due_date' => $due, 'priority' => 'low', 'employee_id' => $maria->id, 'due_type' => $due === '' ? 'none' : 'date'])->assertSessionHasNoErrors();
        }

        $messages = EmployeeNotification::where('employee_id', $maria->id)->where('type', 'task_assigned')->orderBy('id')->pluck('message')->all();

        $this->assertSame(['Dated · due Nov 06, 2026 · Assigned by Kurt Boss', 'Ongoing · Assigned by Kurt Boss'], $messages);
        foreach ($messages as $message) {
            $this->assertTrue(mb_check_encoding($message, 'UTF-8'));
        }
    }
}
