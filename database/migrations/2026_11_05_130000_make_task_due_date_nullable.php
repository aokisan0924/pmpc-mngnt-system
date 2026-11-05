<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tasks may have no due date (ongoing work).
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->date('due_date')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (DB::table('tasks')->whereNull('due_date')->exists()) {
            throw new RuntimeException('Give every task a due date before rolling this migration back.');
        }

        Schema::table('tasks', function (Blueprint $table) {
            $table->date('due_date')->nullable(false)->change();
        });
    }
};
