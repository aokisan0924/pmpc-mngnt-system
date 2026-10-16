<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DtrLog;
use App\Models\Employee;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
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
        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();
        $days = DtrLog::weightedDaysByEmployee($employeeIds, $fromDate, $toDate);
        $today = Carbon::today('Asia/Manila');

        foreach ($employeeIds as $employeeId) {
            $employeeId = (int) $employeeId;
            $days[$employeeId] ??= 0.0;

            if (! Employee::isAlwaysPresent($employeeId)) {
                continue;
            }

            $periodStart = Carbon::parse($fromDate)->startOfDay();
            $periodEnd = Carbon::parse($toDate)->startOfDay();
            $startDate = Employee::startDateFor($employeeId);
            $eligibleStart = $startDate !== null && $startDate > $fromDate
                ? Carbon::parse($startDate)->startOfDay()
                : $periodStart->copy();
            $eligibleEnd = $today->lt($periodEnd) ? $today->copy() : $periodEnd->copy();

            $scheduledDaysInPeriod = $this->scheduledWorkdays($employeeId, $periodStart, $periodEnd);
            $eligibleScheduledDays = $eligibleStart->lte($eligibleEnd)
                ? $this->scheduledWorkdays($employeeId, $eligibleStart, $eligibleEnd)
                : 0;

            $days[$employeeId] = max(0.0, (float) $days[$employeeId] - ($scheduledDaysInPeriod - $eligibleScheduledDays));
        }

        return $days;
    }

    private function scheduledWorkdays(int $employeeId, Carbon $from, Carbon $to): int
    {
        return collect(CarbonPeriod::create($from, $to))
            ->filter(fn (Carbon $day): bool => Employee::isWorkDay($employeeId, $day))
            ->count();
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
