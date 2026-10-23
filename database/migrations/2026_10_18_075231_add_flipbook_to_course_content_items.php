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
        Schema::table('course_content_items', function (Blueprint $table) {
            $table->string('type', 20)->change();
            $table->json('pages')->nullable()->after('file_size');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('course_content_items', function (Blueprint $table) {
            $table->dropColumn('pages');
        });

        Schema::table('course_content_items', function (Blueprint $table) {
            $table->enum('type', ['pdf', 'word', 'video', 'youtube'])->change();
        });
    }
};
