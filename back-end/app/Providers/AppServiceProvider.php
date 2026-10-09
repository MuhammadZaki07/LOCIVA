<?php

namespace App\Providers;

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
        //
    }
}
