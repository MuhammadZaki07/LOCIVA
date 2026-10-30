<?php

namespace App\Repositories;

use App\Models\User;

class UserRepository extends BaseRepository
{
    public function __construct(User $model)
    {
        parent::__construct($model);
    }

    public function findByEmail(string $email): ?User
    {
        return $this->model->newQuery()->where('email', $email)->first();
    }



    public function finds(int|string $id, array $columns = ['*'])
    {
        return $this->model->newQuery()
            ->withCount([
                'businesses',
                'reports',
                'vendorRoutes',
            ])
            ->with([
                'businesses' => fn($query) => $query
                    ->latest()
                    ->limit(5),

                'reports' => fn($query) => $query
                    ->latest()
                    ->limit(5),

                'vendorRoutes' => fn($query) => $query
                    ->latest()
                    ->limit(5),
            ])
            ->find($id, $columns);
    }

    public function PaginateFilter(array $filters = [], int $perPage = 10)
    {
        $query = $this->model->newQuery();

        $query->when($filters['search'] ?? null, function ($query, $search) {
            $query->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        });

        $query->when($filters['role'] ?? null, function ($query, $role) {
            $query->role($role);
        });

        $query->when($filters['from'] ?? null, function ($query, $from) {
            $query->whereDate('created_at', '>=', $from);
        });

        $query->when($filters['to'] ?? null, function ($query, $to) {
            $query->whereDate('created_at', '<=', $to);
        });

        $allowedSorts = ['name', 'email', 'created_at'];
        $sortBy = in_array($filters['sort_by'] ?? null, $allowedSorts, true) ? $filters['sort_by'] : 'created_at';
        $sortOrder = ($filters['sort_order'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        return $query->paginate($perPage);
    }
}
