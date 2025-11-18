<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Building;

class CampusBuildingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $buildings = [
            [
                'name' => 'Teachers Education Building (TEB)',
                'latitude' => 10.715061646515199,
                'longitude' => 122.56666247393926,
                'description' => 'Main Teachers Education Building',
                'address' => 'Iloilo Science and Technology University Campus',
                'is_active' => true,
            ],
            [
                'name' => 'Teachers Education Building Annex (TEB-ANNEX)',
                'latitude' => 10.71525101220961,
                'longitude' => 122.56561743408697,
                'description' => 'Teachers Education Building Annex',
                'address' => 'Iloilo Science and Technology University Campus',
                'is_active' => true,
            ],
            [
                'name' => 'K-Building',
                'latitude' => 10.714588937281126,
                'longitude' => 122.56658949710416,
                'description' => 'K-Building',
                'address' => 'Iloilo Science and Technology University Campus',
                'is_active' => true,
            ],
            [
                'name' => 'L-Building',
                'latitude' => 10.714095,
                'longitude' => 122.566311,
                'description' => 'L-Building',
                'address' => 'Iloilo Science and Technology University Campus',
                'is_active' => true,
            ],
            [
                'name' => 'M-Building',
                'latitude' => 10.713791,
                'longitude' => 122.565729,
                'description' => 'M-Building',
                'address' => 'Iloilo Science and Technology University Campus',
                'is_active' => true,
            ],
            [
                'name' => 'N-Building',
                'latitude' => 10.7143538184003,
                'longitude' => 122.56549538533663,
                'description' => 'N-Building',
                'address' => 'Iloilo Science and Technology University Campus',
                'is_active' => true,
            ],
            [
                'name' => 'Press Cottage',
                'latitude' => 10.71332389062544,
                'longitude' => 122.56555948552736,
                'description' => 'Press Cottage',
                'address' => 'Iloilo Science and Technology University Campus',
                'is_active' => true,
            ],
            [
                'name' => 'ICT Building',
                'latitude' => 10.716309129405174,
                'longitude' => 122.56675790521572,
                'description' => 'Information and Communications Technology Building',
                'address' => 'Iloilo Science and Technology University Campus',
                'is_active' => true,
            ],
        ];

        foreach ($buildings as $building) {
            // Check if building already exists to avoid duplicates
            $exists = Building::where('name', $building['name'])->first();
            
            if (!$exists) {
                Building::create($building);
                $this->command->info("✅ Added: {$building['name']}");
            } else {
                $this->command->warn("⚠️  Already exists: {$building['name']}");
            }
        }

        $this->command->info("\n🎉 Campus buildings seeded successfully!");
        $this->command->info("Total buildings in database: " . Building::count());
    }
}
