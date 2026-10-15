<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Payroll;
use App\Services\ManagementPayrollExport;
use App\Services\OfficePayrollCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

class EmployeeSignatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_upload_preview_replace_and_remove_private_signature(): void
    {
        Storage::fake('local');
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create();
        $url = route('admin.employees.signature.store', $employee);
        $this->actingAs($admin)->post($url, ['signature' => UploadedFile::fake()->image('signature.png', 300, 90)])->assertSessionHasNoErrors();
        $employee->refresh();
        $old = $employee->signature_path;
        Storage::disk('local')->assertExists($old);
        $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/png')->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertArrayNotHasKey('signature_path', $employee->toArray());
        $this->post($url, ['signature' => UploadedFile::fake()->image('replacement.jpg', 400, 100)])->assertSessionHasNoErrors();
        Storage::disk('local')->assertMissing($old);
        $new = $employee->fresh()->signature_path;
        Storage::disk('local')->assertExists($new);
        $this->delete($url)->assertSessionHasNoErrors();
        Storage::disk('local')->assertMissing($new);
        $this->assertNull($employee->fresh()->signature_path);
        $this->get($url)->assertNotFound();
    }

    public function test_employees_cannot_upload_read_or_remove_signatures(): void
    {
        $employee = Employee::factory()->create();
        $other = Employee::factory()->create();
        $url = route('admin.employees.signature.store', $other);
        $this->actingAs($employee)->post($url, ['signature' => UploadedFile::fake()->image('signature.png', 100, 40)])->assertRedirect(route('employee.dashboard'));
        $this->get($url)->assertRedirect(route('employee.dashboard'));
        $this->delete($url)->assertRedirect(route('employee.dashboard'));
        $this->assertNull($other->fresh()->signature_path);
    }

    public function test_non_image_svg_oversized_and_excess_dimensions_are_rejected(): void
    {
        Storage::fake('local');
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create();
        foreach ([UploadedFile::fake()->create('signature.pdf', 20, 'application/pdf'), UploadedFile::fake()->createWithContent('signature.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'), UploadedFile::fake()->image('huge.png', 300, 90)->size(2049), UploadedFile::fake()->image('wide.png', 2401, 90)] as $file) {
            $this->actingAs($admin)->post(route('admin.employees.signature.store', $employee), ['signature' => $file])->assertSessionHasErrors('signature');
        }
        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_selected_signatures_are_embedded_only_in_footer_areas_and_unselected_export_is_unsigned(): void
    {
        Storage::fake('local');
        $admin = Employee::factory()->superAdmin()->create();
        $image = imagecreatetruecolor(300, 80);
        imagefill($image, 0, 0, imagecolorallocate($image, 255, 255, 255));
        imagestring($image, 5, 10, 30, 'SYNTHETIC SIGNATURE', imagecolorallocate($image, 38, 33, 92));
        ob_start();
        imagepng($image);
        $png = ob_get_clean();
        imagedestroy($image);
        $this->actingAs($admin)->post(route('admin.employees.signature.store', $admin), ['signature' => UploadedFile::fake()->createWithContent('signature.png', $png)])->assertSessionHasNoErrors();
        $admin->refresh();
        $batch = Payroll::create(['period_label' => 'September second', 'period_from' => '2026-09-16', 'period_to' => '2026-09-30', 'cutoff' => 'second', 'status' => 'draft', 'created_by' => $admin->id]);
        foreach (['main_office', 'fort_magsaysay', 'gen_mdse', 'cubao'] as $office) {
            $employee = Employee::factory()->create(['daily_rate' => 600]);
            $values = app(OfficePayrollCalculator::class)->calculate($employee, false, 11, 1);
            $batch->items()->create([...$values, 'employee_id' => $employee->id, 'cutoff' => 'second', 'payroll_office' => $office, 'paid_days_basis' => 11, 'absence_days' => 1]);
        }
        $unsigned = app(ManagementPayrollExport::class)->export($batch);
        $signed = app(ManagementPayrollExport::class)->export($batch, ['second' => ['prepared' => $admin->id, 'certified' => $admin->id, 'approved' => $admin->id]]);
        try {
            $zip = new ZipArchive;
            $zip->open($signed);
            $signatureCount = 0;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (str_starts_with($name, 'xl/media/signature-')) {
                    $signatureCount++;
                }
                if (str_starts_with($name, 'xl/drawings/') && str_ends_with($name, '.xml') && ! str_contains($name, '/_rels/')) {
                    $doc = new \DOMDocument;
                    $doc->loadXML($zip->getFromIndex($i));
                    foreach ($doc->getElementsByTagName('oneCellAnchor') as $anchor) {
                        if (str_starts_with($anchor->getElementsByTagName('cNvPr')->item(0)?->getAttribute('name') ?? '', 'Signature - ')) {
                            $this->assertGreaterThanOrEqual(16, (int) $anchor->getElementsByTagName('row')->item(0)->textContent);
                        }
                    }
                }
            }
            $this->assertEquals(27, $signatureCount);
            $zip->close();
            $zip->open($unsigned);
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $this->assertFalse(str_starts_with($zip->getNameIndex($i), 'xl/media/signature-'));
                $part = $zip->getNameIndex($i);
                if (str_starts_with($part, 'xl/drawings/') && str_ends_with($part, '.xml') && ! str_contains($part, '/_rels/')) {
                    $doc = new \DOMDocument;
                    $doc->loadXML($zip->getFromIndex($i));
                    foreach ($doc->getElementsByTagName('from') as $from) {
                        $this->assertLessThan(10, (int) $from->getElementsByTagName('row')->item(0)->textContent);
                    }
                }
            }
            $zip->close();
            copy($signed, sys_get_temp_dir().'/management-payroll-signed-synthetic.xlsx');
        } finally {
            try {
                $zip->close();
            } catch (\Throwable) {
            }
            unlink($signed);
            unlink($unsigned);
        }
    }

    public function test_export_rejects_a_selected_employee_without_an_uploaded_signature(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $batch = Payroll::create(['period_label' => 'September second', 'period_from' => '2026-09-16', 'period_to' => '2026-09-30', 'cutoff' => 'second', 'status' => 'draft', 'created_by' => $admin->id]);
        $this->actingAs($admin)->get(route('admin.payroll.export', ['payroll' => $batch, 'signatories' => ['second' => ['approved' => $admin->id]]]))->assertSessionHasErrors('signatories.second.approved');
    }

    public function test_absence_snapshot_does_not_become_a_second_deduction_and_migration_rolls_back(): void
    {
        $employee = Employee::factory()->create(['daily_rate' => 600]);
        $values = app(OfficePayrollCalculator::class)->calculate($employee, false, 11, 1);
        $this->assertEquals(6600, $values['basic_before_absence']);
        $this->assertEquals(600, $values['absence_deduction']);
        $this->assertEquals(6000, $values['net_pay']);
        $migration = require database_path('migrations/2026_10_02_000001_add_signatures_and_payroll_absence_snapshots.php');
        $migration->down();
        $this->assertDatabaseHas('employees', ['id' => $employee->id]);
        $migration->up();
        $this->assertNull($employee->fresh()->signature_path);
    }
}
