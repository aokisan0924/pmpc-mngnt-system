<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('holidays', function (Blueprint $table): void {
            $table->id();
            $table->date('date')->unique();
            $table->string('name', 100);
            $table->string('type', 20);
            $table->timestamps();
        });

        Schema::table('employees', function (Blueprint $table): void {
            $table->boolean('auto_present_weekdays')->default(false);
        });

        Schema::table('payroll_items', function (Blueprint $table): void {
            $table->decimal('holiday_pay', 12, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('payroll_items', fn (Blueprint $table) => $table->dropColumn('holiday_pay'));
        Schema::table('employees', fn (Blueprint $table) => $table->dropColumn('auto_present_weekdays'));
        Schema::dropIfExists('holidays');
    }
};
