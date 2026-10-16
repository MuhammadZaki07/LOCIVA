<?php

namespace Database\Seeders;

use App\Models\ReportCategory;
use Illuminate\Database\Seeder;

class ReportCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name'        => 'Jalan Rusak & Berlubang',
                'slug'        => 'road',
                'description' => 'Kerusakan fisik jalan, aspal ambles, atau lubang yang mengganggu mobilitas pedagang dan konsumen.',
                'icon'        => 'alert-triangle',
                'is_active'   => true,
            ],
            [
                'name'        => 'Genangan Air & Banjir',
                'slug'        => 'flood',
                'description' => 'Genangan air berkala atau titik rawan banjir saat curah hujan tinggi yang menghambat akses toko/ruko.',
                'icon'        => 'droplets',
                'is_active'   => true,
            ],
            [
                'name'        => 'Tumpukan Sampah & Bau',
                'slug'        => 'waste',
                'description' => 'Tempat pembuangan liar atau sampah menumpuk yang mengganggu kenyamanan pelanggan kuliner/usaha.',
                'icon'        => 'trash-2',
                'is_active'   => true,
            ],
            [
                'name'        => 'Penerangan Jalan Mati',
                'slug'        => 'light',
                'description' => 'Lampu jalan umum (PJU) padam yang menurunkan rasa aman pengunjung di malam hari.',
                'icon'        => 'lightbulb',
                'is_active'   => true,
            ],
            [
                'name'        => 'Penertiban & Keamanan',
                'slug'        => 'security',
                'description' => 'Penertiban zonasi trotoar, pungli liar, atau gangguan ketertiban umum di sekitar lapak.',
                'icon'        => 'shield-alert',
                'is_active'   => true,
            ],
        ];

        foreach ($categories as $cat) {
            ReportCategory::firstOrCreate(
                ['slug' => $cat['slug']],
                $cat
            );
        }
    }
}
