<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DtrEditRequest extends Model
{
    protected $fillable = [
        'dtr_log_id',
        'employee_id',
        'original_am_time_in',
        'original_am_time_out',
        'original_pm_time_in',
        'original_pm_time_out',
        'requested_am_time_in',
        'requested_am_time_out',
        'requested_pm_time_in',
        'requested_pm_time_out',
        'reason',
        'status',
        'admin_note',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function dtrLog() {
        return $this->belongsTo(DtrLog::class);
    }

    public function employee() {
        return $this->belongsTo(Employee::class);
    }

    public function reviewer() {
        return $this->belongsTo(Employee::class, 'reviewed_by');
    }

    public function isPending(): bool {
        return $this->status === 'pending';
    }
}
