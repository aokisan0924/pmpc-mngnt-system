<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string $role): Response {
        $employee = $request->user();

        if (! $employee || $employee->role !== $role) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }

            if ($employee) {
                return redirect()->route(
                    $employee->isSuperAdmin() ? 'admin.dashboard' : 'employee.dashboard'
                );
            }

            return redirect()->route('login');
        }

        if (! $employee->isActive()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->withErrors(['login' => 'Your account has been deactivated.']);
        }

        return $next($request);
    }
}