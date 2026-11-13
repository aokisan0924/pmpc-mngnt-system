<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\PayrollItem;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\Concerns\BuildsWizardPayroll;
use Tests\TestCase;

class HolidayAttendanceTest extends TestCase
{
    use BuildsWizardPayroll;
    use RefreshDatabase;

    public function test_admin_manages_holidays_and_duplicates_or_employees_are_rejected(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create();

        $this->actingAs($admin)->post(route('admin.holidays.store'), ['date' => '2026-12-25', 'name' => 'Christmas Day', 'type' => 'regular'])
            ->assertSessionHasNoErrors();
        $this->post(route('admin.holidays.store'), ['date' => '2026-12-25', 'name' => 'Duplicate', 'type' => 'special'])
            ->assertSessionHasErrors('date');
        $this->post(route('admin.holidays.store'), ['date' => '2026-12-26', 'name' => 'Bad type', 'type' => 'local'])
            ->assertSessionHasErrors('type');
        $this->assertSame(1, Holiday::count());

        // The admin role middleware turns non-admins away before the request reaches the controller.
        $this->actingAs($employee)->post(route('admin.holidays.store'), ['date' => '2026-12-30', 'name' => 'Rizal Day', 'type' => 'regular'])
            ->assertRedirect();
        $this->assertSame(1, Holiday::count());

        $this->actingAs($admin)->delete(route('admin.holidays.destroy', Holiday::firstOrFail()))->assertSessionHasNoErrors();
        $this->assertSame(0, Holiday::count());
    }

    public function test_payroll_preview_keeps_holidays_as_nwnp_days_and_saves_entered_holiday_pay(): void
    {
        Holiday::create(['date' => '2026-09-08', 'name' => 'Regular test holiday', 'type' => 'regular']);
        Holiday::create(['date' => '2026-09-10', 'name' => 'Special test holiday', 'type' => 'special']);
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $employee = Employee::factory()->create(['daily_rate' => 600, 'transpo_allowance' => 0, 'rep_allowance' => 0, 'quarterly_allowance' => 0]);
        $employee->forceFill(['payroll_office' => 'fort_magsaysay', 'setup_completed_at' => now(), 'office_verified_at' => now()])->save();
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-09-08']);
        $this->actingAs($admin)->get(route('admin.payroll.create', ['month' => '2026-09', 'cutoff' => 'first']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('employees.0.id', $employee->id)
                ->where('employees.0.holiday_pay', 0)
                // Holidays stay in the cutoff (11 weekdays); not worked = no work, no pay.
                ->where('employees.0.days_of_work', 11)
                ->where('employees.0.unresolved_dates', [])
                ->has('holidays', 2));

        $this->post(route('admin.payroll.store'), $this->wizardPayload([$employee], '2026-09', 'first', ['holiday_pay' => 600]))
            ->assertSessionHasNoErrors()->assertRedirect();

        $item = PayrollItem::firstOrFail();
        $this->assertEquals(600, $item->holiday_pay);
        // One worked day (the regular holiday, 8 h), the DOLE extra for working it (200% - 100% already paid = 600,
        // added automatically since 2026-11-13) and the typed premium: step 3 shows both so HR can avoid paying twice.
        $this->assertEquals(600, $item->worked_holiday_pay);
        $this->assertEquals(600 + 600 + 600, $item->gross_pay);
    }

    public function test_always_present_employee_counts_every_weekday_and_is_never_late(): void
    {
        Holiday::create(['date' => '2026-09-08', 'name' => 'Regular test holiday', 'type' => 'regular']);
        Holiday::create(['date' => '2026-09-10', 'name' => 'Special test holiday', 'type' => 'announced']);
        $president = Employee::factory()->create(['auto_present_weekdays' => true]);
        $staff = Employee::factory()->create();

        // Sept 1-15, 2026 has 11 weekdays; holidays still count for an always-present employee.
        $days = DtrLog::weightedDaysByEmployee([$president->id, $staff->id], '2026-09-01', '2026-09-15');
        $this->assertEquals(11, $days[$president->id]);
        $this->assertArrayNotHasKey($staff->id, $days->all());

        $this->assertSame('on_time', DtrLog::fallbackStatus($president->id, Carbon::parse('2026-09-02')));
        $this->assertSame('absent', DtrLog::fallbackStatus($staff->id, Carbon::parse('2026-09-02')));
        $this->assertSame('holiday', DtrLog::fallbackStatus($staff->id, Carbon::parse('2026-09-08')));
        $this->assertSame('rest_day', DtrLog::fallbackStatus($staff->id, Carbon::parse('2026-09-05')));

        $late = DtrLog::factory()->make(['employee_id' => $president->id, 'date' => '2026-09-03', 'am_time_in' => '09:30', 'pm_time_out' => '15:00']);
        $late->computeHoursAndStatus();
        $this->assertSame('on_time', $late->status);

        $holidayAbsence = DtrLog::factory()->create(['employee_id' => $staff->id, 'date' => '2026-09-08', 'am_time_in' => null, 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null, 'status' => 'absent']);
        $this->assertSame('holiday', $holidayAbsence->displayStatus());
        $this->assertTrue($holidayAbsence->isExcusedAbsence());
    }

    public function test_admin_can_flag_employee_as_always_present(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create(['daily_rate' => 1236]);

        $this->actingAs($admin)->patch(route('admin.employees.compensation', $employee), ['daily_rate' => 1236, 'auto_present_weekdays' => true])
            ->assertSessionHasNoErrors();

        $this->assertTrue($employee->fresh()->auto_present_weekdays);
    }

    public function test_dashboard_offers_the_holiday_types_for_marking_a_holiday(): void
    {
        $admin = Employee::factory()->superAdmin()->create();

        $this->actingAs($admin)->get(route('admin.dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Dashboard')
                ->where('holiday_types', collect(Holiday::TYPES)->map(fn (array $type): string => $type['label'])->all()));
    }
}
