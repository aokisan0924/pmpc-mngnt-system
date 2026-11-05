<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A bill or payment that comes due on a schedule (every month, or once). */
class Due extends Model
{
    protected $fillable = [
        'title', 'notes', 'office', 'amount', 'frequency', 'day_of_month', 'last_day_of_month',
        'due_on', 'active', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'due_on' => 'date',
            'active' => 'boolean',
            'last_day_of_month' => 'boolean',
        ];
    }

    public function occurrences(): HasMany
    {
        return $this->hasMany(DueOccurrence::class);
    }

    /** The due date of this monthly due in the given month (day 31 clamps to the month's length). */
    public function dateIn(CarbonImmutable $month): CarbonImmutable
    {
        $month = $month->startOfMonth();

        return $this->last_day_of_month
            ? $month->endOfMonth()->startOfDay()
            : $month->day(min((int) $this->day_of_month, $month->daysInMonth));
    }

    public function scheduleLabel(): string
    {
        if ($this->frequency === 'once') {
            return 'One time on '.$this->due_on?->format('M d, Y');
        }

        if ($this->last_day_of_month) {
            return 'Every month on the last day';
        }

        $d = (int) $this->day_of_month;
        $suffix = ($d % 100 >= 11 && $d % 100 <= 13) ? 'th' : match ($d % 10) {
            1 => 'st', 2 => 'nd', 3 => 'rd', default => 'th',
        };

        return "Every month on the {$d}{$suffix}";
    }
}
