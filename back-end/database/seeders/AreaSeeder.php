<?php

namespace Database\Seeders;

use App\Models\Area;
use Illuminate\Database\Seeder;

class AreaSeeder extends Seeder
{
    public function run(): void
    {
        $areas = [
            [
                'name'      => 'Jakarta Pusat',
                'type'      => 'city',
                'code'      => '31.71',
                'latitude'  => -6.1805,
                'longitude' => 106.8284,
            ],
            [
                'name'      => 'Jakarta Selatan',
                'type'      => 'city',
                'code'      => '31.74',
                'latitude'  => -6.2615,
                'longitude' => 106.8106,
            ],
            [
                'name'      => 'Bandung',
                'type'      => 'city',
                'code'      => '32.73',
                'latitude'  => -6.9175,
                'longitude' => 107.6191,
            ],
            [
                'name'      => 'Semarang',
                'type'      => 'city',
                'code'      => '33.74',
                'latitude'  => -6.9667,
                'longitude' => 110.4167,
            ],
            [
                'name'      => 'Yogyakarta',
                'type'      => 'city',
                'code'      => '34.71',
                'latitude'  => -7.7956,
                'longitude' => 110.3695,
            ],
            [
                'name'      => 'Surabaya',
                'type'      => 'city',
                'code'      => '35.78',
                'latitude'  => -7.2575,
                'longitude' => 112.7521,
            ],
            [
                'name'      => 'Malang',
                'type'      => 'city',
                'code'      => '35.73',
                'latitude'  => -7.9666,
                'longitude' => 112.6326,
            ],
        ];

        foreach ($areas as $area) {
            Area::updateOrCreate(
                ['name' => $area['name']],
                $area
            );
        }
    }
}
