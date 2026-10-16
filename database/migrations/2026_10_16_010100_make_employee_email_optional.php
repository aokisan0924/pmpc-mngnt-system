<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (DB::table('employees')->whereNull('email')->exists()) {
            throw new RuntimeException('Supply real email addresses for employee-ID accounts before restoring required email.');
        }
        Schema::table('employees', function (Blueprint $table) {
            $table->string('email')->nullable(false)->change();
        });
    }
};
