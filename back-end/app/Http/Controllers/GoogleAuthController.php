<?php

namespace App\Http\Controllers;

use Laravel\Socialite\Facades\Socialite;
use App\Models\User;
use Illuminate\Http\Request;

class GoogleAuthController extends Controller
{
    public function redirectToGoogle()
    {
       return Socialite::driver('google')->stateless()->redirect();
    }

    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();

            $user = User::updateOrCreate(
                ['email' => $googleUser->getEmail()],
                [
                    'name'          => $googleUser->getName(),
                    'google_id'     => $googleUser->getId(),
                    'profile_image' => $googleUser->getAvatar(),
                ]
            );

            if (!$user->hasAnyRole(['admin', 'user'])) {
                $user->assignRole('user');
            }

            $token = $user->createToken('auth_token')->plainTextToken;
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            return redirect()->away("{$frontendUrl}/auth/callback?token={$token}");

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Google authentication failed',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
