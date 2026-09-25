<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\DtrEditRequest;
use App\Models\DtrLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DtrEditRequest>
 */
class DtrEditRequestFactory extends Factory
{
    protected $model = DtrEditRequest::class;

    public function definition(): array
    {
        return [
            'dtr_log_id' => DtrLog::factory(),
            'employee_id' => fn (array $attrs) => DtrLog::find($attrs['dtr_log_id'])->employee_id,
            'original_am_time_in' => '08:00:00',
            'original_am_time_out' => '12:00:00',
            'original_pm_time_in' => '13:00:00',
            'original_pm_time_out' => '17:00:00',
            'requested_am_time_in' => '08:00:00',
            'requested_am_time_out' => '12:00:00',
            'requested_pm_time_in' => '13:00:00',
            'requested_pm_time_out' => '17:00:00',
            'reason' => 'Forgot to punch out earlier',
            'status' => 'pending',
            'admin_note' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ];
    }
}
