<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\Setting;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Once;
use Tests\TestCase;

class ScheduleDataMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const MIGRATION = 'migrations/2026_10_23_000002_move_shifts_and_work_days_to_employee_schedules.php';

    public function test_old_shifts_and_workdays_become_history_with_unchanged_statuses(): void
    {
        $this->travelTo(Carbon::parse('2026-10-23 12:00', 'Asia/Manila'));
        $migration = require database_path(self::MIGRATION);
        $migration->down();

        $a = Employee::factory()->create(['date_hired' => '2026-09-01']);
        $b = Employee::factory()->create(['date_hired' => null]);
        $c = Employee::factory()->create(['date_hired' => '2026-09-01']);
        $d = Employee::factory()->create(['date_hired' => '2026-09-01']);
        // (b) has no hire date, so its start date is the account creation date.
        DB::table('employees')->where('id', $b->id)->update(['work_days' => '0,6', 'created_at' => '2026-08-15 10:00:00']);
        DB::table('employees')->where('id', $c->id)->update(['work_days' => '0,6']);
        DB::table('settings')->insert([
            ['key' => "employee_shift_{$c->id}", 'value' => json_encode(['effective_from' => '2026-10-17', 'start' => '19:00', 'end' => '07:00', 'two_punch' => true])],
            ['key' => "employee_shift_{$d->id}", 'value' => '{"effective_from": "2026-10-17", "start": '],
            ['key' => 'employee_shift_notes', 'value' => 'keep me'],
        ]);
        Setting::get("employee_shift_{$c->id}"); // warm the settings cache the migration must clear

        $migration->up();
        Once::flush();

        $rows = fn (Employee $e): array => DB::table('employee_schedules')->where('employee_id', $e->id)->orderBy('effective_from')
            ->get(['effective_from', 'type', 'shift_start', 'shift_end', 'work_days', 'created_by'])
            ->map(fn (object $r): array => [substr((string) $r->effective_from, 0, 10), $r->type, $r->shift_start, $r->shift_end, $r->work_days, $r->created_by])
            ->all();
        $this->assertSame([], $rows($a));
        $this->assertSame([['2026-08-15', 'standard', null, null, '0,6', null]], $rows($b));
        $this->assertSame([
            ['2026-09-01', 'standard', null, null, '0,6', null],
            ['2026-10-17', 'two_punch', '19:00', '07:00', '0,6', null],
        ], $rows($c));
        $this->assertSame([], $rows($d));
        $this->assertFalse(Schema::hasColumn('employees', 'work_days'));
        $this->assertSame(['employee_shift_notes'], DB::table('settings')->where('key', 'like', 'employee_shift_%')->pluck('key')->all());
        $this->assertFalse(Cache::has("setting_employee_shift_{$c->id}"));

        // (c): a four-punch Saturday before the shift change, a closed overnight shift, and an unclosed one.
        foreach ([
            ['2026-10-10', '08:00', '12:00', '13:00', '17:00'],
            ['2026-10-17', '19:00', null, null, '07:00'],
            ['2026-10-18', '19:00', null, null, null],
        ] as [$date, $amIn, $amOut, $pmIn, $pmOut]) {
            $log = new DtrLog(['employee_id' => $c->id, 'date' => $date, 'am_time_in' => $amIn, 'am_time_out' => $amOut, 'pm_time_in' => $pmIn, 'pm_time_out' => $pmOut]);
            $log->computeHoursAndStatus();
            $log->save();
        }

        // Expected statuses written from the old storage rules (work_days for every date, shift from its effective_from).
        $weekdays = ['absent', 'absent', 'rest_day', 'rest_day', 'absent', 'absent', 'absent', 'absent', 'absent', 'rest_day', 'rest_day',
            'absent', 'absent', 'absent', 'absent', 'absent', 'rest_day', 'rest_day', 'absent', 'absent', 'absent', 'absent', 'in_progress'];
        $weekends = ['rest_day', 'rest_day', 'absent', 'absent', 'rest_day', 'rest_day', 'rest_day', 'rest_day', 'rest_day', 'absent', 'absent',
            'rest_day', 'rest_day', 'rest_day', 'rest_day', 'rest_day', 'absent', 'absent', 'rest_day', 'rest_day', 'rest_day', 'rest_day', 'rest_day'];
        // Oct 10 four-punch Saturday, Oct 17 closed 19:00 -> 07:00, Oct 18 never clocked out.
        $withLogs = array_replace($weekends, [9 => 'on_time', 16 => 'on_time', 17 => 'missing_out']);

        $this->assertSame($weekdays, $this->octoberStatuses($a));
        $this->assertSame($weekends, $this->octoberStatuses($b));
        $this->assertSame($withLogs, $this->octoberStatuses($c));
        $this->assertSame($weekdays, $this->octoberStatuses($d));
    }

    public function test_down_restores_the_old_storage(): void
    {
        $migration = require database_path(self::MIGRATION);
        $migration->down();
        $b = Employee::factory()->create();
        $c = Employee::factory()->create(['date_hired' => '2026-09-01']);
        DB::table('employees')->where('id', $b->id)->update(['work_days' => '0,6']);
        DB::table('employees')->where('id', $c->id)->update(['work_days' => '0,6']);
        $shift = json_encode(['effective_from' => '2026-10-17', 'start' => '07:00', 'end' => '16:00', 'two_punch' => false]);
        DB::table('settings')->insert(['key' => "employee_shift_{$c->id}", 'value' => $shift]);

        $migration->up();
        $migration->down();

        $this->assertSame(0, DB::table('employee_schedules')->count());
        $this->assertSame('0,6', DB::table('employees')->where('id', $b->id)->value('work_days'));
        $this->assertSame('0,6', DB::table('employees')->where('id', $c->id)->value('work_days'));
        $this->assertSame(json_decode($shift, true), json_decode((string) DB::table('settings')->where('key', "employee_shift_{$c->id}")->value('value'), true));
        $this->assertSame(1, DB::table('settings')->where('key', 'like', 'employee_shift_%')->count());
    }

    /** @return array<int, string> */
    private function octoberStatuses(Employee $employee): array
    {
        $logs = DtrLog::where('employee_id', $employee->id)->get()->keyBy(fn (DtrLog $log): string => $log->date->toDateString());

        return collect(CarbonPeriod::create('2026-10-01', '2026-10-23'))
            ->map(fn (Carbon $day): string => $logs->get($day->toDateString())?->displayStatus() ?? DtrLog::fallbackStatus($employee->id, $day))
            ->all();
    }
}
