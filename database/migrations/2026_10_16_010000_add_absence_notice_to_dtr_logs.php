<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dtr_logs', function (Blueprint $table) {
            $table->text('absence_reason')->nullable();
            $table->timestamp('absence_cancelled_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('dtr_logs', function (Blueprint $table) {
            $table->dropColumn(['absence_reason', 'absence_cancelled_at']);
        });
    }
};
