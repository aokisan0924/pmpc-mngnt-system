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
        Schema::table('employees', function (Blueprint $table) {
            // Remove old single allowance, add specific allowances
            $table->dropColumn('allowance');

            $table->decimal('transpo_allowance', 10, 2)->default(0)->after('daily_rate');
            $table->decimal('rep_allowance', 10, 2)->default(0)->after('transpo_allowance');
            $table->decimal('quarterly_allowance', 10, 2)->default(0)->after('rep_allowance');

            // Additional deductions
            $table->decimal('loan_deduction', 10, 2)->default(0)->after('tax_deduction');
            $table->decimal('cc_deduction', 10, 2)->default(0)->after('loan_deduction');
            $table->decimal('cash_advance_deduction', 10, 2)->default(0)->after('cc_deduction');
            $table->decimal('rental_deduction', 10, 2)->default(0)->after('cash_advance_deduction');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'transpo_allowance',
                'rep_allowance',
                'quarterly_allowance',
                'loan_deduction',
                'cc_deduction',
                'cash_advance_deduction',
                'rental_deduction',
            ]);
            $table->decimal('allowance', 10, 2)->default(0)->after('daily_rate');
        });
    }
};
