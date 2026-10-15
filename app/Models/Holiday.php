<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    /** Reference only: holiday pay is entered on the payroll form, not calculated. */
    public const TYPES = [
        'regular' => ['label' => 'Regular holiday'],
        'special' => ['label' => 'Special non-working holiday'],
        'announced' => ['label' => 'Announced (proclaimed) holiday'],
    ];

    protected $fillable = ['date', 'name', 'type'];

    protected $casts = ['date' => 'date'];

    /** @return array<string, string> date => type, cached for the request */
    public static function calendar(): array
    {
        return once(fn (): array => static::query()->pluck('type', 'date')
            ->mapWithKeys(fn (string $type, $date): array => [substr((string) $date, 0, 10) => $type])
            ->all());
    }

    public static function typeOn(CarbonInterface $date): ?string
    {
        return static::calendar()[$date->toDateString()] ?? null;
    }
}
