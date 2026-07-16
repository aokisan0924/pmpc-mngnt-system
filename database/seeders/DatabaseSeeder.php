<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\EmployeeGovernmentId;
use App\Models\DtrLog;
use App\Models\Setting;
use App\Models\User;
use Carbon\Carbon;
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
            'is_staff'    => true,
            'department'  => 'IT Department',
            'position'    => 'IT Specialist',
            'status'      => 'active',
        ]);

        EmployeeGovernmentId::create([
            'employee_id'   => $admin->id,
            'sss_no'        => null,
            'philhealth_no' => null,
            'tin_no'        => null,
            'pagibig_no'    => null,
        ]);

        $this->seedFullOnTimeDtr($admin, '2026-07-01', '2026-07-15');

        $employee = Employee::create([
            'employee_id' => '2026-00028',
            'first_name'  => 'Diana',
            'last_name'   => 'Pasco',
            'email'       => 'dianabpasco@gmail.com',
            'password'    => Hash::make('employee28'),
            'role'        => 'employee',
            'is_staff'    => true,
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

        // Seed default settings
        foreach (Setting::defaults() as $key => $value) {
            Setting::set($key, $value);
        }

        // Must run after Jeffrae/Diana above — this seeder uses firstOrCreate()
        // and will safely reuse Diana's record (same employee_id) rather than
        // conflict with it, but only in this order.
        $this->call(PmpcEmployeeDataSeeder::class);
    }

    /**
     * Full, on-time attendance (weekdays only) for a given date range —
     * used for payroll testing so gross/net pay math isn't muddied by
     * missing DTR data.
     */
    private function seedFullOnTimeDtr(Employee $employee, string $from, string $to): void
    {
        $start = Carbon::parse($from);
        $end   = Carbon::parse($to);

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if ($date->isWeekend()) {
                continue;
            }

            $log = DtrLog::firstOrNew([
                'employee_id' => $employee->id,
                'date'        => $date->format('Y-m-d'),
            ]);

            $log->am_time_in  = '08:00:00';
            $log->am_time_out = '12:00:00';
            $log->pm_time_in  = '13:00:00';
            $log->pm_time_out = '17:00:00';

            $log->computeHoursAndStatus();
            $log->save();
        }
    }
}