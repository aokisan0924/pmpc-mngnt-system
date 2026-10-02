<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Http\Requests\Admin\UploadEmployeeSignatureRequest;

class UploadOwnSignatureRequest extends UploadEmployeeSignatureRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isActive() && $this->user()->is_staff;
    }
}
