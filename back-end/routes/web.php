<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::fallback(function (Request $request) {
    return redirect()->away('https://lociva.vercel.app' . $request->getRequestUri());
});