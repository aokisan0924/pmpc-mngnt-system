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

    public function test_export_prints_the_prepared_by_signature_but_no_other_signature_pictures(): void
    {
        // Kurt, 2026-11-13: the Prepared by signature is printed above the name; Certified and Approved stay names only.
        Storage::fake('local');
        $admin = Employee::factory()->superAdmin()->create(['first_name' => 'Synthetic', 'last_name' => 'Signatory']);
        $other = Employee::factory()->create(['first_name' => 'Other', 'last_name' => 'Signer']);
        $signature = function (): string {
            $image = imagecreatetruecolor(300, 400);
            imagefill($image, 0, 0, imagecolorallocate($image, 255, 255, 255));
            imagefilledrectangle($image, 60, 180, 240, 210, imagecolorallocate($image, 0, 0, 0));
            ob_start();
            imagepng($image);
            imagedestroy($image);

            return (string) ob_get_clean();
        };
        foreach ([$admin, $other] as $person) {
            $this->actingAs($admin)->post(route('admin.employees.signature.store', $person), ['signature' => UploadedFile::fake()->createWithContent('signature.png', $signature())])->assertSessionHasNoErrors();
        }
        $batch = Payroll::create(['period_label' => 'September second', 'period_from' => '2026-09-16', 'period_to' => '2026-09-30', 'cutoff' => 'second', 'status' => 'draft', 'created_by' => $admin->id]);
        foreach (['main_office', 'fort_magsaysay', 'gen_mdse', 'cubao'] as $office) {
            $employee = Employee::factory()->create(['daily_rate' => 600]);
            $values = app(OfficePayrollCalculator::class)->calculateHours($employee, false, ['days' => [...array_fill(0, 10, ['shift_hours' => 8.0, 'worked_hours' => 8.0]), ['shift_hours' => 8.0, 'worked_hours' => 0.0]], 'days_of_work' => 11.0], []);
            $batch->items()->create([...$values, 'employee_id' => $employee->id, 'cutoff' => 'second', 'payroll_office' => $office]);
        }

        $path = app(ManagementPayrollExport::class)->export($batch->fresh(), ['second' => ['prepared' => $admin->id, 'prepared_2' => $other->id, 'certified' => $other->id, 'approved' => $other->id]]);
        try {
            $zip = new ZipArchive;
            $zip->open($path);
            $template = new ZipArchive;
            $template->open(resource_path('payroll/management-template.xlsx'));
            $media = fn (ZipArchive $archive): array => array_values(array_filter(array_map(fn (int $i): string => $archive->getNameIndex($i), range(0, $archive->numFiles - 1)), fn (string $name): bool => str_starts_with($name, 'xl/media/')));
            // Exactly one picture more than the template: the Prepared by signature, trimmed to its ink.
            $added = array_values(array_diff($media($zip), $media($template)));
            $this->assertCount(1, $added);
            [$width, $height] = getimagesizefromstring($zip->getFromName($added[0]));
            $this->assertLessThan(200, $height);
            $this->assertGreaterThan($height, $width);
            foreach (range(1, 5) as $sheet) {
                $rels = (string) $zip->getFromName("xl/worksheets/_rels/sheet$sheet.xml.rels");
                preg_match('#Target="/?(?:xl/|\.\./)?(drawings/drawing\d+\.xml)"#', $rels, $match);
                $this->assertGreaterThanOrEqual(1, substr_count((string) $zip->getFromName('xl/'.$match[1]), 'name="Prepared by signature"'), "sheet $sheet");
            }
            $this->assertStringContainsString('Synthetic Signatory', $zip->getFromName('xl/worksheets/sheet1.xml'));
            $template->close();
            $zip->close();
        } finally {
            unlink($path);
        }
    }

    public function test_export_accepts_a_signatory_without_an_uploaded_signature_but_rejects_unknown_ids(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $batch = Payroll::create(['period_label' => 'September second', 'period_from' => '2026-09-16', 'period_to' => '2026-09-30', 'cutoff' => 'second', 'status' => 'draft', 'created_by' => $admin->id]);
        // Name-only signatories are allowed (the original workbook prints names); only the empty batch is rejected.
        $this->actingAs($admin)->get(route('admin.payroll.export', ['payroll' => $batch, 'signatories' => ['second' => ['approved' => $admin->id]]]))
            ->assertSessionDoesntHaveErrors('signatories.second.approved');
        $this->get(route('admin.payroll.export', ['payroll' => $batch, 'signatories' => ['second' => ['approved' => 999999]]]))
            ->assertSessionHasErrors('signatories.second.approved');
    }

    public function test_absence_snapshot_does_not_become_a_second_deduction_and_migration_rolls_back(): void
    {
        $employee = Employee::factory()->create(['daily_rate' => 600]);
        $values = app(OfficePayrollCalculator::class)->calculateHours($employee, false, ['days' => [...array_fill(0, 10, ['shift_hours' => 8.0, 'worked_hours' => 8.0]), ['shift_hours' => 8.0, 'worked_hours' => 0.0]], 'days_of_work' => 11.0], []);
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
