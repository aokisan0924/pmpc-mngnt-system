<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dues', function (Blueprint $table) {
            $table->id();
            $table->string('title', 200);
            $table->text('notes')->nullable();
            $table->string('office', 32)->nullable();
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('frequency', 16); // monthly | once
            $table->unsignedTinyInteger('day_of_month')->nullable();
            $table->boolean('last_day_of_month')->default(false);
            $table->date('due_on')->nullable();
            $table->boolean('active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('employees')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('due_occurrences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('due_id')->constrained('dues')->cascadeOnDelete();
            $table->date('due_date');
            $table->decimal('amount', 12, 2)->nullable();
            $table->date('paid_at')->nullable();
            $table->decimal('paid_amount', 12, 2)->nullable();
            $table->string('paid_note', 200)->nullable();
            $table->foreignId('paid_by')->nullable()->constrained('employees')->nullOnDelete();
            $table->timestamps();
            $table->unique(['due_id', 'due_date']);
        });
    }

    public function down(): void
    {
        // Dropping the tables takes their foreign keys and indexes with them (no lone index drops).
        Schema::dropIfExists('due_occurrences');
        Schema::dropIfExists('dues');
    }
};
