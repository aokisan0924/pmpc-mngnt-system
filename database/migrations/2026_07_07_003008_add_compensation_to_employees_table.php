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
            // Basic pay
            $table->decimal('daily_rate', 10, 2)->default(0)->after('date_hired');

            // Allowances
            $table->decimal('allowance', 10, 2)->default(0)->after('daily_rate');

            // Government deductions
            $table->decimal('sss_deduction', 10, 2)->default(0)->after('allowance');
            $table->decimal('philhealth_deduction', 10, 2)->default(0)->after('sss_deduction');
            $table->decimal('pagibig_deduction', 10, 2)->default(0)->after('philhealth_deduction');
            $table->decimal('tax_deduction', 10, 2)->default(0)->after('pagibig_deduction');

            // Other deductions
            $table->decimal('savings_deduction', 10, 2)->default(0)->after('tax_deduction');
            $table->decimal('share_capital_deduction', 10, 2)->default(0)->after('savings_deduction');
            $table->decimal('other_deductions', 10, 2)->default(0)->after('share_capital_deduction');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'daily_rate',
                'allowance',
                'sss_deduction',
                'philhealth_deduction',
                'pagibig_deduction',
                'tax_deduction',
                'savings_deduction',
                'share_capital_deduction',
                'other_deductions',
            ]);
        });
    }
};
