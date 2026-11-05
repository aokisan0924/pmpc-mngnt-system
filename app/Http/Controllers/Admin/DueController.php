<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\DueAmountRequest;
use App\Http\Requests\DueRequest;
use App\Http\Requests\PayDueRequest;
use App\Models\Due;
use App\Models\DueOccurrence;
use App\Models\Task;
use App\Services\DueSchedule;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DueController extends Controller
{
    public function index(Request $request, DueSchedule $schedule): Response
    {
        $today = CarbonImmutable::now('Asia/Manila')->startOfDay();
        $month = preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', (string) $request->query('month'))
            ? CarbonImmutable::createFromFormat('!Y-m', (string) $request->query('month'), 'Asia/Manila')
            : $today->startOfMonth();

        $schedule->ensureMonth($month);

        $rows = DueOccurrence::with('due:id,title,notes,office')
            ->whereBetween('due_date', [$month->startOfMonth()->toDateString(), $month->endOfMonth()->toDateString()])
            ->orderBy('due_date')
            ->orderBy('id')
            ->get();

        $occurrences = $rows->map(function (DueOccurrence $o) use ($today): array {
            $days = (int) $today->diffInDays($o->due_date->startOfDay(), false);

            return [
                'id' => $o->id,
                'title' => $o->due->title,
                'notes' => $o->due->notes,
                'office_label' => Task::OFFICES[$o->due->office] ?? null,
                'due_date' => $o->due_date->toDateString(),
                'due_label' => $o->due_date->format('M d'),
                'amount' => $o->amount,
                'status' => $o->isPaid() ? 'paid' : ($days < 0 ? 'overdue' : ($days <= 7 ? 'soon' : 'upcoming')),
                'days' => $days,
                'paid_at' => $o->paid_at?->toDateString(),
                'paid_label' => $o->paid_at?->format('M d'),
                'paid_amount' => $o->paid_amount,
                'paid_note' => $o->paid_note,
            ];
        })->values();

        $open = $rows->reject->isPaid();

        return Inertia::render('Admin/Dues', [
            'month' => $month->format('Y-m'),
            'monthLabel' => $month->format('F Y'),
            'prevMonth' => $month->subMonthNoOverflow()->format('Y-m'),
            'nextMonth' => $month->addMonthNoOverflow()->format('Y-m'),
            'today' => $today->toDateString(),
            'occurrences' => $occurrences,
            'summary' => [
                'count' => $rows->count(),
                'total' => (float) $rows->sum(fn (DueOccurrence $o) => (float) ($o->isPaid() ? ($o->paid_amount ?? $o->amount) : $o->amount)),
                'paid' => (float) $rows->filter->isPaid()->sum(fn (DueOccurrence $o) => (float) ($o->paid_amount ?? $o->amount)),
                'paidCount' => $rows->filter->isPaid()->count(),
                'remaining' => (float) $open->sum(fn (DueOccurrence $o) => (float) $o->amount),
                'overdue' => $occurrences->where('status', 'overdue')->count(),
                'noAmount' => $rows->filter(fn (DueOccurrence $o) => $o->amount === null && ! $o->isPaid())->count(),
            ],
            'dues' => Due::orderByDesc('active')->orderBy('title')->get()->map(fn (Due $d) => [
                'id' => $d->id,
                'title' => $d->title,
                'notes' => $d->notes,
                'office' => $d->office,
                'office_label' => Task::OFFICES[$d->office] ?? null,
                'amount' => $d->amount,
                'frequency' => $d->frequency,
                'day_of_month' => $d->day_of_month,
                'last_day_of_month' => $d->last_day_of_month,
                'due_on' => $d->due_on?->toDateString(),
                'active' => $d->active,
                'schedule' => $d->scheduleLabel(),
            ])->values(),
            'offices' => collect(Task::OFFICES)->map(fn (string $label, string $key) => ['key' => $key, 'label' => $label])->values(),
        ]);
    }

    public function store(DueRequest $request, DueSchedule $schedule): RedirectResponse
    {
        $due = Due::create([...$this->fields($request), 'created_by' => $request->user()->id, 'active' => true]);

        if ($due->frequency === 'once') {
            $due->occurrences()->create(['due_date' => $due->due_on, 'amount' => $due->amount]);
        } else {
            $schedule->ensureMonth(CarbonImmutable::now('Asia/Manila'));
        }

        return back()->with('success', 'Due added.');
    }

    public function update(DueRequest $request, Due $due): RedirectResponse
    {
        $due->update($this->fields($request));

        return back()->with('success', 'Due updated. New amounts and dates apply from the next lines it makes.');
    }

    public function toggle(Due $due): RedirectResponse
    {
        $due->update(['active' => ! $due->active]);

        return back()->with('success', $due->active ? 'Due resumed.' : 'Due stopped. Its lines so far stay.');
    }

    public function destroy(Due $due): RedirectResponse
    {
        $due->delete();

        return back()->with('success', 'Due deleted with all its lines.');
    }

    public function amount(DueAmountRequest $request, DueOccurrence $occurrence): RedirectResponse
    {
        $occurrence->update(['amount' => $request->validated('amount')]);

        return back()->with('success', 'Amount saved for this month.');
    }

    public function pay(PayDueRequest $request, DueOccurrence $occurrence): RedirectResponse
    {
        $data = $request->validated();

        $occurrence->update([
            'paid_at' => $data['paid_at'],
            'paid_amount' => $data['paid_amount'] ?? $occurrence->amount,
            'paid_note' => $data['paid_note'] ?? null,
            'paid_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Marked as paid.');
    }

    public function unpay(DueOccurrence $occurrence): RedirectResponse
    {
        $occurrence->update(['paid_at' => null, 'paid_amount' => null, 'paid_note' => null, 'paid_by' => null]);

        return back()->with('success', 'Payment removed.');
    }

    /**
     * @return array<string, mixed>
     */
    private function fields(DueRequest $request): array
    {
        $data = $request->validated();
        $monthly = $data['frequency'] === 'monthly';
        $lastDay = $monthly && $request->boolean('last_day_of_month');

        return [
            'title' => $data['title'],
            'notes' => $data['notes'] ?? null,
            'office' => $data['office'] ?? null,
            'amount' => ($data['amount'] ?? '') === '' ? null : $data['amount'],
            'frequency' => $data['frequency'],
            'last_day_of_month' => $lastDay,
            'day_of_month' => $monthly && ! $lastDay ? $data['day_of_month'] : null,
            'due_on' => $monthly ? null : $data['due_on'],
        ];
    }
}
