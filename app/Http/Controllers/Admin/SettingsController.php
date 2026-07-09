<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(): Response {
        $keys     = array_keys(Setting::defaults());
        $settings = Setting::getMany($keys);

        // Fill in any missing keys with defaults
        foreach (Setting::defaults() as $key => $default) {
            if (! isset($settings[$key]) || $settings[$key] === null) {
                $settings[$key] = $default;
            }
        }

        return Inertia::render('Admin/Settings', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request): RedirectResponse {
        $validated = $request->validate([
            // Cooperative info
            'coop_name'           => ['required', 'string', 'max:200'],
            'coop_address'        => ['nullable', 'string', 'max:500'],
            'coop_email'          => ['nullable', 'email', 'max:100'],
            'coop_phone'          => ['nullable', 'string', 'max:30'],

            // Signatories
            'signatory_1_name'    => ['required', 'string', 'max:100'],
            'signatory_1_role'    => ['required', 'string', 'max:100'],
            'signatory_2_name'    => ['required', 'string', 'max:100'],
            'signatory_2_role'    => ['required', 'string', 'max:100'],

            // Shift
            'shift_start'         => ['required', 'date_format:H:i'],
            'shift_end'           => ['required', 'date_format:H:i'],
            'lunch_start'         => ['required', 'date_format:H:i'],
            'lunch_end'           => ['required', 'date_format:H:i'],

            // Payroll
            'working_days_month'  => ['required', 'integer', 'min:1', 'max:31'],
            'late_grace_minutes'  => ['required', 'integer', 'min:0', 'max:60'],
        ]);

        foreach ($validated as $key => $value) {
            Setting::set($key, $value);
        }

        return back()->with('success', 'Settings saved successfully.');
    }
}