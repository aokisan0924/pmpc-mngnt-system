<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\EmployeeDashboardController;
use App\Http\Controllers\EmployeeProfileController;
use App\Http\Controllers\DtrController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminDtrController;
use App\Http\Controllers\Admin\DtrEditRequestController;
use App\Http\Controllers\Admin\EmployeeController;
use App\Http\Controllers\Admin\PayrollAnalyticsController;
use App\Http\Controllers\Admin\PayrollController;
use App\Http\Controllers\DtrPrintController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\ThirteenthMonthController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PayslipController;
use Illuminate\Support\Facades\Route;

// ── Auth ──────────────────────────────────────────────────

Route::middleware('guest')->group(function () {
    Route::get('/',      [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::get('/login', [AuthenticatedSessionController::class, 'create']);
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('login.store');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
});

// ── Employee portal ───────────────────────────────────────

Route::middleware(['auth', 'role:employee'])
    ->prefix('employee')
    ->name('employee.')
    ->group(function () {
        // Dashboard
        Route::get('/dashboard', [EmployeeDashboardController::class, 'index'])->name('dashboard');

        // DTR
        Route::get('/dtr',   [DtrController::class, 'index'])->name('dtr');
        Route::post('/dtr/punch', [DtrController::class, 'punch'])->name('dtr.punch');
        Route::post('/dtr/{dtrLog}/edit-request', [DtrController::class, 'requestEdit'])->name('dtr.edit-request');

        // Profile
        Route::get('/profile',          [EmployeeProfileController::class, 'index'])->name('profile');
        Route::patch('/profile/info',   [EmployeeProfileController::class, 'updateInfo'])->name('profile.info');
        Route::patch('/profile/gov-ids',[EmployeeProfileController::class, 'updateGovIds'])->name('profile.gov-ids');
        Route::patch('/profile/password',[EmployeeProfileController::class, 'updatePassword'])->name('profile.password');

        // Task planner
        Route::get('/planner',                [TaskController::class, 'index'])->name('planner');
        Route::post('/planner',               [TaskController::class, 'store'])->name('planner.store');
        Route::patch('/planner/{task}',       [TaskController::class, 'update'])->name('planner.update');
        Route::patch('/planner/{task}/toggle',[TaskController::class, 'toggleDone'])->name('planner.toggle');
        Route::delete('/planner/{task}',      [TaskController::class, 'destroy'])->name('planner.destroy');

        // DTR print
        Route::get('/dtr/print', [DtrPrintController::class, 'employeePrint'])->name('dtr.print');

        // Notifications
        Route::get('/notifications',                          [NotificationController::class, 'index'])->name('notifications');
        Route::patch('/notifications/{notification}/read',    [NotificationController::class, 'markRead'])->name('notifications.read');
        Route::post('/notifications/read-all',                [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
        Route::delete('/notifications/{notification}',        [NotificationController::class, 'destroy'])->name('notifications.destroy');
    
        // Payslips
        Route::get('/payslips',              [PayslipController::class, 'index'])->name('payslips');
        Route::get('/payslips/history',      [PayslipController::class, 'index'])->name('payslips.history');
        Route::get('/payslips/{month}',      [PayslipController::class, 'download'])->name('payslips.download')
            ->where('month', '\d{4}-\d{2}'); // only match YYYY-MM format
    });

// ── Admin portal ──────────────────────────────────────────

Route::middleware(['auth', 'role:super_admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/dashboard',     [AdminDashboardController::class, 'index'])->name('dashboard');
        Route::get('/edit-requests', [DtrEditRequestController::class, 'index'])->name('edit-requests');
        Route::post('/edit-requests/{editRequest}/approve', [DtrEditRequestController::class, 'approve'])->name('edit-requests.approve');
        Route::post('/edit-requests/{editRequest}/decline', [DtrEditRequestController::class, 'decline'])->name('edit-requests.decline');
        
        // Employee management
        Route::get('/employees',                      [EmployeeController::class, 'index'])->name('employees');
        Route::post('/employees',                     [EmployeeController::class, 'store'])->name('employees.store');
        Route::get('/employees/{employee}',           [EmployeeController::class, 'show'])->name('employees.show');
        Route::patch('/employees/{employee}',         [EmployeeController::class, 'update'])->name('employees.update');
        Route::patch('/employees/{employee}/password',[EmployeeController::class, 'resetPassword'])->name('employees.password');
        Route::patch('/employees/{employee}/compensation', [EmployeeController::class, 'updateCompensation'])->name('employees.compensation');
        Route::get('/employees/{employee}/dtr/print', [DtrPrintController::class, 'adminPrint'])->name('employees.dtr.print');
        
        // Payroll
        Route::get('/payroll',                    [PayrollController::class, 'index'])->name('payroll');
        Route::get('/payroll/create',             [PayrollController::class, 'create'])->name('payroll.create');
        Route::get('/payroll/analytics', [PayrollAnalyticsController::class, 'index'])->name('payroll.analytics');
        Route::post('/payroll',                   [PayrollController::class, 'store'])->name('payroll.store');
        Route::get('/payroll/{payroll}',          [PayrollController::class, 'show'])->name('payroll.show');
        Route::post('/payroll/{payroll}/finalize',[PayrollController::class, 'finalize'])->name('payroll.finalize');
        

        // DTR management
        Route::get('/dtr/{employee}/print', [DtrPrintController::class, 'adminPrint'])->name('dtr.admin-print');
        Route::get('/dtr',                    [AdminDtrController::class, 'index'])->name('dtr');
        Route::get('/dtr/{employee}',         [AdminDtrController::class, 'show'])->name('dtr.show');

        // Settings
        Route::get('/settings',  [SettingsController::class, 'index'])->name('settings');
        Route::post('/settings', [SettingsController::class, 'update'])->name('settings.update');

        // 13th month pay
        Route::get('/thirteenth-month',         [ThirteenthMonthController::class, 'index'])->name('thirteenth-month');
        Route::get('/thirteenth-month/compute', [ThirteenthMonthController::class, 'compute'])->name('thirteenth-month.compute');
        Route::post('/thirteenth-month',        [ThirteenthMonthController::class, 'store'])->name('thirteenth-month.store');
        Route::get('/thirteenth-month/show',    [ThirteenthMonthController::class, 'show'])->name('thirteenth-month.show');
        Route::post('/thirteenth-month/finalize',[ThirteenthMonthController::class, 'finalize'])->name('thirteenth-month.finalize');
    
        // Payslips
        Route::get('/payslips/download-all',        [PayslipController::class, 'downloadAll'])->name('payslips.download-all');
    Route::get('/payslips/{employee}/download', [PayslipController::class, 'adminDownload'])->name('payslips.admin-download');
    });