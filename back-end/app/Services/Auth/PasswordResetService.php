<?php

namespace App\Services\Auth;

use App\Exceptions\Auth\PasswordResetException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PasswordResetService
{
    /**
     * @throws PasswordResetException
     */
    public function sendResetLink(string $email): void
    {
        $status = Password::sendResetLink(['email' => $email]);

        if ($status !== Password::RESET_LINK_SENT) {
            throw new PasswordResetException(
                'Email not found or failed to send password reset link.'
            );
        }
    }

    /**
     * @throws PasswordResetException
     */
    public function reset(array $credentials): void
    {
        $status = Password::reset(
            $credentials,
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                $user->tokens()->delete();
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw new PasswordResetException(
                'The password reset token is invalid or has expired.'
            );
        }
    }
}