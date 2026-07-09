<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Auto-zip DTR at midnight on the 1st of every month (archives previous month)
Schedule::command('dtr:archive')->monthlyOn(1, '00:00');
