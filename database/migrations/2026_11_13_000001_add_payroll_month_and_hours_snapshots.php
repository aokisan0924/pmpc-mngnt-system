<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payrolls', function (Blueprint $table): void {
            $table->char('period_month', 7)->nullable()->after('period_to');
        });
        DB::table('payrolls')->update(['period_month' => DB::raw('substr(period_from, 1, 7)')]);
        $duplicate = DB::table('payrolls')->select('period_month', 'cutoff')->groupBy('period_month', 'cutoff')->havingRaw('count(*) > 1')->first();
        if ($duplicate !== null) {
            Schema::table('payrolls', fn (Blueprint $table) => $table->dropColumn('period_month'));
            throw new RuntimeException("Duplicate payroll batches for {$duplicate->period_month} {$duplicate->cutoff}; resolve before migrating.");
        }
        Schema::table('payrolls', function (Blueprint $table): void {
            $table->char('period_month', 7)->nullable(false)->change();
            $table->unique(['period_month', 'cutoff']);
        });
        Schema::table('payroll_items', function (Blueprint $table): void {
            $table->decimal('paid_hours', 8, 2)->nullable();
            $table->decimal('scheduled_hours', 8, 2)->nullable();
            $table->json('day_resolutions')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('payroll_items', fn (Blueprint $table) => $table->dropColumn(['paid_hours', 'scheduled_hours', 'day_resolutions']));
        Schema::table('payrolls', function (Blueprint $table): void {
            $table->dropUnique(['period_month', 'cutoff']);
            $table->dropColumn('period_month');
        });
    }
};
