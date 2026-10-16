<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Login');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $login = trim($request->login);
        $limiterKey = 'auth.login.'.hash('sha256', mb_strtolower($login).'|'.(string) $request->ip());

        if (RateLimiter::tooManyAttempts($limiterKey, 5)) {
            $seconds = max(1, RateLimiter::availableIn($limiterKey));

            throw ValidationException::withMessages([
                'login' => "Too many login attempts. Please try again in {$seconds} seconds.",
            ]);
        }

        $field = filter_var($login, FILTER_VALIDATE_EMAIL)
            ? 'email'
            : 'employee_id';

        if (! Auth::attempt(
            [$field => $login, 'password' => $request->password],
            $request->boolean('remember')
        )) {
            RateLimiter::hit($limiterKey, 60);

            throw ValidationException::withMessages([
                'login' => __('auth.failed'),
            ]);
        }

        /** @var Employee $employee */
        $employee = Auth::user();

        if (! $employee->isActive()) {
            Auth::logout();
            RateLimiter::hit($limiterKey, 60);
            throw ValidationException::withMessages([
                'login' => 'Your account has been deactivated. Contact your administrator.',
            ]);
        }

        RateLimiter::clear($limiterKey);

        $request->session()->regenerate();

        if ($employee->is_staff && ! $employee->setup_completed_at
            && ! $employee->accountSetupRequests()->where('status', 'pending')->exists()) {
            return redirect()->route('employee.setup');
        }

        return redirect()->intended(
            $employee->isSuperAdmin()
                ? route('admin.dashboard')
                : route('employee.dashboard')
        );
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
