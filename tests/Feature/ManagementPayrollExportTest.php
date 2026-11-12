<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Services\ManagementPayrollExport;
use DOMDocument;
use DOMXPath;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\ReadsPayrollExport;
use Tests\TestCase;
use ZipArchive;

class ManagementPayrollExportTest extends TestCase
{
    use ReadsPayrollExport;
    use RefreshDatabase;

    private array $files = [];

    protected function tearDown(): void
    {
        foreach ($this->files as $path) {
            @unlink($path);
        }
        parent::tearDown();
    }

    private function batch(string $cutoff = 'second'): Payroll
    {
        return Payroll::create(['period_label' => 'September '.$cutoff, 'period_from' => $cutoff === 'first' ? '2026-09-01' : '2026-09-16', 'period_to' => $cutoff === 'first' ? '2026-09-15' : '2026-09-30', 'cutoff' => $cutoff, 'status' => 'draft', 'created_by' => Employee::factory()->superAdmin()->create()->id]);
    }

    private function item(Payroll $batch, string $office = 'main_office', ?Employee $employee = null): PayrollItem
    {
        return $batch->items()->create(['employee_id' => ($employee ?? Employee::factory()->create(['first_name' => 'Synthetic', 'last_name' => 'Employee', 'position' => 'Bookkeeper']))->id, 'cutoff' => $batch->cutoff, 'payroll_office' => $office, 'paid_days_basis' => 11, 'absence_days' => 1, 'days_present' => 10, 'cutoff_basic' => 6000, 'cutoff_transpo' => 500, 'cutoff_rep' => 250, 'cutoff_quarterly' => 100, 'weekday_ot_hours' => 2, 'weekday_ot_pay' => 187.50, 'weekend_ot_hours' => 1, 'weekend_ot_pay' => 97.50, 'total_ot_pay' => 285, 'gross_pay' => 7135, 'tax_deduction' => 25, 'sss_deduction' => 10, 'philhealth_deduction' => 15, 'pagibig_deduction' => 20, 'loan_deduction' => 100, 'capital_contribution_deduction' => 50, 'cash_advance_deduction' => 30, 'rental_deduction' => 40, 'savings_deduction' => 35, 'other_deductions' => 45, 'tardiness_deduction' => 5, 'total_deductions' => 375, 'net_pay' => 6760]);
    }

    private function exported(Payroll $batch): string
    {
        $path = app(ManagementPayrollExport::class)->export($batch);
        $this->files[] = $path;

        return $path;
    }

