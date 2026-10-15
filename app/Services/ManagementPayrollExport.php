<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;
use ZipArchive;

/** Fill the management template with saved amounts, never current compensation calculations. */
class ManagementPayrollExport
{
    private ?\WeakMap $indexes = null;

    private const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    private const LAYOUT = [
        'main_office' => ['sheet' => 1, 'capacity' => 3, 'second' => ['O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', null, 'W', 'X', 'Y'], 'monthly' => 'AB', 'first_ded' => 'AM', 'second_ded' => 'AX', 'ot_first' => 'AM', 'ot_second' => 'AX', 'ot_row' => 21],
        'fort_magsaysay' => ['sheet' => 2, 'capacity' => 2, 'second' => ['O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'], 'monthly' => 'AC', 'first_ded' => 'AN', 'second_ded' => 'AY', 'ot_first' => 'AN', 'ot_second' => 'AY', 'ot_row' => 18],
        'gen_mdse' => ['sheet' => 3, 'capacity' => 2, 'second' => ['L', 'M', 'N', 'O', null, null, null, null, 'P', 'Q', 'R', 'S'], 'monthly' => 'X', 'first_ded' => 'AI', 'second_ded' => 'AT', 'ot_first' => 'AI', 'ot_second' => 'AT', 'ot_row' => 18],
        'cubao' => ['sheet' => 4, 'capacity' => 4, 'second' => ['O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'], 'monthly' => 'AC', 'first_ded' => 'AO', 'second_ded' => 'AZ', 'ot_first' => 'AO', 'ot_second' => 'AZ', 'ot_row' => 20],
    ];

