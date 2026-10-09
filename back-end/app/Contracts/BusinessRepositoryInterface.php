<?php

namespace App\Contracts;

use App\Models\Business;
use Illuminate\Database\Eloquent\Collection;

interface BusinessRepositoryInterface
{
    /**
     * Get businesses for map display with optional spatial radius and category filtering.
     */
    public function getMapBusinesses(
        ?float $lat = null,
        ?float $lng = null,
        ?float $radiusMeters = null,
        ?string $category = null,
        ?string $search = null,
        int $limit = 100
    ): Collection;

    /**
     * Get businesses belonging to a specific user.
     */
    public function getUserBusinesses(string $userId): Collection;

    /**
     * Create a new business entry.
     */
    public function createBusiness(array $data): Business;

    /**
     * Get a business by ID with its relationships.
     */
    public function getBusinessById(string $id): ?Business;

    /**
     * Update an existing business.
     */
    public function updateBusiness(Business $business, array $data): Business;

    /**
     * Delete a business.
     */
    public function deleteBusiness(Business $business): bool;
}
