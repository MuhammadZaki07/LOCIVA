<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\ReportConfirmation;
use App\Models\ReportVerification;
use App\Models\ReportMedia;
use App\Helpers\ApiResponse;
use App\Traits\UploadTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Events\ReportCreated;

class ReportController extends Controller
{
    use UploadTrait;

    public function index(Request $request)
    {
        $request->validate([
            'lat'         => 'nullable|numeric|between:-90,90',
            'lng'         => 'nullable|numeric|between:-180,180',
            'radius'      => 'nullable|numeric|max:50000',
            'category_id' => 'nullable|string',
            'status'      => 'nullable|string',
            'severity'    => 'nullable|string',
            'search'      => 'nullable|string|max:200',
            'from'        => 'nullable|date',
            'to'          => 'nullable|date',
            'sort_by'     => 'nullable|in:created_at,status,severity,title,confirmations_count',
            'sort_order'  => 'nullable|in:asc,desc',
            'per_page'    => 'nullable|integer|min:1|max:100',
        ]);

        $query = Report::with([
            'category:id,name,slug,icon',
            'area:id,name',
            'user:id,name,email',
            'media:id,report_id,file_path,file_type,file_size,created_at',
            'verifications.moderator:id,name,email',
        ])->withCount('confirmations');

        if ($request->filled('category_id') && $request->category_id !== 'all' && $request->category_id !== 'Semua') {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('severity') && $request->severity !== 'all') {
            $query->where('severity', $request->severity);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('area', function ($aq) use ($search) {
                        $aq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        if ($request->filled('lat') && $request->filled('lng')) {
            $lat    = (float) $request->lat;
            $lng    = (float) $request->lng;
            $radius = (float) $request->input('radius', 5000);

            $query->selectRaw(
                '*, (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
                [$lat, $lng, $lat]
            )
                ->having('distance', '<=', $radius)
                ->orderBy('distance');
        } else {
            $sortBy = $request->input('sort_by', 'created_at');
            $sortOrder = $request->input('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);
        }

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $reports = $query->paginate($perPage);

        return ApiResponse::success($reports, 'Reports retrieved successfully');
    }

    public function show(string $id)
    {
        $report = Report::with([
            'category:id,name,slug,icon',
            'area:id,name',
            'user:id,name,email',
            'media:id,report_id,file_path,file_type,file_size,created_at',
            'verifications.moderator:id,name,email',
        ])->withCount('confirmations')->find($id);

        if (! $report) {
            return ApiResponse::notFound('Report not found.');
        }

        return ApiResponse::success($report, 'Report detail retrieved successfully');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:200',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:report_categories,id',
            'area_id'     => 'nullable|exists:areas,id',
            'latitude'    => 'required|numeric|between:-90,90',
            'longitude'   => 'required|numeric|between:-180,180',
            'severity'    => 'nullable|in:low,medium,high',
            'occurred_at' => 'nullable|date',
            'image'       => 'nullable|file|image|mimes:jpeg,png,jpg,webp|max:5120',
            'images'      => 'nullable|array|max:5',
            'images.*'    => 'file|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $validated['user_id']  = Auth::id();
        $validated['status']   = 'reported';
        $validated['severity'] = $validated['severity'] ?? 'medium';

        $uploadedPaths = [];
        DB::beginTransaction();
        try {
            $report = Report::create($validated);

            // Handle multiple uploaded files
            $files = [];
            if ($request->hasFile('images')) {
                $files = $request->file('images');
            } elseif ($request->hasFile('image')) {
                $files = [$request->file('image')];
            }

            foreach ($files as $file) {
                if (!$file) continue;
                $path = $this->upload('reports', $file);
                $uploadedPaths[] = $path;
                ReportMedia::create([
                    'report_id' => $report->id,
                    'file_path' => $path,
                    'file_type' => $file->getClientMimeType(),
                    'file_size' => $file->getSize(),
                ]);
            }
            ReportCreated::dispatch($report);

            DB::commit();

            return ApiResponse::success(
                $report->load([
                    'category:id,name,slug,icon',
                    'area:id,name',
                    'user:id,name,email',
                    'media:id,report_id,file_path,file_type,file_size,created_at'
                ]),
                'Report created successfully',
                201
            );
        } catch (\Throwable $e) {
            DB::rollBack();
            foreach ($uploadedPaths as $uploadedPath) {
                $this->remove($uploadedPath);
            }
            return ApiResponse::error('Failed to create report: ' . $e->getMessage(), 500);
        }
    }

    public function uploadMedia(Request $request, string $id)
    {
        $report = Report::find($id);
        if (! $report) {
            return ApiResponse::notFound('Report not found.');
        }

        $user = Auth::user();
        if ($report->user_id !== $user->id && !$user->hasRole('admin')) {
            return ApiResponse::error('Unauthorized to upload media for this report.', 403);
        }

        $request->validate([
            'image'    => 'required_without:images|file|image|mimes:jpeg,png,jpg,webp|max:5120',
            'images'   => 'required_without:image|array|max:5',
            'images.*' => 'file|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $files = $request->hasFile('images') ? $request->file('images') : [$request->file('image')];
        $created = [];
        $uploadedPaths = [];

        DB::beginTransaction();
        try {
            foreach ($files as $file) {
                if (!$file) continue;
                $path = $this->upload('reports', $file);
                $uploadedPaths[] = $path;
                $created[] = ReportMedia::create([
                    'report_id' => $report->id,
                    'file_path' => $path,
                    'file_type' => $file->getClientMimeType(),
                    'file_size' => $file->getSize(),
                ]);
            }

            DB::commit();

            return ApiResponse::success($created, 'Media uploaded successfully', 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            foreach ($uploadedPaths as $uploadedPath) {
                $this->remove($uploadedPath);
            }
            return ApiResponse::error('Failed to upload media: ' . $e->getMessage(), 500);
        }
    }

    public function updateStatus(Request $request, string $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:reported,verification,confirmed,handled,resolved,rejected',
            'note'   => 'nullable|string|max:1000',
        ]);

        $report = Report::find($id);
        if (! $report) {
            return ApiResponse::notFound('Report not found.');
        }

        DB::beginTransaction();
        try {
            $report->status = $validated['status'];

            if ($validated['status'] === 'confirmed') {
                $report->confirmed_at = now();
            } elseif ($validated['status'] === 'resolved') {
                $report->resolved_at = now();
            }

            $report->save();

            ReportVerification::create([
                'report_id'    => $report->id,
                'moderator_id' => Auth::id(),
                'action'       => $validated['status'],
                'note'         => $validated['note'] ?? null,
            ]);

            DB::commit();

            return ApiResponse::success(
                $report->load([
                    'category:id,name,slug,icon',
                    'area:id,name',
                    'user:id,name,email',
                    'media:id,report_id,file_path,file_type,file_size,created_at',
                    'verifications.moderator:id,name,email'
                ])->loadCount('confirmations'),
                'Report status updated successfully'
            );
        } catch (\Throwable $e) {
            DB::rollBack();
            return ApiResponse::error('Failed to update report status: ' . $e->getMessage(), 500);
        }
    }

    public function confirm(Request $request, string $id)
    {
        $validated = $request->validate([
            'type' => 'required|in:agree,disagree',
            'note' => 'nullable|string',
        ]);

        $report = Report::find($id);
        if (! $report) {
            return ApiResponse::notFound('Report not found.');
        }

        ReportConfirmation::updateOrCreate(
            [
                'report_id' => $report->id,
                'user_id'   => Auth::id(),
                'type'      => $validated['type'],
            ],
            ['note' => $validated['note'] ?? null]
        );

        $count = ReportConfirmation::where('report_id', $report->id)->count();

        return ApiResponse::success(['confirmations_count' => $count], 'Confirmation recorded');
    }

    public function dismiss(string $id)
    {
        $report = Report::find($id);

        if (! $report) {
            return ApiResponse::notFound('Report not found.');
        }

        $report->is_dismissed = true;
        $report->save();

        return ApiResponse::success(
            [
                'id' => (string) $report->id,
                'is_dismissed' => true,
            ],
            'Notification dismissed successfully'
        );
    }
}
