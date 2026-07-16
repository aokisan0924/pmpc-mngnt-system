<?php

namespace Database\Seeders;

use App\Models\DtrLog;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PmpcEmployeeDataSeeder extends Seeder
{
    /**
     * Migrated from the legacy `users_tbl` table (users_tbl.sql).
     *
     * NOTE — fields not present in the legacy table (department, role,
     * daily_rate, date_hired) are filled with placeholder/inferred values
     * below. Review before running real payroll:
     *   - `daily_rate` is seeded as 0 for everyone — payroll math will be
     *     wrong until real rates are entered.
     *   - `role` is seeded as 'employee' for everyone — manually set
     *     whichever accounts need 'super_admin' access.
     *
     * Passwords: the legacy MD5 hashes are NOT reused (MD5 is insecure and
     * incompatible with Laravel's bcrypt Hash::check). Every seeded account
     * gets the temporary password below via Hash::make() — force a reset
     * before real use.
     */
    private const TEMP_PASSWORD = 'Password123!';

    public function run(): void
    {
        $hashedPassword = Hash::make(self::TEMP_PASSWORD);

        $employees = [
            [
                'employee_id' => '2003-00001',
                'first_name'  => 'Alexander L.',
                'last_name'   => 'Feria',
                'email'       => 'alferia67@gmail.com',
                'phone'       => '09054567475',
                'position'    => 'President',
                'department'  => 'Executive',
            ],
            [
                'employee_id' => '2022-00003',
                'first_name'  => 'Alexander A.',
                'last_name'   => 'Feria Jr.',
                'email'       => 'xanderferia018@gmail.com',
                'phone'       => '09552853668',
                'position'    => 'Operations',
                'department'  => 'Operations',
            ],
            [
                'employee_id' => '2025-00023',
                'first_name'  => 'Michaela',
                'last_name'   => 'Mauanay',
                'email'       => 'mauanay2003@gmail.com',
                'phone'       => null,
                'position'    => 'Accounting Clerk',
                'department'  => 'Accounting',
            ],
            [
                'employee_id' => '2026-00025',
                'first_name'  => 'Yvonne N.',
                'last_name'   => 'Condo',
                'email'       => 'yvonnecondo1@gmail.com',
                'phone'       => null,
                'position'    => 'Loan Processor/Cashier',
                'department'  => 'Finance',
            ],
            [
                'employee_id' => '2026-00026',
                'first_name'  => 'Jerome A.',
                'last_name'   => 'Santos',
                'email'       => 'jeromesantos1923@gmail.com',
                'phone'       => null,
                'position'    => 'Bookkeeper',
                'department'  => 'Accounting',
            ],
            [
                'employee_id' => '2026-00027',
                'first_name'  => 'Mariel S.',
                'last_name'   => 'Lucero',
                'email'       => 'marielluceros21@gmail.com',
                'phone'       => null,
                'position'    => 'Bookkeeper',
                'department'  => 'Accounting',
            ],
            [
                'employee_id' => '2026-00028',
                'first_name'  => 'Diana B.',
                'last_name'   => 'Pasco',
                'email'       => 'dianabpasco@gmail.com',
                'phone'       => null,
                'position'    => 'Loan Processor/Cashier',
                'department'  => 'Finance',
            ],
        ];

        $records = [];

        foreach ($employees as $data) {
            $records[$data['employee_id']] = Employee::firstOrCreate(
                ['employee_id' => $data['employee_id']],
                [
                    'first_name' => $data['first_name'],
                    'last_name'  => $data['last_name'],
                    'email'      => $data['email'],
                    'phone'      => $data['phone'],
                    'position'   => $data['position'],
                    'department' => $data['department'],
                    'role'       => 'employee', // adjust manually for admin accounts
                    'status'     => 'active',
                    'password'   => $hashedPassword,
                    'daily_rate' => 0, // set real rate before running payroll
                ]
            );
        }

        $this->seedDtrRecords($records);
    }

    private function seedDtrRecords(array $employees): void
    {
        $start = Carbon::parse('2026-07-01');
        $end   = Carbon::parse('2026-07-15');

        // No exceptions — every employee gets full, on-time attendance
        // for the whole period (payroll testing).
        $exceptions = [];

        foreach ($employees as $employeeCode => $employee) {
            for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
                if ($date->isWeekend()) {
                    continue;
                }

                $dateKey  = $date->format('Y-m-d');
                $scenario = $exceptions[$dateKey][$employeeCode] ?? 'full';

                $log = DtrLog::firstOrNew([
                    'employee_id' => $employee->id,
                    'date'        => $dateKey,
                ]);

                match ($scenario) {
                    'absent' => $this->applyPunches($log, null, null, null, null),
                    'half_am_absent' => $this->applyPunches($log, null, null, '13:00:00', '17:00:00'),
                    'half_pm_absent' => $this->applyPunches($log, '08:00:00', '12:00:00', null, null),
                    default  => $this->applyPunches($log, '08:00:00', '12:00:00', '13:00:00', '17:00:00'),
                };

                $log->computeHoursAndStatus();
                $log->save();
            }
        }
    }

    private function applyPunches(DtrLog $log, ?string $amIn, ?string $amOut, ?string $pmIn, ?string $pmOut): void
    {
        $log->am_time_in  = $amIn;
        $log->am_time_out = $amOut;
        $log->pm_time_in  = $pmIn;
        $log->pm_time_out = $pmOut;
    }
}