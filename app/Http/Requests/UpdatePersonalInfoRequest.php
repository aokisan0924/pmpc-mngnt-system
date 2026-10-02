<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePersonalInfoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isActive() ?? false;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', Rule::in([$this->user()->first_name])],
            'last_name' => ['required', 'string', Rule::in([$this->user()->last_name])],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return ['first_name.in' => 'Name changes require HR review through account setup or HR support.', 'last_name.in' => 'Name changes require HR review through account setup or HR support.'];
    }
}
