<?php

namespace App\Traits;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

trait UploadTrait
{
    /**
     * delete specified file in storage
     * @param string $file
     * @return void
     */

    public function remove(string $file): void
    {
        if ($this->exist($file)) {
            Storage::delete($file);
        } else {
            Storage::delete('public/' . $file);
        }
    }

    /**
     * check specified file in storage
     * @param string $file
     * @return bool
     */

    public function exist(string $file): bool
    {
        return Storage::exists($file);
    }

    /**
     * Handle upload file to storage
     * @param string $disk
     * @param UploadedFile $file
     * @param bool $originalName
     * @return string
     */

    public function upload(string $folder, UploadedFile $file, bool $originalName = false): string
    {
        $disk = 'public';

        if ($originalName) {
            return $file->storeAs($folder, $file->getClientOriginalName(), $disk);
        }

        return $file->store($folder, $disk);
    }
}