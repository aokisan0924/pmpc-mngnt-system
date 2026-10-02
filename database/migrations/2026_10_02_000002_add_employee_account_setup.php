<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->string('middle_name', 100)->nullable();
            $table->string('name_suffix', 20)->nullable();
            $table->string('payroll_office', 30)->nullable();
            $table->timestamp('setup_completed_at')->nullable();
            $table->timestamp('office_verified_at')->nullable();
            $table->foreignId('office_verified_by')->nullable()->constrained('employees')->nullOnDelete();
        });
        Schema::create('account_setup_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->json('details');
            $table->string('status', 20)->default('pending');
            $table->text('review_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('employees')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['employee_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_setup_requests');
        Schema::table('employees', function (Blueprint $table): void {
            $table->dropForeign(['office_verified_by']);
            $table->dropColumn(['middle_name', 'name_suffix', 'payroll_office', 'setup_completed_at', 'office_verified_at', 'office_verified_by']);
        });
    }
};
