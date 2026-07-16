<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class DtrLog extends Model
{
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

    public function employee() {
        return $this->belongsTo(Employee::class);
    }

    public function editRequests() {
        return $this->hasMany(DtrEditRequest::class);
    }

    public function pendingEditRequest() {
        return $this->hasOne(DtrEditRequest::class)->where('status', 'pending');
    }

    // ── Next punch slot ────────────────────────────────────

    public function getNextPunchSlot(): ?string {
        if (! $this->am_time_in)  return 'am_time_in';
        if (! $this->am_time_out) return 'am_time_out';
        if (! $this->pm_time_in)  return 'pm_time_in';
        if (! $this->pm_time_out) return 'pm_time_out';
        return null;
    }

    // ── Hours + status computation ─────────────────────────

    public function computeHoursAndStatus(): void {
        $shiftStart   = Setting::get('shift_start', '08:00');
        $shiftEnd     = Setting::get('shift_end', '17:00');
        $graceMinutes = (int) Setting::get('late_grace_minutes', '0');

        // Normalize all times to H:i (strip seconds if present)
        $normalizeTime = fn(string $t): string => substr($t, 0, 5);

        $shiftStart = $normalizeTime($shiftStart);
        $shiftEnd   = $normalizeTime($shiftEnd);

        // Compute grace cutoff time in H:i
        [$h, $m] = explode(':', $shiftStart);
        $totalMinutes = (int)$h * 60 + (int)$m + $graceMinutes;
        $graceTime = sprintf('%02d:%02d', intdiv($totalMinutes, 60), $totalMinutes % 60);

        // Compute hours
        $amMinutes = 0;
        $pmMinutes = 0;

        if ($this->am_time_in && $this->am_time_out) {
            $amIn  = $normalizeTime($this->am_time_in);
            $amOut = $normalizeTime($this->am_time_out);
            $amMinutes = abs(Carbon::parse($amIn)->diffInMinutes(Carbon::parse($amOut)));
        }

        if ($this->pm_time_in && $this->pm_time_out) {
            $pmIn  = $normalizeTime($this->pm_time_in);
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
            $isLate      = $amTimeIn > $graceTime;
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

    // ── Attendance day-weighting ────────────────────────────

    /**
     * Total "days present" for an employee between two dates, with
     * half_day statuses counted as 0.5 instead of a full day.
     */
    public static function daysPresentBetween(int $employeeId, $from, $to): float {
        return static::where('employee_id', $employeeId)
            ->whereBetween('date', [$from, $to])
            ->whereIn('status', ['on_time', 'late', 'undertime', 'half_day'])
            ->get()
            ->sum(fn($log) => $log->status === 'half_day' ? 0.5 : 1);
    }
}