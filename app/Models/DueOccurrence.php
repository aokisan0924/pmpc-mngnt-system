<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One due date of a Due, with what was paid. */
class DueOccurrence extends Model
{
    protected $fillable = ['due_id', 'due_date', 'amount', 'paid_at', 'paid_amount', 'paid_note', 'paid_by'];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'paid_at' => 'date',
            'amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
        ];
    }

    public function due(): BelongsTo
    {
        return $this->belongsTo(Due::class);
    }

    public function isPaid(): bool
    {
        return $this->paid_at !== null;
    }
}
