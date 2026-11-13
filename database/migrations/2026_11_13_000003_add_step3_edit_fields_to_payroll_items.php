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
            // Typed on step 3 every cutoff; never on the employee record.
            $table->decimal('electricity_deduction', 12, 2)->default(0)->after('rental_deduction');
            // DOLE pay for work done on holidays, on top of basic pay.
            $table->decimal('worked_holiday_pay', 12, 2)->default(0)->after('holiday_pay');
            // Numbers HR typed over the system's on step 3, and hours worked on holidays without punches.
            $table->json('overrides')->nullable()->after('day_resolutions');
            $table->json('holiday_hours')->nullable()->after('overrides');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_items', fn (Blueprint $table) => $table->dropColumn(['electricity_deduction', 'worked_holiday_pay', 'overrides', 'holiday_hours']));
    }
};
