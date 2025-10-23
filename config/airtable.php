<?php

return [
    'api_key' => env('AIRTABLE_API_KEY', ''),
    'base_id' => env('AIRTABLE_BASE_ID', ''),
    'verify_ssl' => env('AIRTABLE_VERIFY_SSL', true),
    'ca_bundle' => env('AIRTABLE_CA_BUNDLE', null),

    // Logical table names used by the app
    'tables' => [
        'classes' => env('AIRTABLE_TABLE_CLASSES', 'Classes'),
        'users' => env('AIRTABLE_TABLE_USERS', 'Users'),
        'students' => env('AIRTABLE_TABLE_STUDENTS', null),
        'teachers' => env('AIRTABLE_TABLE_TEACHERS', null),
        'attendance' => env('AIRTABLE_TABLE_ATTENDANCE', 'Attendance Entries'),
    ],
];


