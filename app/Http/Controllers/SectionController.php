<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Section;
use Illuminate\Support\Facades\Validator;

class SectionController extends Controller
{
    /**
     * Get all sections
     */
    public function index()
    {
        try {
            $sections = Section::orderBy('name')->get();
            
            return response()->json([
                'success' => true,
                'sections' => $sections
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to fetch sections: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sections'
            ], 500);
        }
    }

    /**
     * Get active sections only
     */
    public function active()
    {
        try {
            $sections = Section::active()->orderBy('name')->get();
            
            return response()->json([
                'success' => true,
                'sections' => $sections
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to fetch active sections: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sections'
            ], 500);
        }
    }

    /**
     * Create a new section
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:sections,name|max:100',
            'course' => 'required|string|max:50',
            'year_level' => 'required|string|max:10',
            'section_letter' => 'required|string|max:10',
            'capacity' => 'nullable|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $section = Section::create([
                'name' => $request->name,
                'course' => $request->course,
                'year_level' => $request->year_level,
                'section_letter' => $request->section_letter,
                'capacity' => $request->capacity ?? 40,
                'is_active' => true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Section created successfully',
                'section' => $section
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Failed to create section: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create section'
            ], 500);
        }
    }

    /**
     * Update a section
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100|unique:sections,name,' . $id,
            'course' => 'required|string|max:50',
            'year_level' => 'required|string|max:10',
            'section_letter' => 'required|string|max:10',
            'capacity' => 'nullable|integer|min:1|max:100',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $section = Section::findOrFail($id);
            
            $section->update([
                'name' => $request->name,
                'course' => $request->course,
                'year_level' => $request->year_level,
                'section_letter' => $request->section_letter,
                'capacity' => $request->capacity ?? 40,
                'is_active' => $request->is_active ?? true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Section updated successfully',
                'section' => $section
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to update section: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update section'
            ], 500);
        }
    }

    /**
     * Delete a section
     */
    public function destroy($id)
    {
        try {
            $section = Section::findOrFail($id);
            $section->delete();

            return response()->json([
                'success' => true,
                'message' => 'Section deleted successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to delete section: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete section'
            ], 500);
        }
    }

    /**
     * Toggle section active status
     */
    public function toggleActive($id)
    {
        try {
            $section = Section::findOrFail($id);
            $section->is_active = !$section->is_active;
            $section->save();

            return response()->json([
                'success' => true,
                'message' => 'Section status updated',
                'section' => $section
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to toggle section status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update section status'
            ], 500);
        }
    }
}
