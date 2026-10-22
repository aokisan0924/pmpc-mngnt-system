<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DtrPunchIntegrityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-10-22 09:00:00'));
    }

    /** @param  array<int, ?string>  $punches */
    private function log(array $punches, string $date = '2026-10-21'): DtrLog
    {
        $log = DtrLog::factory()->create([
            'employee_id' => Employee::factory()->create()->id,
            'date' => $date,
            ...array_combine(['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out'], $punches),
        ]);
        $log->computeHoursAndStatus();
        $log->save();

        return $log;
    }

    public function test_edit_request_times_must_be_in_order(): void
    {
        $log = $this->log(['07:50:00', '12:00:00', null, null], '2026-09-03');

        $this->actingAs($log->employee)->post(route('employee.dtr.edit-request', $log), [
            'requested_am_time_in' => '07:50',
            'requested_am_time_out' => '12:00',
            'requested_pm_time_in' => '01:00',
            'requested_pm_time_out' => '17:00',
            'reason' => 'Forgot afternoon punches',
        ])->assertSessionHasErrors('requested_pm_time_in');

        $this->actingAs($log->employee)->post(route('employee.dtr.edit-request', $log), [
            'requested_am_time_in' => '07:50',
            'requested_am_time_out' => '12:00',
            'requested_pm_time_in' => '13:00',
            'requested_pm_time_out' => '17:00',
            'reason' => 'Forgot afternoon punches',
        ])->assertSessionHasNoErrors();
    }

    public function test_tapped_through_pairs_do_not_count_as_worked(): void
    {
        // Arrived after lunch and tapped through the morning punches.
        $this->assertSame('half_day', $this->log(['12:31:21', '12:31:22', '12:31:24', '17:00:25'])->displayStatus());
        // Left at noon and tapped through the afternoon punches.
        $this->assertSame('half_day', $this->log(['07:56:59', '12:00:17', '12:00:21', '12:00:43'])->displayStatus());
        // Skipped lunch punches and tapped them at the end of the day: still a full day.
        $this->assertSame('on_time', $this->log(['07:52:16', '17:07:17', '17:07:19', '17:07:20'])->displayStatus());
        // A normal day with a quick lunch tap stays a full day.
        $this->assertSame('on_time', $this->log(['07:55:00', '12:00:10', '12:00:12', '17:00:00'])->displayStatus());
    }

    public function test_a_past_day_with_only_a_clock_in_is_flagged_missing_time_out(): void
    {
        $log = $this->log(['07:16:16', null, null, null], '2026-10-20');

        $this->assertSame('absent', $log->status);
        $this->assertSame('missing_out', $log->displayStatus());
        $this->assertSame('in_progress', $this->log(['07:16:16', null, null, null], '2026-10-22')->displayStatus());
    }

    public function test_recompute_command_lists_then_saves_only_status_changes(): void
    {
        $log = $this->log(['12:31:21', '12:31:22', '12:31:24', '17:00:25']);
        $log->update(['status' => 'late']);

        $this->artisan('dtr:recompute-status', ['--from' => '2026-10-01'])->assertSuccessful();
        $this->assertSame('late', $log->fresh()->status);

        $this->artisan('dtr:recompute-status', ['--from' => '2026-10-01', '--apply' => true])->assertSuccessful();
        $this->assertSame('half_day', $log->fresh()->status);
        $this->assertSame('17:00:25', $log->fresh()->pm_time_out);
    }
}
