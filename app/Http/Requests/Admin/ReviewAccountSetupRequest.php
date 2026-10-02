<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReviewAccountSetupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        return ['decision' => ['required', 'in:approved,rejected'], 'review_note' => ['required_if:decision,rejected', 'nullable', 'string', 'max:1000']];
    }
}
