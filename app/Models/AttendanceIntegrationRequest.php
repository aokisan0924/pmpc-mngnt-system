<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceIntegrationRequest extends Model
{
    protected $fillable = ['request_id', 'employee_id', 'payload_hash', 'response'];

    protected function casts(): array
    {
        return ['response' => 'array'];
    }
}
