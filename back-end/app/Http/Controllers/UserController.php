<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Helpers\PaginationHelper;
use App\Http\Requests\UserRequestUpdate;
use App\Http\Resources\UserResource;
use App\Repositories\UserRepository;
use App\Traits\UploadTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    use UploadTrait;
    private $userRepo;
    public function __construct(UserRepository $userRepo)
    {
        $this->userRepo = $userRepo;
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $fetch = $this->userRepo->paginate($request->query('per_page', 10));
            return ApiResponse::success(["mete" => PaginationHelper::meta($fetch), "Data" => UserResource::collection($fetch)]);
        } catch (\Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $data = $this->userRepo->find($id);

            if (!$data) return ApiResponse::error('Data not found', 404);

            return ApiResponse::success(UserResource::make($data), 'Data retrieved successfully');
        } catch (\Throwable $th) {
            return ApiResponse::error('Failed get data: ' . $th->getMessage(), 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UserRequestUpdate $request, string $id)
    {
        $data = $this->userRepo->find($id);
        if (!$data) return ApiResponse::error('Data not found', 404);

        $validate = $request->validated();

        DB::beginTransaction();
        try {
            if (isset($validate['profile_image'])) {
                $oldImage = $data->profile_image;

                $validate['profile_image'] = $this->upload(
                    'users',
                    $validate['profile_image']
                );

                if ($oldImage && Storage::disk('public')->exists($oldImage)) {
                    Storage::disk('public')->delete($oldImage);
                }
            }

            $this->userRepo->update($id, $validate);
            $newData = $this->userRepo->find($id);

            DB::commit();
            return ApiResponse::success($newData, 'Data updated successfully');
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Data not updated: ' . $th->getMessage(), 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $data = $this->userRepo->find($id);
        if (!$data) return ApiResponse::error('Data not found', 404);

        DB::beginTransaction();
        try {
            $delete = $this->userRepo->delete($id);

            DB::commit();
            return ApiResponse::success($delete, 'Data deleted successfully');
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Data not deleted: ' . $th->getMessage(), 500);
        }
    }
}
