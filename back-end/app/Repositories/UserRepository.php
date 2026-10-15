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

        return $query->paginate($perPage);
    }
}
