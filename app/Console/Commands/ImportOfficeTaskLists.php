<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * One-off import of Kurt's Google Tasks lists (2026-11-04). Dry run by default;
 * safe to run again because it skips tasks that already exist.
 */
class ImportOfficeTaskLists extends Command
{
    protected $signature = 'tasks:import-office-lists {--apply : Create the tasks (default is a dry run)}';

    protected $description = 'Import the Xander, Reynold and team task lists as admin-assigned and office-wide tasks';

    private const ASSIGNER = 'EMP-0002';

    private const UNDATED = '2026-11-04';

    /**
     * `owners` are employee codes. A task with no owners is for the whole office of its list.
     *
     * @return array<int, array<string, mixed>>
     */
    private function lists(): array
    {
        return [
            ['list' => 'Xander', 'office' => null, 'owners' => ['2022-00003'], 'tasks' => [
                ['Billing Active', '1. Erica Ibasco RL', '2026-11-05'],
                ['Remmittance Active (august and October)', '1. Travel toFort Bonifacio', '2026-11-04'],
                ['NOV. 3 SCHEDULE', "DELIVERY OF DEMAND LETTER\n1. DUYAO - LBC (XANDER)\n2. VILLAFLOR - Delivered", '2026-11-06'],
                ['CDEA COLLECTION', '1. COLLECTION FOR THE MONTH OF SEPT. AND OCTOBER 2026', '2026-11-06'],
                ['PARAMOUNT INSURANCE :', '1. COMPLETION OF BILLING NOV. 5 LAST DATE', '2026-11-07'],
            ]],
            ['list' => 'Reynold', 'office' => null, 'owners' => ['EMP-0001'], 'tasks' => [
                ['Generate GC for Updates on Capital Contribution and savings deposit', '1. indicate Xander(Me), Mariel, Yvon', null],
                ['Proposal Giveaways for members', "1. discuss on management meeting\n2. create proposals of amount to be given", '2026-11-06'],
                ['proposal of Dates ( Christmas Party & Year End party)', "1. do a proposal dates\n2. discuss in the upcoming meeting Nov 9 2026", '2026-11-06'],
                ['Reynold', "Take note Dismemberment July 26 2026\nRenato Batuccan\n1. Check if the board already approve his dismemberment from august to oct 2026\n2. if not request for release of capital contribution due to long pending request\n3. take note and discuss on the upcoming board meeting", '2026-11-04'],
            ]],
            ['list' => 'Team Isabela', 'office' => 'main_office', 'owners' => [], 'tasks' => [
                ['Yvon and Jerome', "1. Gather all Loan transactions LRV and update the Capital Contribution / Savings of all Loaner Members\n(Seek Assistance of LRV Cubao (Kath), fortmag (Dianna))", null, ['2026-00025', '2026-00026']],
                ['New Loans Deposit', '1. update the updated CC,Savings and Time deposit base on specific loans (Inform Sir Reynold Before input Data)', '2026-11-04'],
                ['LRV', '1. BAQUIRAN INFORMATION', '2026-11-04'],
                ['Assistance on planning', "1. assist reynold on planning the christmas party and year end\n2. provide proposals on (venue, program, giveaways)", '2026-11-06'],
            ]],
            ['list' => 'Team Fortmag', 'office' => 'fort_magsaysay', 'owners' => [], 'tasks' => [
                ['Facebook Page Monitoring', '1. Respond on', null],
                ['new loans deposits', '1. update the updated CC,Savings and Time deposit base on specific loans (Inform Sir Reynold Before input Data)', '2026-11-04'],
                ['Validating information on PIS', "1. Dianna and Mariel Assist Kurt on Validating information from PIS\n2. Use the scanned copies as your primary reference", '2026-11-06', ['2026-00028', '2026-00027']],
                ['Update LRV', '1. update informations on lrv', '2026-11-04'],
            ]],
            ['list' => 'Team Cubao', 'office' => 'cubao', 'owners' => [], 'tasks' => [
                ['Kath', "1. Update CC, per loan transactions here at cubao.\n2. Call Reynold: Request for Policy on Withdrawal on share capital and find the bylaws of 60 days of release of Capcon upon approval of dismemberment.", '2026-11-07', ['EMP-0003']],
                ['Kurt', "1. make a list of regular members usernames and password put in excel (see assitance to Fortmag and Isabela)\n\n2. indicate as mobile numbers and email address or Facebook accounts as well\n3. Make a progress report of the PIS and all the systems that you are handling.", '2026-11-06', ['EMP-0002']],
            ]],
        ];
    }

    public function handle(): int
    {
        $codes = collect($this->lists())
            ->flatMap(fn (array $list) => collect($list['tasks'])->flatMap(fn (array $task) => $task[3] ?? $list['owners']))
            ->push(self::ASSIGNER)
            ->unique()
            ->values();

        $employees = Employee::whereIn('employee_id', $codes)->get()->keyBy('employee_id');
        $missing = $codes->diff($employees->keys());

        if ($missing->isNotEmpty()) {
            $this->error('Employees not found, nothing was written: '.$missing->implode(', '));

            return self::FAILURE;
        }

        $rows = $this->rows($employees);
        $assignerId = $employees[self::ASSIGNER]->id;
        $apply = (bool) $this->option('apply');

        $this->table(['List', 'Task', 'For', 'Due', 'Status'], $rows->map(fn (array $row) => [
            $row['category'],
            $row['title'],
            $row['employee_id'] === null ? 'Whole office: '.(Task::OFFICES[$row['office']] ?? $row['office']) : $employees->firstWhere('id', $row['employee_id'])->first_name,
            $row['due_date'],
            $this->exists($row) ? 'already there' : 'new',
        ])->all());

        $new = $rows->reject(fn (array $row) => $this->exists($row));

        if (! $apply) {
            $this->info("{$rows->count()} task(s) planned ({$new->count()} new). Dry run, nothing written; rerun with --apply.");

            return self::SUCCESS;
        }

        DB::transaction(fn () => $new->each(fn (array $row) => Task::create([...$row, 'assigned_by' => $assignerId, 'priority' => 'medium', 'status' => 'pending'])));

        $this->info("{$new->count()} created, ".($rows->count() - $new->count()).' already existed.');

        return self::SUCCESS;
    }

    /** @return Collection<int, array<string, mixed>> */
    private function rows($employees)
    {
        $rows = collect();

        foreach ($this->lists() as $list) {
            foreach ($list['tasks'] as $task) {
                [$title, $description, $due] = $task;
                $owners = $task[3] ?? $list['owners'];

                $base = [
                    'title' => $title,
                    'description' => $description,
                    'due_date' => $due ?? self::UNDATED,
                    'category' => $list['list'],
                ];

                if ($owners === []) {
                    $rows->push([...$base, 'employee_id' => null, 'office' => $list['office']]);

                    continue;
                }

                foreach ($owners as $code) {
                    $employee = $employees[$code];
                    $rows->push([...$base, 'employee_id' => $employee->id, 'office' => $list['office'] ?? $employee->payroll_office]);
                }
            }
        }

        return $rows;
    }

    /** @param  array<string, mixed>  $row */
    private function exists(array $row): bool
    {
        return Task::where('title', $row['title'])
            ->where('category', $row['category'])
            ->where('employee_id', $row['employee_id'])
            ->where('office', $row['office'])
            ->exists();
    }
}
