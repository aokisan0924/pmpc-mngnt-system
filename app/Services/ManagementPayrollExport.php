<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use Carbon\CarbonImmutable;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;
use Throwable;
use ZipArchive;

/** Fill the management template with saved amounts, never current compensation calculations. */
class ManagementPayrollExport
{
    private ?\WeakMap $indexes = null;

    private const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    /** Office sheet number in the October-layout template; columns are found by header text. */
    private const SHEETS = ['main_office' => 1, 'fort_magsaysay' => 2, 'gen_mdse' => 3, 'cubao' => 4];

    private const CAPACITY = 6;

    private const FIRST_ROW = 11;

    /** Journal label prefixes (lower case, longest first) => amount key; debits are gross and employer. */
    private const JOURNAL = [
        'salaries and wages' => 'gross', 'sss, philhealth' => 'employer',
        'sss payable - emp' => 'sss', 'phil health payable - emp' => 'philhealth', 'pagibig contribution - emp' => 'pagibig',
        'wholding tax' => 'tax', 'sss payable' => 'sss', 'phil health payable' => 'philhealth', 'pagibig contribution' => 'pagibig',
        'loans re' => 'loan', 'interest income' => 'zero', 'share capital' => 'cc', 'rental income' => 'rental',
        'tardiness/absent' => 'tardiness_absent', 'savings deposit' => 'savings', 'cash advance' => 'cash',
        'advances to officers' => 'cash', "employees' benefit" => 'zero', 'other income' => 'other', 'cash in bank' => 'net',
    ];

    /** Notes and supplemental detail sit below the original layout and outside the print area. */
    private const DETAIL_ROW = 90;

    public function defaultSignatories(): array
    {
        $employees = Employee::where('status', 'active')->get(['id', 'employee_id', 'first_name', 'last_name', 'position']);
        $defaults = [
            // From November 2026: Reynold and Kurt prepare, Katherine certifies, the President approves (last).
            'prepared' => $employees->firstWhere('employee_id', 'EMP-0001')?->id,
            'prepared_2' => $employees->firstWhere('employee_id', 'EMP-0002')?->id,
            'certified' => $employees->first(fn (Employee $employee): bool => $employee->first_name === 'Katherine' && $employee->last_name === 'Sevilleno')?->id,
            'approved' => $employees->first(fn (Employee $employee): bool => $employee->first_name === 'Alexander L.' && $employee->last_name === 'Feria' && $employee->position === 'President')?->id,
        ];

        return ['first' => $defaults, 'second' => $defaults];
    }

