<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Payroll;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

class PayrollSchemaTest extends TestCase
{
    use RefreshDatabase;

    private function migration(): object
    {
        return require database_path('migrations/2026_11_13_000001_add_payroll_month_and_hours_snapshots.php');
    }

    private function insertRaw(string $from, string $cutoff): void
    {
        DB::table('payrolls')->insert(['period_label' => 'x', 'period_from' => $from, 'period_to' => $from, 'cutoff' => $cutoff, 'status' => 'draft', 'created_by' => Employee::factory()->create()->id, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_period_month_is_filled_from_the_start_date(): void
    {
        $payroll = Payroll::factory()->create(['period_from' => '2026-11-02', 'period_to' => '2026-11-13']);

        $this->assertSame('2026-11', $payroll->fresh()->period_month);
    }

    public function test_second_batch_for_same_month_and_cutoff_is_rejected_by_database(): void
    {
        Payroll::factory()->create(['period_from' => '2026-11-02', 'period_to' => '2026-11-13']);

        $this->expectException(QueryException::class);
        Payroll::factory()->create(['period_from' => '2026-11-03', 'period_to' => '2026-11-13']);
    }

    public function test_migration_refuses_existing_duplicates(): void
    {
        $this->migration()->down();
        $this->insertRaw('2026-11-02', 'first');
        $this->insertRaw('2026-11-03', 'first');

        try {
            $this->migration()->up();
            $this->fail('Expected duplicate batches to stop the migration.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('2026-11 first', $exception->getMessage());
        }
        $this->assertFalse(Schema::hasColumn('payrolls', 'period_month'));
    }

    public function test_migration_rolls_back_and_reapplies(): void
    {
        $this->migration()->down();
        $this->assertFalse(Schema::hasColumn('payroll_items', 'paid_hours'));
        $this->insertRaw('2026-10-16', 'second');

        $this->migration()->up();

        $this->assertSame('2026-10', DB::table('payrolls')->value('period_month'));
        $this->assertTrue(Schema::hasColumn('payroll_items', 'day_resolutions'));
    }
}