    public function export(Payroll $selected, array $signatories = []): string
    {
        $signatureIds = collect($signatories)->flatMap(fn ($roles) => array_values($roles))->filter()->unique();
        $people = Employee::whereIn('id', $signatureIds)->get()->keyBy('id');
        foreach ($signatureIds as $id) {
            $person = $people->get($id);
            if (! $person?->signature_path || ! Storage::disk('local')->exists($person->signature_path)) {
                $this->reject('A selected signature is unavailable. Reload and choose an uploaded signature.');
            }
        }
        $pictures = [];
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
            if (! isset(self::LAYOUT[$item->payroll_office]) || ! $item->employee) {
                $this->reject('Every exported item needs a verified payroll office and employee. Historical items without an office cannot use this export.');
            }
        }
        foreach (self::LAYOUT as $office => $layout) {
            if ($items->where('payroll_office', $office)->pluck('employee_id')->unique()->count() > $layout['capacity']) {
                $this->reject((OfficePayrollCalculator::OFFICES[$office]['label'] ?? 'Main Office (historical)').' exceeds the supplied template capacity ('.$layout['capacity'].' employees). Expand the approved template before exporting; no rows have been omitted.');
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
            foreach (self::LAYOUT as $office => $layout) {
                $doc = $this->document($zip->getFromName('xl/worksheets/sheet'.$layout['sheet'].'.xml'));
                $officeItems = $items->where('payroll_office', $office);
                $ids = $officeItems->sortBy(fn ($i) => $i->employee->full_name)->pluck('employee_id')->unique()->values();
                foreach (['first', 'second'] as $cutoff) {
                    $batch = $batches->firstWhere('cutoff', $cutoff);
                    $start = $cutoff === 'first' ? 'B' : $layout['second'][0];
                    $this->put($doc, $start.'9', $batch ? strtoupper($batch->period_from->format('F j').' - '.$batch->period_to->format('j, Y')) : 'CUTOFF NOT AVAILABLE');
                    $this->put($doc, $start.'7', $batch ? strtoupper($batch->status) : '');
                    $cols = $cutoff === 'second' ? $layout['second'] : ($office === 'gen_mdse' ? ['B', 'C', 'D', 'E', null, null, null, null, 'F', 'G', 'H', 'I'] : ['B', 'C', 'D', 'E', 'F', 'H', 'I', 'J', 'G', 'K', 'L', 'M']);
                    $cutoffItems = $officeItems->where('cutoff', $cutoff);
                    foreach ($ids as $offset => $id) {
                        $item = $cutoffItems->firstWhere('employee_id', $id);
                        if (! $item) {
                            continue;
                        }
                        $row = 11 + $offset;
                        [$basicBefore, $absenceAmount] = $this->absenceAmounts($item);
                        $values = [$item->employee->full_name, $item->employee->position, (float) $item->paid_days_basis, $cols[8] ? $basicBefore : $item->cutoff_basic, $item->total_ot_pay, $item->cutoff_transpo, $item->cutoff_rep, $item->cutoff_quarterly, $absenceAmount, $item->gross_pay, $item->total_deductions, $item->net_pay];
                        foreach ($cols as $index => $col) {
                            if ($col) {
                                $this->put($doc, $col.$row, $values[$index]);
                            }
                        }
                        $dedStart = $layout[$cutoff === 'first' ? 'first_ded' : 'second_ded'];
                        $this->deductions($doc, $dedStart, $row, $item, $office === 'cubao');
                        $ot = self::column($layout[$cutoff === 'first' ? 'ot_first' : 'ot_second']);
                        foreach ([$item->employee->full_name, $item->weekday_ot_hours, $item->weekday_ot_pay, null, null, $item->employee->full_name, $item->weekend_ot_hours, $item->weekend_ot_pay] as $j => $value) {
                            if ($value !== null) {
                                $this->put($doc, self::letter($ot + $j).($layout['ot_row'] + $offset), $value);
                            }
                        }
                    }
                    $totalRow = 11 + $layout['capacity'];
                    if ($batch) {
                        $this->signOff($doc, $office, $cutoff, $signatories[$cutoff] ?? [], $people, $layout['sheet'], $pictures);
                        $this->put($doc, $cols[0].$totalRow, 'TOTAL');
                        foreach ([9 => 'gross_pay', 10 => 'total_deductions', 11 => 'net_pay'] as $j => $field) {
                            $this->put($doc, $cols[$j].$totalRow, round($cutoffItems->sum($field), 2));
                        }
                        $aggregate = $this->aggregate($cutoffItems);
                        $dedStart = $layout[$cutoff === 'first' ? 'first_ded' : 'second_ded'];
                        $this->deductions($doc, $dedStart, $totalRow, $aggregate, $office === 'cubao');
                        $this->put($doc, $dedStart.$totalRow, 'TOTAL');
                    }
                }
                $this->deductions($doc, $layout['monthly'], 11 + $layout['capacity'], $this->aggregate($officeItems), $office === 'cubao');
                $this->put($doc, $layout['monthly'].(11 + $layout['capacity']), 'TOTAL');
                foreach ($ids as $offset => $id) {
                    $employeeItems = $officeItems->where('employee_id', $id);
                    $combined = new PayrollItem;
                    $combined->setRelation('employee', $employeeItems->first()->employee);
                    foreach (array_merge(OfficePayrollCalculator::DEDUCTIONS, ['tardiness_deduction', 'total_deductions']) as $field) {
                        $combined->{$field} = round($employeeItems->sum($field), 2);
                    }
                    $this->deductions($doc, $layout['monthly'], 11 + $offset, $combined, $office === 'cubao');
                }
                $this->put($doc, 'B40', 'Saved figures only. Basic pay is already net of absences; absence days are a reference. Blank cutoff = no saved batch.');
                $this->put($doc, 'B41', 'Supplemental detail (including amounts without a dedicated column in the original layout). Signatures require separate approval.');
                $headers = ['Employee ID', 'Employee', 'Cutoff', 'Paid days basis', 'Absence days', 'Transport', 'Representation', 'Quarterly', 'Weekday OT', 'Rest day OT', 'Savings', 'Other deductions', 'Tardiness', 'Cash advance'];
                foreach ($headers as $j => $header) {
                    $this->put($doc, self::letter(2 + $j).'42', $header);
                }
                foreach ($officeItems->values() as $offset => $item) {
                    $values = [$item->employee->employee_id, $item->employee->full_name, $item->cutoff, (float) $item->paid_days_basis, (float) $item->absence_days, $item->cutoff_transpo, $item->cutoff_rep, $item->cutoff_quarterly, $item->weekday_ot_pay, $item->weekend_ot_pay, $item->savings_deduction, $item->other_deductions, $item->tardiness_deduction, $item->cash_advance_deduction];
                    foreach ($values as $j => $value) {
                        $this->put($doc, self::letter(2 + $j).(43 + $offset), $value);
                    }
                }
                $zip->addFromString('xl/worksheets/sheet'.$layout['sheet'].'.xml', $doc->saveXML());
            }
            $voucher = $this->document($zip->getFromName('xl/worksheets/sheet5.xml'));
            $this->put($voucher, 'B9', 'DISBURSEMENT VOUCHER');
            $this->put($voucher, 'B11', $selected->period_from->format('F Y').' | '.($batches->count() === 2 ? 'BOTH CUTOFFS' : 'PARTIAL MONTH').' | '.$batches->map(fn ($p) => $p->cutoff.': '.$p->status)->implode(', '));
            $this->put($voucher, 'H15', round($items->sum('gross_pay'), 2));
            $fields = [16 => ['Withholding tax', 'tax_deduction'], 17 => ['SSS', 'sss_deduction'], 18 => ['PhilHealth', 'philhealth_deduction'], 19 => ['Pag-IBIG', 'pagibig_deduction'], 20 => ['Capital contribution', 'capital_contribution_deduction'], 21 => ['Loan deductions (allocation pending)', 'loan_deduction'], 22 => ['Other deductions and tardiness (allocation pending)', 'other_deductions'], 23 => ['Rental deductions', 'rental_deduction'], 24 => ['Savings', 'savings_deduction'], 25 => ['Cash advance deductions', 'cash_advance_deduction'], 26 => ['Net payroll', 'net_pay']];
            foreach ($fields as $row => [$label, $field]) {
                $this->put($voucher, 'D'.$row, $label);
                $this->put($voucher, 'G'.$row, null);
                $this->put($voucher, 'I'.$row, round($items->sum($field) + ($row === 22 ? $items->sum('tardiness_deduction') : 0), 2));
            }
            $this->put($voucher, 'H27', round($items->sum('gross_pay'), 2));
            $this->put($voucher, 'I27', round($items->sum('total_deductions') + $items->sum('net_pay'), 2));
            $this->put($voucher, 'D27', 'Review accounting allocation; this export does not post a voucher.');
            foreach (['prepared' => 'C30', 'certified' => 'D30', 'approved' => 'H30'] as $role => $cell) {
                $person = $people->get($signatories[$selected->cutoff][$role] ?? null);
                if ($person) {
                    $this->put($voucher, $cell, $person->full_name);
                    $pictures[] = [5, preg_replace('/\d+/', '29', $cell), $person];
                }
            }
            $zip->addFromString('xl/worksheets/sheet5.xml', $voucher->saveXML());
            $book = $this->document($zip->getFromName('xl/workbook.xml'));
            $xpath = new DOMXPath($book);
            $xpath->registerNamespace('s', self::NS);
            $sheets = $xpath->query('//s:sheet');
            $sheets->item(4)->setAttribute('name', strtoupper($selected->period_from->format('F Y')).' VOUCHER');
            // Print the same first/second-cutoff blocks, then the deductions/detail block.
            $definedNames = $xpath->query('//s:definedNames')->item(0);
            foreach (iterator_to_array($xpath->query('//s:definedName[@name="_xlnm.Print_Area"]')) as $oldName) {
                $oldName->parentNode->removeChild($oldName);
            }
            if (! $definedNames) {
                $definedNames = $book->createElementNS(self::NS, 'definedNames');
                $book->documentElement->insertBefore($definedNames, $xpath->query('//s:calcPr')->item(0));
            }
            foreach (range(0, 4) as $index) {
                $name = $book->createElementNS(self::NS, 'definedName');
                $name->setAttribute('name', '_xlnm.Print_Area');
                $name->setAttribute('localSheetId', (string) $index);
                $definedNames->appendChild($name);
                $sheetName = $sheets->item($index)->getAttribute('name');
                $name->nodeValue = "'".$sheetName."'!".match ($index) {
                    0 => '$B$1:$M$19,\''.$sheetName.'\'!$O$1:$Y$19,\''.$sheetName.'\'!$AB$1:$BH$32,\''.$sheetName.'\'!$B$40:$O$60',
                    1 => '$B$1:$M$19,\''.$sheetName.'\'!$O$1:$Z$19,\''.$sheetName.'\'!$AC$1:$BI$29,\''.$sheetName.'\'!$B$40:$O$60',
                    2 => '$B$1:$J$19,\''.$sheetName.'\'!$L$1:$S$19,\''.$sheetName.'\'!$X$1:$BD$29,\''.$sheetName.'\'!$B$40:$O$60',
                    3 => '$B$1:$M$21,\''.$sheetName.'\'!$O$1:$Z$21,\''.$sheetName.'\'!$AC$1:$BJ$32,\''.$sheetName.'\'!$B$40:$O$60',
                    default => '$B$3:$I$33',
                };
            }
            $zip->addFromString('xl/workbook.xml', $book->saveXML());
            foreach ($pictures as [$sheet, $cell, $person]) {
                app(PayrollSignatureDrawing::class)->add($zip, $sheet, $cell, $person->full_name, Storage::disk('local')->get($person->signature_path));
            }
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

    private function aggregate(Collection $items): PayrollItem
    {
        $item = new PayrollItem;
        $item->setRelation('employee', new Employee(['first_name' => 'TOTAL', 'last_name' => '']));
        foreach (array_merge(OfficePayrollCalculator::DEDUCTIONS, ['tardiness_deduction', 'total_deductions']) as $field) {
            $item->{$field} = round($items->sum($field), 2);
        }

        return $item;
    }

    private function absenceAmounts(PayrollItem $item): array
    {
        if ($item->basic_before_absence !== null && $item->absence_deduction !== null) {
            return [$item->basic_before_absence, $item->absence_deduction];
        }
        $paid = (float) $item->paid_days_basis;
        $absence = (float) $item->absence_days;
        if ($absence === 0.0) {
            return [$item->cutoff_basic, 0.0];
        }
        if ($paid <= $absence) {
            $this->reject('An older item with all paid days absent has no absence-amount snapshot. Verify that payroll before using the original-format export.');
        }
        $basic = round($item->cutoff_basic / ($paid - $absence) * $paid, 2);

        return [$basic, round($basic - $item->cutoff_basic, 2)];
    }

    private function signOff(DOMDocument $doc, string $office, string $cutoff, array $roles, Collection $people, int $sheet, array &$pictures): void
    {
        $nameRow = $office === 'cubao' ? 20 : 18;
        $columns = $cutoff === 'first'
            ? ($office === 'gen_mdse' ? ['B', 'E', 'H'] : ['B', 'F', 'K'])
            : match ($office) {
                'main_office' => ['O', 'Q', 'W'], 'fort_magsaysay', 'cubao' => ['O', 'R', 'X'], 'gen_mdse' => ['L', 'O', 'R']
            };
        $otColumns = match ($office) {
            'main_office' => $cutoff === 'first' ? ['AM', 'AQ', 'AU'] : ['AX', 'BB', 'BF'],
            'fort_magsaysay' => $cutoff === 'first' ? ['AN', 'AR', 'AV'] : ['AY', 'BC', 'BG'],
            'gen_mdse' => $cutoff === 'first' ? ['AI', 'AM', 'AQ'] : ['AT', 'AX', 'BB'],
            'cubao' => $cutoff === 'first' ? ['AO', 'AS', 'AW'] : ['AZ', 'BD', 'BH'],
        };
        $otRow = in_array($office, ['main_office', 'cubao'], true) ? 29 : 27;
        foreach (['prepared', 'certified', 'approved'] as $index => $role) {
            $person = $people->get($roles[$role] ?? null);
            if ($person) {
                foreach ([[$columns[$index], $nameRow], [$otColumns[$index], $otRow]] as [$column, $row]) {
                    $this->put($doc, $column.$row, $person->full_name);
                    $pictures[] = [$sheet, $column.($row - 1), $person];
                }
            }
        }
    }

    private function deductions(DOMDocument $doc, string $start, int $row, PayrollItem $item, bool $cubao): void
    {
        $fields = ['tax_deduction', 'sss_deduction', 'philhealth_deduction', 'pagibig_deduction', 'loan_deduction', 'capital_contribution_deduction'];
        if ($cubao && $start === 'AC') {
            $fields = array_merge($fields, ['savings_deduction', 'cash_advance_deduction', 'rental_deduction', 'total_deductions']);
        } else {
            $fields = array_merge($fields, [$cubao ? 'savings_deduction' : 'cash_advance_deduction', 'rental_deduction']);
            if (in_array($start, ['AX', 'AY', 'AT', 'AZ'], true)) {
                $fields[] = 'tardiness_deduction';
            }
            $fields[] = 'total_deductions';
        }
        $column = self::column($start);
        $this->put($doc, $start.$row, $item->employee->full_name);
        foreach ($fields as $j => $field) {
            $this->put($doc, self::letter($column + $j + 1).$row, (float) $item->{$field});
        }
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