    public function export(Payroll $selected, array $signatories = []): string
    {
        $signatories = array_replace_recursive($this->defaultSignatories(), $signatories);
        $signatureIds = collect($signatories)->flatMap(fn ($roles) => array_values($roles))->filter()->unique();
        $people = Employee::whereIn('id', $signatureIds)->get()->keyBy('id');
        if ($people->count() !== $signatureIds->count()) {
            $this->reject('A selected signatory is unavailable. Reload and choose again.');
        }
        $batches = Payroll::with('items.employee')->whereBetween('period_from', [
            $selected->period_from->copy()->startOfMonth()->toDateString(),
            $selected->period_from->copy()->endOfMonth()->toDateString(),
        ])->get();
        if ($batches->groupBy('cutoff')->contains(fn ($group) => $group->count() > 1)) {
            $this->reject('This month has duplicate cutoff batches. Resolve the duplicate before exporting.');
        }
        $items = $batches->flatMap->items;
        if ($items->isEmpty()) {
            $this->reject('There are no saved payroll items to export.');
        }
        foreach ($items as $item) {
            if (! isset(self::SHEETS[$item->payroll_office]) || ! $item->employee) {
                $this->reject('Every exported item needs a verified payroll office and employee. Historical items without an office cannot use this export.');
            }
            if (! isset(self::SHEETS[$this->exportOffice($item)])) {
                $this->reject('Every exported item needs a supported payroll section.');
            }
        }
        $itemsByOffice = $items->groupBy(fn (PayrollItem $item): string => $this->exportOffice($item));
        foreach (array_keys(self::SHEETS) as $office) {
            if ($itemsByOffice->get($office, collect())->pluck('employee_id')->unique()->count() > self::CAPACITY) {
                $this->reject(OfficePayrollCalculator::OFFICES[$office]['label'].' exceeds the supplied template capacity ('.self::CAPACITY.' employees). Expand the approved template before exporting; no rows have been omitted.');
            }
        }
        File::ensureDirectoryExists(storage_path('app/private'));
        $path = tempnam(storage_path('app/private'), 'management-payroll-');
        if ($path === false || ! copy(resource_path('payroll/management-template.xlsx'), $path)) {
            throw new \RuntimeException('Could not create the payroll export.');
        }
        $zip = new ZipArchive;
        try {
            if ($zip->open($path) !== true) {
                throw new \RuntimeException('Could not open the management template.');
            }
            $month = [];
            foreach (self::SHEETS as $office => $sheet) {
                $doc = $this->document($zip->getFromName('xl/worksheets/sheet'.$sheet.'.xml'));
                $texts = $this->texts($doc);
                $headers = [];
                foreach ($texts as $address => $text) {
                    [$col, $row] = self::split($address);
                    if ($row === 10) {
                        $headers[$col] = mb_strtoupper($text);
                    }
                }
                ksort($headers);
                $blocks = [];
                foreach ($headers as $col => $header) {
                    if ($header === 'EMPLOYEE NAME') {
                        $blocks[] = [];
                    }
                    if ($blocks !== []) {
                        $blocks[array_key_last($blocks)][$col] = str_starts_with($header, 'RENTAL') ? 'RENTAL' : $header;
                    }
                }
                $ot = collect($texts)->filter(fn (string $text, string $address): bool => self::split($address)[1] > 17 && in_array(mb_strtoupper($text), ['OVERTIME PAY', '1.3% OVERTIME'], true))
                    ->keys()->map(fn (string $address): array => self::split($address))->sortBy(0)->values();
                if (count($blocks) !== 6 || $ot->count() !== 4) {
                    throw new \RuntimeException('The management template layout is not recognised.');
                }
                $officeItems = $itemsByOffice->get($office, collect());
                $ids = $officeItems->sortBy(fn ($i) => mb_strtolower($i->employee->last_name.' '.$i->employee->first_name))->pluck('employee_id')->unique()->values();
                $sums = [];
                // Blocks: 1st grid, 2nd grid, 1st govt source, 1st deductions, 2nd deductions, 2nd govt source.
                foreach (['first' => ['grid' => 0, 'ded' => 3, 'govt' => 2], 'second' => ['grid' => 1, 'ded' => 4, 'govt' => 5]] as $cutoff => $parts) {
                    $batch = $batches->firstWhere('cutoff', $cutoff);
                    $this->put($doc, self::letter(array_key_first($blocks[$parts['grid']])).'9', $batch ? strtoupper($batch->period_from->format('F j').' - '.$batch->period_to->format('j, Y')) : 'CUTOFF NOT AVAILABLE');
                    $cutoffItems = $officeItems->where('cutoff', $cutoff);
                    $totals = [];
                    foreach ($ids as $offset => $id) {
                        $item = $cutoffItems->firstWhere('employee_id', $id);
                        if (! $item && $batch) {
                            $item = $this->blankItem($officeItems->firstWhere('employee_id', $id)->employee);
                        }
                        if (! $item) {
                            continue;
                        }
                        $values = $this->rowValues($item, $blocks[$parts['grid']], $blocks[$parts['govt']], $this->sheetName($item->employee, $office), $cutoff);
                        foreach ($parts as $kind => $index) {
                            foreach ($blocks[$index] as $col => $header) {
                                if (array_key_exists($header, $values[$kind])) {
                                    $value = $values[$kind][$header];
                                    $this->put($doc, self::letter($col).(self::FIRST_ROW + $offset), $value);
                                    if (! is_string($value)) {
                                        $totals[$col] = ($totals[$col] ?? 0) + $value;
                                    }
                                }
                            }
                        }
                        foreach ([0, 1] as $table) {
                            [$col, $row] = $ot[($cutoff === 'first' ? 0 : 2) + $table];
                            $hours = $table === 0 ? $item->weekday_ot_hours : $item->weekend_ot_hours;
                            $pay = $table === 0 ? $item->weekday_ot_pay : $item->weekend_ot_pay;
                            foreach ([$values['grid']['EMPLOYEE NAME'], (float) $hours, (float) $pay] as $j => $value) {
                                $this->put($doc, self::letter($col + $j).($row + 2 + $offset), $value);
                            }
                        }
                        foreach ($values['journal'] as $key => $amount) {
                            $sums[$key] = ($sums[$key] ?? 0) + $amount;
                        }
                    }
                    if ($batch) {
                        foreach ($totals as $col => $total) {
                            $this->put($doc, self::letter($col).(self::FIRST_ROW + self::CAPACITY), round($total, 2));
                        }
                    }
                }
                // Grid sign-offs sit left of the 1st govt table; in each pair the right half is the 2nd cutoff.
                foreach ($texts as $address => $text) {
                    if (preg_match('/^\{\{(prepared_2|prepared|certified|approved)(_title)?\}\}$/', $text, $marker)) {
                        $col = self::split($address)[0];
                        $second = $col < array_key_first($blocks[2]) ? $col >= array_key_first($blocks[1]) : $col >= $ot[2][0];
                        $cutoff = $second ? 'second' : 'first';
                        $person = $batches->firstWhere('cutoff', $cutoff) ? $people->get($signatories[$cutoff][$marker[1]] ?? null) : null;
                        $this->put($doc, $address, ($marker[2] ?? '') === '_title' ? ($person ? mb_strtoupper((string) $person->position) : null) : ($person ? $this->signName($person) : null));
                    }
                }
                $sums = array_map(fn (float|int $sum): float => round($sum, 2), $sums);
                $this->journal($doc, $texts, $sums);
                foreach ($sums as $key => $sum) {
                    $month[$key] = round(($month[$key] ?? 0) + $sum, 2);
                }
                $detail = self::DETAIL_ROW;
                $this->put($doc, 'B'.($detail - 2), 'Status: '.$batches->map(fn ($p) => $p->cutoff.' cutoff '.$p->status)->implode(', ').'. Saved figures only; gross includes entered holiday pay. Interest income from loans is not split by the system.');
                $this->put($doc, 'B'.($detail - 1), 'Supplemental detail (amounts without a dedicated column in the original layout). Not part of the printed payroll.');
                $detailHeaders = ['Employee ID', 'Employee', 'Cutoff', 'Paid days basis', 'Absence days', 'Transport', 'Representation', 'Quarterly', 'Weekday OT', 'Rest day OT', 'Savings', 'Other deductions', 'Tardiness', 'Cash advance', 'Holiday pay', 'Late minutes'];
                foreach ($detailHeaders as $j => $header) {
                    $this->put($doc, self::letter(2 + $j).$detail, $header);
                }
                foreach ($officeItems->values() as $offset => $item) {
                    $values = [$item->employee->employee_id, $item->employee->full_name, $item->cutoff, (float) $item->paid_days_basis, (float) $item->absence_days, $item->cutoff_transpo, $item->cutoff_rep, $item->cutoff_quarterly, $item->weekday_ot_pay, $item->weekend_ot_pay, $item->savings_deduction, $item->other_deductions, $item->tardiness_deduction, $item->cash_advance_deduction, $item->holiday_pay, (float) $item->tardiness_minutes];
                    foreach ($values as $j => $value) {
                        $this->put($doc, self::letter(2 + $j).($detail + 1 + $offset), $value);
                    }
                }
                $zip->addFromString('xl/worksheets/sheet'.$sheet.'.xml', $doc->saveXML());
            }
            $voucher = $this->document($zip->getFromName('xl/worksheets/sheet5.xml'));
            $monthEnd = $selected->period_from->copy()->endOfMonth()->format('n/j/Y');
            foreach (['I12', 'B15', 'C34'] as $cell) {
                $this->put($voucher, $cell, $monthEnd);
            }
            $this->put($voucher, 'H15', $month['gross'] ?? 0.0);
            // The voucher has no cash-advance or other-income row: book them with savings (row 25) so it balances.
            $month['savings_other'] = round(($month['savings'] ?? 0) + ($month['cash'] ?? 0) + ($month['other'] ?? 0), 2);
            if (($month['cash'] ?? 0) + ($month['other'] ?? 0) > 0) {
                $this->put($voucher, 'D25', '      Savings Deposit / Advances / Other Income');
            }
            $credits = [16 => 'tax', 17 => 'sss', 18 => 'philhealth', 19 => 'pagibig', 20 => 'cc', 21 => 'loan', 22 => 'zero', 23 => 'rental', 24 => 'tardiness_absent', 25 => 'savings_other', 26 => 'zero', 27 => 'net'];
            foreach ($credits as $row => $key) {
                $this->put($voucher, 'I'.$row, $month[$key] ?? 0.0);
            }
            $this->put($voucher, 'H28', $month['gross'] ?? 0.0);
            $this->put($voucher, 'I28', round(array_sum(array_map(fn (string $key): float => $month[$key] ?? 0.0, $credits)), 2));
            $this->put($voucher, 'D28', 'To record salaries and wages for the month of '.$selected->period_from->format('F Y'));
            // Prepared by: C31 and D31 side by side; Certified Correct: H31.
            foreach (['prepared' => 'C31', 'prepared_2' => 'D31', 'certified' => 'H31'] as $role => $cell) {
                $person = $people->get($signatories[$selected->cutoff][$role] ?? null);
                if ($person) {
                    $this->put($voucher, $cell, mb_strtoupper($this->signName($person)));
                }
            }
            $this->put($voucher, 'D32', $people->get($signatories[$selected->cutoff]['prepared_2'] ?? null)?->position);
            $this->put($voucher, 'H32', $people->get($signatories[$selected->cutoff]['certified'] ?? null)?->position);
            // October 2026 was voucher 0017; each month after counts up by one.
            $months = (int) CarbonImmutable::create(2026, 10, 1)->diffInMonths($selected->period_from->copy()->startOfMonth(), false);
            $this->put($voucher, 'I11', sprintf('%04d', max(1, 17 + $months)));
            $zip->addFromString('xl/worksheets/sheet5.xml', $voucher->saveXML());
            $book = $this->document($zip->getFromName('xl/workbook.xml'));
            $xpath = new DOMXPath($book);
            $xpath->registerNamespace('s', self::NS);
            $voucherSheet = $xpath->query('//s:sheet')->item(4);
            $oldName = $voucherSheet->getAttribute('name');
            $newName = strtoupper($selected->period_from->format('F Y')).' VOUCHER';
            $voucherSheet->setAttribute('name', $newName);
            // Defined names (the voucher print area) refer to the sheet by name, so follow the rename.
            foreach ($xpath->query('//s:definedName') as $definedName) {
                $definedName->nodeValue = str_replace("'".$oldName."'", "'".$newName."'", $definedName->nodeValue);
            }
            $zip->addFromString('xl/workbook.xml', $book->saveXML());
            if (! $zip->close()) {
                throw new \RuntimeException('Could not finish the payroll export.');
            }

            return $path;
        } catch (Throwable $error) {
            try {
                $zip->close();
            } catch (Throwable) {
                // Keep the original export error if the archive could not be opened.
            }
            @unlink($path);
            throw $error;
        }
    }

