<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Login');
    }

    public function store(Request $request): RedirectResponse {
        $request->validate([
            'login'    => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $field = filter_var($request->login, FILTER_VALIDATE_EMAIL)
            ? 'email'
            : 'employee_id';

        if (! Auth::attempt(
            [$field => $request->login, 'password' => $request->password],
            $request->boolean('remember')
        )) {
            throw ValidationException::withMessages([
                'login' => __('auth.failed'),
            ]);
        }

        /** @var \App\Models\Employee $employee */
        $employee = Auth::user();

        if (! $employee->isActive()) {
            Auth::logout();
            throw ValidationException::withMessages([
                'login' => 'Your account has been deactivated. Contact your administrator.',
            ]);
        }

        $request->session()->regenerate();

        return redirect()->intended(
            $employee->isSuperAdmin()
                ? route('admin.dashboard')
                : route('employee.dashboard')
        );
    }

    public function destroy(Request $request): RedirectResponse {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('login');
    }
}
