<?php

namespace App\Http\Controllers;

use App\Models\EmployeeNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response {
        $employee = $request->user();

        $notifications = EmployeeNotification::where('employee_id', $employee->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($n) => [
                'id'         => $n->id,
                'type'       => $n->type,
                'title'      => $n->title,
                'message'    => $n->message,
                'link'       => $n->link,
                'is_read'    => $n->isRead(),
                'created_at' => $n->created_at->diffForHumans(),
            ]);

        // Mark all as read when viewing the page
        EmployeeNotification::where('employee_id', $employee->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return Inertia::render('Employee/Notifications', [
            'notifications' => $notifications,
        ]);
    }

    public function markRead(Request $request, EmployeeNotification $notification): RedirectResponse {
        if ($notification->employee_id !== $request->user()->id) {
            abort(403);
        }

        $notification->update(['read_at' => now()]);
        return back();
    }

    public function markAllRead(Request $request): RedirectResponse {
        EmployeeNotification::where('employee_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return back()->with('success', 'All notifications marked as read.');
    }

    public function destroy(Request $request, EmployeeNotification $notification): RedirectResponse {
        if ($notification->employee_id !== $request->user()->id) {
            abort(403);
        }

        $notification->delete();
        return back();
    }
}