    /** One employee's cutoff row keyed by header (grid, deduction table, govt source table) plus journal amounts. */
    private function rowValues(PayrollItem $item, array $grid, array $govtHeaders, string $name, string $cutoff): array
    {
        $field = fn (string $key): float => (float) $item->{$key};
        $absence = $field('absence_deduction');
        $gridNpw = in_array('NPW- HOLIDAY', $grid, true) ? $field('nwnp_deduction') : 0.0;
        $gridAbsent = in_array('ABSENT', $grid, true) ? round($absence - $gridNpw, 2) : 0.0;
        $tableAbsent = round($absence - $gridNpw - $gridAbsent, 2);
        $basic = $item->basic_before_absence !== null ? $field('basic_before_absence') : round($field('cutoff_basic') + $absence, 2);
        $overtime = round($field('total_ot_pay') + $field('holiday_pay') + $field('worked_holiday_pay'), 2);
        $allowances = $field('cutoff_transpo') + $field('cutoff_rep') + $field('cutoff_quarterly');
        $adjustment = $field('earnings_adjustment');
        $gross = round($basic + $overtime + $allowances - $gridNpw - $gridAbsent + $adjustment, 2);
        $deductions = round($field('total_deductions') + $tableAbsent, 2);
        $net = $field('net_pay');
        if (abs(round($gross - $deductions - $net, 2)) >= 0.005) {
            $this->reject("The saved {$cutoff} cutoff item for {$name} does not balance: gross {$gross} minus deductions {$deductions} is not the net pay {$net}. Re-save that payroll before exporting.");
        }
        $pesos = array_map($field, ['W/H TAX' => 'tax_deduction', 'SSS' => 'sss_deduction', 'PHILHEALTH' => 'philhealth_deduction', 'PAGIBIG' => 'pagibig_deduction', 'LOAN' => 'loan_deduction', 'CC' => 'capital_contribution_deduction', 'SAVINGS' => 'savings_deduction', 'CASH ADVANCE' => 'cash_advance_deduction', 'RENTAL' => 'rental_deduction', 'ELECTRICITY' => 'electricity_deduction', 'ADJUSTMENT' => 'deductions_adjustment']);
        // HR types monthly figures in the govt source table: government shares as deducted, the rest twice the cutoff amount.
        $govt = [];
        foreach ($pesos as $header => $amount) {
            $govt[$header] = in_array($header, ['SSS', 'PHILHEALTH', 'PAGIBIG', 'ADJUSTMENT'], true) ? $amount : round($amount * 2, 2);
        }

        return [
            'grid' => ['EMPLOYEE NAME' => $name, 'POSITION' => mb_strtoupper((string) $item->employee->position), 'DAYS OF WORK' => $field('days_present'), 'BASIC PAY' => $basic,
                'OVERTIME PAY' => $overtime, 'TRANSPO ALLOW' => $field('cutoff_transpo'), 'REP ALLOW' => $field('cutoff_rep'), 'QUART ALLOW' => $field('cutoff_quarterly'),
                'NPW- HOLIDAY' => $gridNpw, 'ABSENT' => $gridAbsent, 'ADJUSTMENT' => $adjustment, 'GROSS PAY' => $gross, 'DEDUCTIONS' => $deductions, 'NET PAY' => $net],
            'ded' => ['EMPLOYEE NAME' => $name] + $pesos + ['TARDINESS' => $field('tardiness_deduction'), 'ABSENT' => $tableAbsent, 'TOTAL DEDUCTIONS' => $deductions],
            'govt' => ['EMPLOYEE NAME' => $name] + $govt + ['ABSENT' => $field('absence_days'), 'TARDINESS' => $field('tardiness_minutes'),
                'TOTAL DEDUCTIONS' => round(array_sum(array_intersect_key($govt, array_flip($govtHeaders))), 2)],
            'journal' => ['gross' => $gross, 'tax' => $pesos['W/H TAX'], 'sss' => $pesos['SSS'], 'philhealth' => $pesos['PHILHEALTH'], 'pagibig' => $pesos['PAGIBIG'],
                'loan' => $pesos['LOAN'], 'cc' => $pesos['CC'], 'rental' => round($pesos['RENTAL'] + $pesos['ELECTRICITY'], 2), 'tardiness_absent' => $tableAbsent + $field('tardiness_deduction'),
                'savings' => $pesos['SAVINGS'], 'cash' => $pesos['CASH ADVANCE'], 'other' => round($field('other_deductions') + $pesos['ADJUSTMENT'], 2), 'net' => $net],
        ];
    }

