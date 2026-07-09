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
            $table->renameColumn('cc_deduction', 'capital_contribution_deduction');
        });

        Schema::table('payroll_items', function (Blueprint $table) {
            $table->renameColumn('cc_deduction', 'capital_contribution_deduction');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->renameColumn('capital_contribution_deduction', 'cc_deduction');
        });

        Schema::table('payroll_items', function (Blueprint $table) {
            $table->renameColumn('capital_contribution_deduction', 'cc_deduction');
        });
    }
};
