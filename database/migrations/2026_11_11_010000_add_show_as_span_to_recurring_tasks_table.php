<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recurring_tasks', function (Blueprint $table): void {
            $table->boolean('show_as_span')->default(false)->after('lead_days');
        });
    }

    public function down(): void
    {
        Schema::table('recurring_tasks', function (Blueprint $table): void {
            $table->dropColumn('show_as_span');
        });
    }
};
