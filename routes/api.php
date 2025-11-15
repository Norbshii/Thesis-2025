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

// Student profile (public for simplicity; consider adding auth later)
Route::get('/student/profile', [StudentProfileController::class, 'get']);
Route::post('/student/profile', [StudentProfileController::class, 'update']);
Route::get('/student/course-options', [StudentProfileController::class, 'getCourseOptions']);

// Students list (for adding students to classes)
Route::get('/students', [StudentsController::class, 'index']);

// Buildings list (for teachers to select when creating classes)
Route::get('/buildings', [BuildingController::class, 'index']);

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
