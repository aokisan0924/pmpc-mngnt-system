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
            // Part of absence_deduction that comes from unworked holidays (NPW-HOLIDAY column).
            $table->decimal('nwnp_deduction', 12, 2)->nullable()->after('absence_deduction');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_items', fn (Blueprint $table) => $table->dropColumn('nwnp_deduction'));
    }
};
