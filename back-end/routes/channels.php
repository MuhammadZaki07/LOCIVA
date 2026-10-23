<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('admin.reports', function ($user) {
    return $user->hasRole('admin');
});
