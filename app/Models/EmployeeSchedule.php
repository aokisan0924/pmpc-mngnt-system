<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Once;

class EmployeeSchedule extends Model
{
    protected $fillable = [
        'employee_id', 'effective_from', 'type', 'shift_start', 'shift_end', 'work_days', 'created_by',
    ];

    protected $casts = ['effective_from' => 'date:Y-m-d'];

    protected static function booted(): void
    {
        // The lookup is memoized per request; drop it whenever a row changes.
        static::saved(fn () => Once::flush());
        static::deleted(fn () => Once::flush());
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'created_by');
    }

    /** @return array<int> */
    public function workDays(): array
    {
        return array_map('intval', array_filter(explode(',', $this->work_days), 'strlen'));
    }

    /** The row in effect on the date: latest with effective_from on or before it. */
    public static function forDate(int $employeeId, CarbonInterface $date): ?self
    {
        $rows = once(fn () => static::query()->orderBy('effective_from')->get()->groupBy('employee_id'));
        $day = $date->toDateString();

        return $rows->get($employeeId)?->last(fn (self $row): bool => $row->effective_from->toDateString() <= $day);
    }

    /** @return array{start: string, end: string, two_punch: bool}|null */
    public static function shiftFor(int $employeeId, CarbonInterface $date): ?array
    {
        $row = static::forDate($employeeId, $date);

        if ($row === null || $row->type === 'standard') {
            return null;
        }

        return ['start' => $row->shift_start, 'end' => $row->shift_end, 'two_punch' => $row->type === 'two_punch'];
    }

    /** Paid hours in a full shift on the date: two-punch shifts run straight through, others drop the lunch hour. */
    public static function shiftHoursFor(int $employeeId, CarbonInterface $date): float
    {
        $shift = static::shiftFor($employeeId, $date)
            ?? ['start' => (string) Setting::get('shift_start', '08:00'), 'end' => (string) Setting::get('shift_end', '17:00'), 'two_punch' => false];
        $minutes = fn (string $time): int => (int) substr($time, 0, 2) * 60 + (int) substr($time, 3, 2);
        [$start, $end] = [$minutes($shift['start']), $minutes($shift['end'])];
        if ($end <= $start) {
            $end += 1440;
        }
        $length = $end - $start;
        if (! $shift['two_punch']) {
            [$lunchFrom, $lunchTo] = [$minutes((string) Setting::get('lunch_start', '12:00')), $minutes((string) Setting::get('lunch_end', '13:00'))];
            $length -= max(0, min($end, $lunchTo) - max($start, $lunchFrom));
        }

        return round($length / 60, 2);
    }

    /** @return array<int> */
    public static function workDaysFor(int $employeeId, CarbonInterface $date): array
    {
        $days = static::forDate($employeeId, $date)?->workDays() ?? [];

        return $days !== [] ? $days : Employee::DEFAULT_WORK_DAYS;
    }
}
