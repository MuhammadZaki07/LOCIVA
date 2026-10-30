<?php

namespace App\Services\Auth;

use App\Exceptions\Auth\InvalidCredentialsException;
use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function __construct(protected UserRepository $users) {}
    
    /**
     * @param array<string,mixed> $data
     */
    public function register(array $data): User
    {
        $user = $this->users->create($data);
        $user->assignRole('user');

        return $user;
    }

    /**
     * @throws InvalidCredentialsException
     */
    public function login(string $email, string $password): User
    {
        $user = $this->users->findByEmail($email);

        if (! $user || ! Hash::check($password, $user->password)) {
            throw new InvalidCredentialsException("Invalid email or password.");
        }

        $user->tokens()->delete();

        return $this->withRole($user);
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }

    public function createToken(User $user): string
    {
        return $user->createToken('auth_token')->plainTextToken;
    }

    public function withRole(User $user): User
    {
        $user->role = $user->getRoleNames()->first() ?? 'user';

        return $user;
    }
}