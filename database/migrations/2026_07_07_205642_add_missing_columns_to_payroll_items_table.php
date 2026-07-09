<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payroll_items', function (Blueprint $table) {
            $table->decimal('days_absent', 5, 2)->default(0)->after('days_present');
            $table->decimal('savings_deduction', 10, 2)->default(0)->after('rental_deduction');
            $table->decimal('share_capital_deduction', 10, 2)->default(0)->after('savings_deduction');
            $table->string('ot_type')->default('weekday')->after('hours_rendered');
            $table->decimal('ot_hours', 5, 2)->default(0)->after('ot_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payroll_items', function (Blueprint $table) {
            $table->dropColumn([
                'days_absent',
                'rental_deduction',
                'savings_deduction',
                'share_capital_deduction',
                'ot_type',
                'ot_hours',
            ]);
        });
    }
};
