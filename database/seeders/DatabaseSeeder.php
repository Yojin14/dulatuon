<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'eugene.ranoco@gmail.com'],
            [
                'name' => 'Super Admin',
                'password' => 'SuperAdmin@123',
                'role' => 'admin',
                'status' => 'approved',
                'is_active' => true,
                'approved_at' => now(),
                'email_verified_at' => now(),
            ]
        );

        User::firstOrCreate(
            ['email' => 'fhelfeliciano@gmail.com'],
            [
                'name' => 'Fhel Feliciano',
                'password' => 'admin123',
                'role' => 'admin',
                'status' => 'approved',
                'is_active' => true,
                'approved_at' => now(),
                'email_verified_at' => now(),
            ]
        );

        if (app()->environment('local', 'demo')) {
            User::firstOrCreate(
                ['email' => 'teacher@gmail.com'],
                [
                    'name' => 'Teacher test',
                    'password' => 'admin123',
                    'role' => 'teacher',
                    'status' => 'approved',
                    'is_active' => true,
                    'approved_at' => now(),
                    'email_verified_at' => now(),
                ]
            );

            User::firstOrCreate(
                ['email' => 'student@gmail.com'],
                [
                    'name' => 'student',
                    'password' => 'admin123',
                    'role' => 'student',
                    'status' => 'approved',
                    'is_active' => true,
                    'approved_at' => now(),
                    'email_verified_at' => now(),
                ]
            );

            $this->call(DemoDataSeeder::class);
        }
    }
}
