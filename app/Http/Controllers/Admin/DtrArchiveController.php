<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DtrArchiveController extends Controller
{
    private const DIR = 'dtr_archives';

    public function index(): \Inertia\Response {
        $disk = Storage::disk('local');

        $archives = collect($disk->files(self::DIR))
            ->filter(fn($path) => str_ends_with($path, '.zip'))
            ->map(function ($path) use ($disk) {
                $month = basename($path, '.zip');

                return [
                    'month'       => $month,
                    'month_label' => Carbon::parse($month . '-01')->format('F Y'),
                    'size'        => $this->formatBytes($disk->size($path)),
                    'created_at'  => Carbon::createFromTimestamp($disk->lastModified($path))->format('M d, Y h:i A'),
                ];
            })
            ->sortByDesc('month')
            ->values();

        return Inertia::render('Admin/Archives', [
            'archives'    => $archives,
            'last_month'  => now()->subMonth()->format('Y-m'),
        ]);
    }

    public function generate(Request $request): RedirectResponse {
        $request->validate([
            'month' => ['required', 'date_format:Y-m'],
        ]);

        Artisan::call('dtr:archive', ['--month' => $request->month]);

        return back()->with('success', "DTR archive generated for {$request->month}.");
    }

    public function download(string $month): BinaryFileResponse|RedirectResponse {
        if (! preg_match('/^\d{4}-\d{2}$/', $month)) {
            abort(404);
        }

        $path = self::DIR . "/{$month}.zip";

        if (! Storage::disk('local')->exists($path)) {
            return back()->withErrors(['error' => "No archive found for {$month}."]);
        }

        return response()->download(
            Storage::disk('local')->path($path),
            "DTR_Archive_{$month}.zip"
        );
    }

    private function formatBytes(int $bytes): string {
        if ($bytes >= 1048576) return round($bytes / 1048576, 1) . ' MB';
        if ($bytes >= 1024)    return round($bytes / 1024, 1) . ' KB';
        return $bytes . ' B';
    }
}