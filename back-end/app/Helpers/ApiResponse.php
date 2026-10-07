<?php

namespace App\Helpers;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    /**
     * Success response
     */
    public static function success(
        mixed $data = null,
        string $message = 'Success',
        int $code = 200
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    /**
     * Error response
     */
    public static function error(
        string $message = 'Something went wrong',
        int $code = 400,
        mixed $errors = null
    ): JsonResponse {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $code);
    }

    /**
     * Validation error
     */
    public static function validation(
        mixed $errors,
        string $message = 'Validation failed'
    ): JsonResponse {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], 422);
    }

    /**
     * Unauthorized
     */
    public static function unauthorized(
        string $message = 'Unauthenticated.'
    ): JsonResponse {
        return self::error($message, 401);
    }

    /**
     * Forbidden
     */
    public static function forbidden(
        string $message = 'You do not have permission to access this resource.'
    ): JsonResponse {
        return self::error($message, 403);
    }

    /**
     * Not found
     */
    public static function notFound(
        string $message = 'Resource not found.'
    ): JsonResponse {
        return self::error($message, 404);
    }

    /**
     * Server error
     */
    public static function serverError(
        string $message = 'Internal server error.'
    ): JsonResponse {
        return self::error($message, 500);
    }
}
