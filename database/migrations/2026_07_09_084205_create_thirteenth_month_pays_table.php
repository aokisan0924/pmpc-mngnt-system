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
        Schema::create('thirteenth_month_pays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->year('year');
            $table->enum('tranche', ['mid_year', 'year_end']);
            $table->date('period_from');
            $table->date('period_to');
            $table->integer('days_present')->default(0);
            $table->decimal('daily_rate', 10, 2)->default(0);
            $table->decimal('total_basic_pay', 12, 2)->default(0);
            $table->decimal('thirteenth_month_pay', 12, 2)->default(0);
            $table->enum('status', ['draft', 'finalized'])->default('draft');
            $table->foreignId('processed_by')->constrained('employees')->cascadeOnDelete();
            $table->timestamp('finalized_at')->nullable();
            $table->timestamps();

            $table->unique(['employee_id', 'year', 'tranche']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('thirteenth_month_pays');
    }
};
