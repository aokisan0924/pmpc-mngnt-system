<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeGovernmentId extends Model
{
    protected $fillable = [
        'employee_id',
        'sss_no',
        'philhealth_no',
        'pagibig_no',
        'tin_no',
    ];

    public function employee() {
        return $this->belongsTo(Employee::class);
    }
}