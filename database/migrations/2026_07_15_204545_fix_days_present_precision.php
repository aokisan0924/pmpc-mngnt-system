<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The days_present columns were created as INTEGER, which silently
     * rounds half-day attendance (e.g. 10.5 -> 11) on save. This widens
     * them to DECIMAL(5,2) so half days are stored and displayed correctly.
     */
    public function up(): void {
        if (Schema::hasColumn('payroll_items', 'days_present')) {
            DB::statement('ALTER TABLE payroll_items MODIFY days_present DECIMAL(5,2) NOT NULL DEFAULT 0');
        }

        if (Schema::hasColumn('thirteenth_month_pays', 'days_present')) {
            DB::statement('ALTER TABLE thirteenth_month_pays MODIFY days_present DECIMAL(5,2) NOT NULL DEFAULT 0');
        }
    }

    public function down(): void {
        if (Schema::hasColumn('payroll_items', 'days_present')) {
            DB::statement('ALTER TABLE payroll_items MODIFY days_present INT NOT NULL DEFAULT 0');
        }

        if (Schema::hasColumn('thirteenth_month_pays', 'days_present')) {
            DB::statement('ALTER TABLE thirteenth_month_pays MODIFY days_present INT NOT NULL DEFAULT 0');
        }
    }
};