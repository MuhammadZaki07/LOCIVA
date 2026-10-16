<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\ReportConfirmation;
use App\Models\ReportVerification;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReportSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@gmail.com')->first();
        $user = User::where('email', 'user@gmail.com')->first();
        $area = Area::first();

        $catRoad = ReportCategory::where('slug', 'road')->first();
        $catFlood = ReportCategory::where('slug', 'flood')->first();
        $catWaste = ReportCategory::where('slug', 'waste')->first();
        $catLight = ReportCategory::where('slug', 'light')->first();
        $catSec = ReportCategory::where('slug', 'security')->first();

        if (!$user || !$catRoad) {
            return;
        }

        $reportsData = [
            [
                'user_id'     => $user->id,
                'category_id' => $catRoad->id,
                'area_id'     => $area?->id,
                'title'       => 'Aspal Ambles di Simpang Jalan Utama',
                'description' => 'Lubang jalan sedalam 15cm tepat di depan ruko, membahayakan pengendara motor dan pedagang gerobak keliling.',
                'latitude'    => -6.917464,
                'longitude'   => 107.619123,
                'status'      => 'reported',
                'severity'    => 'high',
                'occurred_at' => now()->subDays(2),
            ],
            [
                'user_id'     => $user->id,
                'category_id' => $catFlood->id,
                'area_id'     => $area?->id,
                'title'       => 'Genangan Air Setinggi Mata Kaki Saat Hujan',
                'description' => 'Saluran drainase tersumbat menyebabkan genangan di akses pedestrian sepanjang 50 meter.',
                'latitude'    => -6.914500,
                'longitude'   => 107.615000,
                'status'      => 'verification',
                'severity'    => 'medium',
                'occurred_at' => now()->subDays(3),
            ],
            [
                'user_id'     => $user->id,
                'category_id' => $catWaste->id,
                'area_id'     => $area?->id,
                'title'       => 'Tumpukan Sampah Liar di Sudut Pasar',
                'description' => 'Sampah menumpuk belum diangkut selama 3 hari menimbulkan bau menyengat di sekitar area pedagang kuliner.',
                'latitude'    => -6.920100,
                'longitude'   => 107.622500,
                'status'      => 'confirmed',
                'severity'    => 'medium',
                'occurred_at' => now()->subDays(5),
                'confirmed_at'=> now()->subDays(4),
            ],
            [
                'user_id'     => $user->id,
                'category_id' => $catLight->id,
                'area_id'     => $area?->id,
                'title'       => 'Lampu Jalan PJU Mati Total di Gang Komersil',
                'description' => 'Penerangan padam di koridor pejalan kaki menuju stasiun, rawan kriminalitas di malam hari.',
                'latitude'    => -6.912200,
                'longitude'   => 107.618800,
                'status'      => 'handled',
                'severity'    => 'medium',
                'occurred_at' => now()->subDays(6),
                'confirmed_at'=> now()->subDays(5),
            ],
            [
                'user_id'     => $user->id,
                'category_id' => $catSec->id,
                'area_id'     => $area?->id,
                'title'       => 'Pungli Parkir Liar di Trotoar Depan Ruko',
                'description' => 'Oknum meminta pungutan tidak resmi kepada pelanggan gerobak dan warung makan di trotoar.',
                'latitude'    => -6.918900,
                'longitude'   => 107.614200,
                'status'      => 'resolved',
                'severity'    => 'low',
                'occurred_at' => now()->subDays(10),
                'confirmed_at'=> now()->subDays(9),
                'resolved_at' => now()->subDays(1),
            ],
        ];

        foreach ($reportsData as $item) {
            $report = Report::firstOrCreate(
                ['title' => $item['title']],
                $item
            );

            // Add community confirmation
            ReportConfirmation::firstOrCreate([
                'report_id' => $report->id,
                'user_id'   => $user->id,
                'type'      => 'agree',
            ]);

            // Add verification history for confirmed/handled/resolved
            if (in_array($report->status, ['confirmed', 'handled', 'resolved']) && $admin) {
                ReportVerification::firstOrCreate([
                    'report_id'    => $report->id,
                    'moderator_id' => $admin->id,
                    'action'       => $report->status,
                ], [
                    'note' => 'Telah divalidasi oleh admin moderator setelah pengecekan lapangan.',
                ]);
            }
        }
    }
}
