<?php

declare(strict_types=1);

namespace App\Services;

use Carbon\Carbon;
use Throwable;

final class PayrollCutoffPeriod
{
    public static function matches(mixed $from, mixed $to, mixed $cutoff): bool
    {
        try {
            $fromDate = Carbon::parse($from);
            $toDate = Carbon::parse($to);
        } catch (Throwable) {
            return false;
        }

        if ($fromDate->format('Y-m') !== $toDate->format('Y-m')) {
            return false;
        }

        return match ($cutoff) {
            'first' => $fromDate->day === 1 && $toDate->day === 15,
            'second' => $fromDate->day === 16 && $toDate->isLastOfMonth(),
            default => false,
        };
    }

    public static function message(): string
    {
        return 'First cutoff must run from the 1st through the 15th, or second cutoff from the 16th through the last day of the same month.';
    }
}
