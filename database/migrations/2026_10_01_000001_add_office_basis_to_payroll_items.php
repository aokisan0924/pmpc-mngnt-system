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
            // Null identifies historical attendance-based items. Never backfill old payrolls.
            $table->string('payroll_office', 30)->nullable();
            $table->decimal('paid_days_basis', 6, 2)->nullable();
            $table->decimal('absence_days', 6, 2)->default(0);
            $table->decimal('tardiness_deduction', 12, 4)->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('payroll_items', function (Blueprint $table): void {
            $table->dropColumn(['payroll_office', 'paid_days_basis', 'absence_days', 'tardiness_deduction']);
        });
    }
};
