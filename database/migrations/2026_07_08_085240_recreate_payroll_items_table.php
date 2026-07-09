<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('payroll_items');

        Schema::create('payroll_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_id')->constrained('payrolls')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();

            // Cutoff info
            $table->enum('cutoff', ['first', 'second']);
            $table->integer('days_present')->default(0);

            // Gross components (per cutoff)
            $table->decimal('cutoff_basic', 10, 2)->default(0);       // monthly_basic / 2
            $table->decimal('cutoff_transpo', 10, 2)->default(0);     // monthly_transpo / 2
            $table->decimal('cutoff_rep', 10, 2)->default(0);         // monthly_rep / 2
            $table->decimal('cutoff_quarterly', 10, 2)->default(0);   // monthly_quarterly / 2
            $table->decimal('cutoff_gross', 10, 2)->default(0);       // sum of above

            // OT
            $table->decimal('weekday_ot_hours', 5, 2)->default(0);
            $table->decimal('weekday_ot_pay', 10, 2)->default(0);
            $table->decimal('weekend_ot_hours', 5, 2)->default(0);
            $table->decimal('weekend_ot_pay', 10, 2)->default(0);
            $table->decimal('total_ot_pay', 10, 2)->default(0);

            // Total gross (cutoff_gross + OT)
            $table->decimal('gross_pay', 10, 2)->default(0);

            // Deductions — govt (1st cutoff only, 0 on 2nd)
            $table->decimal('sss_deduction', 10, 2)->default(0);
            $table->decimal('philhealth_deduction', 10, 2)->default(0);
            $table->decimal('pagibig_deduction', 10, 2)->default(0);
            $table->decimal('tax_deduction', 10, 2)->default(0);

            // Deductions — split (half each cutoff)
            $table->decimal('loan_deduction', 10, 2)->default(0);
            $table->decimal('cc_deduction', 10, 2)->default(0);
            $table->decimal('cash_advance_deduction', 10, 2)->default(0);
            $table->decimal('savings_deduction', 10, 2)->default(0);
            $table->decimal('share_capital_deduction', 10, 2)->default(0);
            $table->decimal('other_deductions', 10, 2)->default(0);

            $table->decimal('total_deductions', 10, 2)->default(0);
            $table->decimal('net_pay', 10, 2)->default(0);

            $table->unique(['payroll_id', 'employee_id', 'cutoff']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_items');
    }
};