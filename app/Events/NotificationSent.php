<?php

namespace App\Events;

use App\Models\EmployeeNotification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public EmployeeNotification $notification)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('employee.' . $this->notification->employee_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'id'         => $this->notification->id,
            'type'       => $this->notification->type,
            'title'      => $this->notification->title,
            'message'    => $this->notification->message,
            'link'       => $this->notification->link,
            'created_at' => $this->notification->created_at->diffForHumans(),
        ];
    }
}