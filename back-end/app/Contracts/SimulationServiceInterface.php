<?php

namespace App\Contracts;

use App\Models\SimulationSession;
use Illuminate\Database\Eloquent\Collection;

interface SimulationServiceInterface
{
    /**
     * Persist or update candidate location simulation session.
     */
    public function saveCandidateLocation(string $userId, array $payload): array;

    /**
     * Retrieve user's saved simulation sessions with their candidate simulations.
     */
    public function getUserSimulationSessions(string $userId): Collection;

    /**
     * Delete user's simulation session and cascaded records.
     */
    public function deleteSimulationSession(string $userId, string $sessionId): bool;
}
