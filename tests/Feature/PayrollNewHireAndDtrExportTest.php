<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class PayrollNewHireAndDtrExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_mid_period_hire_is_not_paid_for_days_before_the_hire_date(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create(['date_hired' => '2026-09-09', 'payroll_office' => 'main_office', 'setup_completed_at' => now(), 'office_verified_at' => now()]);

        // Sep 1-8 holds six weekdays (1,2,3,4,7,8) before the hire date.
        $this->actingAs($admin)->get('/admin/payroll/create?period_from=2026-09-01&period_to=2026-09-15&cutoff=first')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('employees', fn ($employees) => (float) collect($employees)->firstWhere('id', $employee->id)['paid_days_basis'] === 5.0));
    }

    public function test_export_all_downloads_one_surname_named_pdf_per_employee_in_a_zip(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        Employee::factory()->create(['last_name' => 'Santos']);
        Employee::factory()->create(['last_name' => 'Santos']);

        $response = $this->actingAs($admin)->get('/admin/dtr/export-all?month=2026-09');
        $response->assertOk()->assertDownload('DTR_All_2026-09.zip');

        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($response->baseResponse->getFile()->getPathname()));
        $names = collect(range(0, $zip->numFiles - 1))->map(fn (int $i): string => $zip->getNameIndex($i));
        $this->assertTrue($names->contains('Santos_DTR_2026-09.pdf'));
        $this->assertSame($names->count(), $names->unique()->count());
        $this->assertTrue($names->every(fn (string $n): bool => str_ends_with($n, '_DTR_2026-09.pdf')));
    }
}
