<?php

namespace App\Models;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class DtrLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'date',
        'am_time_in',
        'am_time_out',
        'pm_time_in',
        'pm_time_out',
        'hours_rendered',
        'status',
        'ip_address',
        'absence_reason',
        'absence_cancelled_at',
    ];

    protected $casts = [
        'date' => 'date',
        'absence_cancelled_at' => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function editRequests()
    {
        return $this->hasMany(DtrEditRequest::class);
    }

    public function pendingEditRequest()
    {
        return $this->hasOne(DtrEditRequest::class)->where('status', 'pending');
    }

    public function latestEditRequest()
    {
        return $this->hasOne(DtrEditRequest::class)->latestOfMany();
    }

    // ── Next punch slot ────────────────────────────────────

    /** Two-punch shift (time in / time out, no lunch): only am_time_in and pm_time_out are used. */
    public function isTwoPunch(): bool
    {
        return Setting::employeeShiftForDate((int) $this->employee_id, $this->date)['two_punch'] ?? false;
    }

    /** The log a punch made now belongs to: an overnight shift's clock-out lands on the log opened yesterday. */
    public static function forPunch(int $employeeId, bool $create = true): ?self
    {
        $open = static::where('employee_id', $employeeId)->whereDate('date', today()->subDay())
            ->whereNotNull('am_time_in')->whereNull('pm_time_out')->first();

        if ($open?->isOpenOvernightShift()) {
            return $open;
        }

        return $create
            ? static::firstOrCreate(['employee_id' => $employeeId, 'date' => today()], ['status' => 'absent'])
            : static::where('employee_id', $employeeId)->whereDate('date', today())->first();
    }

    /** Show Time In / Time Out columns only: a two-punch employee whose displayed logs hold no lunch punches. */
    public static function twoPunchLayout(int $employeeId, iterable $logs): bool
    {
        return Employee::hasTwoPunchShift($employeeId)
            && collect($logs)->every(fn (self $log): bool => ! $log->am_time_out && ! $log->pm_time_in);
    }

    /** Yesterday's overnight two-punch shift that is still waiting for this morning's clock-out. */
    public function isOpenOvernightShift(): bool
    {
        if (! $this->date->isYesterday() || ! $this->am_time_in || $this->pm_time_out || ! $this->isTwoPunch()) {
            return false;
        }
        $shift = Setting::employeeShiftForDate((int) $this->employee_id, $this->date);

        return $shift['end'] < $shift['start'];
    }

    public function getNextPunchSlot(): ?string
    {
        if ($this->isTwoPunch()) {
            return ! $this->am_time_in ? 'am_time_in' : (! $this->pm_time_out ? 'pm_time_out' : null);
        }
        if (! $this->am_time_in) {
            return 'am_time_in';
        }
        if (! $this->am_time_out) {
            return 'am_time_out';
        }
        if (! $this->pm_time_in) {
            return 'pm_time_in';
        }
        if (! $this->pm_time_out) {
            return 'pm_time_out';
        }

        return null;
    }

    public function punchesCount(): int
    {
        $count = 0;
        if ($this->am_time_in) {
            $count++;
        }
        if ($this->am_time_out) {
            $count++;
        }
        if ($this->pm_time_in) {
            $count++;
        }
        if ($this->pm_time_out) {
            $count++;
        }

        return $count;
    }

    // ── Hours + status computation ─────────────────────────

    public function computeHoursAndStatus(): void
    {
        $personalShift = Setting::employeeShiftForDate((int) $this->employee_id, $this->date);
        $shiftStart = $personalShift['start'] ?? Setting::get('shift_start', '08:00');
        $shiftEnd = $personalShift['end'] ?? ($this->date->isFriday() ? '16:00' : Setting::get('shift_end', '17:00'));
        $graceMinutes = (int) Setting::get('late_grace_minutes', '0');

        // Normalize all times to H:i (strip seconds if present)
        $normalizeTime = fn (string $t): string => substr($t, 0, 5);

        $shiftStart = $normalizeTime($shiftStart);
        $shiftEnd = $normalizeTime($shiftEnd);

        // Compute grace cutoff time in H:i
        [$h, $m] = explode(':', $shiftStart);
        $totalMinutes = (int) $h * 60 + (int) $m + $graceMinutes;
        $graceTime = sprintf('%02d:%02d', intdiv($totalMinutes, 60), $totalMinutes % 60);

        // Compute hours
        $amMinutes = 0;
        $pmMinutes = 0;

        if ($this->isTwoPunch()) {
            $this->computeTwoPunch($shiftStart, $shiftEnd, $graceMinutes);

            return;
        }

        if ($this->am_time_in && $this->am_time_out) {
            $amIn = $normalizeTime($this->am_time_in);
            $amOut = $normalizeTime($this->am_time_out);
            $amMinutes = abs(Carbon::parse($amIn)->diffInMinutes(Carbon::parse($amOut)));
        }

        if ($this->pm_time_in && $this->pm_time_out) {
            $pmIn = $normalizeTime($this->pm_time_in);
            $pmOut = $normalizeTime($this->pm_time_out);
            $pmMinutes = abs(Carbon::parse($pmIn)->diffInMinutes(Carbon::parse($pmOut)));
        }

        $this->hours_rendered = round(($amMinutes + $pmMinutes) / 60, 2);

        $hasAm = $this->am_time_in && $this->am_time_out;
        $hasPm = $this->pm_time_in && $this->pm_time_out;

        if (! $hasAm && ! $hasPm) {
            $this->status = 'absent';
        } elseif (! $hasAm || ! $hasPm) {
            $this->status = 'half_day';
        } else {
            $amTimeIn = $normalizeTime($this->am_time_in);
            $pmTimeOut = $normalizeTime($this->pm_time_out);

            // gte: clocking in AT shift start (or grace cutoff) is on time
            $isLate = $amTimeIn > $graceTime;
            $isUndertime = $pmTimeOut < $shiftEnd;

            if ($isLate) {
                $this->status = 'late';
            } elseif ($isUndertime) {
                $this->status = 'undertime';
            } else {
                $this->status = 'on_time';
            }
        }

        // Employees flagged as always present are never late, undertime or half-day.
        if ($this->status !== 'absent' && Employee::isAlwaysPresent((int) $this->employee_id)) {
            $this->status = 'on_time';
        }
    }

    private function computeTwoPunch(string $shiftStart, string $shiftEnd, int $graceMinutes): void
    {
        if (! $this->am_time_in || ! $this->pm_time_out) {
            $this->hours_rendered = 0;
            $this->status = 'absent';

            return;
        }

        $toMinutes = fn (string $t): int => (int) substr($t, 0, 2) * 60 + (int) substr($t, 3, 2);
        $start = $toMinutes($shiftStart);
        $in = $toMinutes($this->am_time_in);
        $out = $toMinutes($this->pm_time_out);
        $shiftLength = ($toMinutes($shiftEnd) - $start + 1440) % 1440;

        // Offsets from shift start, so an overnight shift compares correctly across midnight.
        $inOffset = ($in - $start + 1440 + 720) % 1440 - 720;
        $outOffset = ($out - $start + 1440) % 1440;

        $this->hours_rendered = round((($out - $in + 1440) % 1440) / 60, 2);

        $this->status = match (true) {
            $inOffset > $graceMinutes => 'late',
            $outOffset < $shiftLength => 'undertime',
            default => 'on_time',
        };

        if (Employee::isAlwaysPresent((int) $this->employee_id)) {
            $this->status = 'on_time';
        }
    }

    /** Recorded "absent" with no punches that the calendar does not treat as an absence (rest day, holiday, today, before start, always present). */
    public function isExcusedAbsence(): bool
    {
        return $this->status === 'absent' && $this->punchesCount() === 0
            && self::fallbackStatus((int) $this->employee_id, $this->date) !== 'absent';
    }

    /**
     * Status for a day without punches. A past weekday from the employee's start date
     * is absent even when no record exists (no login = absent once the day has ended).
     */
    public static function fallbackStatus(int $employeeId, CarbonInterface $date): string
    {
        if (Holiday::typeOn($date)) {
            return 'holiday';
        }
        if (! Employee::isWorkDay($employeeId, $date)) {
            return 'rest_day';
        }
        if ($date->toDateString() > today()->toDateString()) {
            return 'upcoming';
        }
        $start = Employee::startDateFor($employeeId);
        if ($start !== null && $date->toDateString() < $start) {
            return 'not_started';
        }

        if ($date->isToday()) {
            return 'in_progress';
        }

        return Employee::isAlwaysPresent($employeeId) ? 'on_time' : 'absent';
    }

    /** Absent days in the range: recorded absences plus past weekdays with no record at all. */
    public static function absentDaysBetween(int $employeeId, $from, $to, ?Collection $logs = null): int
    {
        $logs = ($logs ?? static::where('employee_id', $employeeId)->whereBetween('date', [$from, $to])->get())
            ->keyBy(fn (self $log): string => $log->date->toDateString());

        return collect(CarbonPeriod::create($from, $to))
            ->filter(function (CarbonInterface $day) use ($logs, $employeeId): bool {
                $log = $logs->get($day->toDateString());

                return $log ? in_array($log->displayStatus(), ['absent', 'missing_out'], true) : self::fallbackStatus($employeeId, $day) === 'absent';
            })
            ->count();
    }

    public function displayStatus(): string
    {
        if ($this->hasActiveAbsence() && $this->punchesCount() === 0) {
            $fallback = self::fallbackStatus((int) $this->employee_id, $this->date);
            if (in_array($fallback, ['holiday', 'rest_day', 'not_started'], true)) {
                return $fallback;
            }

            return $this->date->isFuture() && ! $this->date->isToday() ? 'planned_absence' : 'absent';
        }
        if ($this->punchesCount() > 0 && $this->getNextPunchSlot() !== null
            && ($this->date->isToday() || $this->isOpenOvernightShift())) {
            return 'in_progress';
        }
        // A two-punch day that was never closed: flagged for HR instead of silently counting as absent.
        if ($this->am_time_in && ! $this->pm_time_out && $this->date->lt(today()) && $this->isTwoPunch()) {
            return 'missing_out';
        }
        if ($this->isExcusedAbsence()) {
            return self::fallbackStatus((int) $this->employee_id, $this->date);
        }
        // Historical Friday logs can still have the old 17:00-based status.
        if ($this->status === 'undertime' && $this->date->isFriday()
            && $this->pm_time_out && substr($this->pm_time_out, 0, 5) >= '16:00'
            && Setting::employeeShiftForDate((int) $this->employee_id, $this->date) === null) {
            return 'on_time';
        }

        return $this->status;
    }

    public function hasActiveAbsence(): bool
    {
        return filled($this->absence_reason) && $this->absence_cancelled_at === null;
    }

    /** Attendance reports count the statuses actually shown; payroll keeps its existing day-weighting rules. */
    public static function displayDaysPresentBetween(int $employeeId, $from, $to, ?Collection $logs = null): float
    {
        $logs = ($logs ?? static::where('employee_id', $employeeId)->whereBetween('date', [$from, $to])->get())
            ->keyBy(fn (self $log): string => $log->date->toDateString());

        return (float) collect(CarbonPeriod::create($from, $to))->sum(function (CarbonInterface $day) use ($logs, $employeeId): float {
            $status = $logs->get($day->toDateString())?->displayStatus() ?? self::fallbackStatus($employeeId, $day);

            return self::presenceWeight($status);
        });
    }

    // ── Attendance day-weighting ────────────────────────────

    /**
     * Total "days present" for an employee between two dates, with
     * half_day statuses counted as 0.5 instead of a full day.
     */
    public static function daysPresentBetween(int $employeeId, $from, $to): float
    {
        return (float) self::weightedDaysByEmployee([$employeeId], $from, $to)->get($employeeId, 0.0);
    }

    /**
     * @param  array<int>  $employeeIds
     * @return Collection<int, float>
     */
    public static function weightedDaysByEmployee(array $employeeIds, $from, $to): Collection
    {
        if ($employeeIds === []) {
            return collect();
        }

        $days = static::whereIn('employee_id', $employeeIds)
            ->whereBetween('date', [$from, $to])
            ->whereIn('status', ['on_time', 'late', 'undertime', 'half_day'])
            ->get(['employee_id', 'status', 'date'])
            ->groupBy('employee_id')
            ->map(fn (Collection $logs, int $id): float => Employee::isAlwaysPresent($id)
                ? self::weightedDaysPresent($logs->filter(fn (self $log): bool => ! Employee::isWorkDay($id, $log->date)))
                : self::weightedDaysPresent($logs));

        // Always-present employees: every workday counts, holidays included.
        foreach (array_filter($employeeIds, fn ($id): bool => Employee::isAlwaysPresent((int) $id)) as $id) {
            $weekdays = collect(CarbonPeriod::create($from, $to))
                ->filter(fn (CarbonInterface $day): bool => Employee::isWorkDay((int) $id, $day))
                ->count();
            $days[(int) $id] = ($days[(int) $id] ?? 0.0) + $weekdays;
        }

        return $days;
    }

    public static function presenceWeight(string $status): float
    {
        return match ($status) {
            'on_time', 'late', 'undertime' => 1.0,
            'half_day' => 0.5,
            default => 0.0,
        };
    }

    /**
     * @param  iterable<self>  $logs
     */
    public static function weightedDaysPresent(iterable $logs): float
    {
        $days = 0.0;

        foreach ($logs as $log) {
            $days += self::presenceWeight($log->status);
        }

        return $days;
    }
}
