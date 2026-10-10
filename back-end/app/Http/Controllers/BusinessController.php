<?php

namespace App\Http\Controllers;

use App\Contracts\SimulationServiceInterface;
use App\Helpers\ApiResponse;
use App\Helpers\PaginationHelper;
use App\Http\Requests\BusinessMapQueryRequest;
use App\Http\Requests\BusinessRequest;
use App\Http\Requests\BusinessUpdateRequest;
use App\Http\Requests\SaveCandidateLocationRequest;
use App\Http\Resources\BusinessMapResource;
use App\Http\Resources\BusinessResource;
use App\Models\Business;
use App\Repositories\BusinessRepository;
use App\Traits\UploadTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BusinessController extends Controller
{
    use UploadTrait;
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
    private $businessRepository;
    private $simulationService;

    public function __construct(BusinessRepository $businessRepository , SimulationServiceInterface $simulationService)
    {
        $this->businessRepository = $businessRepository;
        $this->simulationService = $simulationService;
    }

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

    public function index(Request $request)
    {
        try {
            $fetch = $this->businessRepository->paginate($request->query('per_page', 10));
            return ApiResponse::success(["mete" => PaginationHelper::meta($fetch), "Data" => BusinessResource::collection($fetch)]);
        } catch (\Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create() {}

    /**
     * Store a newly created resource in storage.
     */
    public function store(BusinessRequest $request)
    {
        $validate = $request->validated();

        DB::beginTransaction();
        try {
            if (isset($validate['image'])) {
                $validate['image'] = $this->upload('businesses', $validate['image']);
            }

            $validate['user_id'] = auth()->id();

            $business = $this->businessRepository->create($validate);

            DB::commit();
            return ApiResponse::success($business, 'Create business successful', 200);
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Failed store data' . $th->getMessage(), 500);
        }
    }

    /**
     * Get detail of a specific business.
     */
    public function show(string $id)
    {
        try {
            $data = $this->businessRepository->find($id);

            if (!$data) return ApiResponse::error('Data not found', 404);

            return ApiResponse::success(BusinessResource::make($data), 'Data retrieved successfully');
        } catch (\Throwable $th) {
            return ApiResponse::error('Failed get data: ' . $th->getMessage(), 500);
        }
    }

    /**
     * Update business owned by the authenticated user.
     */
    // public function update(Request $request, string $id)
    // {
    //     $business = $this->businessRepository->getBusinessById($id);

    //     if (!$business) {
    //         return ApiResponse::error('Bisnis tidak ditemukan.', 404);
    //     }

    //     // Authorization check: only owner or admin can update
    //     $user = Auth::user();
    //     if ($business->user_id !== $user->id && !$user->hasRole('admin')) {
    //         return ApiResponse::error('Anda tidak memiliki izin untuk mengubah data bisnis ini.', 403);
    //     }

    //     $validated = $request->validate([
    //         'name'             => 'sometimes|required|string|max:150',
    //         'description'      => 'nullable|string',
    //         'business_type_id' => 'sometimes|required|exists:business_types,id',
    //         'latitude'         => 'sometimes|required|numeric|between:-90,90',
    //         'longitude'        => 'sometimes|required|numeric|between:-180,180',
    //         'address'          => 'nullable|string|max:500',
    //     ]);

    //     $updated = $this->businessRepository->updateBusiness($business, $validated);

    //     return ApiResponse::success(
    //         new BusinessMapResource($updated),
    //         'Data bisnis berhasil diperbarui'
    //     );
    // }

    /**
     * Delete business owned by the authenticated user.
     */
    public function update(BusinessUpdateRequest $request, string $id)
    {
        $data = $this->businessRepository->find($id);
        if (!$data) return ApiResponse::error('Data not found', 404);

        $validate = $request->validated();

        DB::beginTransaction();
        try {
            if (isset($validate['profile_image'])) {
                $oldImage = $data->image;

                $validate['image'] = $this->upload(
                    'businesses',
                    $validate['image']
                );

                if ($oldImage && Storage::disk('public')->exists($oldImage)) {
                    Storage::disk('public')->delete($oldImage);
                }
            }

            $this->businessRepository->update($id, $validate);
            $newData = $this->businessRepository->find($id);

            DB::commit();
            return ApiResponse::success($newData, 'Data updated successfully');
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Data not updated: ' . $th->getMessage(), 500);
        }
    }

    /**
     * Persist candidate location analysis / simulation to database.
     */
    public function destroy(string $id)
    {
        $data = $this->businessRepository->find($id);
        if (!$data) return ApiResponse::error('Data not found', 404);

        DB::beginTransaction();
        try {
            $delete = $this->businessRepository->delete($id);

            DB::commit();
            return ApiResponse::success($delete, 'Data deleted successfully');
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Data not deleted: ' . $th->getMessage(), 500);
        }
    }
}
