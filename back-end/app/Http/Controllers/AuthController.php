<?php

namespace App\Http\Controllers;

use App\Exceptions\Auth\PasswordResetException;
use App\Exceptions\Auth\InvalidCredentialsException;
use App\Exceptions\Auth\RoleChangeNotAllowedException;
use App\Helpers\ApiResponse;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Services\Auth\AuthService;
use App\Services\Auth\PasswordResetService;
use App\Services\Auth\UserRoleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Throwable;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $service,
        protected PasswordResetService $passwordService,
        protected UserRoleService $roleService,
    ) {}

    public function register(RegisterRequest $request)
    {
        try {
            $user = $this->service->register($request->validated());

            return ApiResponse::success(
                [
                    "user" => $user,
                    "token" => $this->service->createToken($user),
                ],
                "Registration successful.",
                201,
            );
        } catch (Throwable $e) {
            Log::error("Registration failed.", [
                "email" => $request->email,
                "error" => $e->getMessage(),
            ]);

            return ApiResponse::error(
                "Registration failed. Please try again later.",
                500,
            );
        }
    }

    public function login(LoginRequest $request)
    {
        try {
            $user = $this->service->login(
                $request->email,
                $request->password,
            );

            return ApiResponse::success(
                [
                    "user" => $user,
                    "token" => $this->service->createToken($user),
                ],
                "Login successful.",
            );
        } catch (InvalidCredentialsException $e) {
            return ApiResponse::unauthorized($e->getMessage());
        } catch (Throwable $e) {
            Log::error("Login failed.", [
                "email" => $request->email,
                "error" => $e->getMessage(),
            ]);

            return ApiResponse::error(
                "Login failed. Please try again later.",
                500,
            );
        }
    }

    public function user(Request $request)
    {
        try {
            $user = $this->service->withRole($request->user());

            return ApiResponse::success(
                $user,
                "User data retrieved successfully.",
            );
        } catch (Throwable $e) {
            Log::error("Failed to retrieve authenticated user.", [
                "error" => $e->getMessage(),
            ]);

            return ApiResponse::error("Failed to retrieve user data.", 500);
        }
    }

    public function logout(Request $request)
    {
        try {
            $this->service->logout($request->user());

            return ApiResponse::success(null, "Logout successful.");
        } catch (Throwable $e) {
            Log::error("Logout failed.", [
                "error" => $e->getMessage(),
            ]);

            return ApiResponse::error(
                "Logout failed. Please try again later.",
                500,
            );
        }
    }

    public function forgotPassword(ForgotPasswordRequest $request)
    {
        try {
            $this->passwordService->sendResetLink($request->email);

            return ApiResponse::success(
                null,
                "Password reset link has been sent to your email.",
            );
        } catch (PasswordResetException $e) {
            return ApiResponse::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Log::error("Forgot password failed.", [
                "email" => $request->email,
                "error" => $e->getMessage(),
            ]);

            return ApiResponse::error(
                "Failed to send password reset link. Please try again later.",
                500,
            );
        }
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        try {
            $this->passwordService->reset(
                $request->only(
                    "email",
                    "password",
                    "password_confirmation",
                    "token",
                ),
            );

            return ApiResponse::success(
                null,
                "Password has been reset successfully.",
            );
        } catch (PasswordResetException $e) {
            return ApiResponse::error($e->getMessage(), 400);
        } catch (Throwable $e) {
            Log::error("Password reset failed.", [
                "email" => $request->email,
                "error" => $e->getMessage(),
            ]);

            return ApiResponse::error(
                "Password reset failed. Please try again later.",
                500,
            );
        }
    }

    /**
     * Admin: retrieve list of users with roles and activity counts.
     */
    public function usersList(Request $request)
    {
        $users = $this->roleService->list($request->input("search"));

        return ApiResponse::success(
            $users,
            "Users directory retrieved successfully",
        );
    }

    /**
     * Admin: toggle between user and admin role.
     */
    public function toggleUserRole(string $id)
    {
        try {
            $user = $this->roleService->toggleAdmin($id, Auth::id());
        } catch (RoleChangeNotAllowedException $e) {
            return ApiResponse::unauthorized($e->getMessage());
        } catch(Throwable $e){
            return ApiResponse::error($e->getMessage());
        }

        return ApiResponse::success($user, "User role updated successfully");
    }
}