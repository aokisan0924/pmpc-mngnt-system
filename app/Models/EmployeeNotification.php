<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeNotification extends Model
{
    protected $table = 'notifications';

    protected $fillable = [
        'employee_id',
        'type',
        'title',
        'message',
        'link',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function employee() {
        return $this->belongsTo(Employee::class);
    }

    public function isRead(): bool {
        return $this->read_at !== null;
    }

    public function isUnread(): bool {
        return $this->read_at === null;
    }

    // ── Static helpers ─────────────────────────────────────

    public static function send(
        int    $employeeId,
        string $type,
        string $title,
        string $message,
        string $link = null
    ): self {
        return static::create([
            'employee_id' => $employeeId,
            'type'        => $type,
            'title'       => $title,
            'message'     => $message,
            'link'        => $link,
        ]);
    }

    public static function unreadCount(int $employeeId): int {
        return static::where('employee_id', $employeeId)
            ->whereNull('read_at')
            ->count();
    }
}