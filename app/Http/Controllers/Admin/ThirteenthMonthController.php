<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreThirteenthMonthRequest;
use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\ThirteenthMonthPay;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ThirteenthMonthController extends Controller
{
    public function index(): Response
    {
        $records = ThirteenthMonthPay::with(['employee', 'processor'])
            ->orderBy('year', 'desc')
            ->orderByRaw("CASE tranche WHEN 'year_end' THEN 1 WHEN 'mid_year' THEN 2 ELSE 3 END")
            ->get()
            ->groupBy(fn ($r) => $r->year.'_'.$r->tranche)
            ->map(fn ($group) => [
                'year' => $group->first()->year,
                'tranche' => $group->first()->tranche,
                'tranche_label' => $group->first()->trancheLabel(),
                'period_from' => $group->first()->period_from->format('M d, Y'),
                'period_to' => $group->first()->period_to->format('M d, Y'),
                'status' => $group->first()->status,
                'total_payout' => $group->sum('thirteenth_month_pay'),
                'employee_count' => $group->count(),
                'processed_by' => $group->first()->processor->full_name,
                'created_at' => $group->first()->created_at->format('M d, Y'),
                'batch_key' => $group->first()->year.'_'.$group->first()->tranche,
            ])
            ->values();

        return Inertia::render('Admin/ThirteenthMonth', [
            'records' => $records,
        ]);
    }

    public function compute(Request $request): Response
    {
        $year = (int) $request->query('year', now()->year);
        $tranche = $request->query('tranche', 'year_end');

        if ($tranche === 'mid_year') {
            $from = Carbon::create($year, 1, 1)->startOfDay();
            $to = Carbon::create($year, 6, 30)->endOfDay();
        } else {
            $from = Carbon::create($year, 7, 1)->startOfDay();
            $to = Carbon::create($year, 12, 31)->endOfDay();
        }

        $employees = Employee::where('is_staff', true)
            ->where('status', 'active')
            ->get()
            ->map(function ($emp) use ($from, $to, $year, $tranche) {
                $daysPresent = DtrLog::where('employee_id', $emp->id)
                    ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
                    ->whereNotIn('status', ['absent'])
                    ->sum(DB::raw("CASE WHEN status = 'half_day' THEN 0.5 ELSE 1 END"));

                $totalBasicPay = round($emp->daily_rate * $daysPresent, 2);
                $thirteenthMonthPay = round($totalBasicPay / 12, 2);

                $existing = ThirteenthMonthPay::where('employee_id', $emp->id)
                    ->where('year', $year)
                    ->where('tranche', $tranche)
                    ->first();

                return [
                    'id' => $emp->id,
                    'employee_id' => $emp->employee_id,
                    'full_name' => $emp->full_name,
                    'initials' => $emp->initials,
                    'department' => $emp->department,
                    'position' => $emp->position,
                    'daily_rate' => $emp->daily_rate,
                    'days_present' => $daysPresent,
                    'total_basic_pay' => $totalBasicPay,
                    'thirteenth_month_pay' => $thirteenthMonthPay,
                    'already_processed' => $existing !== null,
                    'existing_status' => $existing?->status,
                ];
            });

        return Inertia::render('Admin/ThirteenthMonthCompute', [
            'employees' => $employees,
            'year' => $year,
            'tranche' => $tranche,
            'tranche_label' => $tranche === 'mid_year' ? 'Mid-year (Jan – Jun)' : 'Year-end (Jul – Dec)',
            'period_from' => $from->format('M d, Y'),
            'period_to' => $to->format('M d, Y'),
        ]);
    }

    public function store(StoreThirteenthMonthRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request) {
            foreach ($validated['items'] as $item) {
                ThirteenthMonthPay::updateOrCreate(
                    [
                        'employee_id' => $item['employee_id'],
                        'year' => $validated['year'],
                        'tranche' => $validated['tranche'],
                    ],
                    [
                        'period_from' => $validated['period_from'],
                        'period_to' => $validated['period_to'],
                        'days_present' => $item['days_present'],
                        'daily_rate' => $item['daily_rate'],
                        'total_basic_pay' => $item['total_basic_pay'],
                        'thirteenth_month_pay' => $item['thirteenth_month_pay'],
                        'status' => 'draft',
                        'processed_by' => $request->user()->id,
                    ]
                );
            }
        });

        return redirect()->route('admin.thirteenth-month.show', [
            'year' => $validated['year'],
            'tranche' => $validated['tranche'],
        ])->with('success', '13th month pay computed and saved successfully.');
    }

    public function show(Request $request): Response
    {
        $year = (int) $request->query('year', now()->year);
        $tranche = $request->query('tranche', 'year_end');

        $records = ThirteenthMonthPay::with('employee')
            ->where('year', $year)
            ->where('tranche', $tranche)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'employee_id' => $r->employee->employee_id,
                'full_name' => $r->employee->full_name,
                'initials' => $r->employee->initials,
                'department' => $r->employee->department,
                'position' => $r->employee->position,
                'daily_rate' => $r->daily_rate,
                'days_present' => $r->days_present,
                'total_basic_pay' => $r->total_basic_pay,
                'thirteenth_month_pay' => $r->thirteenth_month_pay,
                'status' => $r->status,
            ]);

        $first = ThirteenthMonthPay::where('year', $year)
            ->where('tranche', $tranche)
            ->first();

        return Inertia::render('Admin/ThirteenthMonthShow', [
            'records' => $records,
            'year' => $year,
            'tranche' => $tranche,
            'tranche_label' => $first?->trancheLabel() ?? '',
            'period_from' => $first?->period_from->format('M d, Y') ?? '',
            'period_to' => $first?->period_to->format('M d, Y') ?? '',
            'status' => $first?->status ?? 'draft',
            'total_payout' => $records->sum('thirteenth_month_pay'),
        ]);
    }

    public function finalize(Request $request): RedirectResponse
    {
        $request->validate([
            'year' => ['required', 'integer'],
            'tranche' => ['required', 'in:mid_year,year_end'],
        ]);

        $updated = ThirteenthMonthPay::where('year', $request->year)
            ->where('tranche', $request->tranche)
            ->where('status', 'draft')
            ->update([
                'status' => 'finalized',
                'finalized_at' => now(),
            ]);

        if ($updated === 0) {
            return back()->withErrors(['error' => 'No draft records found to finalize.']);
        }

        return back()->with('success', '13th month pay finalized for '.$updated.' employees.');
    }
}
