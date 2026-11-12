<?php

declare(strict_types=1);

namespace App\Services;

use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Throwable;

final class PayrollCutoffPeriod
{
    /**
     * Suggested dates: first weekday on/after the 1st (16th) to last weekday on/before the 15th (month end).
     * Holidays stay inside the range; a holiday not worked is no work, no pay.
     *
     * @return array{from: CarbonImmutable, to: CarbonImmutable}
     */
    public static function suggest(string $month, string $cutoff): array
    {
        [$start, $end] = self::half($month, $cutoff);
        $from = $start;
        while ($from->isWeekend()) {
            $from = $from->addDay();
        }
        $to = $end;
        while ($to->isWeekend()) {
            $to = $to->subDay();
        }

        return ['from' => $from, 'to' => $to];
    }

    /**
     * The DTR days a cutoff pays: the day after the previous cutoff's suggested end through $to,
     * so each day belongs to exactly one cutoff (weekend workers included).
     *
     * @return array{from: CarbonImmutable, to: CarbonImmutable}
     */
    public static function window(string $month, string $cutoff, CarbonInterface $to): array
    {
        $first = CarbonImmutable::createFromFormat('!Y-m', $month);
        $previous = $cutoff === 'first'
            ? self::suggest($first->subMonth()->format('Y-m'), 'second')
            : self::suggest($month, 'first');

        return ['from' => $previous['to']->addDay(), 'to' => CarbonImmutable::parse($to->toDateString())];
    }

    public static function withinHalf(CarbonInterface $from, CarbonInterface $to, string $month, string $cutoff): bool
    {
        [$start, $end] = self::half($month, $cutoff);
        $fromDay = $from->toDateString();
        $toDay = $to->toDateString();

        return $fromDay <= $toDay && $fromDay >= $start->toDateString() && $toDay <= $end->toDateString();
    }

    public static function canSaveOn(CarbonInterface $to, CarbonInterface $today): bool
    {
        return $today->toDateString() > $to->toDateString();
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private static function half(string $month, string $cutoff): array
    {
        $first = CarbonImmutable::createFromFormat('!Y-m', $month);

        return $cutoff === 'first'
            ? [$first, $first->setDay(15)]
            : [$first->setDay(16), $first->endOfMonth()->startOfDay()];
    }

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
