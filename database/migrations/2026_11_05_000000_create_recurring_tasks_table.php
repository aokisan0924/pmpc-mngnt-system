<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A repeat rule behind a series of tasks (bills, reminders). A daily job creates each copy as a normal task.
     */
    public function up(): void
    {
        Schema::create('recurring_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('employees');
            $table->foreignId('employee_id')->nullable()->constrained('employees')->cascadeOnDelete();
            $table->string('office', 30)->nullable();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->string('category', 100)->nullable();
            $table->string('priority', 10)->default('medium');
            $table->string('frequency', 10);
            $table->unsignedTinyInteger('day_of_week')->nullable();
            $table->unsignedTinyInteger('day_of_month')->nullable();
            $table->boolean('last_day_of_month')->default(false);
            $table->unsignedTinyInteger('month')->nullable();
            $table->unsignedSmallInteger('lead_days')->default(7);
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->boolean('active')->default(true);
            $table->date('last_due_date')->nullable();
            $table->timestamps();
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('recurring_task_id')->nullable()->after('assigned_by')
                ->constrained('recurring_tasks')->nullOnDelete();
            $table->unique(['recurring_task_id', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // MySQL backs the foreign key with the unique index, so the key must go first.
            $table->dropForeign(['recurring_task_id']);
            $table->dropUnique(['recurring_task_id', 'due_date']);
            $table->dropColumn('recurring_task_id');
        });

        Schema::dropIfExists('recurring_tasks');
    }
};
