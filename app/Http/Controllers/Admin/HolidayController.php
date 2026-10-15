<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreHolidayRequest;
use App\Models\Holiday;
use Illuminate\Http\RedirectResponse;

class HolidayController extends Controller
{
    public function store(StoreHolidayRequest $request): RedirectResponse
    {
        Holiday::create($request->validated());

        return back()->with('success', 'Holiday added.');
    }

    public function destroy(Holiday $holiday): RedirectResponse
    {
        $holiday->delete();

        return back()->with('success', 'Holiday removed.');
    }
}
