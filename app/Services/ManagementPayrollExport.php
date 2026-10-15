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

    /** Original workbook journal block per office: label/debit/credit columns and row per account. */
    private const JOURNAL = [
        'main_office' => ['debit' => 'R', 'credit' => 'S', 'employer' => null, 'savings' => true,
            'rows' => ['gross' => 24, 'tax_deduction' => 25, 'sss_deduction' => 26, 'philhealth_deduction' => 27, 'pagibig_deduction' => 28, 'loan_deduction' => 29, 'capital_contribution_deduction' => 31, 'rental_deduction' => 32, 'savings_deduction' => 33, 'cash_advance_deduction' => 35, 'other' => 36, 'net_pay' => 37, 'benefit' => 34, 'total' => 38]],
        'fort_magsaysay' => ['debit' => 'R', 'credit' => 'S', 'employer' => 36, 'savings' => false,
            'rows' => ['gross' => 21, 'tax_deduction' => 22, 'sss_deduction' => 23, 'philhealth_deduction' => 24, 'pagibig_deduction' => 25, 'loan_deduction' => 26, 'capital_contribution_deduction' => 28, 'rental_deduction' => 29, 'cash_advance_deduction' => 30, 'other' => 32, 'net_pay' => 33, 'benefit' => 31, 'total' => 34]],
        'gen_mdse' => ['debit' => 'O', 'credit' => 'P', 'employer' => 36, 'savings' => false,
            'rows' => ['gross' => 21, 'tax_deduction' => 22, 'sss_deduction' => 23, 'philhealth_deduction' => 24, 'pagibig_deduction' => 25, 'loan_deduction' => 26, 'capital_contribution_deduction' => 28, 'rental_deduction' => 29, 'cash_advance_deduction' => 30, 'other' => 32, 'net_pay' => 33, 'benefit' => 31, 'total' => 34]],
        'cubao' => ['debit' => 'R', 'credit' => 'S', 'employer' => 39, 'savings' => true,
            'rows' => ['gross' => 23, 'tax_deduction' => 24, 'sss_deduction' => 25, 'philhealth_deduction' => 26, 'pagibig_deduction' => 27, 'loan_deduction' => 28, 'capital_contribution_deduction' => 30, 'rental_deduction' => 31, 'savings_deduction' => 32, 'cash_advance_deduction' => 34, 'other' => 35, 'net_pay' => 36, 'benefit' => 33, 'total' => 37]],
    ];

    /** Static voucher text and chart-of-account codes from the original September workbook. */
    private const VOUCHER_TEXT = [
        'B3' => "PEOPLE'S MULTI-PURPOSE COOPERATIVE", 'B4' => 'Stall #2 Principe Building, Maharlika Highway', 'B5' => 'Upi, Gamu, Isabela',
        'B6' => 'CDA Registration No.: 9520-0200-8847', 'B7' => 'Mobile Nos. 0919-498-3770/ 0953-033-1580', 'B9' => 'DISBURSEMENT VOUCHER',
        'B11' => 'Payee:', 'H11' => 'Voucher No.:', 'B12' => 'Addressee:', 'C12' => '20e 2nd Camarilla St. Cubao, Quezon City', 'H12' => 'Voucher Date:',
        'B14' => 'Date', 'C14' => 'Ref No.', 'D14' => 'Account Name', 'G14' => 'Code', 'H14' => 'DR', 'I14' => 'CR',
    ];

    private const VOUCHER_CODES = [15 => 73110, 16 => 21340, 17 => 61245, 18 => 61247, 19 => 61248, 20 => 30130, 21 => 11210, 22 => 40110, 23 => 40650, 24 => 21110, 25 => 73120, 26 => 11115];

    /** Notes and supplemental detail sit below the original layout and outside the print area. */
    private const DETAIL_ROW = 90;

    public function export(Payroll $selected, array $signatories = []): string
    {
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
                $ids = $officeItems->sortBy(fn ($i) => mb_strtolower($i->employee->last_name.' '.$i->employee->first_name))->pluck('employee_id')->unique()->values();
                foreach (['first', 'second'] as $cutoff) {
                    $batch = $batches->firstWhere('cutoff', $cutoff);
                    $start = $cutoff === 'first' ? 'B' : $layout['second'][0];
                    $this->put($doc, $start.'9', $batch ? strtoupper($batch->period_from->format('F j').' - '.$batch->period_to->format('j, Y')) : 'CUTOFF NOT AVAILABLE');
                    $cols = $cutoff === 'second' ? $layout['second'] : ($office === 'gen_mdse' ? ['B', 'C', 'D', 'E', null, null, null, null, 'F', 'G', 'H', 'I'] : ['B', 'C', 'D', 'E', 'F', 'H', 'I', 'J', 'G', 'K', 'L', 'M']);
                    $cutoffItems = $officeItems->where('cutoff', $cutoff);
                    foreach ($ids as $offset => $id) {
                        $item = $cutoffItems->firstWhere('employee_id', $id);
                        if (! $item && $batch) {
                            $item = $this->blankItem($officeItems->firstWhere('employee_id', $id)->employee);
                        }
                        if (! $item) {
                            continue;
                        }
                        $row = 11 + $offset;
                        [$basicBefore, $absenceAmount] = $this->absenceAmounts($item);
                        $values = [$this->sheetName($item->employee, $office), $item->employee->position, (float) $item->paid_days_basis, $cols[8] ? $basicBefore : $item->cutoff_basic, $item->total_ot_pay, $item->cutoff_transpo, $item->cutoff_rep, $item->cutoff_quarterly, $absenceAmount, $item->gross_pay, $item->total_deductions, $item->net_pay];
                        foreach ($cols as $index => $col) {
                            if ($col) {
                                $this->put($doc, $col.$row, $values[$index]);
                            }
                        }
                        $dedStart = $layout[$cutoff === 'first' ? 'first_ded' : 'second_ded'];
                        $this->deductions($doc, $dedStart, $row, $item, $office);
                        $ot = self::column($layout[$cutoff === 'first' ? 'ot_first' : 'ot_second']);
                        foreach ([$this->sheetName($item->employee, $office), $item->weekday_ot_hours, $item->weekday_ot_pay, null, null, $this->sheetName($item->employee, $office), $item->weekend_ot_hours, $item->weekend_ot_pay] as $j => $value) {
                            if ($value !== null) {
                                $this->put($doc, self::letter($ot + $j).($layout['ot_row'] + $offset), $value);
                            }
                        }
                    }
                    $totalRow = 11 + $layout['capacity'];
                    if ($batch) {
                        $this->signOff($doc, $office, $cutoff, $signatories[$cutoff] ?? [], $people);
                        $this->put($doc, $cols[0].$totalRow, 'TOTAL');
                        foreach ([9 => 'gross_pay', 10 => 'total_deductions', 11 => 'net_pay'] as $j => $field) {
                            $this->put($doc, $cols[$j].$totalRow, round($cutoffItems->sum($field), 2));
                        }
                        $aggregate = $this->aggregate($cutoffItems);
                        $dedStart = $layout[$cutoff === 'first' ? 'first_ded' : 'second_ded'];
                        $this->deductions($doc, $dedStart, $totalRow, $aggregate, $office);
                    }
                }
                $this->deductions($doc, $layout['monthly'], 11 + $layout['capacity'], $this->aggregate($officeItems), $office);
                foreach ($ids as $offset => $id) {
                    $employeeItems = $officeItems->where('employee_id', $id);
                    $combined = new PayrollItem;
                    $combined->setRelation('employee', $employeeItems->first()->employee);
                    foreach (array_merge(OfficePayrollCalculator::DEDUCTIONS, ['tardiness_deduction', 'total_deductions']) as $field) {
                        $combined->{$field} = round($employeeItems->sum($field), 2);
                    }
                    $this->deductions($doc, $layout['monthly'], 11 + $offset, $combined, $office);
                }
                $this->journal($doc, $office, $officeItems);
                $detail = self::DETAIL_ROW;
                $this->put($doc, 'B'.($detail - 2), 'Status: '.$batches->map(fn ($p) => $p->cutoff.' cutoff '.$p->status)->implode(', ').'. Saved figures only; gross includes entered holiday pay. Interest income from loans is not split by the system.');
                $this->put($doc, 'B'.($detail - 1), 'Supplemental detail (amounts without a dedicated column in the original layout). Not part of the printed payroll.');
                $headers = ['Employee ID', 'Employee', 'Cutoff', 'Paid days basis', 'Absence days', 'Transport', 'Representation', 'Quarterly', 'Weekday OT', 'Rest day OT', 'Savings', 'Other deductions', 'Tardiness', 'Cash advance', 'Holiday pay'];
                foreach ($headers as $j => $header) {
                    $this->put($doc, self::letter(2 + $j).$detail, $header);
                }
                foreach ($officeItems->values() as $offset => $item) {
                    $values = [$item->employee->employee_id, $item->employee->full_name, $item->cutoff, (float) $item->paid_days_basis, (float) $item->absence_days, $item->cutoff_transpo, $item->cutoff_rep, $item->cutoff_quarterly, $item->weekday_ot_pay, $item->weekend_ot_pay, $item->savings_deduction, $item->other_deductions, $item->tardiness_deduction, $item->cash_advance_deduction, $item->holiday_pay];
                    foreach ($values as $j => $value) {
                        $this->put($doc, self::letter(2 + $j).($detail + 1 + $offset), $value);
                    }
                }
                $zip->addFromString('xl/worksheets/sheet'.$layout['sheet'].'.xml', $doc->saveXML());
            }
            $voucher = $this->document($zip->getFromName('xl/worksheets/sheet5.xml'));
            $monthEnd = $selected->period_from->copy()->endOfMonth()->format('n/j/Y');
            foreach (self::VOUCHER_TEXT as $cell => $text) {
                $this->put($voucher, $cell, $text);
            }
            $this->put($voucher, 'I12', $monthEnd);
            $this->put($voucher, 'B15', $monthEnd);
            foreach (self::VOUCHER_CODES as $row => $code) {
                $this->put($voucher, 'G'.$row, $code);
            }
            $this->put($voucher, 'H15', round($items->sum('gross_pay'), 2));
            // Interest income (row 22) and Employees' Benefit stay for manual entry; the system stores one loan amount.
            $credits = [16 => 'tax_deduction', 17 => 'sss_deduction', 18 => 'philhealth_deduction', 19 => 'pagibig_deduction', 20 => 'capital_contribution_deduction', 21 => 'loan_deduction', 23 => 'rental_deduction', 24 => 'savings_deduction', 26 => 'net_pay'];
            foreach ($credits as $row => $field) {
                $this->put($voucher, 'I'.$row, round($items->sum($field), 2));
            }
            $otherIncome = round($items->sum('other_deductions') + $items->sum('tardiness_deduction') + $items->sum('cash_advance_deduction'), 2);
            if ($otherIncome > 0) {
                $this->put($voucher, 'D25', '      Other Income / Advances to Officers & Employees');
            }
            $this->put($voucher, 'I25', $otherIncome);
            $this->put($voucher, 'H27', round($items->sum('gross_pay'), 2));
            $this->put($voucher, 'I27', round($items->sum('total_deductions') + $items->sum('net_pay'), 2));
            $this->put($voucher, 'D27', 'To record salaries and wages for the month of '.$selected->period_from->format('F Y'));
            foreach (['prepared' => 'C30', 'certified' => 'D30', 'approved' => 'H30'] as $role => $cell) {
                $person = $people->get($signatories[$selected->cutoff][$role] ?? null);
                if ($person) {
                    $this->put($voucher, $cell, mb_strtoupper($person->full_name));
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
                    0 => '$B$1:$M$19,\''.$sheetName.'\'!$O$1:$Y$19,\''.$sheetName.'\'!$AB$1:$BH$32',
                    1 => '$B$1:$M$19,\''.$sheetName.'\'!$O$1:$Z$19,\''.$sheetName.'\'!$AC$1:$BI$29',
                    2 => '$B$1:$J$19,\''.$sheetName.'\'!$L$1:$S$19,\''.$sheetName.'\'!$X$1:$BD$29',
                    3 => '$B$1:$M$21,\''.$sheetName.'\'!$O$1:$Z$21,\''.$sheetName.'\'!$AC$1:$BJ$32',
                    default => '$B$3:$I$33',
                };
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

    private function aggregate(Collection $items): PayrollItem
    {
        $item = new PayrollItem;
        $item->setRelation('employee', new Employee(['first_name' => '', 'last_name' => '']));
        foreach (array_merge(OfficePayrollCalculator::DEDUCTIONS, ['tardiness_deduction', 'total_deductions']) as $field) {
            $item->{$field} = round($items->sum($field), 2);
        }

        return $item;
    }

    private function blankItem(Employee $employee): PayrollItem
    {
        $item = new PayrollItem;
        $item->setRelation('employee', $employee);
        foreach (array_merge(OfficePayrollCalculator::DEDUCTIONS, ['paid_days_basis', 'absence_days', 'cutoff_basic', 'basic_before_absence', 'absence_deduction', 'cutoff_transpo', 'cutoff_rep', 'cutoff_quarterly', 'weekday_ot_hours', 'weekday_ot_pay', 'weekend_ot_hours', 'weekend_ot_pay', 'total_ot_pay', 'gross_pay', 'tardiness_deduction', 'total_deductions', 'net_pay']) as $field) {
            $item->{$field} = 0;
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

    private function signOff(DOMDocument $doc, string $office, string $cutoff, array $roles, Collection $people): void
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
                }
            }
        }
    }

    private function deductions(DOMDocument $doc, string $start, int $row, PayrollItem $item, string $office): void
    {
        $cubao = $office === 'cubao';
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
        $name = $this->sheetName($item->employee, $office);
        $this->put($doc, $start.$row, $name !== '' ? $name : null);
        foreach ($fields as $j => $field) {
            $this->put($doc, self::letter($column + $j + 1).$row, (float) $item->{$field});
        }
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

    /** Monthly journal entry beside each office payroll, as laid out in the original workbook. */
    private function journal(DOMDocument $doc, string $office, Collection $items): void
    {
        $layout = self::JOURNAL[$office];
        $sum = fn (string $field): float => round($items->sum($field), 2);
        $rows = $layout['rows'];
        $other = $sum('other_deductions') + $sum('tardiness_deduction') + ($layout['savings'] ? 0 : $sum('savings_deduction'));
        $this->put($doc, $layout['debit'].$rows['gross'], $sum('gross_pay'));
        foreach ($rows as $field => $row) {
            if (! in_array($field, ['gross', 'other', 'total', 'benefit'], true)) {
                $this->put($doc, $layout['credit'].$row, $sum($field));
            }
        }
        $this->put($doc, $layout['credit'].$rows['other'], round($other, 2));
        $this->put($doc, $layout['credit'].$rows['benefit'], 0);
        $this->put($doc, $layout['debit'].$rows['total'], $sum('gross_pay'));
        $this->put($doc, $layout['credit'].$rows['total'], round($sum('total_deductions') + $sum('net_pay'), 2));
        if ($layout['employer'] !== null) {
            // The original workbook records the employer share equal to the employee contributions.
            $row = $layout['employer'];
            $this->put($doc, $layout['debit'].$row, round($sum('sss_deduction') + $sum('philhealth_deduction') + $sum('pagibig_deduction'), 2));
            foreach (['sss_deduction', 'philhealth_deduction', 'pagibig_deduction'] as $j => $field) {
                $this->put($doc, $layout['credit'].($row + 1 + $j), $sum($field));
            }
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
