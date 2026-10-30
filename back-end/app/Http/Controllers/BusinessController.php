<?php

namespace App\Http\Controllers;

use App\Contracts\BusinessRepositoryInterface;
use App\Contracts\SimulationServiceInterface;
use App\Helpers\ApiResponse;
use App\Helpers\PaginationHelper;
use App\Http\Requests\BusinessMapQueryRequest;
use App\Http\Requests\SaveCandidateLocationRequest;
use App\Http\Requests\UpdateBusinessRequest;
use App\Http\Resources\BusinessMapResource;
use App\Http\Resources\BusinessResource;
use App\Http\Resources\SimulationSessionResource;
use App\Traits\UploadTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Throwable;

class BusinessController extends Controller
{
    use UploadTrait;
    public function __construct(
        protected BusinessRepositoryInterface $businessRepository,
        protected SimulationServiceInterface $simulationService,
    ) {}

    /**
     * Get LOCIVA Internal businesses for the map layer.
     * Publicly accessible, sanitized against private user data.
     */
    public function mapIndex(BusinessMapQueryRequest $request)
    {
        try {
            $float = fn (string $key) => $request->filled($key) ? $request->float($key) : null;
    
            $businesses = $this->businessRepository->getMapBusinesses(
                $float("lat"),
                $float("lng"),
                $float("radius"),
                $request->input("category"),
                $request->input("search"),
                $request->integer("limit", 100),
                $float("min_lat"),
                $float("min_lng"),
                $float("max_lat"),
                $float("max_lng"),
            );
    
            return ApiResponse::success(
                BusinessMapResource::collection($businesses),
                "LOCIVA internal businesses retrieved successfully",
            );
        } catch (\Throwable $e) {
            return ApiResponse::error(
                "Failed to retrieve map businesses: " . $e->getMessage(),
                500,
            );
        }
    }

    /**
     * Get businesses owned by the authenticated user.
     */
    public function index()
    {
        $businesses = $this->businessRepository->getUserBusinesses(Auth::id());

        return ApiResponse::success(
            BusinessMapResource::collection($businesses),
            "User businesses retrieved successfully",
        );
    }

    /**
     * Register a new business under the authenticated user.
     */
    public function store(StoreBusinessRequest $request)
    {
        try {
            $validated = $request->validated();

            if (isset($validated["image"])) {
                $validated["image"] = $this->upload(
                    "businesses",
                    $validated["image"],
                );
            }

            $validated["user_id"] = Auth::id();

            $business = $this->businessRepository->createBusiness($validated);

            return ApiResponse::success(
                new BusinessMapResource($business),
                "Business registered successfully",
                201,
            );
        } catch (Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Get detail of a specific business.
     */
    public function show(string $id)
    {
        try {
            $business = $this->businessRepository->getBusinessById($id);

            if (!$business) {
                return ApiResponse::error("Bisnis tidak ditemukan.", 404);
            }

            return ApiResponse::success(
                new BusinessMapResource($business),
                "Business details retrieved successfully",
            );
        } catch (Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Update business owned by the authenticated user.
     */
    public function update(UpdateBusinessRequest $request, string $id)
    {
        $validated = $request->validated();

        try {
            $business = $this->businessRepository->getBusinessById($id);

            if (!$business) {
                return ApiResponse::error("Bisnis tidak ditemukan.", 404);
            }

            // Authorization check: only owner or admin can update
            $user = $request->user();
            if ($business->user_id !== $user->id && !$user->hasRole("admin")) {
                return ApiResponse::error(
                    "Anda tidak memiliki izin untuk mengubah data bisnis ini.",
                    403,
                );
            }

            $updated = $this->businessRepository->updateBusiness(
                $business,
                $validated,
            );

            return ApiResponse::success(
                new BusinessMapResource($updated),
                "Data bisnis berhasil diperbarui",
            );
        } catch (Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Delete business owned by the authenticated user.
     */
    public function destroy(string $id)
    {
        try {
            $business = $this->businessRepository->getBusinessById($id);

            if (!$business) {
                return ApiResponse::error("Bisnis tidak ditemukan.", 404);
            }

            if (
                $business->user_id !== $request->user()->id &&
                !$request->user()->hasRole("admin")
            ) {
                return ApiResponse::error(
                    "Anda tidak memiliki izin untuk menghapus bisnis ini.",
                    403,
                );
            }

            $this->businessRepository->deleteBusiness($business);

            return ApiResponse::success(
                null,
                "Bisnis berhasil dihapus dari sistem",
            );
        } catch (Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Persist candidate location analysis / simulation to database.
     */
    public function saveCandidateLocation(SaveCandidateLocationRequest $request)
    {
        try {
            $result = $this->simulationService->saveCandidateLocation(
                Auth::id(),
                $request->validated(),
            );

            return ApiResponse::success(
                $result,
                "Candidate location simulation saved successfully",
            );
        } catch (Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Retrieve user's saved simulation sessions.
     */
    public function getSimulationSessions(SimulationSessionListRequest $request)
    {
        $validated = $request->validated();
        try {
            $sessions = $this->simulationService->getUserSimulationSessions(
                (string) Auth::id(),
                $validated["search"] ?? "",
                (int) ($validated["per_page"] ?? 10),
            );

            return ApiResponse::success(
                SimulationSessionResource::collection($sessions),
                "Saved simulation sessions retrieved successfully",
            );
        } catch (Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Delete a saved simulation session.
     */
    public function deleteSimulationSession(string $id)
    {
        try {
            $this->simulationService->deleteSimulationSession(Auth::id(), $id);

            return ApiResponse::success(null, "Sesi simulasi berhasil dihapus");
        } catch (Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    public function indexUser(Request $request)
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:200',
            'business_type_id' => 'nullable|string|max:50',
            'sort_by' => 'nullable|in:name,created_at,address',
            'sort_order' => 'nullable|in:asc,desc',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            $fetch = $this->businessRepository->paginateUserBusinesses(
                $request->user()->id,
                $request->query("per_page", 10),
            );
            return ApiResponse::success([
                "meta" => PaginationHelper::meta($fetch),
                "Data" => BusinessResource::collection($fetch),
            ]);
        } catch (Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }
}
