<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Get a setting value by key with optional default.
     */
    public static function get(string $key, mixed $default = null): mixed {
        return Cache::remember("setting_{$key}", 3600, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });
    }

    /**
     * Set a setting value and clear its cache.
     */
    public static function set(string $key, mixed $value): void {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget("setting_{$key}");
    }

    /**
     * Get multiple settings as an array.
     */
    public static function getMany(array $keys): array {
        return collect($keys)->mapWithKeys(
            fn($key) => [$key => static::get($key)]
        )->toArray();
    }

    /**
     * All default settings.
     */
    public static function defaults(): array {
        return [
            // Cooperative info
            'coop_name'           => "People's Multi-Purpose Cooperative",
            'coop_address'        => 'Stall #2 Principe Building, Maharlika Highway, Upi, Gamu, Isabela',
            'coop_email'          => '',
            'coop_phone'          => '',

            // Signatories on DTR print
            'signatory_1_name'    => 'Michaela P. Mauanay',
            'signatory_1_role'    => 'Accounting Clerk',
            'signatory_2_name'    => 'Alexander L. Feria, CPA, MNSA',
            'signatory_2_role'    => 'President',

            // Shift
            'shift_start'         => '08:00',
            'shift_end'           => '17:00',
            'lunch_start'         => '12:00',
            'lunch_end'           => '13:00',

            // Payroll
            'working_days_month'  => '22',
            'late_grace_minutes'  => '0',
        ];
    }
}