    private function exportOffice(PayrollItem $item): string
    {
        return mb_strtolower(trim((string) $item->employee->department)) === 'general merchandise'
            ? 'gen_mdse'
            : $item->payroll_office;
    }

    private function blankItem(Employee $employee): PayrollItem
    {
        $item = new PayrollItem;
        $item->setRelation('employee', $employee);
        foreach (array_merge(OfficePayrollCalculator::DEDUCTIONS, ['paid_days_basis', 'days_present', 'absence_days', 'nwnp_deduction', 'holiday_pay', 'worked_holiday_pay', 'earnings_adjustment', 'deductions_adjustment', 'tardiness_minutes', 'cutoff_basic', 'basic_before_absence', 'absence_deduction', 'cutoff_transpo', 'cutoff_rep', 'cutoff_quarterly', 'weekday_ot_hours', 'weekday_ot_pay', 'weekend_ot_hours', 'weekend_ot_pay', 'total_ot_pay', 'gross_pay', 'tardiness_deduction', 'total_deductions', 'net_pay']) as $field) {
            $item->{$field} = 0;
        }

        return $item;
    }

    /** Sign-off names as on the October sheets: first name, middle initial, last name ("Kurt Vincent F. Fariñas"). */
    private function signName(Employee $employee): string
    {
        $middle = trim((string) $employee->middle_name);

        return trim(implode(' ', array_filter([trim((string) $employee->first_name), $middle !== '' ? mb_substr($middle, 0, 1).'.' : '', trim((string) $employee->last_name), trim((string) $employee->name_suffix)])));
    }

