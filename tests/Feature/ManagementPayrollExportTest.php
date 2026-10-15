<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Services\ManagementPayrollExport;
use DOMDocument;
use DOMXPath;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;
use ZipArchive;

class ManagementPayrollExportTest extends TestCase
{
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

    public function test_all_offices_use_saved_figures_and_partial_month_is_explicit(): void
    {
        $batch = $this->batch();
        foreach (['main_office', 'fort_magsaysay', 'gen_mdse', 'cubao'] as $office) {
            $item = $this->item($batch, $office);
            $item->employee->update(['daily_rate' => 9999, 'transpo_allowance' => 9999]);
        }
        $path = $this->exported($batch);
        foreach ([1 => 'Y11', 2 => 'Z11', 3 => 'S11', 4 => 'Z11'] as $sheet => $net) {
            $this->assertEquals(6760, $this->value($path, $sheet, $net));
            $this->assertEquals('CUTOFF NOT AVAILABLE', $this->value($path, $sheet, 'B9'));
            $this->assertEmpty($this->value($path, $sheet, 'E11'));
            $this->assertEquals(30, $this->value($path, $sheet, 'O43'));
        }
        $this->assertEquals(6000, $this->value($path, 1, 'R11'));
        $this->assertEquals(375, $this->value($path, 4, 'BJ11'));
        $this->assertStringContainsString('PARTIAL MONTH', $this->value($path, 5, 'B11'));
        $this->assertEquals(28540, $this->value($path, 5, 'H27'));
        $this->assertEquals(28540, $this->value($path, 5, 'I27'));
        $this->assertEquals(200, $this->value($path, 5, 'I22'));
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
        $this->assertEquals(6760, $this->value($path, 4, 'M11'));
        $this->assertEquals(6760, $this->value($path, 4, 'Z11'));
        $this->assertEquals(750, $this->value($path, 4, 'AM11'));
        $this->assertEquals(750, $this->value($path, 4, 'AM15'));
        $this->assertEquals(14270, $this->value($path, 5, 'I27'));
        $this->assertStringContainsString('BOTH CUTOFFS', $this->value($path, 5, 'B11'));
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
        foreach (range(1, 4) as $unused) {
            $this->item($batch);
        }
        $this->actingAs(Employee::findOrFail($batch->created_by))->from(route('admin.payroll.show', $batch))->get(route('admin.payroll.export', $batch))->assertRedirect(route('admin.payroll.show', $batch))->assertSessionHasErrors('export');
        $this->assertDatabaseCount('payroll_items', 4);
    }

    public function test_legacy_office_data_and_duplicate_cutoffs_are_rejected(): void
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
        $item->update(['payroll_office' => 'main_office']);
        $this->batch();
        $this->expectException(ValidationException::class);
        $this->exported($batch);
    }

    public function test_template_contains_no_previous_payroll_or_formulas(): void
    {
        $zip = new ZipArchive;
        $zip->open(resource_path('payroll/management-template.xlsx'));
        foreach (range(1, 5) as $sheet) {
            $doc = new DOMDocument;
            $doc->loadXML($zip->getFromName('xl/worksheets/sheet'.$sheet.'.xml'));
            $this->assertCount(0, $doc->getElementsByTagName('f'));
            $this->assertStringNotContainsString('YVONNE', $doc->textContent);
            $this->assertStringNotContainsString('Michaela', $doc->textContent);
        }
        $zip->close();
    }
}
