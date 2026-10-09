<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Poi;
use Illuminate\Database\Seeder;

class PoiSeeder extends Seeder
{
    public function run(): void
    {
        $area = Area::first();

        $pois = [
            [
                'external_id' => 'poi-kampus-ui-salemba',
                'source'      => 'internal',
                'category'    => 'university',
                'name'        => 'Universitas Indonesia Kampus Salemba',
                'address'     => 'Jl. Salemba Raya No. 4, Senen, Jakarta Pusat',
                'latitude'    => -6.1950000,
                'longitude'   => 106.8488000,
                'area_id'     => $area?->id,
            ],
            [
                'external_id' => 'poi-stasiun-manggarai',
                'source'      => 'internal',
                'category'    => 'transit_station',
                'name'        => 'Stasiun Manggarai (Sentral Transit)',
                'address'     => 'Jl. Manggarai Utara 1, Tebet, Jakarta Selatan',
                'latitude'    => -6.2100000,
                'longitude'   => 106.8502000,
                'area_id'     => $area?->id,
            ],
            [
                'external_id' => 'poi-stasiun-tebet',
                'source'      => 'internal',
                'category'    => 'transit_station',
                'name'        => 'Stasiun KRL Tebet',
                'address'     => 'Jl. Lapangan Roos Raya, Tebet Timur, Jakarta Selatan',
                'latitude'    => -6.2266000,
                'longitude'   => 106.8582000,
                'area_id'     => $area?->id,
            ],
            [
                'external_id' => 'poi-sman-8-jakarta',
                'source'      => 'internal',
                'category'    => 'school',
                'name'        => 'SMAN 8 Jakarta',
                'address'     => 'Jl. Taman Bukit Duri No. 2, Tebet, Jakarta Selatan',
                'latitude'    => -6.2201000,
                'longitude'   => 106.8604000,
                'area_id'     => $area?->id,
            ],
            [
                'external_id' => 'poi-pasar-tebet-barat',
                'source'      => 'internal',
                'category'    => 'market',
                'name'        => 'Pasar Tebet Barat',
                'address'     => 'Jl. Tebet Barat Dalam Raya, Tebet, Jakarta Selatan',
                'latitude'    => -6.2343000,
                'longitude'   => 106.8519000,
                'area_id'     => $area?->id,
            ],
        ];

        foreach ($pois as $p) {
            Poi::updateOrCreate(
                [
                    'external_id' => $p['external_id'],
                    'source'      => $p['source'],
                ],
                $p
            );
        }
    }
}
