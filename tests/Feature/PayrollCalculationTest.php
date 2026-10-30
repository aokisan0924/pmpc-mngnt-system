<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollCalculationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_discard_draft_payroll_batch(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $payroll = Payroll::factory()->create([
            'status' => 'draft',
            'created_by' => $admin->id,
        ]);
        PayrollItem::factory()->create(['payroll_id' => $payroll->id]);

        $response = $this->actingAs($admin)->delete(route('admin.payroll.destroy', $payroll));

        $response->assertRedirect(route('admin.payroll'));
        $this->assertDatabaseMissing('payrolls', ['id' => $payroll->id]);
        $this->assertDatabaseMissing('payroll_items', ['payroll_id' => $payroll->id]);
    }

    public function test_admin_cannot_discard_finalized_payroll_batch(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $payroll = Payroll::factory()->finalized()->create([
            'created_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin)->delete(route('admin.payroll.destroy', $payroll));

        $response->assertSessionHasErrors(['error' => 'Finalized payroll batches cannot be discarded or deleted.']);
        $this->assertDatabaseHas('payrolls', ['id' => $payroll->id]);
    }

    public function test_payroll_finalization_records_actor_and_time_and_is_idempotent(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $payroll = Payroll::factory()->create(['status' => 'draft', 'created_by' => $admin->id]);

        $response = $this->actingAs($admin)->post(route('admin.payroll.finalize', $payroll));
        $response->assertRedirect()->assertSessionHasNoErrors();
        $payroll->refresh();
        $this->assertSame('finalized', $payroll->status);
        $this->assertSame($admin->id, $payroll->finalized_by);
        $this->assertNotNull($payroll->finalized_at);

        $originalFinalizedAt = $payroll->finalized_at->toDateTimeString();
        $this->post(route('admin.payroll.finalize', $payroll))->assertSessionHasErrors('error');
        $this->assertSame($originalFinalizedAt, $payroll->fresh()->finalized_at->toDateTimeString());
    }
}
