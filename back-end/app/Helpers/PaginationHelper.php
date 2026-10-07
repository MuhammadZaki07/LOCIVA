<?php

namespace App\Helpers;

use Illuminate\Pagination\LengthAwarePaginator;

class PaginationHelper
{
    public static function meta(LengthAwarePaginator $collection): array
    {
        return [
            'total' => $collection->total(),
            'per_page' => $collection->perPage(),
            'current_page' => $collection->currentPage(),
            'last_page' => $collection->lastPage(),
            'from' => $collection->firstItem(),
            'to' => $collection->lastItem(),
        ];
    }
}
