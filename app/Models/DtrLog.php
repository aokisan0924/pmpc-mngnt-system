<?php

namespace App\Models;

use Carbon\Carbon;
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
    ];

    protected $casts = [
        'date' => 'date',
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

    // ── Next punch slot ────────────────────────────────────

    public function getNextPunchSlot(): ?string
    {
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
    }

    public function isRestDayAbsence(): bool
    {
        return $this->status === 'absent' && $this->punchesCount() === 0 && $this->date->isWeekend();
    }

    public function displayStatus(): string
    {
        if ($this->isRestDayAbsence()) {
            return 'rest_day';
        }

        // Historical Friday logs can still have the old 17:00-based status.
        if ($this->status === 'undertime' && $this->date->isFriday()
            && $this->pm_time_out && substr($this->pm_time_out, 0, 5) >= '16:00'
            && Setting::employeeShiftForDate((int) $this->employee_id, $this->date) === null) {
            return 'on_time';
        }

        return $this->status;
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

        return static::whereIn('employee_id', $employeeIds)
            ->whereBetween('date', [$from, $to])
            ->whereIn('status', ['on_time', 'late', 'undertime', 'half_day'])
            ->get(['employee_id', 'status'])
            ->groupBy('employee_id')
            ->map(fn (Collection $logs): float => self::weightedDaysPresent($logs));
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
