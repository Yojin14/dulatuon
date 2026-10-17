<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Course>
 */
class CourseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'course_code' => 'DLT-'.$this->faker->unique()->numberBetween(100, 9999),
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(),
            'short_description' => $this->faker->sentence(),
            'level' => 'Beginner',
            'status' => 'published',
        ];
    }
}
