<?php

use Illuminate\Support\Facades\Route;

Route::fallback(function () {
    return response("Lociva backend", 200, [
        'Content-Type' => 'text/plain'
    ]);
});
