<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Payroll pages: super admins, or staff listed in pmpc.payroll_processors; everyone else is turned away like EnsureRole does. */
class EnsurePayrollAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $employee = $request->user();
        if ($employee?->canProcessPayroll()) {
            // EnsureRole also signs out inactive accounts; reuse it for that check.
            return app(EnsureRole::class)->handle($request, $next, (string) $employee->role);
        }

        return app(EnsureRole::class)->handle($request, $next, 'super_admin');
    }
}
