<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `role` controls portal access (employee vs super_admin) and should stay
     * that way for auth/middleware purposes. But several places in the app
     * used `role = 'employee'` as a proxy for "is this person a paid staff
     * member with DTR/payroll records" — which silently excludes a
     * super_admin who is also a real staff member (e.g. clocks in, gets
     * paid, appears in employee records).
     *
     * `is_staff` decouples the two concerns: it answers "should this person
     * appear in the employee list / DTR / payroll / 13th month / dashboard
     * stats", independent of their portal role.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->boolean('is_staff')->default(true)->after('role');
        });
    }
    
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('is_staff');
        });
    }
};
