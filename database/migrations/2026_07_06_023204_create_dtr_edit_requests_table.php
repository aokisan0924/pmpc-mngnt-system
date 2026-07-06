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
        Schema::create('dtr_edit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dtr_log_id')->constrained('dtr_logs')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->time('original_am_time_in')->nullable();
            $table->time('original_am_time_out')->nullable();
            $table->time('original_pm_time_in')->nullable();
            $table->time('original_pm_time_out')->nullable();
            $table->time('requested_am_time_in')->nullable();
            $table->time('requested_am_time_out')->nullable();
            $table->time('requested_pm_time_in')->nullable();
            $table->time('requested_pm_time_out')->nullable();
            $table->text('reason');
            $table->enum('status', ['pending', 'approved', 'declined'])->default('pending');
            $table->text('admin_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('employees')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dtr_edit_requests');
    }
};
