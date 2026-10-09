<?php

namespace App\Http\Controllers;

use App\Contracts\BusinessRepositoryInterface;
use App\Contracts\SimulationServiceInterface;
use App\Helpers\ApiResponse;
use App\Http\Requests\BusinessMapQueryRequest;
use App\Http\Requests\SaveCandidateLocationRequest;
use App\Http\Resources\BusinessMapResource;
use App\Http\Resources\SimulationSessionResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BusinessController extends Controller
{
    public function __construct(
        protected BusinessRepositoryInterface $businessRepository,
        protected SimulationServiceInterface $simulationService
    ) {}

    /**
     * Get LOCIVA Internal businesses for the map layer.
     * Publicly accessible, sanitized against private user data.
     */
    public function mapIndex(BusinessMapQueryRequest $request)
    {
        $lat      = $request->filled('lat') ? (float) $request->lat : null;
        $lng      = $request->filled('lng') ? (float) $request->lng : null;
        $radius   = $request->filled('radius') ? (float) $request->radius : null;
        $category = $request->input('category');
        $search   = $request->input('search');
        $limit    = (int) $request->input('limit', 100);

        $businesses = $this->businessRepository->getMapBusinesses(
            $lat,
            $lng,
            $radius,
            $category,
            $search,
            $limit
        );

        return ApiResponse::success(
            BusinessMapResource::collection($businesses),
            'LOCIVA internal businesses retrieved successfully'
        );
    }

    /**
     * Get businesses owned by the authenticated user.
     */
    public function index()
    {
        $businesses = $this->businessRepository->getUserBusinesses(Auth::id());

        return ApiResponse::success(
            BusinessMapResource::collection($businesses),
            'User businesses retrieved successfully'
        );
    }

    /**
     * Register a new business under the authenticated user.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:150',
            'description'      => 'nullable|string',
            'business_type_id' => 'required|exists:business_types,id',
            'latitude'         => 'required|numeric|between:-90,90',
            'longitude'        => 'required|numeric|between:-180,180',
            'address'          => 'nullable|string|max:500',
        ]);

        $validated['user_id'] = Auth::id();

        $business = $this->businessRepository->createBusiness($validated);

        return ApiResponse::success(
            new BusinessMapResource($business),
            'Business registered successfully',
            201
        );
    }

    /**
     * Get detail of a specific business.
     */
    public function show(string $id)
    {
        $business = $this->businessRepository->getBusinessById($id);

        if (!$business) {
            return ApiResponse::error('Bisnis tidak ditemukan.', 404);
        }

        return ApiResponse::success(
            new BusinessMapResource($business),
            'Business details retrieved successfully'
        );
    }

    /**
     * Update business owned by the authenticated user.
     */
    public function update(Request $request, string $id)
    {
        $business = $this->businessRepository->getBusinessById($id);

        if (!$business) {
            return ApiResponse::error('Bisnis tidak ditemukan.', 404);
        }

        // Authorization check: only owner or admin can update
        $user = Auth::user();
        if ($business->user_id !== $user->id && !$user->hasRole('admin')) {
            return ApiResponse::error('Anda tidak memiliki izin untuk mengubah data bisnis ini.', 403);
        }

        $validated = $request->validate([
            'name'             => 'sometimes|required|string|max:150',
            'description'      => 'nullable|string',
            'business_type_id' => 'sometimes|required|exists:business_types,id',
            'latitude'         => 'sometimes|required|numeric|between:-90,90',
            'longitude'        => 'sometimes|required|numeric|between:-180,180',
            'address'          => 'nullable|string|max:500',
        ]);

        $updated = $this->businessRepository->updateBusiness($business, $validated);

        return ApiResponse::success(
            new BusinessMapResource($updated),
            'Data bisnis berhasil diperbarui'
        );
    }

    /**
     * Delete business owned by the authenticated user.
     */
    public function destroy(string $id)
    {
        $business = $this->businessRepository->getBusinessById($id);

        if (!$business) {
            return ApiResponse::error('Bisnis tidak ditemukan.', 404);
        }

        $user = Auth::user();
        if ($business->user_id !== $user->id && !$user->hasRole('admin')) {
            return ApiResponse::error('Anda tidak memiliki izin untuk menghapus bisnis ini.', 403);
        }

        $this->businessRepository->deleteBusiness($business);

        return ApiResponse::success(
            null,
            'Bisnis berhasil dihapus dari sistem'
        );
    }

    /**
     * Persist candidate location analysis / simulation to database.
     */
    public function saveCandidateLocation(SaveCandidateLocationRequest $request)
    {
        $result = $this->simulationService->saveCandidateLocation(
            Auth::id(),
            $request->validated()
        );

        return ApiResponse::success(
            $result,
            'Candidate location simulation saved successfully'
        );
    }

    /**
     * Retrieve user's saved simulation sessions.
     */
    public function getSimulationSessions()
    {
        $sessions = $this->simulationService->getUserSimulationSessions(Auth::id());

        return ApiResponse::success(
            SimulationSessionResource::collection($sessions),
            'Saved simulation sessions retrieved successfully'
        );
    }

    /**
     * Delete a saved simulation session.
     */
    public function deleteSimulationSession(string $id)
    {
        $this->simulationService->deleteSimulationSession(Auth::id(), $id);

        return ApiResponse::success(
            null,
            'Sesi simulasi berhasil dihapus'
        );
    }
}