    /** Names as the original sheets write them: "LAST, FIRST M." on Main Office and Cubao, "FIRST M. LAST" elsewhere. */
    private function sheetName(Employee $employee, string $office): string
    {
        $last = trim((string) $employee->last_name);
        $suffix = trim((string) $employee->name_suffix);
        if ($suffix === '' && preg_match('/^(.*?)[\s,]+(jr\.?|sr\.?|ii|iii|iv)$/i', $last, $match)) {
            [$last, $suffix] = [$match[1], $match[2]];
        }
        $middle = trim((string) $employee->middle_name);
        $first = trim($employee->first_name.($middle !== '' ? ' '.mb_substr($middle, 0, 1).'.' : ''));
        $name = in_array($office, ['main_office', 'cubao'], true)
            ? trim($last.', '.trim($first.' '.$suffix), ', ')
            : trim(implode(' ', array_filter([$first, $last, $suffix])));

        return mb_strtoupper($name);
    }

    /** Month journal beside each office payroll: labels found by prefix, debit two columns right, credit three. */
    private function journal(DOMDocument $doc, array $texts, array $sums): void
    {
        $sums += ['zero' => 0.0, 'employer' => round(($sums['sss'] ?? 0) + ($sums['philhealth'] ?? 0) + ($sums['pagibig'] ?? 0), 2)];
        $start = collect($texts)->filter(fn (string $text, string $address): bool => self::split($address)[1] > 17 && str_starts_with(mb_strtolower($text), 'salaries and wages'))->keys()->first();
        if ($start === null) {
            throw new \RuntimeException('The management template journal is not recognised.');
        }
        [$labelCol, $startRow] = self::split($start);
        $entries = [];
        foreach ($texts as $address => $text) {
            [$col, $row] = self::split($address);
            if ($col === $labelCol && $row >= $startRow) {
                foreach (self::JOURNAL as $prefix => $key) {
                    if (str_starts_with(mb_strtolower($text), $prefix)) {
                        $entries[$row] = $key;
                        break;
                    }
                }
            }
        }
        if (! in_array('savings', $entries, true)) {
            // Sheets without a Savings Deposit line book savings as other income so the entry still balances.
            $sums['other'] = round(($sums['other'] ?? 0) + ($sums['savings'] ?? 0), 2);
        }
        foreach ($entries as $row => $key) {
            $debit = in_array($key, ['gross', 'employer'], true);
            $this->put($doc, self::letter($labelCol + ($debit ? 2 : 3)).$row, $sums[$key] ?? 0.0);
        }
    }

