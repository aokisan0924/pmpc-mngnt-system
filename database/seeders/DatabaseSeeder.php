<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\EmployeeGovernmentId;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = Employee::create([
            'employee_id' => '2023-00010',
            'first_name'  => 'Jeffrae',
            'last_name'   => 'Sapla',
            'email'       => 'jeffraesapla24@gmail.com',
            'password'    => Hash::make('admin123'),
            'role'        => 'super_admin',
            'department'  => 'IT Department',
            'position'    => 'IT Specialist',
            'status'      => 'active',
        ]);

        $employee = Employee::create([
            'employee_id' => '2026-00028',
            'first_name'  => 'Diana',
            'last_name'   => 'Pasco',
            'email'       => 'dianabpasco@gmail.com',
            'password'    => Hash::make('employee28'),
            'role'        => 'employee',
            'department'  => 'Operations',
            'position'    => 'Loan Processor',
            'date_hired'  => '2026-06-01',
            'status'      => 'active',
        ]);

        EmployeeGovernmentId::create([
            'employee_id'   => $employee->id,
            'sss_no'        => null,
            'philhealth_no' => null,
            'tin_no'        => null,
            'pagibig_no'    => null,
        ]);
    }
}
