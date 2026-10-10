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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Throwable;

class AuthController extends Controller
{

    public function register(RegisterRequest $request)
    {
        try {
            $user = User::create([
                'name' => $request->full_name,
                'email' => $request->email,
                'password' => $request->password,
            ]);

            $user->assignRole('user');

            $token = $user
                ->createToken('auth_token')
                ->plainTextToken;

            return ApiResponse::success(
                [
                    'user' => $user,
                    'token' => $token,
                ],
                'Registration successful.',
                201
            );
        } catch (Throwable $e) {
            Log::error('Registration failed.', [
                'email' => $request->email,
                'error' => $e->getMessage(),
            ]);

            return ApiResponse::error(
                'Registration failed. Please try again later.',
                500
            );
        }
    }

    public function login(LoginRequest $request)
    {
        try {
            $user = User::where(
                'email',
                $request->email
            )->first();

            if (
                !$user ||
                !Hash::check(
                    $request->password,
                    $user->password
                )
            ) {
                return ApiResponse::unauthorized(
                    'Invalid email or password.'
                );
            }

            $user->tokens()->delete();

            $token = $user
                ->createToken('auth_token')
                ->plainTextToken;

            return ApiResponse::success(
                [
                    'user' => $user,
                    'token' => $token,
                ],
                'Login successful.'
            );
        } catch (Throwable $e) {
            Log::error('Login failed.', [
                'email' => $request->email,
                'error' => $e->getMessage(),
            ]);

            return ApiResponse::error(
                'Login failed. Please try again later.',
                500
            );
        }
    }

    public function user(Request $request)
    {
        try {
            $user = $request->user();

            $user->role = $user->getRoleNames()->first();

            return ApiResponse::success(
                $user,
                'User data retrieved successfully.'
            );
        } catch (Throwable $e) {
            Log::error('Failed to retrieve authenticated user.', [
                'error' => $e->getMessage(),
            ]);

            return ApiResponse::error(
                'Failed to retrieve user data.',
                500
            );
        }
    }

    public function logout(Request $request)
    {
        try {
            $request->user()
                ->currentAccessToken()
                ->delete();

            return ApiResponse::success(
                null,
                'Logout successful.'
            );
        } catch (Throwable $e) {
            Log::error('Logout failed.', [
                'error' => $e->getMessage(),
            ]);

            return ApiResponse::error(
                'Logout failed. Please try again later.',
                500
            );
        }
    }

    public function forgotPassword(
        ForgotPasswordRequest $request
    ) {
        try {
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
        } catch (Throwable $e) {
            Log::error('Forgot password failed.', [
                'email' => $request->email,
                'error' => $e->getMessage(),
            ]);

            return ApiResponse::error(
                'Failed to send password reset link. Please try again later.',
                500
            );
        }
    }

    public function resetPassword(
        ResetPasswordRequest $request
    ) {
        try {
            $status = Password::reset(
                $request->only(
                    'email',
                    'password',
                    'password_confirmation',
                    'token'
                ),
                function (User $user, string $password) {
                    $user->forceFill([
                        'password' => Hash::make($password),
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
        } catch (Throwable $e) {
            Log::error('Password reset failed.', [
                'email' => $request->email,
                'error' => $e->getMessage(),
            ]);

            return ApiResponse::error(
                'Password reset failed. Please try again later.',
                500
            );
        }
    }

    /**
     * Admin: retrieve list of users with roles and activity counts.
     */
    public function usersList(Request $request)
    {
        $query = User::with('roles:id,name');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->latest()->paginate(50);

        return ApiResponse::success($users, 'Users directory retrieved successfully');
    }

    /**
     * Admin: toggle between user and admin role.
     */
    public function toggleUserRole(string $id)
    {
        $user = User::findOrFail($id);

        if ($user->hasRole('admin')) {
            $user->removeRole('admin');
            $user->assignRole('user');
        } else {
            $user->assignRole('admin');
        }

        return ApiResponse::success($user->fresh('roles'), 'User role updated successfully');
    }
}
