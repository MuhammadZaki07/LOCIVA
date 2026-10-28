<?php
// Audit validation — run from back-end directory: php audit_validation_be.php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\BusinessType;
use App\Models\BusinessTypeWeight;
use App\Models\Business;
use App\Models\Poi;
use App\Models\Report;

echo "=== 1. WEIGHTS VALIDATION ===\n";
$slugs = ['kedai-kopi', 'gerobak-bakso', 'laundry', 'barbershop', 'warung-makan', 'toko-kelontong', 'minimarket', 'gerobak-seblak'];
foreach ($slugs as $slug) {
    $bt = BusinessType::with('weights')->where('slug', $slug)->first();
    if (!$bt) { echo "$slug: NOT FOUND\n"; continue; }
    $active  = $bt->weights->count();
    $allTrashed = BusinessTypeWeight::withTrashed()->where('business_type_id', $bt->id)->count();
    $deleted = BusinessTypeWeight::onlyTrashed()->where('business_type_id', $bt->id)->count();
    echo "$slug: active_weights=$active, all_incl_deleted=$allTrashed, deleted=$deleted\n";
    if ($active > 0) {
        foreach ($bt->weights as $w) {
            echo "   -> factor={$w->factor}, weight={$w->weight}\n";
        }
    } else {
        echo "   -> FALLBACK: target_demographics=" . json_encode($bt->target_demographics) . "\n";
    }
}

echo "\n=== 2. DOUBLE QUERY VALIDATION (radius 500m, Malang center) ===\n";
$lat = -7.9797; $lng = 112.6304; $radius = 500;

$reg = Business::with('businessType:id,name,slug,category')
    ->selectRaw('*, (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
        [$lat, $lng, $lat])
    ->having('distance', '<=', $radius)
    ->orderBy('distance')->limit(200)->get();

$int = Business::query()
    ->selectRaw('businesses.*, (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
        [$lat, $lng, $lat])
    ->having('distance', '<=', $radius)
    ->orderBy('distance')->limit(500)->get();

echo "registeredBusinesses: " . $reg->count() . "\n";
echo "internalBusinesses:   " . $int->count() . "\n";
$overlap = $reg->pluck('id')->intersect($int->pluck('id'));
echo "True overlapping IDs:  " . $overlap->count() . " (these would be double-counted)\n";

// Simulate full normalized array as service does
$normalized = [];
foreach ($reg as $b) {
    $normalized[] = ['id' => $b->id, 'source' => 'lociva_registered'];
}
foreach ($int as $b) {
    $normalized[] = ['id' => $b->id, 'source' => 'lociva_internal'];
}

$regCount = $reg->count();
$intPoiCount = Poi::selectRaw('*, (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance', [$lat, $lng, $lat])
    ->having('distance', '<=', $radius)->count();

$poiTotal = count($normalized) + $intPoiCount;
$extCount_way1 = count($normalized) - $regCount - $intPoiCount;
$extCount_way2 = count(array_filter($normalized, fn($p) => $p['source'] !== 'lociva_internal'));

echo "\nCounts as computed by service:\n";
echo "  registeredBusinessCount: $regCount\n";
echo "  internalPoiCount:        $intPoiCount\n";
echo "  poiTotal (count normalized + poi): $poiTotal\n";
echo "  externalCount (way 1, L274): $extCount_way1\n";
echo "  externalCount (way 2, L289-293 re-calc): $extCount_way2\n";
echo "  NOTE: way2 counts lociva_registered as 'external' because source='lociva_registered' != 'lociva_internal'\n";

echo "\n=== 3. COORDINATE QUALITY ===\n";
$total   = Business::count();
$nullCrd = Business::whereNull('latitude')->orWhereNull('longitude')->count();
$zeroCrd = Business::where('latitude', 0)->orWhere('longitude', 0)->count();
$validGeo = Business::whereNotNull('latitude')->whereNotNull('longitude')
    ->where('latitude', '!=', 0)->where('longitude', '!=', 0)->count();
echo "Business: total=$total, null_coords=$nullCrd, zero_coords=$zeroCrd, valid_geo=$validGeo\n";

$pTotal  = Poi::count();
$pNull   = Poi::whereNull('latitude')->orWhereNull('longitude')->count();
echo "Poi: total=$pTotal, null_coords=$pNull\n";

echo "\n=== 4. POI & BUSINESS CATEGORIES IN DB ===\n";
$poiCats = Poi::selectRaw('category, count(*) as cnt')->groupBy('category')->get();
foreach ($poiCats as $p) { echo "  poi.category={$p->category}: {$p->cnt}\n"; }

$bizTypes = Business::join('business_types','business_types.id','=','businesses.business_type_id')
    ->selectRaw('business_types.slug as bt_slug, count(*) as cnt')->groupBy('business_types.slug')->get();
foreach ($bizTypes as $b) { echo "  business.type_slug={$b->bt_slug}: {$b->cnt}\n"; }

echo "\n=== 5. CATEGORY MAPPING CROSS-REF ===\n";
// Categories used in target_demographics vs CATEGORY_MAP keys
$allDemoCategories = collect();
BusinessType::whereNotNull('target_demographics')->get()->each(function ($bt) use (&$allDemoCategories) {
    $cats = collect($bt->target_demographics)->pluck('category');
    $allDemoCategories = $allDemoCategories->merge($cats);
});
$demoCats = $allDemoCategories->unique()->sort()->values()->toArray();
echo "target_demographics categories: " . implode(', ', $demoCats) . "\n";

$allCompCats = collect();
BusinessType::whereNotNull('competitor_categories')->get()->each(function ($bt) use (&$allCompCats) {
    $allCompCats = $allCompCats->merge($bt->competitor_categories);
});
echo "competitor_categories values: " . $allCompCats->unique()->sort()->join(', ') . "\n";

echo "\n=== 6. REPORTS STATUS DISTRIBUTION ===\n";
$rpts = Report::selectRaw('status, count(*) as cnt')->groupBy('status')->orderByDesc('cnt')->get();
foreach ($rpts as $r) { echo "  status={$r->status}: {$r->cnt}\n"; }
$rptWithGeo = Report::whereNotNull('latitude')->whereNotNull('longitude')->count();
echo "Reports with valid coords: $rptWithGeo / " . Report::count() . "\n";

echo "\nDone.\n";
