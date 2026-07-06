<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function index(): Response {
        $totalEmployees  = Employee::where('role', 'employee')->count();
        $activeEmployees = Employee::where('role', 'employee')
            ->where('status', 'active')
            ->count();

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total_employees'  => $totalEmployees,
                'active_employees' => $activeEmployees,
            ],
        ]);
    }
}
