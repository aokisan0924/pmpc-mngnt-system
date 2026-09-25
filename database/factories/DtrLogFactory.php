<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\DtrLog;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DtrLog>
 */
class DtrLogFactory extends Factory
{
    protected $model = DtrLog::class;

    public function definition(): array
    {
        return [
            'employee_id' => Employee::factory(),
            'date' => now()->toDateString(),
            'am_time_in' => '08:00:00',
            'am_time_out' => '12:00:00',
            'pm_time_in' => '13:00:00',
            'pm_time_out' => '17:00:00',
            'hours_rendered' => 8.0,
            'status' => 'on_time',
            'ip_address' => '127.0.0.1',
        ];
    }

    public function partialMorning(): static
    {
        return $this->state(fn (array $attributes) => [
            'am_time_in' => '08:00:00',
            'am_time_out' => null,
            'pm_time_in' => null,
            'pm_time_out' => null,
            'hours_rendered' => 0.0,
            'status' => 'half_day',
        ]);
    }
}
