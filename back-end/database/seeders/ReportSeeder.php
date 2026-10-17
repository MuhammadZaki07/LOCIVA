<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\ReportConfirmation;
use App\Models\ReportVerification;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * ReportSeeder — Demo data only.
 *
 * Spreads 30 curated civic reports across the Greater Bandung metro area.
 * Uses firstOrCreate on title so re-running is idempotent and never touches
 * real user-submitted reports that have different titles.
 *
 * Area coverage (approximate):
 *   Dago / Cibeunying   : lat -6.880 … -6.900 | lng 107.610 … 107.640
 *   Sukajadi / Pasteur  : lat -6.895 … -6.910 | lng 107.580 … 107.600
 *   Kiaracondong / Antapani : lat -6.915 … -6.935 | lng 107.640 … 107.660
 *   Buah Batu / Margahayu   : lat -6.940 … -6.960 | lng 107.625 … 107.650
 *   Cimahi Utara / Selatan  : lat -6.860 … -6.890 | lng 107.530 … 107.555
 *   Ujungberung / Cibiru    : lat -6.900 … -6.920 | lng 107.695 … 107.720
 *   Bandung Kidul / Baleendah: lat -6.970 … -6.990 | lng 107.620 … 107.650
 */
class ReportSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@gmail.com')->first();
        $user  = User::where('email', 'user@gmail.com')->first();
        $area  = Area::first();

        $catRoad  = ReportCategory::where('slug', 'road')->first();
        $catFlood = ReportCategory::where('slug', 'flood')->first();
        $catWaste = ReportCategory::where('slug', 'waste')->first();
        $catLight = ReportCategory::where('slug', 'light')->first();
        $catSec   = ReportCategory::where('slug', 'security')->first();

        if (!$user || !$catRoad) {
            $this->command->warn('[ReportSeeder] Prerequisite data missing – skipping.');
            return;
        }

        // ─── Curated demo dataset ─────────────────────────────────────────────
        // Columns: title, description, lat, lng, category_id, severity, status,
        //          occurred_at offset in days, confirmed_at offset, resolved_at offset
        $reportsData = [
            // ── Dago / Cibeunying Kaler ──────────────────────────────────────
            [
                'title'       => 'Aspal Ambles di Simpang Dago Atas',
                'description' => 'Lubang sedalam 15 cm tepat di perempatan menuju kawasan kampus, membahayakan pengendara motor dan pedagang gerobak keliling.',
                'latitude'    => -6.8821,
                'longitude'   => 107.6158,
                'category_id' => $catRoad->id,
                'severity'    => 'high',
                'status'      => 'reported',
                'occurred'    => 2,
            ],
            [
                'title'       => 'Genangan Banjir Kiriman di Jalan Siliwangi',
                'description' => 'Saluran drainase tersumbat mengakibatkan genangan setinggi 30 cm saat hujan deras di kawasan pertokoan.',
                'latitude'    => -6.8864,
                'longitude'   => 107.6193,
                'category_id' => $catFlood->id,
                'severity'    => 'high',
                'status'      => 'verification',
                'occurred'    => 3,
            ],
            [
                'title'       => 'Sampah Menumpuk di Pinggir Jalan Dipatiukur',
                'description' => 'Tiga tong sampah meluap sejak 4 hari lalu belum diangkut truk kebersihan, bau menyengat ganggu penghuni kos-kosan.',
                'latitude'    => -6.8913,
                'longitude'   => 107.6135,
                'category_id' => $catWaste->id,
                'severity'    => 'medium',
                'status'      => 'confirmed',
                'occurred'    => 5,
                'confirmed'   => 4,
            ],
            [
                'title'       => 'Lampu PJU Padam di Koridor Pejalan Kaki Dago',
                'description' => 'Penerangan jalan umum mati total di sisi barat pedestrian Dago, rawan kriminalitas sejak seminggu terakhir.',
                'latitude'    => -6.8889,
                'longitude'   => 107.6117,
                'category_id' => $catLight->id,
                'severity'    => 'medium',
                'status'      => 'handled',
                'occurred'    => 7,
                'confirmed'   => 6,
            ],

            // ── Sukajadi / Pasteur ────────────────────────────────────────────
            [
                'title'       => 'Jalan Berlubang Parah di Jl. Sukajadi',
                'description' => 'Lima lubang besar berdiameter 30–60 cm tersebar di ruas jalan utama dekat pasar Sukajadi, sudah menelan dua korban jatuh.',
                'latitude'    => -6.8978,
                'longitude'   => 107.5912,
                'category_id' => $catRoad->id,
                'severity'    => 'high',
                'status'      => 'confirmed',
                'occurred'    => 6,
                'confirmed'   => 5,
            ],
            [
                'title'       => 'Pohon Tumbang Halangi Jalan Pasteur',
                'description' => 'Pohon trembesi besar roboh menutup separuh badan jalan, arus lalu lintas terganggu sejak dini hari.',
                'latitude'    => -6.9043,
                'longitude'   => 107.5876,
                'category_id' => $catRoad->id,
                'severity'    => 'high',
                'status'      => 'resolved',
                'occurred'    => 10,
                'confirmed'   => 9,
                'resolved'    => 8,
            ],
            [
                'title'       => 'Pungli Parkir Liar di Depan Ruko Pasteur',
                'description' => 'Oknum meminta pungutan tidak resmi kepada pelanggan gerobak dan warung makan setiap sore, sudah 2 minggu berlangsung.',
                'latitude'    => -6.9007,
                'longitude'   => 107.5944,
                'category_id' => $catSec->id,
                'severity'    => 'low',
                'status'      => 'resolved',
                'occurred'    => 14,
                'confirmed'   => 12,
                'resolved'    => 3,
            ],

            // ── Kiaracondong / Antapani ───────────────────────────────────────
            [
                'title'       => 'Drainase Mampet Picu Banjir di Kiaracondong',
                'description' => 'Saluran drainase penuh sampah dan sedimen, air meluap ke jalan saat hujan ringan sekalipun.',
                'latitude'    => -6.9217,
                'longitude'   => 107.6481,
                'category_id' => $catFlood->id,
                'severity'    => 'high',
                'status'      => 'reported',
                'occurred'    => 1,
            ],
            [
                'title'       => 'Tumpukan Sampah Ilegal di Gang Antapani',
                'description' => 'Warga tak bertanggung jawab membuang limbah rumah tangga di lahan kosong, memperparah kondisi lingkungan.',
                'latitude'    => -6.9172,
                'longitude'   => 107.6543,
                'category_id' => $catWaste->id,
                'severity'    => 'medium',
                'status'      => 'verification',
                'occurred'    => 4,
            ],
            [
                'title'       => 'Lampu Jalan Padam Sepanjang 200 Meter di Antapani',
                'description' => 'Seluruh lampu PJU di satu ruas jalan padam akibat kabel dicuri, warga khawatir kejahatan meningkat.',
                'latitude'    => -6.9195,
                'longitude'   => 107.6512,
                'category_id' => $catLight->id,
                'severity'    => 'high',
                'status'      => 'confirmed',
                'occurred'    => 8,
                'confirmed'   => 7,
            ],

            // ── Buah Batu / Margahayu ─────────────────────────────────────────
            [
                'title'       => 'Jalan Buah Batu Rusak Berlubang Banyak',
                'description' => 'Ruas jalan di depan komplek perumahan penuh lubang, pengendara terpaksa mengambil badan jalan kiri sehingga macet.',
                'latitude'    => -6.9452,
                'longitude'   => 107.6314,
                'category_id' => $catRoad->id,
                'severity'    => 'medium',
                'status'      => 'reported',
                'occurred'    => 2,
            ],
            [
                'title'       => 'Genangan Banjir Rutin di Perumahan Margahayu',
                'description' => 'Banjir masuk ke dalam rumah warga hingga 10 cm saat hujan 1 jam, terjadi hampir setiap musim hujan.',
                'latitude'    => -6.9511,
                'longitude'   => 107.6285,
                'category_id' => $catFlood->id,
                'severity'    => 'high',
                'status'      => 'verification',
                'occurred'    => 5,
            ],
            [
                'title'       => 'Sampah Berserakan di Pasar Buah Batu',
                'description' => 'Pedagang membuang sisa dagangan sembarangan di belakang pasar, memperburuk sanitasi lingkungan sekitar.',
                'latitude'    => -6.9478,
                'longitude'   => 107.6342,
                'category_id' => $catWaste->id,
                'severity'    => 'medium',
                'status'      => 'handled',
                'occurred'    => 9,
                'confirmed'   => 8,
            ],

            // ── Cimahi Utara / Selatan ────────────────────────────────────────
            [
                'title'       => 'Jalan Raya Cimahi Ambles Akibat Erosi',
                'description' => 'Bahu jalan longsor sedalam 50 cm setelah hujan deras, mengancam keselamatan kendaraan berat.',
                'latitude'    => -6.8632,
                'longitude'   => 107.5418,
                'category_id' => $catRoad->id,
                'severity'    => 'high',
                'status'      => 'confirmed',
                'occurred'    => 3,
                'confirmed'   => 2,
            ],
            [
                'title'       => 'Banjir Cimahi Selatan Meluas ke Pemukiman',
                'description' => 'Sungai meluap dan membanjiri sekitar 50 rumah warga di kelurahan Cimahi Selatan.',
                'latitude'    => -6.8854,
                'longitude'   => 107.5375,
                'category_id' => $catFlood->id,
                'severity'    => 'high',
                'status'      => 'resolved',
                'occurred'    => 15,
                'confirmed'   => 14,
                'resolved'    => 5,
            ],
            [
                'title'       => 'Pembuangan Sampah Liar Tepi Sungai Cimahi',
                'description' => 'Warga dan oknum membuang sampah langsung ke sungai, menghambat aliran dan memperparah risiko banjir.',
                'latitude'    => -6.8712,
                'longitude'   => 107.5391,
                'category_id' => $catWaste->id,
                'severity'    => 'high',
                'status'      => 'verification',
                'occurred'    => 6,
            ],

            // ── Ujungberung / Cibiru ──────────────────────────────────────────
            [
                'title'       => 'Jalan Ujungberung Bergelombang Parah',
                'description' => 'Permukaan jalan bergelombang dan retak di sepanjang 300 meter, membahayakan khususnya kendaraan roda dua.',
                'latitude'    => -6.9046,
                'longitude'   => 107.7038,
                'category_id' => $catRoad->id,
                'severity'    => 'medium',
                'status'      => 'reported',
                'occurred'    => 4,
            ],
            [
                'title'       => 'Gorong-gorong Tersumbat di Cibiru Wetan',
                'description' => 'Gorong-gorong penuh sedimen menyebabkan air meluap ke jalan setiap kali hujan lebih dari 30 menit.',
                'latitude'    => -6.9127,
                'longitude'   => 107.7142,
                'category_id' => $catFlood->id,
                'severity'    => 'medium',
                'status'      => 'confirmed',
                'occurred'    => 7,
                'confirmed'   => 6,
            ],
            [
                'title'       => 'Lampu Gang Gelap di Kampung Cibiru',
                'description' => 'Seluruh lampu gang di RT 03 mati sejak pekan lalu, warga takut beraktivitas malam hari.',
                'latitude'    => -6.9083,
                'longitude'   => 107.7087,
                'category_id' => $catLight->id,
                'severity'    => 'medium',
                'status'      => 'verification',
                'occurred'    => 3,
            ],

            // ── Bandung Kidul / Baleendah ─────────────────────────────────────
            [
                'title'       => 'Banjir Tahunan Baleendah Sudah Menggenangi Jalan',
                'description' => 'Banjir rutin tahunan mulai merendam jalan utama Baleendah, akses warga terganggu signifikan.',
                'latitude'    => -6.9882,
                'longitude'   => 107.6351,
                'category_id' => $catFlood->id,
                'severity'    => 'high',
                'status'      => 'reported',
                'occurred'    => 1,
            ],
            [
                'title'       => 'TPS Liar Bandung Kidul Ganggu Lingkungan',
                'description' => 'Tempat pembuangan sampah liar terbentuk di lahan kosong milik pemerintah, menimbulkan bau busuk radius 200 m.',
                'latitude'    => -6.9754,
                'longitude'   => 107.6289,
                'category_id' => $catWaste->id,
                'severity'    => 'high',
                'status'      => 'confirmed',
                'occurred'    => 10,
                'confirmed'   => 9,
            ],
            [
                'title'       => 'Jalan Dayeuhkolot Rusak Tidak Segera Diperbaiki',
                'description' => 'Jalan rusak parah selama 3 bulan belum ada tanda-tanda perbaikan, kendaraan berat melewati permukiman warga.',
                'latitude'    => -6.9817,
                'longitude'   => 107.6427,
                'category_id' => $catRoad->id,
                'severity'    => 'medium',
                'status'      => 'verification',
                'occurred'    => 8,
            ],

            // ── Cicendo / Andir ───────────────────────────────────────────────
            [
                'title'       => 'Lampu Lalu Lintas Mati di Perempatan Andir',
                'description' => 'Traffic light padam sejak 3 hari, kemacetan dan potensi kecelakaan meningkat di jam sibuk pagi dan sore.',
                'latitude'    => -6.9123,
                'longitude'   => 107.5934,
                'category_id' => $catLight->id,
                'severity'    => 'high',
                'status'      => 'confirmed',
                'occurred'    => 3,
                'confirmed'   => 2,
            ],
            [
                'title'       => 'Pencurian Kabel PJU di Kawasan Cicendo',
                'description' => 'Kabel lampu jalan dicuri, seluruh blok perumahan menjadi gelap pada malam hari.',
                'latitude'    => -6.9078,
                'longitude'   => 107.5958,
                'category_id' => $catSec->id,
                'severity'    => 'high',
                'status'      => 'reported',
                'occurred'    => 2,
            ],

            // ── Regol / Lengkong ──────────────────────────────────────────────
            [
                'title'       => 'Drainase Buntu di Pasar Baru Bandung',
                'description' => 'Air limbah dari los pedagang ikan menggenang di lorong pasar karena drainase tersumbat kotoran.',
                'latitude'    => -6.9213,
                'longitude'   => 107.6087,
                'category_id' => $catFlood->id,
                'severity'    => 'medium',
                'status'      => 'handled',
                'occurred'    => 12,
                'confirmed'   => 11,
            ],
            [
                'title'       => 'Vandalisme dan Coret-coret Dinding Lengkong',
                'description' => 'Tembok panjang di sepanjang trotoar dicoret-coret grafiti tidak berizin, merusak estetika kawasan.',
                'latitude'    => -6.9312,
                'longitude'   => 107.6143,
                'category_id' => $catSec->id,
                'severity'    => 'low',
                'status'      => 'resolved',
                'occurred'    => 20,
                'confirmed'   => 18,
                'resolved'    => 10,
            ],

            // ── Gedebage / Rancasari ──────────────────────────────────────────
            [
                'title'       => 'Jalan Gedebage Rusak Usai Proyek Konstruksi',
                'description' => 'Badan jalan rusak parah akibat lalu lintas truk proyek yang berlebihan, belum ada perbaikan dari kontraktor.',
                'latitude'    => -6.9381,
                'longitude'   => 107.6873,
                'category_id' => $catRoad->id,
                'severity'    => 'high',
                'status'      => 'verification',
                'occurred'    => 5,
            ],
            [
                'title'       => 'Banjir Rob Ganggu Akses Rancasari',
                'description' => 'Banjir rob dari area cekungan membuat jalan penghubung ke kawasan industri tidak bisa dilewati kendaraan.',
                'latitude'    => -6.9449,
                'longitude'   => 107.6812,
                'category_id' => $catFlood->id,
                'severity'    => 'high',
                'status'      => 'reported',
                'occurred'    => 1,
            ],
            [
                'title'       => 'TPS Sementara Overload di Rancasari',
                'description' => 'Volume sampah melebihi kapasitas TPS sementara, sampah berceceran di trotoar dan bahu jalan sekitarnya.',
                'latitude'    => -6.9413,
                'longitude'   => 107.6841,
                'category_id' => $catWaste->id,
                'severity'    => 'medium',
                'status'      => 'confirmed',
                'occurred'    => 6,
                'confirmed'   => 5,
            ],

            // ── Coblong / Ledeng ──────────────────────────────────────────────
            [
                'title'       => 'Trotoar Rusak Berbahaya di Ledeng',
                'description' => 'Paving blok trotoar terangkat dan gompal, pejalan kaki berisiko tersandung dan jatuh terutama di malam hari.',
                'latitude'    => -6.8744,
                'longitude'   => 107.5989,
                'category_id' => $catRoad->id,
                'severity'    => 'medium',
                'status'      => 'reported',
                'occurred'    => 3,
            ],
            [
                'title'       => 'Pencemaran Sampah Plastik Sungai Cikapundung',
                'description' => 'Sungai penuh sampah plastik yang mengalir dari kawasan permukiman di hulu, mengancam ekosistem dan memperlambat aliran air.',
                'latitude'    => -6.8812,
                'longitude'   => 107.6021,
                'category_id' => $catWaste->id,
                'severity'    => 'high',
                'status'      => 'verification',
                'occurred'    => 7,
            ],
        ];

        // ─── Persist each record ──────────────────────────────────────────────
        foreach ($reportsData as $item) {
            $occurred = now()->subDays($item['occurred']);

            $report = Report::firstOrCreate(
                ['title' => $item['title']],
                [
                    'user_id'     => $user->id,
                    'category_id' => $item['category_id'],
                    'area_id'     => $area?->id,
                    'description' => $item['description'],
                    'latitude'    => $item['latitude'],
                    'longitude'   => $item['longitude'],
                    'severity'    => $item['severity'],
                    'status'      => $item['status'],
                    'occurred_at' => $occurred,
                    'confirmed_at' => isset($item['confirmed'])
                        ? now()->subDays($item['confirmed'])
                        : null,
                    'resolved_at' => isset($item['resolved'])
                        ? now()->subDays($item['resolved'])
                        : null,
                ]
            );

            // Community confirmation (agree)
            ReportConfirmation::firstOrCreate([
                'report_id' => $report->id,
                'user_id'   => $user->id,
                'type'      => 'agree',
            ]);

            // Verification history for admin-processed statuses
            if (
                in_array($report->status, ['confirmed', 'handled', 'resolved'])
                && $admin
            ) {
                ReportVerification::firstOrCreate(
                    [
                        'report_id'    => $report->id,
                        'moderator_id' => $admin->id,
                        'action'       => $report->status,
                    ],
                    [
                        'note' => 'Telah divalidasi oleh admin moderator setelah pengecekan lapangan.',
                    ]
                );
            }
        }

        $count = count($reportsData);
        $this->command->info("[ReportSeeder] Seeded {$count} demo civic reports across Bandung metro area.");
    }
}
