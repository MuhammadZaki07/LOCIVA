<?php

namespace Database\Seeders;

use App\Models\BusinessType;
use Illuminate\Database\Seeder;

class BusinessTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'name'                  => 'Gerobak Seblak',
                'slug'                  => 'gerobak-seblak',
                'category'              => 'Makanan & Minuman',
                'scale'                 => 'gerobak',
                'icon'                  => 'Utensils',
                'description'           => 'Jajanan kekinian pedas, target utama pelajar dan mahasiswa.',
                'default_radius_m'      => 400,
                'min_radius_m'          => 100,
                'max_radius_m'          => 1000,
                'is_active'             => true,
                'target_demographics'   => [
                    ['category' => 'school', 'weight' => 15],
                    ['category' => 'university', 'weight' => 18],
                    ['category' => 'college', 'weight' => 18],
                    ['category' => 'commercial', 'weight' => 12],
                    ['category' => 'marketplace', 'weight' => 10],
                    ['category' => 'bus_station', 'weight' => 8],
                ],
                'competitor_categories' => ['fast_food', 'cafe', 'food_court'],
            ],
            [
                'name'                  => 'Gerobak Bakso',
                'slug'                  => 'gerobak-bakso',
                'category'              => 'Makanan & Minuman',
                'scale'                 => 'gerobak',
                'icon'                  => 'Utensils',
                'description'           => 'Makanan berkuah populer, cocok di dekat perumahan, perkantoran, atau pasar.',
                'default_radius_m'      => 400,
                'min_radius_m'          => 100,
                'max_radius_m'          => 1000,
                'is_active'             => true,
                'target_demographics'   => [
                    ['category' => 'residential', 'weight' => 15],
                    ['category' => 'marketplace', 'weight' => 15],
                    ['category' => 'school', 'weight' => 10],
                    ['category' => 'commercial', 'weight' => 10],
                ],
                'competitor_categories' => ['restaurant', 'fast_food', 'food_court'],
            ],
            [
                'name'                  => 'Kedai Kopi',
                'slug'                  => 'kedai-kopi',
                'category'              => 'Makanan & Minuman',
                'scale'                 => 'warung',
                'icon'                  => 'Coffee',
                'description'           => 'Tempat nongkrong ngopi, cocok dekat kampus, co-working, atau perkantoran.',
                'default_radius_m'      => 700,
                'min_radius_m'          => 200,
                'max_radius_m'          => 1500,
                'is_active'             => true,
                'target_demographics'   => [
                    ['category' => 'university', 'weight' => 18],
                    ['category' => 'college', 'weight' => 18],
                    ['category' => 'commercial', 'weight' => 15],
                    ['category' => 'park', 'weight' => 10],
                    ['category' => 'community_centre', 'weight' => 10],
                ],
                'competitor_categories' => ['cafe'],
            ],
            [
                'name'                  => 'Warung Makan',
                'slug'                  => 'warung-makan',
                'category'              => 'Makanan & Minuman',
                'scale'                 => 'warung',
                'icon'                  => 'Utensils',
                'description'           => 'Menyediakan makanan berat harian untuk pekerja, keluarga, dan warga sekitar.',
                'default_radius_m'      => 700,
                'min_radius_m'          => 200,
                'max_radius_m'          => 1500,
                'is_active'             => true,
                'target_demographics'   => [
                    ['category' => 'commercial', 'weight' => 15],
                    ['category' => 'university', 'weight' => 15],
                    ['category' => 'industrial', 'weight' => 15],
                    ['category' => 'marketplace', 'weight' => 10],
                    ['category' => 'bus_station', 'weight' => 10],
                ],
                'competitor_categories' => ['restaurant', 'fast_food', 'food_court'],
            ],
            [
                'name'                  => 'Laundry Kiloan & Satuan',
                'slug'                  => 'laundry',
                'category'              => 'Layanan',
                'scale'                 => 'kios',
                'icon'                  => 'Shirt',
                'description'           => 'Layanan cuci pakaian higienis, sangat butuh pemukiman padat atau area kos-kosan.',
                'default_radius_m'      => 1000,
                'min_radius_m'          => 300,
                'max_radius_m'          => 2000,
                'is_active'             => true,
                'target_demographics'   => [
                    ['category' => 'residential', 'weight' => 20],
                    ['category' => 'apartments', 'weight' => 20],
                    ['category' => 'university', 'weight' => 15],
                    ['category' => 'college', 'weight' => 15],
                ],
                'competitor_categories' => ['laundry'],
            ],
            [
                'name'                  => 'Barbershop & Grooming',
                'slug'                  => 'barbershop',
                'category'              => 'Layanan',
                'scale'                 => 'kios',
                'icon'                  => 'Scissors',
                'description'           => 'Pangkas rambut pria dan layanan grooming modern di kawasan komersial atau hunian.',
                'default_radius_m'      => 800,
                'min_radius_m'          => 200,
                'max_radius_m'          => 2000,
                'is_active'             => true,
                'target_demographics'   => [
                    ['category' => 'residential', 'weight' => 15],
                    ['category' => 'university', 'weight' => 10],
                    ['category' => 'commercial', 'weight' => 10],
                ],
                'competitor_categories' => ['barbershop', 'hairdresser'],
            ],
            [
                'name'                  => 'Toko Kelontong',
                'slug'                  => 'toko-kelontong',
                'category'              => 'Retail',
                'scale'                 => 'toko',
                'icon'                  => 'Store',
                'description'           => 'Menjual sembako dan kebutuhan harian rumah tangga langsung di tengah pemukiman.',
                'default_radius_m'      => 500,
                'min_radius_m'          => 100,
                'max_radius_m'          => 1500,
                'is_active'             => true,
                'target_demographics'   => [
                    ['category' => 'residential', 'weight' => 20],
                    ['category' => 'apartments', 'weight' => 15],
                ],
                'competitor_categories' => ['convenience', 'supermarket'],
            ],
            [
                'name'                  => 'Minimarket Mandiri',
                'slug'                  => 'minimarket',
                'category'              => 'Retail',
                'scale'                 => 'ruko',
                'icon'                  => 'ShoppingCart',
                'description'           => 'Retail modern kebutuhan harian skala menengah di pinggir jalan raya utama.',
                'default_radius_m'      => 1200,
                'min_radius_m'          => 500,
                'max_radius_m'          => 3000,
                'is_active'             => true,
                'target_demographics'   => [
                    ['category' => 'residential', 'weight' => 15],
                    ['category' => 'bus_station', 'weight' => 12],
                    ['category' => 'gas', 'weight' => 10],
                    ['category' => 'commercial', 'weight' => 10],
                ],
                'competitor_categories' => ['convenience', 'supermarket'],
            ],
        ];

        foreach ($types as $type) {
            BusinessType::updateOrCreate(
                ['slug' => $type['slug']],
                $type
            );
        }
    }
}
