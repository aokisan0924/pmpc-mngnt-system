<?php

declare(strict_types=1);

namespace App\Services;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

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
     * The DTR days a cutoff pays: the day after the previous cutoff's end (saved, else suggested) through $to,
     * so each day belongs to exactly one cutoff (weekend workers included).
     *
     * @return array{from: CarbonImmutable, to: CarbonImmutable}
     */
    public static function window(string $month, string $cutoff, CarbonInterface $to, ?CarbonInterface $previousTo = null): array
    {
        $first = CarbonImmutable::createFromFormat('!Y-m', $month);
        $previous = $cutoff === 'first'
            ? self::suggest($first->subMonth()->format('Y-m'), 'second')
            : self::suggest($month, 'first');
        // A saved previous batch wins over the suggestion, so an edited end date never drops or repeats a day.
        $end = $previousTo !== null ? CarbonImmutable::parse($previousTo->toDateString()) : $previous['to'];

        return ['from' => $end->addDay(), 'to' => CarbonImmutable::parse($to->toDateString())];
    }

    /** @return array{0: string, 1: string} month and cutoff of the cutoff before this one */
    public static function previous(string $month, string $cutoff): array
    {
        return $cutoff === 'first'
            ? [CarbonImmutable::createFromFormat('!Y-m', $month)->subMonth()->format('Y-m'), 'second']
            : [$month, 'first'];
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
}
