<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $fillable = [
        'employee_id',
        'title',
        'description',
        'due_date',
        'category',
        'priority',
        'status',
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    public function employee() {
        return $this->belongsTo(Employee::class);
    }

    public function isDone(): bool {
        return $this->status === 'done';
    }
}
