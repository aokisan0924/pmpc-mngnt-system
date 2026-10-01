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
            $table->string('signature_path')->nullable();
            $table->timestamp('signature_uploaded_at')->nullable();
        });
        Schema::table('payroll_items', function (Blueprint $table): void {
            $table->decimal('basic_before_absence', 12, 2)->nullable();
            $table->decimal('absence_deduction', 12, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('payroll_items', fn (Blueprint $table) => $table->dropColumn(['basic_before_absence', 'absence_deduction']));
        Schema::table('employees', fn (Blueprint $table) => $table->dropColumn(['signature_path', 'signature_uploaded_at']));
    }
};
