<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReportCategoryController;
use App\Http\Controllers\AreaController;
use App\Http\Controllers\PoiController;
use App\Http\Controllers\LocationAnalysisController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BusinessTypeController;
use App\Http\Controllers\BusinessTypeWeightController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VendorRouteController;

/*
|--------------------------------------------------------------------------
| Auth Routes
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::get('/google', [GoogleAuthController::class, 'redirectToGoogle'])->name('google.login');
    Route::get('/google/callback', [GoogleAuthController::class, 'handleGoogleCallback']);
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

        //USER
        Route::apiResource('users', UserController::class)->except('store');
    });
});

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

// Reports
Route::get('/reports', [ReportController::class, 'index']);
Route::get('/reports/{id}', [ReportController::class, 'show']);

// Report Categories
Route::get('/report-categories', [ReportCategoryController::class, 'index']);

// Areas
Route::get('/areas', [AreaController::class, 'index']);
Route::get('/areas/{id}', [AreaController::class, 'show']);

// Points of Interest
Route::get('/pois', [PoiController::class, 'index']);

// LOCIVA Internal Businesses for Map
Route::get('/businesses/map', [BusinessController::class, 'mapIndex']);

// Business Catalog (Katalog Usaha)
Route::get('/business-types', [\App\Http\Controllers\BusinessTypeController::class, 'index']);
Route::get('/business-types/categories', [\App\Http\Controllers\BusinessTypeController::class, 'categories']);
Route::get('/business-types/{id}', [\App\Http\Controllers\BusinessTypeController::class, 'show']);

// Public Vendor Routes on Map
Route::get('/vendor-routes/public', [\App\Http\Controllers\VendorRouteController::class, 'publicRoutes']);
Route::get('/vendor-routes/recommendations', [\App\Http\Controllers\VendorRouteController::class, 'recommendations']);

// Location Analysis (core UMKM feature — public, no auth needed)
Route::post('/analysis/location', [LocationAnalysisController::class, 'analyze']);

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Reports (write)
    Route::post('/reports', [ReportController::class, 'store']);
    Route::post('/reports/{id}/confirm', [ReportController::class, 'confirm']);

    // POI (manual entry)
    Route::post('/pois', [PoiController::class, 'store']);

    // Business management (per-user CRUD)
    Route::get('/businesses', [BusinessController::class, 'index']);
    Route::post('/businesses', [BusinessController::class, 'store']);
    Route::get('/businesses/{id}', [BusinessController::class, 'show']);
    Route::put('/businesses/{id}', [BusinessController::class, 'update']);
    Route::delete('/businesses/{id}', [BusinessController::class, 'destroy']);

    // Candidate Location Simulations (save, list, & delete per-user)
    Route::post('/simulations/candidate', [BusinessController::class, 'saveCandidateLocation']);
    Route::get('/simulations/sessions', [BusinessController::class, 'getSimulationSessions']);
    Route::delete('/simulations/sessions/{id}', [BusinessController::class, 'deleteSimulationSession']);

    // Mobile Vendor Routes CRUD (per-user)
    Route::get('/vendor-routes', [\App\Http\Controllers\VendorRouteController::class, 'index']);
    Route::post('/vendor-routes', [\App\Http\Controllers\VendorRouteController::class, 'store']);
    Route::get('/vendor-routes/{id}', [\App\Http\Controllers\VendorRouteController::class, 'show']);
    Route::put('/vendor-routes/{id}', [\App\Http\Controllers\VendorRouteController::class, 'update']);
    Route::delete('/vendor-routes/{id}', [\App\Http\Controllers\VendorRouteController::class, 'destroy']);

    // Admin-only
    Route::middleware('role:admin')->group(function () {
        Route::patch('/reports/{id}/status', [ReportController::class, 'updateStatus']);
        Route::post('/business-types', [\App\Http\Controllers\BusinessTypeController::class, 'store']);
        Route::put('/business-types/{id}', [\App\Http\Controllers\BusinessTypeController::class, 'update']);
        Route::delete('/business-types/{id}', [\App\Http\Controllers\BusinessTypeController::class, 'destroy']);
        Route::get('/admin/users', [AuthController::class, 'usersList']);
        Route::post('/admin/users/{id}/toggle-role', [AuthController::class, 'toggleUserRole']);
        Route::apiResource('/area', AreaController::class)->except(['index']);
    });
});
