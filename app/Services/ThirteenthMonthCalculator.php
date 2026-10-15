<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DtrLog;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Support\Collection;

final class ThirteenthMonthCalculator
{
    /**
     * @return array{from: Carbon, to: Carbon}
     */
    public function period(int $year, string $tranche): array
    {
        if ($tranche === 'mid_year') {
            return [
                'from' => Carbon::create($year, 1, 1)->startOfDay(),
                'to' => Carbon::create($year, 6, 30)->endOfDay(),
            ];
        }

        return [
            'from' => Carbon::create($year, 7, 1)->startOfDay(),
            'to' => Carbon::create($year, 12, 31)->endOfDay(),
        ];
    }

    /**
     * @param  array<int>  $employeeIds
     * @return Collection<int, float>
     */
    public function attendanceDays(array $employeeIds, Carbon $from, Carbon $to): Collection
    {
        return DtrLog::weightedDaysByEmployee($employeeIds, $from->toDateString(), $to->toDateString());
    }

    /**
     * @return array{days_present: float, daily_rate: float, total_basic_pay: float, thirteenth_month_pay: float}
     */
    public function calculate(Employee $employee, float $daysPresent): array
    {
        $dailyRate = (float) $employee->daily_rate;
        $totalBasicPay = round($dailyRate * $daysPresent, 2);

        return [
            'days_present' => $daysPresent,
            'daily_rate' => $dailyRate,
            'total_basic_pay' => $totalBasicPay,
            'thirteenth_month_pay' => round($totalBasicPay / 12, 2),
        ];
    }
}
