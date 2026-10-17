<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Curriculum tables that back the Manage Course (my-class/show) editor.
 *
 * Hierarchy:
 *   Course
 *   └── CourseModule          (top-level chapter/unit)
 *       ├── CourseSession     (standalone session directly under a module)
 *       └── CourseLessonGroup (optional sub-grouping within a module)
 *           └── CourseSession (session nested inside a lesson group)
 *
 *   CourseSession
 *   └── CourseContentItem     (PDF, Word, Video, YouTube)
 *
 * Assessments (quizzes / assignments) link back via a nullable session_id
 * defined on their own tables.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('title');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('course_lesson_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained('course_modules')->cascadeOnDelete();
            $table->string('title');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // A session may sit directly under a module OR inside a lesson group.
        // When lesson_group_id is NULL the session belongs directly to the module.
        Schema::create('course_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained('course_modules')->cascadeOnDelete();
            $table->foreignId('lesson_group_id')
                ->nullable()
                ->constrained('course_lesson_groups')
                ->nullOnDelete();
            $table->string('title');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Each session can have multiple content items (PDF, Word doc, video, YouTube).
        Schema::create('course_content_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('course_sessions')->cascadeOnDelete();
            $table->enum('type', ['pdf', 'word', 'video', 'youtube']);
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('url', 2048)->nullable();   // YouTube URL, hosted video URL
            $table->string('filename')->nullable();    // Original filename for uploads
            $table->string('file_path')->nullable();   // Server path for uploaded files
            $table->unsignedBigInteger('file_size')->nullable()->comment('bytes');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('course_meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('course_sessions')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('meet_link');
            $table->dateTime('scheduled_at');
            $table->string('timezone', 64)->default('UTC');
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_meetings');
        Schema::dropIfExists('course_content_items');
        Schema::dropIfExists('course_sessions');
        Schema::dropIfExists('course_lesson_groups');
        Schema::dropIfExists('course_modules');
    }
};
