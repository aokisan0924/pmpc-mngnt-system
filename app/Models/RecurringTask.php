<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class RecurringTask extends Model
{
    public const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

    /** Days before the due date that a copy appears, when the admin does not choose. */
    public const DEFAULT_LEAD_DAYS = ['daily' => 0, 'weekly' => 2, 'monthly' => 7, 'yearly' => 14];

    protected $fillable = [
        'created_by', 'employee_id', 'office', 'title', 'description', 'category', 'priority', 'frequency',
        'day_of_week', 'day_of_month', 'last_day_of_month', 'month', 'lead_days', 'show_as_span', 'starts_on', 'ends_on',
        'active', 'last_due_date',
    ];

    protected $casts = [
        'starts_on' => 'date',
        'ends_on' => 'date',
        'last_due_date' => 'date',
        'active' => 'boolean',
        'last_day_of_month' => 'boolean',
        'show_as_span' => 'boolean',
    ];

    /** A copy's start date: its due date minus the days it shows early, when this rule shows them as a span. */
    public function spanStartFor(CarbonImmutable $due): ?string
    {
        return $this->show_as_span ? $due->subDays((int) $this->lead_days)->toDateString() : null;
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    /** The people on a shared rule (no person, no office). */
    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(Employee::class, 'recurring_task_assignees');
    }

    /** The first due date after $date that this rule produces, or null if the rule has ended by then. */
    public function nextDueAfter(CarbonImmutable $date): ?CarbonImmutable
    {
        $date = $date->startOfDay();

        $next = match ($this->frequency) {
            'daily' => $date->addDay(),
            'weekly' => $this->nextWeekday($date),
            'monthly' => $this->nextMonthly($date),
            'yearly' => $this->nextYearly($date),
            default => null,
        };

        return $next !== null && ($this->ends_on === null || $next->lte($this->ends_on)) ? $next : null;
    }

    /** "Repeats monthly on the 5th" style text for the detail window. */
    public function label(): string
    {
        return match ($this->frequency) {
            'daily' => 'Repeats daily',
            'weekly' => 'Repeats weekly on '.['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][(int) $this->day_of_week],
            'monthly' => 'Repeats monthly on '.($this->last_day_of_month ? 'the last day' : 'the '.$this->ordinal((int) $this->day_of_month)),
            'yearly' => 'Repeats yearly on '.CarbonImmutable::create(2000, (int) $this->month, 1)->format('F').' '.$this->day_of_month,
            default => 'Repeats',
        };
    }

    private function nextWeekday(CarbonImmutable $date): CarbonImmutable
    {
        $days = ((int) $this->day_of_week - $date->dayOfWeek + 7) % 7;

        return $date->addDays($days === 0 ? 7 : $days);
    }

    private function nextMonthly(CarbonImmutable $date): CarbonImmutable
    {
        for ($i = 0; $i < 13; $i++) {
            $month = $date->startOfMonth()->addMonthsNoOverflow($i);
            $candidate = $this->last_day_of_month
                ? $month->endOfMonth()->startOfDay()
                : $month->day(min((int) $this->day_of_month, $month->daysInMonth));

            if ($candidate->gt($date)) {
                return $candidate;
            }
        }

        return $date->addMonthNoOverflow();
    }

    private function nextYearly(CarbonImmutable $date): CarbonImmutable
    {
        for ($i = 0; $i < 3; $i++) {
            $month = CarbonImmutable::create($date->year + $i, (int) $this->month, 1);
            $candidate = $month->day(min((int) $this->day_of_month, $month->daysInMonth));

            if ($candidate->gt($date)) {
                return $candidate;
            }
        }

        return $date->addYear();
    }

    private function ordinal(int $n): string
    {
        $suffix = ($n % 100 >= 11 && $n % 100 <= 13) ? 'th' : [1 => 'st', 2 => 'nd', 3 => 'rd'][$n % 10] ?? 'th';

        return $n.$suffix;
    }
}
