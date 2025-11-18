<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Section;

class SectionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $courses = ['BSCS', 'BSIT', 'BTLED'];
        $yearLevels = ['1', '2', '3', '4'];
        $sectionLetters = ['A', 'B', 'C'];

        foreach ($courses as $course) {
            foreach ($yearLevels as $year) {
                foreach ($sectionLetters as $letter) {
                    Section::create([
                        'name' => "{$course} {$year}{$letter}",
                        'course' => $course,
                        'year_level' => $year,
                        'section_letter' => $letter,
                        'capacity' => 40,
                        'is_active' => true,
                    ]);
                }
            }
        }

        echo "✅ Created " . Section::count() . " sections\n";
    }
}
