<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('report_confirmations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('report_id')->constrained('reports');
            $table->foreignUuid('user_id')->constrained('users');
            $table->string('type', 50);
            $table->text('note')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->softDeletes();

            $table->unique(['report_id', 'user_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_confirmations');
    }
};
