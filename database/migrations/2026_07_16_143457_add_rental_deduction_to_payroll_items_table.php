<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `rental_deduction` was added to payroll_items in two earlier migrations
     * (2026_07_07_163815 and 2026_07_07_205642), but
     * 2026_07_08_085240_recreate_payroll_items_table.php dropped and
     * recreated the table without it. PayrollItem::computeTotals() never
     * stopped writing to this column, so every payroll save has been
     * failing with "Unknown column 'rental_deduction'" since that recreate
     * migration ran. This restores it.
     */
    public function up(): void
    {
        Schema::table('payroll_items', function (Blueprint $table) {
            if (! Schema::hasColumn('payroll_items', 'rental_deduction')) {
                $table->decimal('rental_deduction', 10, 2)->default(0)->after('cash_advance_deduction');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payroll_items', function (Blueprint $table) {
            if (Schema::hasColumn('payroll_items', 'rental_deduction')) {
                $table->dropColumn('rental_deduction');
            }
        });
    }
};
