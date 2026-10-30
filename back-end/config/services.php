<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'bps' => [
        'api_key'  => env('BPS_API_KEY'),
        'base_url' => env('BPS_BASE_URL', 'https://webapi.bps.go.id/v1/api'),
    ],

    'osrmroute' => [
        'api_key'  => env('OSRMROUTE_API_KEY'),
        'base_url' => env('OSRMROUTE_BASE_URL', 'https://api.osrmroute.com/v1'),
    ],

    'ai' => [
        'url'     => env('AI_CHAT_URL', 'https://breakfast-investigator-incoming-grant.trycloudflare.com/api/chat'),
        'model'   => env('AI_MODEL', 'erwan2/DeepSeek-R1-Distill-Qwen-1.5B'),
        'timeout' => (int) env('AI_TIMEOUT_SECONDS', 95),
    ],

];
