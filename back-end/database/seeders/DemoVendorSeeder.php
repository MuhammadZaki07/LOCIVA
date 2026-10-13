<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoVendorSeeder extends Seeder
{
    /**
     * Seed realistic sample demo vendor records across multiple distinct Indonesian regions.
     * These records are explicitly tagged with is_demo = true and are served via the Laravel API.
     */
    public function run(): void
    {
        $user = User::where('email', 'user@gmail.com')->first();
        if (!$user) {
            $user = User::first();
        }
        if (!$user) {
            return;
        }

        $kedaiKopiType   = BusinessType::where('slug', 'kedai-kopi')->first();
        $warungMakanType = BusinessType::where('slug', 'warung-makan')->first();
        $laundryType     = BusinessType::where('slug', 'laundry')->first();
        $barbershopType  = BusinessType::where('slug', 'barbershop')->first();
        $kelontongType   = BusinessType::where('slug', 'toko-kelontong')->first();
        $seblakType      = BusinessType::where('slug', 'gerobak-seblak')->first();
        $baksoType       = BusinessType::where('slug', 'gerobak-bakso')->first();

        $demoVendors = [
            // --- MALANG (Jawa Timur) ---
            [
                'name'             => '[DEMO] Bakso Keliling Cak Man Tugu',
                'business_type_id' => $baksoType?->id,
                'description'      => 'Sample demo vendor: Gerobak bakso kuah sapi legendaris area Alun-alun Tugu.',
                'latitude'         => -7.9780000,
                'longitude'        => 112.6340000,
                'address'          => 'Jl. Tugu No. 1, Klojen, Kota Malang',
                'is_demo'          => true,
            ],
            [
                'name'             => '[DEMO] Kopi Tubruk Sudimoro Heritage',
                'business_type_id' => $kedaiKopiType?->id,
                'description'      => 'Sample demo vendor: Kedai kopi santai komunitas Sudimoro Malang.',
                'latitude'         => -7.9392000,
                'longitude'        => 112.6285000,
                'address'          => 'Jl. Sudimoro Raya No. 18, Mojolangu, Lowokwaru, Kota Malang',
                'is_demo'          => true,
            ],
            [
                'name'             => '[DEMO] Warung Lalapan Sigura-gura',
                'business_type_id' => $warungMakanType?->id,
                'description'      => 'Sample demo vendor: Warung makan spesialis sambal pecel lele mahasiswa.',
                'latitude'         => -7.9555000,
                'longitude'        => 112.6080000,
                'address'          => 'Jl. Bendungan Sigura-gura No. 34, Sumbersari, Lowokwaru, Kota Malang',
                'is_demo'          => true,
            ],

            // --- SURABAYA (Jawa Timur) ---
            [
                'name'             => '[DEMO] Rawon Daging Pabean Express',
                'business_type_id' => $warungMakanType?->id,
                'description'      => 'Sample demo vendor: Gerobak rawon hitam daging empuk dekat pasar grosir.',
                'latitude'         => -7.2345000,
                'longitude'        => 112.7420000,
                'address'          => 'Jl. Panggung No. 82, Pabean Cantian, Kota Surabaya',
                'is_demo'          => true,
            ],
            [
                'name'             => '[DEMO] Kedai Es Kopi Tunjungan',
                'business_type_id' => $kedaiKopiType?->id,
                'description'      => 'Sample demo vendor: Kios kopi artisan pedestrian Tunjungan.',
                'latitude'         => -7.2612000,
                'longitude'        => 112.7402000,
                'address'          => 'Jl. Tunjungan No. 56, Genteng, Kota Surabaya',
                'is_demo'          => true,
            ],

            // --- JAKARTA SELATAN (DKI Jakarta) ---
            [
                'name'             => '[DEMO] Gerobak Ketoprak Blok M Melawai',
                'business_type_id' => $warungMakanType?->id,
                'description'      => 'Sample demo vendor: Pedagang ketoprak gerobak bumbu kacang uleg segar.',
                'latitude'         => -6.2440000,
                'longitude'        => 106.8015000,
                'address'          => 'Jl. Melawai IV No. 10, Kebayoran Baru, Jakarta Selatan',
                'is_demo'          => true,
            ],
            [
                'name'             => '[DEMO] Senopati Mobile Cold Brew',
                'business_type_id' => $kedaiKopiType?->id,
                'description'      => 'Sample demo vendor: Sepeda kopi keliling specialty coffee Senopati.',
                'latitude'         => -6.2315000,
                'longitude'        => 106.8122000,
                'address'          => 'Jl. Suryo No. 25, Senopati, Kebayoran Baru, Jakarta Selatan',
                'is_demo'          => true,
            ],

            // --- BANDUNG (Jawa Barat) ---
            [
                'name'             => '[DEMO] Seblak Ceker Mercon Dago',
                'business_type_id' => $seblakType?->id,
                'description'      => 'Sample demo vendor: Gerobak seblak prasmanan pedas dekat taman Dago.',
                'latitude'         => -6.8850000,
                'longitude'        => 107.6145000,
                'address'          => 'Jl. Ir. H. Juanda No. 120, Dago, Coblong, Kota Bandung',
                'is_demo'          => true,
            ],
            [
                'name'             => '[DEMO] Cuci Kilat Antapani Dry Clean',
                'business_type_id' => $laundryType?->id,
                'description'      => 'Sample demo vendor: Outlet laundry koin ramah lingkungan perumahan.',
                'latitude'         => -6.9180000,
                'longitude'        => 107.6580000,
                'address'          => 'Jl. Terusan Jakarta No. 45, Antapani, Kota Bandung',
                'is_demo'          => true,
            ],

            // --- YOGYAKARTA (DI Yogyakarta) ---
            [
                'name'             => '[DEMO] Angkringan Kopi Jos Malioboro',
                'business_type_id' => $kedaiKopiType?->id,
                'description'      => 'Sample demo vendor: Gerobak angkringan arang panas legendaris dekat stasiun Tugu.',
                'latitude'         => -7.7895000,
                'longitude'        => 110.3645000,
                'address'          => 'Jl. Margo Utomo No. 12, Gowongan, Jetis, Kota Yogyakarta',
                'is_demo'          => true,
            ],
            [
                'name'             => '[DEMO] Gudeg Basah Kaliurang',
                'business_type_id' => $warungMakanType?->id,
                'description'      => 'Sample demo vendor: Warung gudeg areh kental porsi mahasiswa UGM.',
                'latitude'         => -7.7710000,
                'longitude'        => 110.3800000,
                'address'          => 'Jl. Kaliurang KM 5.2, Caturtunggal, Depok, Sleman',
                'is_demo'          => true,
            ],

            // --- SEMARANG (Jawa Tengah) ---
            [
                'name'             => '[DEMO] Lumpia Basah Mataram',
                'business_type_id' => $warungMakanType?->id,
                'description'      => 'Sample demo vendor: Gerobak lumpia rebung saus bawang khas Semarang.',
                'latitude'         => -6.9850000,
                'longitude'        => 110.4280000,
                'address'          => 'Jl. MT Haryono No. 512, Jagalan, Semarang Tengah',
                'is_demo'          => true,
            ],

            // --- DENPASAR (Bali) ---
            [
                'name'             => '[DEMO] Nasi Jinggo Renon Suropati',
                'business_type_id' => $warungMakanType?->id,
                'description'      => 'Sample demo vendor: Gerobak nasi jinggo sambal sero area perkantoran Renon.',
                'latitude'         => -8.6720000,
                'longitude'        => 115.2280000,
                'address'          => 'Jl. Raya Puputan No. 88, Renon, Denpasar Selatan',
                'is_demo'          => true,
            ],

            // --- MEDAN (Sumatera Utara) ---
            [
                'name'             => '[DEMO] Kopi Sidikalang Kesawan',
                'business_type_id' => $kedaiKopiType?->id,
                'description'      => 'Sample demo vendor: Kedai kopi seduh manual heritage Kesawan Medan.',
                'latitude'         => 3.5890000,
                'longitude'        => 98.6780000,
                'address'          => 'Jl. Ahmad Yani No. 42, Kesawan, Medan Barat, Kota Medan',
                'is_demo'          => true,
            ],
        ];

        foreach ($demoVendors as $vendor) {
            Business::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'name'    => $vendor['name'],
                ],
                $vendor
            );
        }
    }
}
