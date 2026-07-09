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
            $table->dropColumn('share_capital_deduction');
        });

        Schema::table('payroll_items', function (Blueprint $table) {
            $table->dropColumn('share_capital_deduction');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->decimal('share_capital_deduction', 10, 2)->default(0);
        });

        Schema::table('payroll_items', function (Blueprint $table) {
            $table->decimal('share_capital_deduction', 10, 2)->default(0);
        });
    }
};
