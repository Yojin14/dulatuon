<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('sections')->nullOnDelete();
            $table->enum('status', ['active', 'completed', 'withdrawn'])->default('active');
            $table->decimal('progress_percentage', 5, 2)->default(0);
            $table->integer('completed_lessons')->default(0);
            $table->integer('completed_assignments')->default(0);
            $table->timestamp('enrollment_date')->useCurrent();
            $table->timestamps();

            $table->unique(['user_id', 'section_id']);
            $table->index(['course_id', 'status'], 'enrollments_course_status_idx');
            $table->index(['user_id', 'status'], 'enrollments_user_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};
