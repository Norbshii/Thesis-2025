<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClassesController;
use App\Http\Controllers\AirtableAuthController;
use App\Http\Controllers\StudentProfileController;
use App\Http\Controllers\StudentsController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\BuildingController;
use App\Http\Controllers\SectionController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Health check route
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'API is running!',
        'timestamp' => now(),
        'env' => [
            'APP_ENV' => env('APP_ENV'),
            'APP_DEBUG' => env('APP_DEBUG'),
            'AIRTABLE_CONFIGURED' => env('AIRTABLE_API_KEY') ? 'yes' : 'no',
        ]
    ]);
});

// Debug mail config
Route::get('/debug/mail-config', function () {
    return response()->json([
        'mail_config' => [
            'MAIL_MAILER' => env('MAIL_MAILER'),
            'MAIL_HOST' => env('MAIL_HOST'),
            'MAIL_PORT' => env('MAIL_PORT'),
            'MAIL_USERNAME' => env('MAIL_USERNAME'),
            'MAIL_PASSWORD' => env('MAIL_PASSWORD') ? '***SET*** (length: ' . strlen(env('MAIL_PASSWORD')) . ')' : 'NOT SET',
            'MAIL_ENCRYPTION' => env('MAIL_ENCRYPTION'),
            'MAIL_FROM_ADDRESS' => env('MAIL_FROM_ADDRESS'),
            'MAIL_FROM_NAME' => env('MAIL_FROM_NAME'),
        ],
        'config_mail' => [
            'default' => config('mail.default'),
            'from_address' => config('mail.from.address'),
            'from_name' => config('mail.from.name'),
            'smtp_host' => config('mail.mailers.smtp.host'),
            'smtp_port' => config('mail.mailers.smtp.port'),
            'smtp_username' => config('mail.mailers.smtp.username'),
            'smtp_password' => config('mail.mailers.smtp.password') ? '***SET***' : 'NOT SET',
        ]
    ]);
});

// Test email sending
Route::get('/debug/test-email', function () {
    try {
        $testEmail = env('MAIL_USERNAME', 'davelima2@gmail.com');
        $resendApiKey = env('RESEND_API_KEY');
        
        \Log::info('=== TEST EMAIL ATTEMPT ===', [
            'to' => $testEmail,
            'resend_api_key_set' => !empty($resendApiKey),
            'api_key_length' => strlen($resendApiKey)
        ]);
        
        // Test Resend API directly
        if ($resendApiKey) {
            $resend = new \Resend\Resend($resendApiKey);
            
            $result = $resend->emails->send([
                'from' => env('MAIL_FROM_ADDRESS', 'onboarding@resend.dev'),
                'to' => $testEmail,
                'subject' => 'PinPoint Test Email - ' . now()->toDateTimeString(),
                'html' => '<h1>Test Email from PinPoint</h1><p>This is a test email from PinPoint Attendance System.</p><p>Timestamp: ' . now()->toDateTimeString() . '</p><p>If you received this, Resend API is working correctly! ✅</p>',
            ]);
            
            \Log::info('=== TEST EMAIL SENT SUCCESSFULLY VIA RESEND API ===', [
                'resend_id' => $result->id ?? 'unknown',
                'to' => $testEmail
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Test email sent successfully via Resend API!',
                'sent_to' => $testEmail,
                'resend_id' => $result->id ?? 'unknown',
                'check_inbox' => 'Check your email at ' . $testEmail,
                'method' => 'Resend API'
            ]);
        } else {
            // Fallback to Laravel Mail
            \Illuminate\Support\Facades\Mail::raw(
                'This is a test email from PinPoint Attendance System. Timestamp: ' . now()->toDateTimeString(),
                function ($message) use ($testEmail) {
                    $message->to($testEmail)
                            ->subject('PinPoint Test Email - ' . now()->toDateTimeString());
                }
            );
            
            \Log::info('=== TEST EMAIL SENT SUCCESSFULLY VIA LARAVEL MAIL ===');
            
            return response()->json([
                'success' => true,
                'message' => 'Test email sent successfully via Laravel Mail!',
                'sent_to' => $testEmail,
                'check_inbox' => 'Check your email at ' . $testEmail,
                'method' => 'Laravel Mail'
            ]);
        }
        
    } catch (\Exception $e) {
        \Log::error('=== TEST EMAIL FAILED ===', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to send test email',
            'error' => $e->getMessage(),
            'error_class' => get_class($e)
        ], 500);
    }
});

