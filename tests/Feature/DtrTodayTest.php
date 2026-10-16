<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DtrTodayTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_dtr_exposes_the_manila_date_even_when_utc_is_the_previous_day(): void
    {
        $this->travelTo(Carbon::parse('2026-10-15 17:00:00', 'UTC'));
        $admin = Employee::factory()->create(['role' => 'super_admin']);
        $employee = Employee::factory()->create();

        foreach (['2026-10', '2026-09'] as $month) {
            $this->actingAs($admin)
                ->get(route('admin.dtr.show', ['employee' => $employee->id, 'month' => $month]))
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Admin/DtrShow')
                    ->where('today_date', '2026-10-16')
                    ->where('month', $month));
        }
    }
}
