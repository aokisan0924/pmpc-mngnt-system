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
            $table->decimal('dtr_days_present', 5, 2)->nullable()->after('absence_days');
            $table->text('dtr_reconciliation_note')->nullable()->after('dtr_days_present');
        });

        Schema::table('payrolls', function (Blueprint $table): void {
            $table->foreignId('finalized_by')->nullable()->after('created_by')
                ->constrained('employees')->nullOnDelete();
            $table->timestamp('finalized_at')->nullable()->after('finalized_by');
        });

        Schema::table('thirteenth_month_pays', function (Blueprint $table): void {
            $table->foreignId('finalized_by')->nullable()->after('finalized_at')
                ->constrained('employees')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('thirteenth_month_pays', function (Blueprint $table): void {
            $table->dropForeign(['finalized_by']);
            $table->dropColumn('finalized_by');
        });

        Schema::table('payrolls', function (Blueprint $table): void {
            $table->dropForeign(['finalized_by']);
            $table->dropColumn(['finalized_by', 'finalized_at']);
        });

        Schema::table('payroll_items', function (Blueprint $table): void {
            $table->dropColumn(['dtr_days_present', 'dtr_reconciliation_note']);
        });
    }
};
