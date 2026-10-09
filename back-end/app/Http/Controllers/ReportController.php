<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\ReportConfirmation;
use App\Models\ReportVerification;
use App\Helpers\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'lat'         => 'nullable|numeric|between:-90,90',
            'lng'         => 'nullable|numeric|between:-180,180',
            'radius'      => 'nullable|numeric|max:50000',
            'category_id' => 'nullable|exists:report_categories,id',
            'status'      => 'nullable|string',
            'per_page'    => 'nullable|integer|max:100',
        ]);

        $query = Report::with(['category:id,name,slug,icon', 'area:id,name'])
            ->withCount('confirmations');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
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
            $query->latest();
        }

        $reports = $query->paginate((int) $request->input('per_page', 20));

        return ApiResponse::success($reports, 'Reports retrieved successfully');
    }

    public function show(string $id)
    {
        $report = Report::with([
            'category:id,name,slug,icon',
            'area:id,name',
            'media:id,report_id,file_path,file_type',
            'verifications:id,report_id,action,note,created_at',
        ])->withCount('confirmations')->find($id);

        if (! $report) {
            return ApiResponse::notFound('Report not found.');
        }

        $report->makeHidden(['user_id']);

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
        ]);

        $validated['user_id']  = Auth::id();
        $validated['status']   = 'reported';
        $validated['severity'] = $validated['severity'] ?? 'medium';

        $report = Report::create($validated);

        return ApiResponse::success($report, 'Report created successfully', 201);
    }

    public function updateStatus(Request $request, string $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:reported,verification,confirmed,handled,resolved',
            'note'   => 'nullable|string',
        ]);

        $report = Report::find($id);
        if (! $report) {
            return ApiResponse::notFound('Report not found.');
        }

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

        return ApiResponse::success($report, 'Report status updated successfully');
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
}
