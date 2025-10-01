<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        // Create sample users
        // Admin Account
        User::create([
            'username' => 'admin',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('password123'),
            'first_name' => 'Admin',
            'last_name' => 'User',
            'role' => 'admin',
            'is_active' => true,
        ]);

        // Sample Student Accounts
        User::create([
            'username' => 'john_student',
            'email' => 'john@studentportal.com',
            'password' => Hash::make('password123'),
            'first_name' => 'John',
            'last_name' => 'Doe',
            'role' => 'student',
            'is_active' => true,
        ]);

        User::create([
            'username' => 'dave_lima',
            'email' => 'student@gmail.com',
            'password' => Hash::make('password123'),
            'first_name' => 'Dave',
            'last_name' => 'Lima',
            'role' => 'student',
            'is_active' => true,
        ]);

        User::create([
            'username' => 'mary_student',
            'email' => 'mary@studentportal.com',
            'password' => Hash::make('password123'),
            'first_name' => 'Mary',
            'last_name' => 'Johnson',
            'role' => 'student',
            'is_active' => true,
        ]);

        User::create([
            'username' => 'jane_teacher',
            'email' => 'jane@studentportal.com',
            'password' => Hash::make('password123'),
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'role' => 'teacher',
            'is_active' => true,
        ]);
    }
}
