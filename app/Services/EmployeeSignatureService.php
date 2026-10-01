<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class EmployeeSignatureService
{
    public function replace(Employee $employee, UploadedFile $file): void
    {
        $image = imagecreatefromstring($file->getContent());
        if ($image === false) {
            throw ValidationException::withMessages(['signature' => 'The signature image could not be read.']);
        }
        imagesavealpha($image, true);
        ob_start();
        imagepng($image);
        $png = ob_get_clean();
        imagedestroy($image);
        $path = 'employee-signatures/'.Str::uuid().'.png';
        if (! Storage::disk('local')->put($path, $png)) {
            throw new \RuntimeException('Could not store the signature image.');
        }
        try {
            $old = DB::transaction(function () use ($employee, $path): ?string {
                $locked = Employee::whereKey($employee->id)->lockForUpdate()->firstOrFail();
                $old = $locked->signature_path;
                $locked->forceFill(['signature_path' => $path, 'signature_uploaded_at' => now()])->save();

                return $old;
            });
        } catch (Throwable $error) {
            Storage::disk('local')->delete($path);
            throw $error;
        }
        if ($old) {
            Storage::disk('local')->delete($old);
        }
    }

    public function remove(Employee $employee): void
    {
        $old = DB::transaction(function () use ($employee): ?string {
            $locked = Employee::whereKey($employee->id)->lockForUpdate()->firstOrFail();
            $old = $locked->signature_path;
            $locked->forceFill(['signature_path' => null, 'signature_uploaded_at' => null])->save();

            return $old;
        });
        if ($old) {
            Storage::disk('local')->delete($old);
        }
    }
}
