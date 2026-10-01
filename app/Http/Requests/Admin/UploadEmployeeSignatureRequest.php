<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UploadEmployeeSignatureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        return ['signature' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg', 'max:2048', 'dimensions:min_width=20,min_height=10,max_width=2400,max_height=1200']];
    }
}
