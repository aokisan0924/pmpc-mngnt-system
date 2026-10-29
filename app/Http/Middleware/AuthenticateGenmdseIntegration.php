<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Employee;
use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateGenmdseIntegration
{
    public function __construct(private readonly RateLimiter $limiter) {}

    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('integrations.genmdse.token', '');
        $provided = (string) $request->bearerToken();

        if ($expected === '' || $provided === '' || ! hash_equals($expected, $provided)) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $employeeId = (int) $request->route('employee');
        if (! in_array($employeeId, config('integrations.genmdse.employee_ids', []), true)) {
            return response()->json(['message' => 'Employee is not authorized for this integration.'], 403);
        }

        $employee = Employee::query()->select(['id', 'first_name', 'middle_name', 'last_name', 'name_suffix', 'status', 'is_staff'])->find($employeeId);
        if (! $employee || ! $employee->isActive() || ! $employee->is_staff) {
            return response()->json(['message' => 'Employee is not available for attendance integration.'], 403);
        }

        $key = 'genmdse:'.hash('sha256', $expected).':'.$employeeId;
        if ($this->limiter->tooManyAttempts($key, 60)) {
            return response()->json(['message' => 'Too many attendance requests.'], 429, [
                'Retry-After' => (string) $this->limiter->availableIn($key),
            ]);
        }
        $this->limiter->hit($key, 60);

        $request->attributes->set('integration.employee', $employee);

        return $next($request);
    }
}
