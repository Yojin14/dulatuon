<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->boolean('is_system')->default(false); // system roles can't be deleted
            $table->timestamps();
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->string('permission');
            $table->unique(['role_id', 'permission']);
        });

        // Seed default system roles
        $now = now();
        $roles = [
            ['slug' => 'admin',   'name' => 'Administrator', 'description' => 'Full system access with all permissions',                 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'teacher', 'name' => 'Teacher',       'description' => 'Can create and manage courses, grade assignments',        'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'student', 'name' => 'Student',       'description' => 'Can enroll in courses, submit assignments, view progress', 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
        ];
        DB::table('roles')->insert($roles);

        // Sidenav-aligned default permissions
        $defaultPermissions = [
            'admin' => ['analytics', 'course_management', 'user_management', 'role_management'],
            'teacher' => ['assigned_class', 'class_management', 'chat'],
            'student' => ['explore_courses', 'my_course', 'my_progress', 'chat'],
        ];

        foreach ($defaultPermissions as $slug => $permissions) {
            $roleId = DB::table('roles')->where('slug', $slug)->value('id');
            $rows = array_map(fn ($p) => ['role_id' => $roleId, 'permission' => $p], $permissions);
            DB::table('role_permissions')->insert($rows);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('roles');
    }
};
