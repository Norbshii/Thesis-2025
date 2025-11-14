<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Teacher;
use App\Models\Student;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  ...$roles
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        // Extract user info from token (our simple token format: base64('mysql|id|role|timestamp'))
        $token = $request->header('Authorization');
        
        if (!$token) {
            return response()->json(['message' => 'Unauthorized - No token provided'], 401);
        }

        // Remove "Bearer " prefix if present
        $token = str_replace('Bearer ', '', $token);

        try {
            $decoded = base64_decode($token);
            $parts = explode('|', $decoded);
            
            if (count($parts) < 3) {
                return response()->json(['message' => 'Unauthorized - Invalid token format'], 401);
            }

            $userId = $parts[1];
            $userRole = $parts[2];

            // Verify user exists
            if ($userRole === 'teacher' || $userRole === 'admin') {
                $user = Teacher::find($userId);
            } else if ($userRole === 'student') {
                $user = Student::find($userId);
            } else {
                return response()->json(['message' => 'Unauthorized - Invalid role'], 401);
            }

            if (!$user) {
                return response()->json(['message' => 'Unauthorized - User not found'], 401);
            }

            // Check if user has required role
            if (!empty($roles) && !in_array($userRole, $roles)) {
                return response()->json(['message' => 'Forbidden - Insufficient permissions'], 403);
            }

            // Attach user to request for later use
            $request->merge(['auth_user' => $user, 'auth_role' => $userRole]);

            return $next($request);
            
        } catch (\Exception $e) {
            return response()->json(['message' => 'Unauthorized - Token error'], 401);
        }
    }
}
