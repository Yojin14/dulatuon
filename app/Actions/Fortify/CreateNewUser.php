<?php

namespace App\Actions\Fortify;

use App\Models\User;
use App\Support\AvatarPresets;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique(User::class),
            ],
            'gender' => ['required', Rule::in(AvatarPresets::GENDERS)],
            'password' => $this->passwordRules(),
        ], [
            'gender.required' => 'Choose an option.',
            'gender.in' => 'Choose an option.',
        ])->validate();

        return User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'gender' => $input['gender'],
            'password' => $input['password'],
            'role' => 'student',
            'status' => 'approved',
            'is_active' => true,
        ]);
    }
}
