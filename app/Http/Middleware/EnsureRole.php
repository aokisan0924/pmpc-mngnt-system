<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string $roles): Response {
        $employee     = $request->user();
        $allowedRoles = explode(',', $roles);

        if (! $employee || ! in_array($employee->role, $allowedRoles, true)) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }

            if ($employee) {
                // Only bounce to a dashboard we know this role can actually
                // reach — otherwise this becomes an infinite redirect loop
                // for any role that isn't exactly 'employee' or
                // 'super_admin' (e.g. a mistyped/renamed/legacy role).
                if ($employee->role === 'super_admin') {
                    return redirect()->route('admin.dashboard');
                }

                if ($employee->role === 'employee') {
                    return redirect()->route('employee.dashboard');
                }

                // Unknown role — log out instead of looping.
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('login')
                    ->withErrors(['login' => 'Your account role is not recognized. Please contact an administrator.']);
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