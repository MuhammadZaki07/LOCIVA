<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GroqRouteService
{
    protected ?string $apiKey;
    protected string $model;
    protected string $baseUrl;
    protected int $timeout;

    public function __construct()
    {
        $this->apiKey  = config('services.groq.api_key');
        $this->model   = config('services.groq.model', 'openai/gpt-oss-120b');
        $this->baseUrl = rtrim(config('services.groq.base_url', 'https://api.groq.com/openai/v1'), '/');
        $this->timeout = (int) config('services.groq.timeout', 25);
    }

    /**
     * Check if Groq API key is configured.
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey) && is_string($this->apiKey) && strlen(trim($this->apiKey)) > 5;
    }

    /**
     * Interpret backend-calculated route candidates and explain trade-offs.
     * Returns structured interpretation or deterministic fallback if unavailable.
     *
     * @param string $businessTypeName
     * @param array $candidates
     * @param array $contextData
     * @return array
     */
    public function interpretRoutes(string $businessTypeName, array $candidates, array $contextData = []): array
    {
        if (empty($candidates)) {
            return [
                'is_ai_explained'      => false,
                'ai_status'            => 'no_candidates',
                'recommended_route_id' => null,
                'overall_summary'      => 'Tidak ada kandidat rute yang dapat dianalisis.',
                'routes_analysis'      => [],
            ];
        }

        // 1. If Groq is not configured, return deterministic fallback immediately
        if (!$this->isConfigured()) {
            return $this->buildDeterministicFallback($businessTypeName, $candidates, 'unconfigured');
        }

        // Cache key based on candidates hash and model
        $cacheKey = 'groq_route_' . md5(json_encode($candidates) . "_{$this->model}");

        $result = Cache::remember($cacheKey, now()->addHours(6), function () use ($businessTypeName, $candidates, $contextData) {
            return $this->callGroq($businessTypeName, $candidates, $contextData)
                ?: $this->buildDeterministicFallback($businessTypeName, $candidates, 'api_failed');
        });

        // Ensure returned recommended_route_id is strictly one of the candidate IDs!
        $validIds = array_column($candidates, 'id');
        if (!in_array($result['recommended_route_id'] ?? null, $validIds, true)) {
            $result['recommended_route_id'] = $candidates[0]['id'] ?? ($validIds[0] ?? null);
        }

        return $result;
    }

    /**
     * Send structured request to Groq OpenAI-compatible Chat Completions API.
     */
    protected function callGroq(string $businessTypeName, array $candidates, array $contextData): ?array
    {
        $candidateSummaries = array_map(function ($c) {
            return [
                'id'               => $c['id'],
                'name'             => $c['name'],
                'profile'          => $c['profile'] ?? 'balanced',
                'distance_km'      => $c['distance_km'],
                'duration_minutes' => $c['duration_minutes'],
                'stops_count'      => count($c['stops'] ?? []),
                'stops'            => array_map(fn ($s) => "{$s['name']} ({$s['category']})", array_slice($c['stops'] ?? [], 0, 8)),
                'scores'           => $c['scores'] ?? [],
            ];
        }, $candidates);

        $validIds = array_column($candidateSummaries, 'id');

        $systemPrompt = <<<SYS
Kamu adalah asisten ahli perencanaan rute bisnis bergerak/keliling LOCIVA di Indonesia.
Tugasmu adalah menganalisis dan membandingkan kandidat rute sirkular (mulai dan berakhir di titik yang sama) yang SUDAH dihitung oleh mesin spasial backend LOCIVA untuk model usaha: {$businessTypeName}.

ATURAN KETAT:
1. Skor numerik dan geometri rute sudah dihitung objektif oleh backend. JANGAN mengubah skor atau angka jarak/durasi.
2. Pilih 'recommended_route_id' HANYA dari salah satu ID berikut: [{$validIdsString}]. DILARANG mengarang ID baru.
3. Berikan analisis berbasis data yang tajam: jelaskan mengapa rute utama direkomendasikan, potensi keunggulan tiap rute, serta potensi risiko (persaingan, aksesibilitas, atau jam operasional).
4. DILARANG mengarang POI baru atau koordinat fiktif.
5. Balas HANYA dengan JSON valid dengan struktur:
{
  "recommended_route_id": "id_pilihan",
  "overall_summary": "Ringkasan rekomendasi keseluruhan dalam 2-3 kalimat berbahasa Indonesia.",
  "routes_analysis": [
    {
      "id": "id_kandidat",
      "highlight": "Sorotan utama rute dalam 1 kalimat.",
      "explanation": "Penjelasan rinci potensi rute ini.",
      "trade_offs": "Kelemahan atau risiko yang perlu diwaspadai pedagang.",
      "best_time_window": "Saran jam operasional terbaik (misal: 10:00 - 14:00)."
    }
  ]
}
SYS;
        $validIdsString = implode(', ', array_map(fn ($id) => "\"{$id}\"", $validIds));
        $systemPrompt = str_replace('{$validIdsString}', $validIdsString, $systemPrompt);

        $userPrompt = "Data Kandidat Rute Sirkular untuk {$businessTypeName}:\n"
            . json_encode($candidateSummaries, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            . (!empty($contextData['reports_count']) ? "\nInformasi Laporan Warga Sekitar: {$contextData['reports_count']} laporan infrastruktur terdeteksi." : "");

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => "Bearer {$this->apiKey}",
                    'Content-Type'  => 'application/json',
                ])
                ->post("{$this->baseUrl}/chat/completions", [
                    'model'           => $this->model,
                    'temperature'     => 0.2,
                    'max_tokens'      => 1500,
                    'response_format' => ['type' => 'json_object'],
                    'messages'        => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                ]);

            if (!$response->successful()) {
                Log::warning('Groq API call failed: HTTP ' . $response->status(), [
                    'body' => substr($response->body(), 0, 300),
                ]);
                return null;
            }

            $content = $response->json('choices.0.message.content');
            if (empty($content) || !is_string($content)) {
                return null;
            }

            $parsed = json_decode($content, true);
            if (!is_array($parsed)) {
                return null;
            }

            // Validate that recommended_route_id exists in our backend candidates
            $recId = $parsed['recommended_route_id'] ?? null;
            if (!in_array($recId, $validIds, true)) {
                // Fallback to the highest-scoring candidate if Groq returned an unknown ID
                $recId = $candidates[0]['id'] ?? $validIds[0];
            }

            // Normalize routes_analysis
            $analyses = [];
            $rawAnalyses = is_array($parsed['routes_analysis'] ?? null) ? $parsed['routes_analysis'] : [];
            $analysesMap = [];
            foreach ($rawAnalyses as $item) {
                if (!empty($item['id']) && in_array($item['id'], $validIds, true)) {
                    $analysesMap[$item['id']] = [
                        'id'               => $item['id'],
                        'highlight'        => $item['highlight'] ?? '',
                        'explanation'      => $item['explanation'] ?? '',
                        'trade_offs'       => $item['trade_offs'] ?? '',
                        'best_time_window' => $item['best_time_window'] ?? 'Jam sibuk siang / sore',
                    ];
                }
            }

            // Ensure every candidate has an entry
            foreach ($candidates as $cand) {
                $cId = $cand['id'];
                if (isset($analysesMap[$cId])) {
                    $analyses[] = $analysesMap[$cId];
                } else {
                    $analyses[] = $this->buildSingleRouteFallback($cand, $businessTypeName);
                }
            }

            return [
                'is_ai_explained'      => true,
                'ai_status'            => 'success',
                'ai_model'             => $this->model,
                'recommended_route_id' => $recId,
                'overall_summary'      => $parsed['overall_summary'] ?? "Rekomendasi rute sirkular untuk {$businessTypeName} berhasil diinterpretasikan oleh AI.",
                'routes_analysis'      => $analyses,
            ];
        } catch (\Throwable $th) {
            Log::warning('Groq exception: ' . $th->getMessage());
            return null;
        }
    }

    /**
     * Deterministic rule-based fallback when Groq is unavailable.
     */
    public function buildDeterministicFallback(string $businessTypeName, array $candidates, string $status = 'fallback'): array
    {
        // First candidate is already ranked highest by backend scoring
        $bestId = $candidates[0]['id'] ?? null;

        $analyses = array_map(function ($cand) use ($businessTypeName) {
            return $this->buildSingleRouteFallback($cand, $businessTypeName);
        }, $candidates);

        return [
            'is_ai_explained'      => false,
            'ai_status'            => $status,
            'ai_model'             => null,
            'recommended_route_id' => $bestId,
            'overall_summary'      => "Rekomendasi rute diurutkan secara deterministik berdasarkan skor spasial LOCIVA untuk {$businessTypeName}. Rute terbaik memaksimalkan relevansi fasilitas publik dan efisiensi lintasan sirkular.",
            'routes_analysis'      => $analyses,
        ];
    }

    /**
     * Generate fallback explanation for a single route candidate.
     */
    protected function buildSingleRouteFallback(array $cand, string $businessTypeName): array
    {
        $profile = $cand['profile'] ?? 'balanced';
        $scores  = $cand['scores'] ?? [];
        $stopsCount = count($cand['stops'] ?? []);

        $highlight = match ($profile) {
            'opportunity' => "Rute dengan potensi konsentrasi konsumen tertinggi ({$stopsCount} titik singgah relevan).",
            'low_competition' => "Rute alternatif melalui koridor dengan tingkat persaingan kompetitor lebih rendah.",
            default => "Rute seimbang yang memadukan aksesibilitas jalan raya dan kepadatan aktivitas masyarakat.",
        };

        $explanation = "Menghubungkan {$stopsCount} titik singgah potensial sepanjang {$cand['distance_km']} km dengan estimasi perjalanan {$cand['duration_minutes']} menit. Skor relevansi bisnis mencapai {$scores['business_relevance']}/100.";

        $tradeOffs = match ($profile) {
            'opportunity' => "Kepadatan aktivitas tinggi berpotensi meningkatkan persaingan dari pedagang sejenis.",
            'low_competition' => "Tingkat persaingan lebih rendah, namun arus pejalan kaki tersebar di sepanjang koridor.",
            default => "Kombinasi merata antara jarak tempuh dan potensi singgah tanpa konsentrasi ekstrem.",
        };

        return [
            'id'               => $cand['id'],
            'highlight'        => $highlight,
            'explanation'      => $explanation,
            'trade_offs'       => $tradeOffs,
            'best_time_window' => '11:00 - 15:00 (Jam makan siang & istirahat)',
        ];
    }
}
