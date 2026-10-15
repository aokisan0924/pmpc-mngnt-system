<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\ThirteenthMonthPay;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class ThirteenthMonthAccuracyTest extends TestCase
{
    use RefreshDatabase;

    public function test_preview_uses_weighted_dtr_attendance_and_project_formula(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $employee = Employee::factory()->create(['daily_rate' => 600]);
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-01-05', 'status' => 'on_time']);
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-01-06', 'status' => 'half_day']);
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-06-30', 'status' => 'absent']);

        $this->actingAs($admin)
            ->get('/admin/thirteenth-month/compute?year=2026&tranche=mid_year')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('period_from', 'Jan 01, 2026')
                ->where('period_to', 'Jun 30, 2026')
                ->where('employees.0.id', $employee->id)
                ->where('employees.0.days_present', 1.5)
                ->where('employees.0.total_basic_pay', 900)
                ->where('employees.0.thirteenth_month_pay', 75)
                ->etc());
    }

    public function test_save_recalculates_values_from_database_instead_of_client_totals(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $employee = Employee::factory()->create(['daily_rate' => 600]);
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-01-05', 'status' => 'on_time']);
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-01-06', 'status' => 'half_day']);

        $employee->update(['daily_rate' => 900]);

        $this->actingAs($admin)->post('/admin/thirteenth-month', [
            'year' => 2026,
            'tranche' => 'mid_year',
            'items' => [[
                'employee_id' => $employee->id,
                'days_present' => 999,
                'daily_rate' => 999999,
                'total_basic_pay' => 999999,
                'thirteenth_month_pay' => 999999,
            ]],
        ])->assertSessionHasNoErrors();

        $record = ThirteenthMonthPay::firstOrFail();
        $this->assertSame('2026-01-01', $record->period_from->toDateString());
        $this->assertSame('2026-06-30', $record->period_to->toDateString());
        $this->assertEquals(1.5, $record->days_present);
        $this->assertEquals(900, $record->daily_rate);
        $this->assertEquals(1350, $record->total_basic_pay);
        $this->assertEquals(112.5, $record->thirteenth_month_pay);
    }

    public function test_finalized_thirteenth_month_records_capture_actor_and_cannot_be_replaced(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $employee = Employee::factory()->create(['daily_rate' => 600]);
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-07-05', 'status' => 'on_time']);
        $payload = [
            'year' => 2026,
            'tranche' => 'year_end',
            'items' => [['employee_id' => $employee->id]],
        ];

        $this->actingAs($admin)->post('/admin/thirteenth-month', $payload)->assertSessionHasNoErrors();
        $record = ThirteenthMonthPay::firstOrFail();
        $this->post('/admin/thirteenth-month/finalize', ['year' => 2026, 'tranche' => 'year_end'])->assertSessionHasNoErrors();

        $record->refresh();
        $this->assertSame('finalized', $record->status);
        $this->assertSame($admin->id, $record->finalized_by);
        $this->assertNotNull($record->finalized_at);

        $this->post('/admin/thirteenth-month', [
            ...$payload,
            'items' => [['employee_id' => $employee->id, 'thirteenth_month_pay' => 999999]],
        ])->assertSessionHasErrors('error');
        $this->assertEquals(50, $record->fresh()->thirteenth_month_pay);
    }

    public function test_compute_rejects_an_unsupported_tranche(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);

        $this->actingAs($admin)
            ->get('/admin/thirteenth-month/compute?year=2026&tranche=invalid')
            ->assertSessionHasErrors('tranche');
    }

    public function test_save_rejects_a_stale_or_incomplete_employee_roster(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $included = Employee::factory()->create();
        Employee::factory()->create();

        $this->actingAs($admin)->post('/admin/thirteenth-month', [
            'year' => 2026,
            'tranche' => 'mid_year',
            'items' => [['employee_id' => $included->id]],
        ])->assertSessionHasErrors('items');

        $this->assertDatabaseCount('thirteenth_month_pays', 0);
    }
}
