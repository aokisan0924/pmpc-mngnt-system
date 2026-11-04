<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Replace the pending/done enum with a plain string so tasks can also be
     * "doing". The allowed values are enforced by App\Models\Task::STATUSES.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('status', 20)->default('pending')->change();
        });
    }

    public function down(): void
    {
        DB::table('tasks')->where('status', 'doing')->update(['status' => 'pending']);

        Schema::table('tasks', function (Blueprint $table) {
            $table->enum('status', ['pending', 'done'])->default('pending')->change();
        });
    }
};
