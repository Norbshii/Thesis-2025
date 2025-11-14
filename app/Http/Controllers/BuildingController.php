<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Building;
use App\Events\BuildingUpdated;

class BuildingController extends Controller
{
    /**
     * Get all buildings
     */
    public function index(Request $request)
    {
        try {
            $query = Building::query();

            // Filter by active status if requested
            if ($request->has('active_only') && $request->active_only) {
                $query->where('is_active', true);
            }

            $buildings = $query->orderBy('name', 'asc')->get();

            return response()->json([
                'success' => true,
                'buildings' => $buildings,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching buildings: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching buildings',
            ], 500);
        }
    }

    /**
     * Get a single building
     */
    public function show($id)
    {
        try {
            $building = Building::with('classes')->findOrFail($id);

            return response()->json([
                'success' => true,
                'building' => $building,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Building not found',
            ], 404);
        }
    }

    /**
     * Create a new building
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:buildings,name',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'description' => 'nullable|string|max:1000',
            'address' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $building = Building::create([
                'name' => $request->name,
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'description' => $request->description,
                'address' => $request->address,
                'is_active' => $request->is_active ?? true,
            ]);
            
            // Broadcast building list updated
            broadcast(new BuildingUpdated(Building::all()));

            return response()->json([
                'success' => true,
                'message' => 'Building created successfully',
                'building' => $building,
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Error creating building: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error creating building',
            ], 500);
        }
    }

    /**
     * Update a building
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255|unique:buildings,name,' . $id,
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'description' => 'nullable|string|max:1000',
            'address' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $building = Building::findOrFail($id);

            // Update only provided fields
            if ($request->has('name')) {
                $building->name = $request->name;
            }
            if ($request->has('latitude')) {
                $building->latitude = $request->latitude;
            }
            if ($request->has('longitude')) {
                $building->longitude = $request->longitude;
            }
            if ($request->has('description')) {
                $building->description = $request->description;
            }
            if ($request->has('address')) {
                $building->address = $request->address;
            }
            if ($request->has('is_active')) {
                $building->is_active = $request->is_active;
            }

            $building->save();

            return response()->json([
                'success' => true,
                'message' => 'Building updated successfully',
                'building' => $building,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error updating building: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating building',
            ], 500);
        }
    }

    /**
     * Delete a building
     */
    public function destroy($id)
    {
        try {
            $building = Building::findOrFail($id);

            // Check if building is used by any classes
            $classCount = $building->classes()->count();
            if ($classCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete building. It is currently assigned to {$classCount} class(es).",
                ], 409);
            }

            $building->delete();

            return response()->json([
                'success' => true,
                'message' => 'Building deleted successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('Error deleting building: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error deleting building',
            ], 500);
        }
    }

    /**
     * Toggle building active status
     */
    public function toggleActive($id)
    {
        try {
            $building = Building::findOrFail($id);
            $building->is_active = !$building->is_active;
            $building->save();

            return response()->json([
                'success' => true,
                'message' => 'Building status updated successfully',
                'building' => $building,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating building status',
            ], 500);
        }
    }
}
