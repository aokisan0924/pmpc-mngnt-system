<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payroll_items', function (Blueprint $table): void {
            // Differences from a gross or net HR typed on step 3 (an amount agreed with the employee), shown openly.
            $table->decimal('earnings_adjustment', 12, 2)->default(0)->after('worked_holiday_pay');
            $table->decimal('deductions_adjustment', 12, 2)->default(0)->after('electricity_deduction');
            $table->string('adjustment_note', 255)->nullable()->after('holiday_hours');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_items', fn (Blueprint $table) => $table->dropColumn(['earnings_adjustment', 'deductions_adjustment', 'adjustment_note']));
    }
};
