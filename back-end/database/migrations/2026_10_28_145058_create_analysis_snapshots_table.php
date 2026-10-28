<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 — Analysis Snapshot History
 *
 * Append-only table: each successful analysis creates a new row.
 * Rows are never updated or deleted (immutable history).
 * simulation_scores continues to hold the *latest* summarised score.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analysis_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('simulation_id')->constrained('simulations');

            // Algorithm / versioning
            $table->string('algorithm_version', 20)->default('1.0');

            // Coordinates actually analysed (may differ from current simulation coords)
            $table->decimal('analyzed_lat', 10, 7)->nullable();
            $table->decimal('analyzed_lng', 10, 7)->nullable();
            $table->unsignedSmallInteger('radius_m')->nullable();

            // Business context
            $table->string('business_type_slug', 120)->nullable();

            // Top-level score summary
            $table->unsignedTinyInteger('opportunity_score')->nullable();
            $table->unsignedTinyInteger('competition_score')->nullable();
            $table->unsignedTinyInteger('accessibility_score')->nullable();
            $table->unsignedTinyInteger('data_confidence')->nullable();

            // Derived counts
            $table->unsignedSmallInteger('competitor_count')->nullable();
            $table->unsignedSmallInteger('report_count')->nullable();

            // JSON blobs — stored verbatim; never re-computed from live data
            $table->json('competitor_categories')->nullable();  // categories used for matching
            $table->json('weights_snapshot')->nullable();       // scoring weights at time of run
            $table->json('sources_snapshot')->nullable();       // source statuses
            $table->json('data_warnings')->nullable();          // warnings list
            $table->json('factors')->nullable();                // factor breakdown

            $table->text('limitations')->nullable();

            // Outcome
            $table->enum('status', ['success', 'failed', 'partial'])->default('success');

            // Timestamps — created_at is the moment this snapshot was written; no updated_at.
            $table->timestamp('analyzed_at')->nullable();       // when the analysis was run (client clock)
            $table->timestamp('created_at')->nullable();        // when the record was persisted
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analysis_snapshots');
    }
};
