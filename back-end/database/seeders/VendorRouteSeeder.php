<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\User;
use App\Models\vendorRoute;
use Illuminate\Database\Seeder;

class VendorRouteSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('email', 'user@gmail.com')->first();
        if (!$user) {
            return;
        }

        $baksoMalang = Business::where('name', 'like', '%Bakso President%')->first();
        $kopiJakarta = Business::where('name', 'like', '%Kopi Kenangan Senopati%')->first();
        $seblakBandung = Business::where('name', 'like', '%Seblak Teh Betty%')->first();

        $routes = [
            [
                'user_id'             => $user->id,
                'business_id'         => $baksoMalang?->id,
                'name'                => 'Rute Keliling Bakso Stasiun & Kampus Malang',
                'start_location_name' => 'Stasiun Kota Baru Malang',
                'end_location_name'   => 'Kawasan Kampus UB Malang',
                'distance'            => 6.4,
                'estimated_duration'  => 45, // menit
                'status'              => 'active',
                'is_shared'           => true,
                'notes'               => 'Rute siang hari melayani jam makan siang pekerja stasiun dan mahasiswa UB.',
                'waypoints'           => [
                    ['name' => 'Titik 1: Stasiun Kota Baru Malang', 'lat' => -7.9775, 'lng' => 112.6375, 'stop_duration' => 60],
                    ['name' => 'Titik 2: Alun-Alun Tugu Malang', 'lat' => -7.9772, 'lng' => 112.6338, 'stop_duration' => 45],
                    ['name' => 'Titik 3: Koridor Kayutangan Heritage', 'lat' => -7.9785, 'lng' => 112.6305, 'stop_duration' => 90],
                    ['name' => 'Titik 4: Gerbang Utama Brawijaya', 'lat' => -7.9525, 'lng' => 112.6145, 'stop_duration' => 120],
                ],
            ],
            [
                'user_id'             => $user->id,
                'business_id'         => $kopiJakarta?->id,
                'name'                => 'Rute Mobile Coffee Senopati - SCBD Pagi',
                'start_location_name' => 'Taman Suryo Senopati',
                'end_location_name'   => 'Area Perkantoran SCBD Lot 8',
                'distance'            => 3.8,
                'estimated_duration'  => 30,
                'status'              => 'planned',
                'is_shared'           => true,
                'notes'               => 'Rute pagi pukul 07.00 - 10.30 WIB untuk komuter kantor SCBD.',
                'waypoints'           => [
                    ['name' => 'Titik A: Taman Suryo', 'lat' => -6.2340, 'lng' => 112.6340 ? 106.8190 : 106.8190, 'stop_duration' => 30],
                    ['name' => 'Titik B: Senopati Suites Gate', 'lat' => -6.2295, 'lng' => 106.8120, 'stop_duration' => 45],
                    ['name' => 'Titik C: Halte Transjakarta Polda', 'lat' => -6.2230, 'lng' => 106.8105, 'stop_duration' => 60],
                ],
            ],
            [
                'user_id'             => $user->id,
                'business_id'         => $seblakBandung?->id,
                'name'                => 'Rute Sore Seblak Dipatiukur - Dago',
                'start_location_name' => 'Taman Panatayuda Bandung',
                'end_location_name'   => 'Simpang Dago Bandung',
                'distance'            => 2.9,
                'estimated_duration'  => 25,
                'status'              => 'active',
                'is_shared'           => true,
                'notes'               => 'Rute sore jam pulang kuliah mahasiswa Unpad & ITB.',
                'waypoints'           => [
                    ['name' => 'Pemberhentian 1: Taman Panatayuda', 'lat' => -6.8965, 'lng' => 107.6140, 'stop_duration' => 45],
                    ['name' => 'Pemberhentian 2: Kampus Unpad DU', 'lat' => -6.8915, 'lng' => 107.6185, 'stop_duration' => 90],
                    ['name' => 'Pemberhentian 3: RS Santo Borromeus', 'lat' => -6.8940, 'lng' => 107.6120, 'stop_duration' => 60],
                ],
            ],
        ];

        foreach ($routes as $route) {
            \App\Models\VendorRoute::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'name'    => $route['name'],
                ],
                $route
            );
        }
    }
}
