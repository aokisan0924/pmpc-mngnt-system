<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('employee.{employeeId}', function ($user, $employeeId) {
    return (int) $user->id === (int) $employeeId;
});
