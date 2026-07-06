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

    public function computeHoursAndStatus(
        string $shiftStart = '08:00',
        string $shiftEnd   = '17:00',
        int    $requiredHours = 8
    ): void {
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

        $totalMinutes = $amMinutes + $pmMinutes;
        $this->hours_rendered = round($totalMinutes / 60, 2);

        // Determine status
        $hasAm = $this->am_time_in && $this->am_time_out;
        $hasPm = $this->pm_time_in && $this->pm_time_out;

        if (! $hasAm && ! $hasPm) {
            $this->status = 'absent';
        } elseif ($hasAm && ! $hasPm) {
            $this->status = 'half_day';
        } elseif ($hasPm && ! $hasAm) {
            $this->status = 'half_day';
        } else {
            $isLate      = $this->am_time_in > $shiftStart;
            $isUndertime = $this->pm_time_out < $shiftEnd;

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
