<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Moves each employee's personal shift (settings `employee_shift_{id}`) and workdays
 * (`employees.work_days`) into `employee_schedules` rows that keep today's behaviour.
 */
return new class extends Migration
{
    private const DEFAULT_WORK_DAYS = '1,2,3,4,5';

    public function up(): void
    {
        $shifts = $this->shiftSettings();
        $now = now();
        $rows = [];

        foreach (DB::table('employees')->orderBy('id')->get(['id', 'date_hired', 'created_at', 'work_days']) as $employee) {
            // No start date at all: cover every date, as the old column did.
            $start = substr((string) ($employee->date_hired ?? $employee->created_at ?? '1970-01-01'), 0, 10);
            $days = $this->workDays($employee->work_days);
            $shift = $this->validShift($shifts->get("employee_shift_{$employee->id}"));
            $row = fn (string $from, string $type, ?string $startTime, ?string $endTime): array => [
                'employee_id' => $employee->id, 'effective_from' => $from, 'type' => $type,
                'shift_start' => $startTime, 'shift_end' => $endTime, 'work_days' => $days ?? self::DEFAULT_WORK_DAYS,
                'created_by' => null, 'created_at' => $now, 'updated_at' => $now,
            ];

            if ($days !== null && ($shift === null || $shift['effective_from'] > $start)) {
                $rows[] = $row($start, 'standard', null, null);
            }
            if ($shift !== null) {
                $rows[] = $row($shift['effective_from'], $shift['two_punch'] ? 'two_punch' : 'custom', $shift['start'], $shift['end']);
            }
        }

        DB::transaction(function () use ($rows, $shifts): void {
            foreach (array_chunk($rows, 200) as $chunk) {
                DB::table('employee_schedules')->insert($chunk);
            }
            DB::table('settings')->whereIn('key', $shifts->keys()->all())->delete();
        });

        Schema::table('employees', fn (Blueprint $table) => $table->dropColumn('work_days'));

        $shifts->keys()->each(fn (string $key) => Cache::forget("setting_{$key}"));
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            // Comma-separated days of the week (0 = Sunday … 6 = Saturday); null means Monday–Friday.
            $table->string('work_days', 20)->nullable();
        });

        $latest = DB::table('employee_schedules')->orderBy('effective_from')->get()
            ->groupBy('employee_id')->map(fn (Collection $rows): object => $rows->last());

        DB::transaction(function () use ($latest): void {
            $now = now();
            foreach ($latest as $employeeId => $row) {
                if ($row->work_days !== self::DEFAULT_WORK_DAYS) {
                    DB::table('employees')->where('id', $employeeId)->update(['work_days' => $row->work_days]);
                }
                // Only a shift still in effect goes back: the old storage held one shift with no end date.
                if ($row->type !== 'standard') {
                    DB::table('settings')->updateOrInsert(['key' => "employee_shift_{$employeeId}"], [
                        'value' => json_encode([
                            'effective_from' => substr((string) $row->effective_from, 0, 10),
                            'start' => $row->shift_start, 'end' => $row->shift_end, 'two_punch' => $row->type === 'two_punch',
                        ]),
                        'created_at' => $now, 'updated_at' => $now,
                    ]);
                }
            }
            DB::table('employee_schedules')->delete();
        });

        $latest->keys()->each(fn ($id) => Cache::forget("setting_employee_shift_{$id}"));
    }

    /** @return Collection<string, ?string> key => value */
    private function shiftSettings(): Collection
    {
        // LIKE treats "_" as a wildcard, so confirm the exact prefix.
        return DB::table('settings')->where('key', 'like', 'employee_shift_%')->pluck('value', 'key')
            ->filter(fn (?string $value, string $key): bool => str_starts_with($key, 'employee_shift_'));
    }

    /** Old reader: comma list of ints; null or nothing usable means Monday–Friday. */
    private function workDays(?string $value): ?string
    {
        $days = array_unique(array_map('intval', array_filter(explode(',', (string) $value), 'strlen')));
        sort($days);

        return $days === [] ? null : implode(',', $days);
    }

    /**
     * Same checks as the removed Setting::employeeShiftForDate.
     *
     * @return array{effective_from: string, start: string, end: string, two_punch: bool}|null
     */
    private function validShift(?string $json): ?array
    {
        $shift = json_decode((string) $json, true);
        if (! is_array($shift)) {
            return null;
        }

        $effectiveFrom = $shift['effective_from'] ?? null;
        $start = $shift['start'] ?? null;
        $end = $shift['end'] ?? null;
        $twoPunch = ($shift['two_punch'] ?? false) === true;
        $time = '/\A(?:[01][0-9]|2[0-3]):[0-5][0-9]\z/';

        if (! is_string($effectiveFrom) || ! is_string($start) || ! is_string($end)
            || ! preg_match('/\A[0-9]{4}-[0-9]{2}-[0-9]{2}\z/', $effectiveFrom)) {
            return null;
        }

        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $effectiveFrom);
        if (! $date || $date->format('Y-m-d') !== $effectiveFrom
            || ! preg_match($time, $start) || ! preg_match($time, $end)
            || $start === $end || (! $twoPunch && $start > $end)) {
            return null;
        }

        return ['effective_from' => $effectiveFrom, 'start' => $start, 'end' => $end, 'two_punch' => $twoPunch];
    }
};
