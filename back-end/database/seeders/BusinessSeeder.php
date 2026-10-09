<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\User;
use Illuminate\Database\Seeder;

class BusinessSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('email', 'user@gmail.com')->first();
        if (!$user) {
            return;
        }

        $kedaiKopiType   = BusinessType::where('slug', 'kedai-kopi')->first();
        $warungMakanType = BusinessType::where('slug', 'warung-makan')->first();
        $laundryType     = BusinessType::where('slug', 'laundry')->first();
        $barbershopType  = BusinessType::where('slug', 'barbershop')->first();
        $kelontongType   = BusinessType::where('slug', 'toko-kelontong')->first();
        $minimarketType  = BusinessType::where('slug', 'minimarket')->first();
        $seblakType      = BusinessType::where('slug', 'gerobak-seblak')->first();
        $baksoType       = BusinessType::where('slug', 'gerobak-bakso')->first();

        $businesses = [
            // --- DKI JAKARTA ---
            [
                'name'             => 'Kopi Kenangan Senopati (Mitra LOCIVA)',
                'business_type_id' => $kedaiKopiType?->id,
                'description'      => 'Kedai kopi susu kekinian dengan konsep grab-and-go dan seating area.',
                'latitude'         => -6.2304000,
                'longitude'        => 106.8152000,
                'address'          => 'Jl. Senopati No. 41, Kebayoran Baru, Jakarta Selatan',
            ],
            [
                'name'             => 'Warung Bu Kris Fatmawati',
                'business_type_id' => $warungMakanType?->id,
                'description'      => 'Spesialis penyetan tradisional dan hidangan khas Jawa Timur.',
                'latitude'         => -6.2751000,
                'longitude'        => 106.7972000,
                'address'          => 'Jl. RS Fatmawati Raya No. 24, Jakarta Selatan',
            ],
            [
                'name'             => 'D Clean Laundry Express Tebet',
                'business_type_id' => $laundryType?->id,
                'description'      => 'Layanan cuci kiloan dan satuan higienis dekat pemukiman Tebet.',
                'latitude'         => -6.2295000,
                'longitude'        => 106.8521000,
                'address'          => 'Jl. Tebet Barat Dalam Raya No. 12, Tebet, Jakarta Selatan',
            ],
            [
                'name'             => 'Chief Barbershop Ciranjang',
                'business_type_id' => $barbershopType?->id,
                'description'      => 'Barbershop modern dengan layanan potong rambut dan grooming premium.',
                'latitude'         => -6.2371000,
                'longitude'        => 106.8118000,
                'address'          => 'Jl. Ciranjang No. 26, Kebayoran Baru, Jakarta Selatan',
            ],
            [
                'name'             => 'Toko Kelontong Berkah Mandiri Saharjo',
                'business_type_id' => $kelontongType?->id,
                'description'      => 'Penyedia sembako lengkap dan kebutuhan harian warga sekitar.',
                'latitude'         => -6.2158000,
                'longitude'        => 106.8392000,
                'address'          => 'Jl. Saharjo No. 88, Tebet, Jakarta Selatan',
            ],

            // --- BANDUNG ---
            [
                'name'             => 'Warung Nasi Ibu Imas Balonggede',
                'business_type_id' => $warungMakanType?->id,
                'description'      => 'Rumah makan Sunda legendaris terkenal dengan sambal dadak dan ayam goreng.',
                'latitude'         => -6.9248000,
                'longitude'        => 107.6045000,
                'address'          => 'Jl. Balonggede No. 67, Regol, Kota Bandung',
            ],
            [
                'name'             => 'Sejiwa Coffee Progo',
                'business_type_id' => $kedaiKopiType?->id,
                'description'      => 'Artisan coffee shop dan brunch spot populer di kawasan heritage Progo.',
                'latitude'         => -6.9038000,
                'longitude'        => 107.6174000,
                'address'          => 'Jl. Progo No. 15, Citarum, Bandung Wetan, Kota Bandung',
            ],
            [
                'name'             => 'Seblak Teh Betty Dipatiukur',
                'business_type_id' => $seblakType?->id,
                'description'      => 'Gerobak dan kedai seblak prasmanan favorit mahasiswa Unpad & ITB.',
                'latitude'         => -6.8920000,
                'longitude'        => 107.6180000,
                'address'          => 'Jl. Dipati Ukur No. 49, Coblong, Kota Bandung',
            ],

            // --- SEMARANG ---
            [
                'name'             => 'Toko Oen Pemuda Semarang',
                'business_type_id' => $warungMakanType?->id,
                'description'      => 'Restoran cagar budaya legendaris menyajikan kuliner kolonial dan es krim kuno.',
                'latitude'         => -6.9744000,
                'longitude'        => 110.4208000,
                'address'          => 'Jl. Pemuda No. 52, Semarang Tengah, Kota Semarang',
            ],
            [
                'name'             => 'Tekodeko Koffiehuis Kota Lama',
                'business_type_id' => $kedaiKopiType?->id,
                'description'      => 'Kedai kopi bernuansa vintage di jantung kawasan Kota Lama Semarang.',
                'latitude'         => -6.9682000,
                'longitude'        => 110.4285000,
                'address'          => 'Jl. Letjen Suprapto No. 44, Tanjung Mas, Kota Semarang',
            ],
            [
                'name'             => 'Laundry Kinclong Tembalang Undip',
                'business_type_id' => $laundryType?->id,
                'description'      => 'Layanan laundry kiloan cepat melayani ribuan mahasiswa di sekitar kampus Tembalang.',
                'latitude'         => -7.0512000,
                'longitude'        => 110.4398000,
                'address'          => 'Jl. Banjarsari No. 18, Tembalang, Kota Semarang',
            ],

            // --- YOGYAKARTA ---
            [
                'name'             => 'Gudeg Yu Djum Wijilan 167',
                'business_type_id' => $warungMakanType?->id,
                'description'      => 'Pusat kuliner gudeg kering tradisional Yogyakarta resep asli Bu Djum.',
                'latitude'         => -7.8042000,
                'longitude'        => 110.3667000,
                'address'          => 'Jl. Wijilan No. 167, Panembahan, Kraton, Kota Yogyakarta',
            ],
            [
                'name'             => 'Warung Kopi Klotok Pakem',
                'business_type_id' => $kedaiKopiType?->id,
                'description'      => 'Warung kopi tradisional dan pisang goreng legendaris berlatar sawah Merapi.',
                'latitude'         => -7.6628000,
                'longitude'        => 110.4225000,
                'address'          => 'Jl. Kaliurang KM 16, Pakem, Sleman, D.I. Yogyakarta',
            ],
            [
                'name'             => 'Barberbox Kaliurang KM 5',
                'business_type_id' => $barbershopType?->id,
                'description'      => 'Barbershop modern dengan fasilitas lengkap dekat kawasan kampus UGM.',
                'latitude'         => -7.7601000,
                'longitude'        => 110.3804000,
                'address'          => 'Jl. Kaliurang KM 5 No. 22, Caturtunggal, Depok, Sleman',
            ],

            // --- SURABAYA ---
            [
                'name'             => 'Rawon Setan Embong Malang',
                'business_type_id' => $warungMakanType?->id,
                'description'      => 'Kuliner rawon daging sapi khas Surabaya dengan kuah hitam pekat gurih.',
                'latitude'         => -7.2618000,
                'longitude'        => 112.7402000,
                'address'          => 'Jl. Embong Malang No. 78, Genteng, Kota Surabaya',
            ],
            [
                'name'             => 'Calibre Coffee Roasters Gubeng',
                'business_type_id' => $kedaiKopiType?->id,
                'description'      => 'Specialty coffee house dan artisan roastery dekat Stasiun Gubeng.',
                'latitude'         => -7.2667000,
                'longitude'        => 112.7508000,
                'address'          => 'Jl. Walikota Mustajab No. 67, Genteng, Kota Surabaya',
            ],
            [
                'name'             => 'Minimarket Mandiri Basuki Rahmat',
                'business_type_id' => $minimarketType?->id,
                'description'      => 'Toko retail kebutuhan pokok 24 jam di koridor komersial Surabaya Pusat.',
                'latitude'         => -7.2650000,
                'longitude'        => 112.7420000,
                'address'          => 'Jl. Basuki Rahmat No. 34, Tegalsari, Kota Surabaya',
            ],

            // --- MALANG ---
            [
                'name'             => 'Bakso President Malang',
                'business_type_id' => $baksoType?->id,
                'description'      => 'Warung bakso legendaris tepat di tepi rel kereta api dengan aneka bakso bakar dan goreng.',
                'latitude'         => -7.9620000,
                'longitude'        => 112.6340000,
                'address'          => 'Jl. Batanghari No. 5, Rampal Celaket, Klojen, Kota Malang',
            ],
            [
                'name'             => 'Toko Oen Basuki Rahmat Malang',
                'business_type_id' => $warungMakanType?->id,
                'description'      => 'Restoran kolonial tempo doeloe terkenal dengan steak lidah dan es krim buatan tangan.',
                'latitude'         => -7.9785000,
                'longitude'        => 112.6298000,
                'address'          => 'Jl. Jenderal Basuki Rahmat No. 5, Kauman, Klojen, Kota Malang',
            ],
            [
                'name'             => 'Kopi Lonceng Kayutangan Heritage',
                'business_type_id' => $kedaiKopiType?->id,
                'description'      => 'Kedai kopi khas di koridor cagar budaya Kayutangan Malang.',
                'latitude'         => -7.9772000,
                'longitude'        => 112.6315000,
                'address'          => 'Jl. Basuki Rahmat No. 8, Klojen, Kota Malang',
            ],
        ];

        foreach ($businesses as $b) {
            if (!$b['business_type_id']) {
                continue;
            }

            Business::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'name'    => $b['name'],
                ],
                $b
            );
        }
    }
}