    private function value(string $path, int $sheet, string $cell): ?string
    {
        $zip = new ZipArchive;
        $zip->open($path);
        $doc = new DOMDocument;
        $doc->loadXML($zip->getFromName('xl/worksheets/sheet'.$sheet.'.xml'));
        $zip->close();
        $xpath = new DOMXPath($doc);
        $xpath->registerNamespace('s', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        return $xpath->query('//s:c[@r="'.$cell.'"]')->item(0)?->textContent;
    }

    /** Sum of the journal's debit and credit columns from "Salaries and Wages" down. */
    private function journalTotals(array $cells): array
    {
        $start = collect($cells)->filter(fn (string $text, string $address): bool => (int) preg_replace('/\D/', '', $address) > 17 && str_starts_with($text, 'Salaries and Wages'))->keys()->first();
        preg_match('/^([A-Z]+)(\d+)$/', $start, $match);
        [$debit, $credit] = [0.0, 0.0];
        foreach ($cells as $address => $text) {
            preg_match('/^([A-Z]+)(\d+)$/', $address, $cell);
            if ($cell[1] === $match[1] && (int) $cell[2] >= (int) $match[2] && (int) $cell[2] < 80 && $text !== '') {
                $debit += (float) ($this->journal([$address => $text] + $cells, $text, true) ?? 0);
                $credit += (float) ($this->journal([$address => $text] + $cells, $text) ?? 0);
            }
        }

        return [round($debit, 2), round($credit, 2)];
    }

    public function test_all_offices_use_saved_figures_and_partial_month_is_explicit(): void
    {
        $batch = $this->batch();
        foreach (['main_office', 'fort_magsaysay', 'gen_mdse', 'cubao'] as $office) {
            $item = $this->item($batch, $office);
            $item->employee->update(['daily_rate' => 9999, 'transpo_allowance' => 9999]);
        }
        $path = $this->exported($batch);
        foreach (range(1, 4) as $sheet) {
            $cells = $this->sheetCells($path, $sheet);
            $this->assertEquals(6760, $this->underHeader($cells, 1, 'NET PAY', 11));
            $this->assertEquals('CUTOFF NOT AVAILABLE', $cells[$this->headerColumn($cells, 0, 'EMPLOYEE NAME').'9']);
            $this->assertEmpty($this->underHeader($cells, 0, 'BASIC PAY', 11));
            // Supplemental detail sits below the printed layout (header row 90).
            $this->assertEquals(30, $cells['O91']);
        }
        $main = $this->sheetCells($path, 1);
        $this->assertEquals(6000, $this->underHeader($main, 1, 'BASIC PAY', 11));
        $this->assertEquals(375, $this->underHeader($this->sheetCells($path, 4), 4, 'TOTAL DEDUCTIONS', 11));
        $voucher = $this->sheetCells($path, 5);
        $this->assertSame('Payee:', $voucher['B11']);
        $this->assertEquals(28540, $voucher['H15']);
        $this->assertEquals(28540, $voucher['I28']);
        // Interest income is entered by hand; savings, cash advances and other deductions share row 25.
        $this->assertEquals(0, $voucher['I22']);
        $this->assertEquals(440, $voucher['I25']);
        $this->assertStringNotContainsString('first cutoff', $main['B88']);
        // Keep a synthetic export outside the repository for visual verification.
        copy($path, sys_get_temp_dir().'/management-payroll-synthetic.xlsx');
    }

    public function test_both_cutoffs_share_employee_rows_and_reconcile_monthly_totals(): void
    {
        $first = $this->batch('first');
        $second = $this->batch();
        $item = $this->item($first, 'cubao');
        $this->item($second, 'cubao', $item->employee);
        $path = $this->exported($second);
        $cubao = $this->sheetCells($path, 4);
        $this->assertEquals(6760, $this->underHeader($cubao, 0, 'NET PAY', 11));
        $this->assertEquals(6760, $this->underHeader($cubao, 1, 'NET PAY', 11));
        $this->assertEquals(375, $this->underHeader($cubao, 3, 'TOTAL DEDUCTIONS', 11));
        $this->assertEquals(375, $this->underHeader($cubao, 4, 'TOTAL DEDUCTIONS', 17));
        $this->assertEquals(14270, $this->sheetCells($path, 5)['I28']);
        $this->assertStringContainsString('first cutoff', $cubao['B88']);
        $this->assertStringContainsString('second cutoff', $cubao['B88']);
    }

    public function test_main_office_fits_six_employees_with_totals_and_journal_below(): void
    {
        $batch = $this->batch();
        foreach (range(1, 6) as $unused) {
            $this->item($batch);
        }
        $main = $this->sheetCells($this->exported($batch), 1);
        $this->assertEquals(6760, $this->underHeader($main, 1, 'NET PAY', 16));
        $this->assertSame('TOTAL', $main[$this->headerColumn($main, 1, 'EMPLOYEE NAME').'17']);
        $this->assertEquals(40560, $this->underHeader($main, 1, 'NET PAY', 17));
        $this->assertEquals(42810, $this->journal($main, 'Salaries and Wages', true));
        $this->assertEquals(40560, $this->journal($main, 'Cash in Bank'));
    }

    public function test_every_row_balances_and_every_journal_balances(): void
    {
        $first = $this->batch('first');
        $second = $this->batch();
        foreach (['main_office', 'fort_magsaysay', 'gen_mdse', 'cubao'] as $office) {
            $item = $this->item($first, $office);
            $item->update(['basic_before_absence' => 6600, 'absence_deduction' => 600, 'nwnp_deduction' => 0]);
            $this->item($second, $office, $item->employee)->update(['basic_before_absence' => 6600, 'absence_deduction' => 600, 'nwnp_deduction' => 600]);
        }
        $path = $this->exported($second);
        foreach (range(1, 4) as $sheet) {
            $cells = $this->sheetCells($path, $sheet);
            foreach ([0, 1] as $grid) {
                $gross = (float) $this->underHeader($cells, $grid, 'GROSS PAY', 11);
                $deductions = (float) $this->underHeader($cells, $grid, 'DEDUCTIONS', 11);
                $this->assertEqualsWithDelta(6760, $gross - $deductions, 0.001, "sheet $sheet grid $grid");
            }
            [$debit, $credit] = $this->journalTotals($cells);
            $this->assertGreaterThan(0, $debit);
            $this->assertEqualsWithDelta($debit, $credit, 0.001, "journal on sheet $sheet");
        }
        // Main Office 2nd grid has an NPW- HOLIDAY column: the unworked holiday shows there, not as absent.
        $main = $this->sheetCells($path, 1);
        $this->assertEquals(600, $this->underHeader($main, 1, 'NPW- HOLIDAY', 11));
        $this->assertEquals(0, $this->underHeader($main, 4, 'ABSENT', 11));
        // Cubao 2nd grid has none: the same amount goes to its deduction table's ABSENT.
        $this->assertEquals(600, $this->underHeader($this->sheetCells($path, 4), 4, 'ABSENT', 11));
        // Gen Mdse 1st grid has its own ABSENT column; the deduction table then shows 0.
        $gen = $this->sheetCells($path, 3);
        $this->assertEquals(600, $this->underHeader($gen, 0, 'ABSENT', 11));
        $this->assertEquals(0, $this->underHeader($gen, 3, 'ABSENT', 11));
    }

    public function test_voucher_print_area_follows_the_renamed_sheet(): void
    {
        $batch = $this->batch();
        $this->item($batch);
        $zip = new ZipArchive;
        $zip->open($this->exported($batch));
        $book = $zip->getFromName('xl/workbook.xml');
        $zip->close();
        $this->assertStringContainsString('SEPTEMBER 2026 VOUCHER', $book);
        $this->assertStringNotContainsString('OCTOBER 2026 VOUCHER', $book);
    }

    public function test_a_saved_row_that_does_not_balance_is_rejected(): void
    {
        $batch = $this->batch();
        $this->item($batch)->update(['net_pay' => 6760.01]);
        $this->expectException(ValidationException::class);
        $this->exported($batch);
    }

    public function test_fort_second_grid_uses_its_own_column_order_and_markers_are_replaced(): void
    {
        $batch = $this->batch();
        $this->item($batch, 'fort_magsaysay')->update(['cutoff_transpo' => 111, 'cutoff_rep' => 222, 'cutoff_quarterly' => 333, 'gross_pay' => 6951, 'net_pay' => 6576]);
        $path = $this->exported($batch);
        $fort = $this->sheetCells($path, 2);
        $this->assertEquals(111, $this->underHeader($fort, 1, 'TRANSPO', 11));
        $this->assertEquals(222, $this->underHeader($fort, 1, 'REP', 11));
        $this->assertEquals(333, $this->underHeader($fort, 1, 'QUART', 11));
        foreach (range(1, 5) as $sheet) {
            $this->assertStringNotContainsString('{{', implode('|', $this->sheetCells($path, $sheet)));
        }
    }

    public function test_download_is_admin_only_and_returns_a_real_xlsx(): void
    {
        $batch = $this->batch();
        $item = $this->item($batch);
        $this->actingAs($item->employee)->get(route('admin.payroll.export', $batch))->assertRedirect(route('employee.dashboard'));
        $admin = Employee::findOrFail($batch->created_by);
        $response = $this->actingAs($admin)->get(route('admin.payroll.export', $batch))->assertOk()->assertDownload('SEPTEMBER 2026 MANAGEMENT PAYROLL.xlsx');
        $this->files[] = $response->baseResponse->getFile()->getPathname();
        $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_over_capacity_reports_error_without_omitting_rows(): void
    {
        $batch = $this->batch();
        foreach (range(1, 7) as $unused) {
            $this->item($batch);
        }
        $this->actingAs(Employee::findOrFail($batch->created_by))->from(route('admin.payroll.show', $batch))->get(route('admin.payroll.export', $batch))->assertRedirect(route('admin.payroll.show', $batch))->assertSessionHasErrors('export');
        $this->assertDatabaseCount('payroll_items', 7);
    }

    public function test_legacy_office_data_is_rejected_and_duplicate_cutoffs_cannot_be_saved(): void
    {
        $batch = $this->batch();
        $item = $this->item($batch);
        $item->update(['payroll_office' => null]);
        try {
            $this->exported($batch);
            $this->fail('Missing office should fail export.');
        } catch (ValidationException $error) {
            $this->assertArrayHasKey('export', $error->errors());
        }
        // A duplicate cutoff batch can no longer exist: the database rejects it (unique period_month + cutoff).
        $this->expectException(QueryException::class);
        $this->batch();
    }

    public function test_template_contains_no_previous_payroll_or_formulas(): void
    {
        $zip = new ZipArchive;
        $zip->open(resource_path('payroll/management-template.xlsx'));
        foreach (range(1, 5) as $sheet) {
            $doc = new DOMDocument;
            $doc->loadXML($zip->getFromName('xl/worksheets/sheet'.$sheet.'.xml'));
            $this->assertCount(0, $doc->getElementsByTagName('f'));
            // File properties too: the source workbook's author must not ship with the template.
            $text = $doc->textContent.$zip->getFromName('xl/sharedStrings.xml').$zip->getFromName('docProps/core.xml').$zip->getFromName('docProps/app.xml');
            foreach (['YVONNE', 'Michaela', 'Sapla', 'Jeffrae', 'CONDO', 'LUCERO', 'MALANA', 'FERIA', 'SEVILLENO', 'Reynold', '12683'] as $previous) {
                $this->assertStringNotContainsString($previous, $text);
            }
        }
        $zip->close();
    }

    public function test_template_keeps_logos_but_no_signature_pictures(): void
    {
        $zip = new ZipArchive;
        $zip->open(resource_path('payroll/management-template.xlsx'));
        foreach (range(1, 5) as $sheet) {
            $rels = (string) $zip->getFromName('xl/worksheets/_rels/sheet'.$sheet.'.xml.rels');
            preg_match('#Target="/?(?:xl/|\.\./)?(drawings/drawing\d+\.xml)"#', $rels, $match);
            $doc = new DOMDocument;
            $doc->loadXML($zip->getFromName('xl/'.$match[1]));
            $anchors = $doc->getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing', 'from');
            // Logos sit in rows 0-3; real signatures sat lower and must never ship in the template.
            $this->assertGreaterThan(0, $anchors->length, 'logo kept on sheet '.$sheet);
            foreach ($anchors as $from) {
                $this->assertLessThanOrEqual(3, (int) $from->getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing', 'row')->item(0)->textContent);
            }
        }
        $zip->close();
    }
}