    /** Text of every inline-string cell, keyed by address. */
    private function texts(DOMDocument $doc): array
    {
        $texts = [];
        foreach ($doc->getElementsByTagName('c') as $cell) {
            if ($cell->getAttribute('t') === 'inlineStr' && trim($cell->textContent) !== '') {
                $texts[$cell->getAttribute('r')] = trim($cell->textContent);
            }
        }

        return $texts;
    }

    /** @return array{int, int} column number and row of an A1 address */
    private static function split(string $address): array
    {
        preg_match('/^([A-Z]+)(\d+)$/', $address, $parts);

        return [self::column($parts[1]), (int) $parts[2]];
    }

    private function document(string|false $xml): DOMDocument
    {
        $doc = new DOMDocument;
        if ($xml === false || ! $doc->loadXML($xml, LIBXML_NONET)) {
            throw new \RuntimeException('The management template contains invalid XML.');
        }

        return $doc;
    }

    private function put(DOMDocument $doc, string $address, string|float|int|null $value): void
    {
        $this->indexes ??= new \WeakMap;
        if (! isset($this->indexes[$doc])) {
            $index = (object) ['cells' => [], 'rows' => [], 'data' => $doc->getElementsByTagName('sheetData')->item(0)];
            foreach ($doc->getElementsByTagName('c') as $entry) {
                $index->cells[$entry->getAttribute('r')] = $entry;
            }
            foreach ($doc->getElementsByTagName('row') as $entry) {
                $index->rows[$entry->getAttribute('r')] = $entry;
            }
            $this->indexes[$doc] = $index;
        }
        $index = $this->indexes[$doc];
        $cell = $index->cells[$address] ?? null;
        if (! $cell) {
            preg_match('/([A-Z]+)(\d+)/', $address, $parts);
            $row = $index->rows[$parts[2]] ?? null;
            if (! $row) {
                $row = $doc->createElementNS(self::NS, 'row');
                $row->setAttribute('r', $parts[2]);
                $next = null;
                foreach ($index->data->childNodes as $candidate) {
                    if ($candidate instanceof DOMElement && (int) $candidate->getAttribute('r') > (int) $parts[2]) {
                        $next = $candidate;
                        break;
                    }
                }
                $index->data->insertBefore($row, $next);
                $index->rows[$parts[2]] = $row;
            }
            $cell = $doc->createElementNS(self::NS, 'c');
            $cell->setAttribute('r', $address);
            $next = null;
            foreach ($row->childNodes as $candidate) {
                if ($candidate instanceof DOMElement && preg_match('/^([A-Z]+)/', $candidate->getAttribute('r'), $match) && self::column($match[1]) > self::column($parts[1])) {
                    $next = $candidate;
                    break;
                }
            }
            $row->insertBefore($cell, $next);
            $index->cells[$address] = $cell;
        }
        while ($cell->firstChild) {
            $cell->removeChild($cell->firstChild);
        }
        $cell->removeAttribute('t');
        if (is_string($value)) {
            $cell->setAttribute('t', 'inlineStr');
            $inline = $doc->createElementNS(self::NS, 'is');
            $text = $doc->createElementNS(self::NS, 't');
            $text->appendChild($doc->createTextNode($value));
            $inline->appendChild($text);
            $cell->appendChild($inline);
        } elseif ($value !== null) {
            $cell->appendChild($doc->createElementNS(self::NS, 'v', (string) round($value, 2)));
        }
    }

    private static function column(string $letter): int
    {
        $number = 0;
        foreach (str_split($letter) as $char) {
            $number = $number * 26 + ord($char) - 64;
        }

        return $number;
    }

    private static function letter(int $column): string
    {
        $letter = '';
        while ($column > 0) {
            $column--;
            $letter = chr(65 + $column % 26).$letter;
            $column = intdiv($column, 26);
        }

        return $letter;
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['export' => $message]);
    }
}
