<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountSetupRequest extends Model
{
    protected $fillable = ['employee_id', 'details', 'status', 'review_note', 'reviewed_by', 'reviewed_at'];

    protected $casts = ['details' => 'array', 'reviewed_at' => 'datetime'];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
