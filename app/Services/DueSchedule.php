<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Due;
use App\Models\DueOccurrence;
use Carbon\CarbonImmutable;

class DueSchedule
{
    /**
     * Makes sure every active monthly due has its line for the given month. Safe to call on every page view:
     * the unique (due_id, due_date) index and firstOrCreate stop duplicates. No lines before a due existed.
     */
    public function ensureMonth(CarbonImmutable $month): void
    {
        $month = $month->startOfMonth();

        Due::where('active', true)->where('frequency', 'monthly')->get()->each(function (Due $due) use ($month): void {
            if ($month->lt(CarbonImmutable::parse($due->created_at)->startOfMonth())) {
                return;
            }

            DueOccurrence::firstOrCreate(
                ['due_id' => $due->id, 'due_date' => $due->dateIn($month)->toDateString()],
                ['amount' => $due->amount],
            );
        });
    }
}
