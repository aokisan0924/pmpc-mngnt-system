<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Holiday;
use App\Services\PayrollCutoffPeriod;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollCutoffPeriodTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Holiday::create(['date' => '2026-11-02', 'name' => "All Soul's Day", 'type' => 'special']);
    }

    public function test_november_first_cutoff_keeps_holiday_and_skips_weekend(): void
    {
        $period = PayrollCutoffPeriod::suggest('2026-11', 'first');

        $this->assertSame('2026-11-02', $period['from']->toDateString());
        $this->assertSame('2026-11-13', $period['to']->toDateString());
    }

    public function test_second_cutoff_ends_on_last_weekday(): void
    {
        $period = PayrollCutoffPeriod::suggest('2026-10', 'second');

        $this->assertSame('2026-10-16', $period['from']->toDateString());
        $this->assertSame('2026-10-30', $period['to']->toDateString());
    }

    public function test_window_starts_after_previous_cutoff(): void
    {
        $this->assertSame('2026-10-31', PayrollCutoffPeriod::window('2026-11', 'first', Carbon::parse('2026-11-13'))['from']->toDateString());
        $this->assertSame('2026-11-14', PayrollCutoffPeriod::window('2026-11', 'second', Carbon::parse('2026-11-30'))['from']->toDateString());
        $this->assertSame('2026-11-13', PayrollCutoffPeriod::window('2026-11', 'first', Carbon::parse('2026-11-13'))['to']->toDateString());
        // January's previous cutoff is December of the year before (Dec 31 2025 is a Wednesday).
        $this->assertSame('2026-01-01', PayrollCutoffPeriod::window('2026-01', 'first', Carbon::parse('2026-01-15'))['from']->toDateString());
    }

    public function test_within_half_rejects_dates_outside_or_reversed(): void
    {
        $this->assertTrue(PayrollCutoffPeriod::withinHalf(Carbon::parse('2026-11-03'), Carbon::parse('2026-11-13'), '2026-11', 'first'));
        $this->assertFalse(PayrollCutoffPeriod::withinHalf(Carbon::parse('2026-11-03'), Carbon::parse('2026-11-16'), '2026-11', 'first'));
        $this->assertFalse(PayrollCutoffPeriod::withinHalf(Carbon::parse('2026-11-13'), Carbon::parse('2026-11-03'), '2026-11', 'first'));
        $this->assertTrue(PayrollCutoffPeriod::withinHalf(Carbon::parse('2026-11-16'), Carbon::parse('2026-11-30'), '2026-11', 'second'));
    }

    public function test_can_save_only_after_last_day(): void
    {
        $this->assertFalse(PayrollCutoffPeriod::canSaveOn(Carbon::parse('2026-11-13'), Carbon::parse('2026-11-13 18:00')));
        $this->assertTrue(PayrollCutoffPeriod::canSaveOn(Carbon::parse('2026-11-13'), Carbon::parse('2026-11-14 00:00')));
    }
}
