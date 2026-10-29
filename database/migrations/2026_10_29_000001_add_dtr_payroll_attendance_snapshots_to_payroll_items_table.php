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
            $table->decimal('default_paid_days_basis', 6, 2)->nullable();
            $table->decimal('dtr_absence_days', 6, 2)->nullable();
            $table->decimal('dtr_tardiness_minutes', 7, 1)->nullable();
            $table->json('dtr_unresolved_dates')->nullable();
            $table->text('attendance_override_reason')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('payroll_items', function (Blueprint $table): void {
            $table->dropColumn([
                'default_paid_days_basis',
                'dtr_absence_days',
                'dtr_tardiness_minutes',
                'dtr_unresolved_dates',
                'attendance_override_reason',
            ]);
        });
    }
};
