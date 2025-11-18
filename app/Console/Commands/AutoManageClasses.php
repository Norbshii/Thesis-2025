<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ClassModel;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AutoManageClasses extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'classes:auto-manage';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically open and close classes based on their scheduled times';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        try {
            $now = Carbon::now();
            $currentTime = $now->format('H:i:s');
            $currentDay = $now->format('D'); // Mon, Tue, Wed, etc.
            
            $this->info("Running auto-manage classes at {$now->format('Y-m-d H:i:s')}");
            $this->info("Current time: {$currentTime}, Day: {$currentDay}");
            
            // Get all classes
            $classes = ClassModel::with('building')->get();
        } catch (\Exception $e) {
            Log::error("Auto-manage classes failed to fetch data", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->error("Failed to connect to database: " . $e->getMessage());
            return Command::FAILURE;
        }
        
        $openedCount = 0;
        $closedCount = 0;
        
        foreach ($classes as $class) {
            // Check if class should be open
            $shouldBeOpen = $this->shouldClassBeOpen($class, $currentTime, $currentDay);
            $shouldBeClosed = $this->shouldClassBeClosed($class, $currentTime);
            
            // Auto-open class if it should be open but isn't
            if ($shouldBeOpen && !$class->is_open) {
                $this->openClass($class);
                $openedCount++;
                $this->info("✅ Opened: {$class->class_code} - {$class->class_name}");
            }
            
            // Auto-close class if it should be closed but isn't
            if ($shouldBeClosed && $class->is_open) {
                $this->closeClass($class);
                $closedCount++;
                $this->info("⏹️  Closed: {$class->class_code} - {$class->class_name}");
            }
        }
        
        $this->info("Summary: Opened {$openedCount}, Closed {$closedCount} classes");
        Log::info("Auto-manage classes completed", [
            'opened' => $openedCount,
            'closed' => $closedCount,
            'timestamp' => $now->toDateTimeString()
        ]);
        
        return Command::SUCCESS;
    }
    
    /**
     * Check if class should be open based on schedule
     */
    private function shouldClassBeOpen($class, $currentTime, $currentDay)
    {
        // Check if today is a scheduled day
        if ($class->days && !str_contains($class->days, $currentDay)) {
            return false;
        }
        
        // Check if current time is within class time window
        // Allow opening 5 minutes before start time
        $startTime = Carbon::createFromFormat('H:i:s', $class->start_time);
        $endTime = Carbon::createFromFormat('H:i:s', $class->end_time);
        $current = Carbon::createFromFormat('H:i:s', $currentTime);
        
        // Open 5 minutes before start time
        $openWindow = $startTime->copy()->subMinutes(5);
        
        return $current->between($openWindow, $endTime);
    }
    
    /**
     * Check if class should be closed
     */
    private function shouldClassBeClosed($class, $currentTime)
    {
        // If manual control is enabled, ONLY check auto_close_time (ignore scheduled end time)
        if ($class->is_manual_control) {
            if ($class->auto_close_time) {
                $autoCloseTime = Carbon::parse($class->auto_close_time);
                return Carbon::now()->gte($autoCloseTime);
            }
            // Manual control with no auto_close_time = never auto-close
            return false;
        }
        
        // For time-based classes:
        // Priority 1: If auto_close_time is set (class was manually opened), use that
        if ($class->auto_close_time) {
            $autoCloseTime = Carbon::parse($class->auto_close_time);
            if (Carbon::now()->gte($autoCloseTime)) {
                \Log::info('Class should close (auto_close_time reached)', [
                    'class' => $class->class_code,
                    'auto_close_time' => $autoCloseTime->format('H:i:s'),
                    'current_time' => Carbon::now()->format('H:i:s')
                ]);
                return true;
            }
            // If auto_close_time is set but not reached yet, don't close
            return false;
        }
        
        // Priority 2: Check if scheduled end time has passed (only if auto_close_time not set)
        $endTime = Carbon::createFromFormat('H:i:s', $class->end_time);
        $current = Carbon::createFromFormat('H:i:s', $currentTime);
        
        // Close if current time is past end time + 1 minute grace period
        $closeWindow = $endTime->copy()->addMinute();
        
        if ($current->gte($closeWindow)) {
            \Log::info('Class should close (scheduled end time passed)', [
                'class' => $class->class_code,
                'end_time' => $class->end_time,
                'current_time' => $currentTime
            ]);
            return true;
        }
        
        return false;
    }
    
    /**
     * Open a class automatically
     */
    private function openClass($class)
    {
        // Use building location if available, otherwise use default coordinates
        $latitude = null;
        $longitude = null;
        
        if ($class->building) {
            $latitude = $class->building->latitude;
            $longitude = $class->building->longitude;
            Log::info("Auto-opening class with building location", [
                'class' => $class->class_code,
                'building' => $class->building->name,
                'lat' => $latitude,
                'lon' => $longitude
            ]);
        } else {
            // Default fallback location (you can change this)
            // For now, we'll skip auto-opening if no building is assigned
            Log::warning("Cannot auto-open class without building location", [
                'class' => $class->class_code
            ]);
            return;
        }
        
        // Calculate auto-close time
        $start = Carbon::createFromFormat('H:i:s', $class->start_time);
        $end = Carbon::createFromFormat('H:i:s', $class->end_time);
        $durationMinutes = $end->diffInMinutes($start);
        $autoCloseTime = now()->addMinutes($durationMinutes);
        
        // Update class
        $class->update([
            'is_open' => true,
            'current_session_lat' => $latitude,
            'current_session_lon' => $longitude,
            'current_session_opened' => now(),
            'auto_close_time' => $autoCloseTime
        ]);
    }
    
    /**
     * Close a class automatically
     */
    private function closeClass($class)
    {
        $class->update([
            'is_open' => false,
            'current_session_lat' => null,
            'current_session_lon' => null,
            'current_session_opened' => null,
            'auto_close_time' => null
        ]);
        
        Log::info("Auto-closed class", [
            'class' => $class->class_code,
            'timestamp' => now()->toDateTimeString()
        ]);
    }
}
