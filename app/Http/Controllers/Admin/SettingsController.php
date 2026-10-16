<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use App\Models\Holiday;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(): Response
    {
        $keys = array_keys(Setting::defaults());
        $settings = Setting::getMany($keys);

        // Fill in any missing keys with defaults
        foreach (Setting::defaults() as $key => $default) {
            if (! isset($settings[$key]) || $settings[$key] === null) {
                $settings[$key] = $default;
            }
        }

        return Inertia::render('Admin/Settings', [
            'settings' => $settings,
            'holidays' => Holiday::whereYear('date', '>=', now()->year - 1)->orderBy('date')->get()
                ->map(fn (Holiday $holiday): array => [
                    'id' => $holiday->id,
                    'date' => $holiday->date->toDateString(),
                    'label' => $holiday->date->format('D, M d, Y'),
                    'name' => $holiday->name,
                    'type' => $holiday->type,
                ]),
            'holidayTypes' => collect(Holiday::TYPES)->map(fn (array $type): string => $type['label']),
        ]);
    }

    public function update(UpdateSettingsRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated): void {
            foreach ($validated as $key => $value) {
                Setting::query()->updateOrCreate(['key' => $key], ['value' => $value]);
            }
        });

        foreach (array_keys($validated) as $key) {
            Cache::forget("setting_{$key}");
        }

        return back()->with('success', 'Settings saved successfully.');
    }
}
