<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A task can belong to an office instead of one employee: employee_id is
     * null and everyone in that office sees it.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->unsignedBigInteger('employee_id')->nullable()->change();
            $table->string('office', 30)->nullable()->after('employee_id');
        });
    }

    public function down(): void
    {
        if (DB::table('tasks')->whereNull('employee_id')->exists()) {
            throw new RuntimeException('Delete or reassign the office-wide tasks before rolling this migration back.');
        }

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('office');
            $table->unsignedBigInteger('employee_id')->nullable(false)->change();
        });
    }
};
