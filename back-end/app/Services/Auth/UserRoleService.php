<?php

namespace App\Services\Auth;

use App\Exceptions\Auth\RoleChangeNotAllowedException;
use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class UserRoleService
{
    public function __construct(protected UserRepository $users) {}

    public function list(?string $search = null): LengthAwarePaginator
    {
        return $this->users->paginate($search);
    }

    /**
     * @throws RoleChangeNotAllowedException
     */
    public function toggleAdmin(int|string $targetId, int|string $actingUserId): User
    {
        $user = $this->users->findOrFail($targetId);

        if ($user->hasRole('admin')) {
            $this->assertCanDemote($user, $actingUserId);

            $user->removeRole('admin');
            $user->assignRole('user');
        } else {
            $user->assignRole('admin');
        }

        return $user->fresh('roles');
    }

    private function assertCanDemote(User $user, int|string $actingUserId): void
    {
        if ((string) $user->id === (string) $actingUserId) {
            throw new RoleChangeNotAllowedException(
                'Anda tidak dapat mendemosi role akun Anda sendiri.'
            );
        }

        if ($this->users->countByRole('admin') <= 1) {
            throw new RoleChangeNotAllowedException(
                'Tidak dapat mengubah role akun admin terakhir untuk mencegah penguncian sistem.'
            );
        }
    }
}