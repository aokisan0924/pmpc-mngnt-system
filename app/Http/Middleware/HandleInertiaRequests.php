<?php

namespace App\Http\Middleware;

use App\Models\DtrLog;
use App\Models\EmployeeNotification;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'employee' => $request->user() ? [
                    'id' => $request->user()->id,
                    'employee_id' => $request->user()->employee_id,
                    'full_name' => $request->user()->full_name,
                    'initials' => $request->user()->initials,
                    'role' => $request->user()->role,
                    'department' => $request->user()->department,
                    'position' => $request->user()->position,
                    'first_name' => $request->user()->first_name,
                ] : null,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
            'unread_notifications' => $request->user()
                ? EmployeeNotification::unreadCount($request->user()->id)
                : 0,
            'dtr_today' => $request->user() ? [
                'next_slot' => DtrLog::where('employee_id', $request->user()->id)
                    ->whereDate('date', today())
                    ->first()?->getNextPunchSlot() ?? 'am_time_in',
                'punches_count' => DtrLog::where('employee_id', $request->user()->id)
                    ->whereDate('date', today())
                    ->first()?->punchesCount() ?? 0,
            ] : null,
        ]);
    }
}
