<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\DtrEditRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DtrEditRequestCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public DtrEditRequest $editRequest) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('dtr-edit-requests'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'dtr.edit_requested';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->editRequest->id,
            'employee_id' => $this->editRequest->employee_id,
            'employee_name' => $this->editRequest->employee?->full_name,
            'date' => $this->editRequest->dtrLog?->date?->format('M d, Y'),
            'reason' => $this->editRequest->reason,
            'status' => $this->editRequest->status,
        ];
    }
}
