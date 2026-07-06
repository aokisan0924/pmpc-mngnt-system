<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeDashboardController extends Controller
{
    public function index(Request $request): Response {
        $employee = $request->user();

        return Inertia::render('Employee/Dashboard', [
            'employee' => [
                'id'          => $employee->id,
                'employee_id' => $employee->employee_id,
                'first_name'  => $employee->first_name,
                'full_name'   => $employee->full_name,
                'initials'    => $employee->initials,
                'department'  => $employee->department,
                'position'    => $employee->position,
            ],
        ]);
    }
}
