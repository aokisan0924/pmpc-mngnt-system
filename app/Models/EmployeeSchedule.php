<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Once;

class EmployeeSchedule extends Model
{
    protected $fillable = [
        'employee_id', 'effective_from', 'type', 'shift_start', 'shift_end', 'work_days', 'created_by',
    ];

    protected $casts = ['effective_from' => 'date'];

    protected static function booted(): void
    {
        // The lookup is memoized per request; drop it whenever a row changes.
        static::saved(fn () => Once::flush());
        static::deleted(fn () => Once::flush());
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

    /** @return array<int> */
    public static function workDaysFor(int $employeeId, CarbonInterface $date): array
    {
        $days = static::forDate($employeeId, $date)?->workDays() ?? [];

        return $days !== [] ? $days : Employee::DEFAULT_WORK_DAYS;
    }
}
