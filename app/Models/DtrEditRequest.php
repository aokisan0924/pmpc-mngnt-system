<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DtrEditRequest extends Model
{
    use HasFactory;

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

    public function dtrLog()
    {
        return $this->belongsTo(DtrLog::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(Employee::class, 'reviewed_by');
    }

    /** Reason, status and the punches that changed (original -> requested), for DTR log rows. */
    public function logSummary(): array
    {
        $time = fn (?string $value): ?string => $value ? substr($value, 0, 5) : null;

        $changes = collect(['am_time_in' => 'AM In', 'am_time_out' => 'AM Out', 'pm_time_in' => 'PM In', 'pm_time_out' => 'PM Out'])
            ->map(fn (string $label, string $slot): array => [
                'slot' => $slot,
                'label' => $label,
                'original' => $time($this->{"original_{$slot}"}),
                'requested' => $time($this->{"requested_{$slot}"}),
            ])
            ->filter(fn (array $change): bool => $change['original'] !== $change['requested'])
            ->values()
            ->all();

        return [
            'status' => $this->status,
            'reason' => $this->reason,
            'admin_note' => $this->admin_note,
            'changes' => $changes,
            'submitted_at' => $this->created_at?->timezone('Asia/Manila')->format('M d, Y g:i A'),
        ];
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
}
