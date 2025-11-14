<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Teacher;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create default admin user if it doesn't exist
        $adminEmail = 'admin@pinpoint.com';
        
        $existingAdmin = Teacher::where('email', $adminEmail)->first();
        
        if (!$existingAdmin) {
            Teacher::create([
                'name' => 'System Administrator',
                'email' => $adminEmail,
                'username' => 'admin',
                'password' => Hash::make('admin123'), // Change this password after first login!
                'first_name' => 'System',
                'last_name' => 'Administrator',
                'role' => 'admin',
            ]);
            
            $this->command->info('✅ Admin user created successfully!');
            $this->command->info('   Email: admin@pinpoint.com');
            $this->command->info('   Password: admin123');
            $this->command->warn('   ⚠️  IMPORTANT: Change this password after first login!');
        } else {
            $this->command->warn('⚠️  Admin user already exists. Skipping...');
        }
    }
}
