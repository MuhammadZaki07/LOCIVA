<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OllamaRecommendationService
{
    public function isConfigured(): bool
    {
        return !empty(config('services.ollama.base_url'));
    }

    /**
     * Returns one reason string per item (same order), or null on any failure.
     * Ranking is already decided by the frontend algorithm; the LLM only writes text.
     *
     * @return string[]|null
     */
    public function reasons(array $items): ?array
    {
        if (!$this->isConfigured() || count($items) === 0) {
            return null;
        }

        $items = array_map(fn ($i) => $this->sanitizeItem($i), $items);

        $cacheKey = 'ai_rec_' . md5(json_encode($items) . config('services.ollama.model'));

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($items) {
            return $this->callOllama($items);
        }) ?: null;
    }

    private function callOllama(array $items): ?array
    {
        $count = count($items);

        $system = <<<TXT
        Kamu adalah asisten analis lokasi UMKM LOCIVA.
        
        Tugasmu adalah menjelaskan setiap rekomendasi usaha berdasarkan data yang diberikan.
        
        Panduan:
        - Tulis satu alasan singkat dalam Bahasa Indonesia untuk setiap usaha.
        - Gunakan fakta, angka, dan faktor yang tersedia. Jangan mengarang informasi.
        - Jelaskan kelebihan atau kekurangan yang paling relevan.
        - Pertimbangkan peluang, persaingan, aksesibilitas, dan kepercayaan data.
        - Jika kepercayaan data rendah, sampaikan bahwa informasi masih terbatas.
        - Jika terdapat banyak pesaing atau aksesibilitas rendah, sebutkan sebagai risiko.
        - Jika ada pesaing terdekat, gunakan informasi tersebut jika relevan.
        - Jangan menganggap tidak adanya pesaing sebagai bukti tidak adanya kompetisi.
        - Jangan menyimpulkan kondisi positif atau negatif dari jumlah laporan saja.
        - Jangan mengubah urutan rekomendasi.
        
        Balas hanya JSON valid dengan format:
        {"reasons":["alasan 1","alasan 2"]}

        KRITIKAL
        Jumlah alasan harus sama dengan jumlah usaha yang diberikan, yaitu {$count} alasan.
TXT;

        $user = "Data rekomendasi (urut dari peringkat 1):\n"
            . json_encode($items, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        try {
            $res = Http::timeout((int) config('services.ollama.timeout', 25))
                ->acceptJson()
                ->post(rtrim(config('services.ollama.base_url'), '/') . '/api/chat', [
                    'model'      => config('services.ollama.model'),
                    'stream'     => false,
                    'format'     => 'json',
                    'keep_alive' => '10m',
                    'options'    => [
                        'temperature' => 0.2,
                        'num_predict' => 120 * $count + 80,
                        'num_ctx'=> 8192
                    ],
                    'messages'   => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $user],
                    ],
                ]);

 
            if (!$res->successful()) {
                Log::warning('Ollama non-2xx', ['status' => $res->status()]);
                return null;
            }

            $content = $res->json('message.content');
            if (!is_string($content)) {
                return null;
            }

            $decoded = json_decode($content, true);
            $reasons = $decoded['reasons'] ?? null;

            Log::info('OLLAMA RAW RESPONSE', [
                'status' => $res->status(),
                'successful' => $res->successful(),
                'body' => $res->body(),
                'requested' => $count,
                'result' => is_array($reasons) ? count($reasons) : null
            ]);

            if (!is_array($reasons)) {
                Log::warning('Ollama reason count mismatch', [
                    'expected' => $count,
                    'received' => is_array($reasons) ? count($reasons) : null,
                    'content' => $content,
                ]);
            
                return null;
            }

            return array_map(
                fn ($r) => is_string($r) ? mb_substr(trim($r), 0, 400) : '',
                array_values($reasons)
            );
        } catch (\Throwable $e) {
            Log::warning('Ollama call failed: ' . $e->getMessage());
            return null;
        }
    }

    /** Trim strings and cap list sizes so OSM-sourced text can't bloat or hijack the prompt. */
    private function sanitizeItem(array $i): array
    {
        $clean = fn ($s, $n = 80) => mb_substr(
            trim(preg_replace('/[\r\n\t]+/', ' ', strip_tags((string) $s))),
            0,
            $n
        );

        return [
            'name'              => $clean($i['name'] ?? ''),
            'category'          => $clean($i['category'] ?? ''),
            'radius_m'          => (int) ($i['radius'] ?? 0),
            'fit_score'         => (int) ($i['fit_score'] ?? 0),
            'opportunity'       => (int) ($i['opportunity'] ?? 0),
            'competition'       => (int) ($i['competition'] ?? 0),
            'accessibility'     => (int) ($i['accessibility'] ?? 0),
            'data_confidence'   => (int) ($i['data_confidence'] ?? 0),
            'competitor_count'  => (int) ($i['competitor_count'] ?? 0),
            'nearest_competitor' => isset($i['nearest_competitor']['distance'])
                ? [
                    'name'     => $clean($i['nearest_competitor']['name'] ?? ''),
                    'distance' => (int) $i['nearest_competitor']['distance'],
                ]
                : null,
            'report_count'      => (int) ($i['report_count'] ?? 0),
            'factors'           => array_slice(array_map(fn ($f) => [
                'label'  => $clean($f['label'] ?? '', 60),
                'impact' => in_array($f['impact'] ?? '', ['positive', 'negative', 'neutral'], true) ? $f['impact'] : 'neutral',
                'note'   => $clean($f['note'] ?? '', 140),
            ], $i['factors'] ?? []), 0, 5),
        ];
    }
}