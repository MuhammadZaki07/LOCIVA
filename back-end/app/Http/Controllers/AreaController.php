<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Http\Requests\AreaRequest;
use App\Repositories\AreaRepository;

class AreaController extends Controller
{

    public function __construct(protected AreaRepository $repo) {}

    /**
     * Store a newly created resource in storage.
     */
    public function store(AreaRequest $request)
    {
        $data = $request->validated();
        try {
            $this->repo->create($data);
            return ApiResponse::success(null, "Success stored data.");
        } catch (\Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            return ApiResponse::success($this->repo->withDetail($id));
        } catch (\Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        try {
            return ApiResponse::success($this->repo->find($id));
        } catch (\Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(AreaRequest $request, string $id)
    {
        $data = $request->validated();

        try {

            if (empty($data)) {
                return ApiResponse::success(null, "Nothing to update.");
            }

            $this->repo->update($id, $data);
            return ApiResponse::success(null, "Data updated successfuly.");
        } catch (\Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            return $this->repo->delete($id) ?
                ApiResponse::success(null, "Deleted successfully.") :
                ApiResponse::error();
        } catch (\Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }
}
