<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\GoogleAuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BusinessTypeController;
use App\Http\Controllers\BusinessTypeWeightController;
use App\Http\Controllers\VendorRouteController;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::get('/google', [GoogleAuthController::class, 'redirectToGoogle'])->name('google.login');
    Route::get('/google/callback', [GoogleAuthController::class, 'handleGoogleCallback']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    //ROLE ADMIN
    Route::middleware(['role:admin'])->group(function () {
        //BUSSINESS TYPE
        Route::apiResource('business-types', BusinessTypeController::class);

        //BUSINESS TYPE WEIGHT
        Route::apiResource('business-type-weights', BusinessTypeWeightController::class);

        Route::apiResource('vendor-routes', VendorRouteController::class);
    });

    //ROLE USER
    Route::middleware(['role:user,admin'])->group(function () {
        //BUSSINESS
        Route::apiResource('businesses', BusinessController::class);
        
    });
});
