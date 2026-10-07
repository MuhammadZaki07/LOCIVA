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
            'Registrasi berhasil.',
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
                'Email atau password salah.'
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
            'Login berhasil.'
        );
    }

    /**
     * Get current authenticated user
     */
    public function user(Request $request)
    {
        return ApiResponse::success(
            $request->user(),
            'Data user berhasil diambil.'
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
            'Logout berhasil.'
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
                'Email tidak ditemukan atau gagal mengirim link reset password.',
                400
            );
        }

        return ApiResponse::success(
            null,
            'Link reset password telah dikirim ke email.'
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
                'Token reset password tidak valid atau sudah kadaluarsa.',
                400
            );
        }

        return ApiResponse::success(
            null,
            'Password berhasil direset.'
        );
    }
}
