<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\Payroll;
use App\Models\PayrollItem;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeScheduleEditTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-10-23 10:00'));
        $this->admin = Employee::factory()->superAdmin()->create();
        $this->employee = Employee::factory()->create();
    }

    /** @param array<string, mixed> $changes */
    private function save(array $changes = [])
    {
        return $this->actingAs($this->admin)->put(route('admin.employees.schedule', $this->employee), array_replace([
            'effective_from' => '2026-10-23',
            'schedule_type' => 'custom',
            'shift_start' => '07:00',
            'shift_end' => '16:00',
            'work_days' => [1, 2, 3, 4, 5],
        ], $changes));
    }

    private function log(string $date, string $status): DtrLog
    {
        return DtrLog::factory()->create([
            'employee_id' => $this->employee->id, 'date' => $date, 'status' => $status,
            'am_time_in' => '07:00:00', 'am_time_out' => '12:00:00', 'pm_time_in' => '13:00:00', 'pm_time_out' => '16:00:00',
        ]);
    }

    public function test_backdated_change_recomputes_status_but_not_punches(): void
    {
        $log = $this->log('2026-10-20', 'undertime');

        $this->save(['effective_from' => '2026-10-17'])->assertSessionHasNoErrors();

        $log->refresh();
        $this->assertSame('on_time', $log->status);
        $this->assertSame('07:00:00', $log->am_time_in);
        $this->assertSame('12:00:00', $log->am_time_out);
        $this->assertSame('13:00:00', $log->pm_time_in);
        $this->assertSame('16:00:00', $log->pm_time_out);
    }

    public function test_backdated_save_stops_at_the_next_schedule_row(): void
    {
        EmployeeSchedule::create(['employee_id' => $this->employee->id, 'effective_from' => '2026-10-21', 'type' => 'custom',
            'shift_start' => '09:00', 'shift_end' => '18:00', 'work_days' => '1,2,3,4,5']);
        $before = $this->log('2026-10-16', 'late');
        $after = $this->log('2026-10-22', 'late');

        $this->save(['effective_from' => '2026-10-15'])->assertSessionHasNoErrors();

        $this->assertSame('on_time', $before->refresh()->status);
        $this->assertSame('late', $after->refresh()->status);
    }

    public function test_same_start_date_replaces_the_row(): void
    {
        $this->save()->assertSessionHasNoErrors();
        $this->save(['schedule_type' => 'standard', 'shift_start' => null, 'shift_end' => null])->assertSessionHasNoErrors();

        $row = EmployeeSchedule::where('employee_id', $this->employee->id)->sole();
        $this->assertSame('standard', $row->type);
        $this->assertNull($row->shift_start);
        $this->assertNull($row->shift_end);
        $this->assertSame($this->admin->id, $row->created_by);
    }

    public function test_cannot_backdate_into_a_finalized_cutoff(): void
    {
        $payroll = Payroll::factory()->finalized()->create(['period_from' => '2026-10-01', 'period_to' => '2026-10-15']);
        PayrollItem::factory()->create(['payroll_id' => $payroll->id, 'employee_id' => $this->employee->id]);

        $this->save(['effective_from' => '2026-10-15'])->assertSessionHasErrors('effective_from');
        $this->save(['effective_from' => '2026-10-16'])->assertSessionHasNoErrors();
    }

    public function test_finalized_payroll_without_this_employee_does_not_block(): void
    {
        Payroll::factory()->finalized()->create(['period_from' => '2026-10-01', 'period_to' => '2026-10-15']);

        $this->save(['effective_from' => '2026-10-10'])->assertSessionHasNoErrors();
    }

    public function test_future_rows_can_be_deleted_past_rows_cannot(): void
    {
        $make = fn (string $date) => EmployeeSchedule::create(['employee_id' => $this->employee->id, 'effective_from' => $date,
            'type' => 'standard', 'work_days' => '1,2,3,4,5']);
        $future = $make('2026-11-01');
        $past = $make('2026-10-01');

        $this->actingAs($this->admin)->delete(route('admin.employees.schedule.destroy', [$this->employee, $future]))->assertRedirect();
        $this->assertModelMissing($future);

        $this->actingAs($this->admin)->delete(route('admin.employees.schedule.destroy', [$this->employee, $past]))->assertForbidden();
        $this->assertModelExists($past);
    }

    public function test_compensation_save_no_longer_touches_the_schedule(): void
    {
        $this->actingAs($this->admin)->patch(route('admin.employees.compensation', $this->employee), ['daily_rate' => 700])
            ->assertSessionHasNoErrors();

        $this->assertSame(0, EmployeeSchedule::count());
        $this->assertEquals(700, $this->employee->refresh()->daily_rate);
    }

    public function test_saving_today_recomputes_todays_log(): void
    {
        $this->travelTo(Carbon::parse('2026-10-23 14:00'));
        $log = $this->log('2026-10-23', 'undertime');

        $this->save(['effective_from' => '2026-10-23'])->assertSessionHasNoErrors();

        $log->refresh();
        $this->assertSame('on_time', $log->status);
        $this->assertSame('07:00:00', $log->am_time_in);
        $this->assertSame('16:00:00', $log->pm_time_out);
    }

    public function test_future_start_recomputes_nothing(): void
    {
        $log = $this->log('2026-10-23', 'undertime');

        $this->save(['effective_from' => '2026-10-24'])->assertSessionHasNoErrors();

        $this->assertSame('undertime', $log->refresh()->status);
    }
}
