<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The people on a shared task (and on the repeat rule behind it). No id column, so eager loads that
     * select employees.id never meet an ambiguous id.
     */
    public function up(): void
    {
        Schema::create('task_assignees', function (Blueprint $table) {
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->primary(['task_id', 'employee_id']);
        });

        Schema::create('recurring_task_assignees', function (Blueprint $table) {
            $table->foreignId('recurring_task_id')->constrained('recurring_tasks')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->primary(['recurring_task_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        if (DB::table('task_assignees')->exists()) {
            throw new RuntimeException('Delete the shared tasks before rolling this migration back.');
        }

        // Whole tables, not a lone index: MariaDB backs each foreign key with the primary key.
        Schema::dropIfExists('recurring_task_assignees');
        Schema::dropIfExists('task_assignees');
    }
};
