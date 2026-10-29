<?php

use App\Http\Controllers\Integrations\AttendanceController;
use App\Http\Middleware\AuthenticateGenmdseIntegration;
use Illuminate\Support\Facades\Route;

Route::prefix('integrations/genmdse/v1')
    ->middleware(AuthenticateGenmdseIntegration::class)
    ->whereNumber('employee')
    ->group(function (): void {
        Route::get('/employees/{employee}/attendance', [AttendanceController::class, 'show']);
        Route::post('/employees/{employee}/punch', [AttendanceController::class, 'punch']);
    });
