<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\EmployeeDashboardController;
use App\Http\Controllers\EmployeeProfileController;
use App\Http\Controllers\DtrController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\DtrEditRequestController;
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
    });