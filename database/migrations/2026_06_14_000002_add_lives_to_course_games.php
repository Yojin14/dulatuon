<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_games', function (Blueprint $table) {
            $table->unsignedTinyInteger('lives')->default(3)->after('points')->comment('0 = unlimited');
        });

        Schema::table('game_attempts', function (Blueprint $table) {
            $table->index(['game_id', 'score']);
        });
    }

    public function down(): void
    {
        Schema::table('game_attempts', function (Blueprint $table) {
            $table->dropIndex(['game_id', 'score']);
        });

        Schema::table('course_games', function (Blueprint $table) {
            $table->dropColumn('lives');
        });
    }
};
