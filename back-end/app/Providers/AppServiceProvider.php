<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            \App\Contracts\BusinessRepositoryInterface::class,
            \App\Repositories\BusinessRepository::class
        );

        $this->app->bind(
            \App\Contracts\SimulationServiceInterface::class,
            \App\Services\SimulationService::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        
        RateLimiter::for('ai-recommend', fn (Request $r) => Limit::perMinute(6)->by($r->ip()));
        // one recommendation run = up to 24 analysis calls
        RateLimiter::for('analysis', fn (Request $r) => Limit::perMinute(120)->by($r->ip()));
    }
}
