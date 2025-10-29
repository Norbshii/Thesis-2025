<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClassesController;
use App\Http\Controllers\AirtableAuthController;
use App\Http\Controllers\StudentProfileController;
use App\Http\Controllers\StudentsController;

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

// Public routes (Airtable-backed auth)
Route::post('/login', [AirtableAuthController::class, 'login']);
Route::post('/register', [AirtableAuthController::class, 'register']);

// Public Airtable-backed class routes (no auth, to reduce setup for non-technical users)
Route::get('/classes', [ClassesController::class, 'index']);
Route::post('/classes', [ClassesController::class, 'store']);
Route::post('/class/toggle-signin', [ClassesController::class, 'toggle']);
Route::post('/classes/add-students', [ClassesController::class, 'addStudents']);
Route::post('/classes/remove-student', [ClassesController::class, 'removeStudent']);
Route::post('/classes/open', [ClassesController::class, 'openClass']);
Route::post('/classes/close', [ClassesController::class, 'closeClass']);
Route::post('/classes/extend', [ClassesController::class, 'extendClass']);
Route::post('/classes/toggle-manual-control', [ClassesController::class, 'toggleManualControl']);
Route::post('/classes/student-signin', [ClassesController::class, 'studentSignIn']);
Route::get('/classes/{classId}/attendance', [ClassesController::class, 'getAttendance']);

// Student profile (public for simplicity; consider adding auth later)
Route::get('/student/profile', [StudentProfileController::class, 'get']);
Route::post('/student/profile', [StudentProfileController::class, 'update']);

// Students list (for adding students to classes)
Route::get('/students', [StudentsController::class, 'index']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    // Original DB-backed endpoints retained for reference
    // Route::get('/classes', [AuthController::class, 'getClasses']);
    // Route::post('/class/toggle-signin', [AuthController::class, 'toggleClassSignIn']);
    
    // Add more protected routes here
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
