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
        $shiftStart    = Setting::get('shift_start', '08:00');
        $shiftEnd      = Setting::get('shift_end', '17:00');
        $graceMinutes  = (int) Setting::get('late_grace_minutes', '0');

        // Add grace period to shift start
        [$h, $m]    = explode(':', $shiftStart);
        $graceTime  = sprintf('%02d:%02d', ...array_values(
            ['h' => floor(($h * 60 + $m + $graceMinutes) / 60),
            'm' => ($h * 60 + $m + $graceMinutes) % 60]
        ));

        $amMinutes = 0;
        $pmMinutes = 0;

        if ($this->am_time_in && $this->am_time_out) {
            $amMinutes = Carbon::parse($this->am_time_out)
                ->diffInMinutes(Carbon::parse($this->am_time_in));
        }

        if ($this->pm_time_in && $this->pm_time_out) {
            $pmMinutes = Carbon::parse($this->pm_time_out)
                ->diffInMinutes(Carbon::parse($this->pm_time_in));
        }

        $this->hours_rendered = round(($amMinutes + $pmMinutes) / 60, 2);

        $hasAm = $this->am_time_in && $this->am_time_out;
        $hasPm = $this->pm_time_in && $this->pm_time_out;

        if (! $hasAm && ! $hasPm) {
            $this->status = 'absent';
        } elseif (! $hasAm || ! $hasPm) {
            $this->status = 'half_day';
        } else {
            $isLate      = Carbon::parse($this->am_time_in)->gt(Carbon::parse($graceTime));
            $isUndertime = Carbon::parse($this->pm_time_out)->lt(Carbon::parse($shiftEnd));

            if ($isLate) {
                $this->status = 'late';
            } elseif ($isUndertime) {
                $this->status = 'undertime';
            } else {
                $this->status = 'on_time';
            }
        }
    }
}