// Public routes (MySQL-backed auth)
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/change-password', [AuthController::class, 'changePassword']);

// Public Airtable-backed class routes (no auth, to reduce setup for non-technical users)
Route::get('/classes', [ClassesController::class, 'index']);
Route::post('/classes', [ClassesController::class, 'store']);
Route::put('/classes/{id}', [ClassesController::class, 'update']);
Route::post('/class/toggle-signin', [ClassesController::class, 'toggle']);
Route::post('/classes/add-students', [ClassesController::class, 'addStudents']);
Route::post('/classes/remove-student', [ClassesController::class, 'removeStudent']);
Route::post('/classes/open', [ClassesController::class, 'openClass']);
Route::post('/classes/close', [ClassesController::class, 'closeClass']);
Route::post('/classes/extend', [ClassesController::class, 'extendClass']);
Route::post('/classes/toggle-manual-control', [ClassesController::class, 'toggleManualControl']);
Route::post('/classes/student-signin', [ClassesController::class, 'studentSignIn']);
Route::get('/classes/{classId}/attendance', [ClassesController::class, 'getAttendance']);
Route::delete('/classes/attendance/{attendanceId}', [ClassesController::class, 'deleteAttendance']);

// Student profile (public for simplicity; consider adding auth later)
Route::get('/student/profile', [StudentProfileController::class, 'get']);
Route::post('/student/profile', [StudentProfileController::class, 'update']);
Route::get('/student/course-options', [StudentProfileController::class, 'getCourseOptions']);

// Students list (for adding students to classes)
Route::get('/students', [StudentsController::class, 'index']);

// Buildings list (for teachers to select when creating classes)
Route::get('/buildings', [BuildingController::class, 'index']);

// Sections list (for students and admins)
Route::get('/sections', [SectionController::class, 'index']);
Route::get('/sections/active', [SectionController::class, 'active']);

// Protected routes - Admin only
Route::middleware(\App\Http\Middleware\CheckRole::class . ':admin')->prefix('admin')->group(function () {
    // User management
    Route::get('/users', [AdminController::class, 'getUsers']);
    Route::post('/users', [AdminController::class, 'createUser']);
    Route::put('/users/{type}/{id}', [AdminController::class, 'updateUser']);
    Route::delete('/users/{type}/{id}', [AdminController::class, 'deleteUser']);
    Route::get('/stats', [AdminController::class, 'getStats']);
    
    // Building management
    Route::get('/buildings', [BuildingController::class, 'index']);
    Route::post('/buildings', [BuildingController::class, 'store']);
    Route::get('/buildings/{id}', [BuildingController::class, 'show']);
    Route::put('/buildings/{id}', [BuildingController::class, 'update']);
    Route::delete('/buildings/{id}', [BuildingController::class, 'destroy']);
    Route::patch('/buildings/{id}/toggle-active', [BuildingController::class, 'toggleActive']);
    
    // Section management
    Route::get('/sections', [SectionController::class, 'index']);
    Route::post('/sections', [SectionController::class, 'store']);
    Route::put('/sections/{id}', [SectionController::class, 'update']);
    Route::delete('/sections/{id}', [SectionController::class, 'destroy']);
    Route::patch('/sections/{id}/toggle-active', [SectionController::class, 'toggleActive']);
});

// Protected routes - Teacher only
Route::middleware(\App\Http\Middleware\CheckRole::class . ':teacher')->prefix('teacher')->group(function () {
    // Teacher-specific routes (classes management, etc.)
    // These will be moved here gradually
});

// Protected routes - Student only
Route::middleware(\App\Http\Middleware\CheckRole::class . ':student')->prefix('student')->group(function () {
    // Student-specific routes
    // These will be moved here gradually
});

// Protected routes - Any authenticated user
Route::middleware(\App\Http\Middleware\CheckRole::class . ':admin,teacher,student')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
});
