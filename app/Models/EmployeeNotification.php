<?php

namespace App\Models;

use App\Events\NotificationSent;
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
    ): void {
        $notification = static::create([
            'employee_id' => $employeeId,
            'type'        => $type,
            'title'       => $title,
            'message'     => $message,
            'link'        => $link,
        ]);

        // Broadcast in real-time via Pusher
        broadcast(new NotificationSent($notification))->toOthers();
    }

    public static function unreadCount(int $employeeId): int {
        return static::where('employee_id', $employeeId)
            ->whereNull('read_at')
            ->count();
    }
}