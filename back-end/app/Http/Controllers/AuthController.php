<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Register
     */
    public function register(RegisterRequest $request)
    {
        $user = User::create([
            'full_name' => $request->full_name,
            'email' => $request->email,
            'password' => $request->password,
        ]);

        $user->assignRole('user');

        $token = $user->createToken('auth_token')->plainTextToken;

        return ApiResponse::success(
            [
                'user' => $user,
                'token' => $token,
            ],
            'Registration successful.',
            201
        );
    }

    /**
     * Login
     */
    public function login(LoginRequest $request)
    {
        $user = User::where(
            'email',
            $request->email
        )->first();

        if (!$user || !Hash::check(
            $request->password,
            $user->password
        )) {
            return ApiResponse::unauthorized(
                'Invalid email or password.'
            );
        }

        $user->tokens()->delete();

        $token = $user->createToken(
            'auth_token'
        )->plainTextToken;

        return ApiResponse::success(
            [
                'user' => $user,
                'token' => $token,
            ],
            'Login successful.'
        );
    }

    /**
     * Get current authenticated user
     */
    public function user(Request $request)
    {
        return ApiResponse::success(
            $request->user(),
            'User data retrieved successfully.'
        );
    }

    /**
     * Logout
     */
    public function logout(Request $request)
    {
        $request->user()
            ->currentAccessToken()
            ->delete();

        return ApiResponse::success(
            null,
            'Logout successful.'
        );
    }

    /**
     * Forgot password
     */
    public function forgotPassword(
        ForgotPasswordRequest $request
    ) {
        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status !== Password::RESET_LINK_SENT) {
            return ApiResponse::error(
                'Email not found or failed to send password reset link.',
                400
            );
        }

        return ApiResponse::success(
            null,
            'Password reset link has been sent to your email.'
        );
    }

    /**
     * Reset password
     */
    public function resetPassword(
        ResetPasswordRequest $request
    ) {
        $status = Password::reset(
            $request->only(
                'email',
                'password',
                'password_confirmation',
                'token'
            ),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                $user->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return ApiResponse::error(
                'The password reset token is invalid or has expired.',
                400
            );
        }

        return ApiResponse::success(
            null,
            'Password has been reset successfully.'
        );
    }
}
