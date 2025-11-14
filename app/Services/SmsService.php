<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    private $apiKey;
    private $apiUrl;
    private $senderName;

    public function __construct()
    {
        $this->apiKey = env('SEMAPHORE_API_KEY');
        $this->apiUrl = 'https://api.semaphore.co/api/v4/messages';
        $this->senderName = env('SEMAPHORE_SENDER_NAME', 'PinPoint');
    }

    /**
     * Send SMS notification to guardian
     *
     * @param string $phoneNumber Guardian's phone number
     * @param string $message Message to send
     * @return array Response from SMS API
     */
    public function sendSMS($phoneNumber, $message)
    {
        // Skip if no API key configured
        if (empty($this->apiKey)) {
            Log::warning('SMS not sent: SEMAPHORE_API_KEY not configured');
            return [
                'success' => false,
                'message' => 'SMS service not configured'
            ];
        }

        // Format phone number for Philippines
        $formattedNumber = $this->formatPhoneNumber($phoneNumber);

        if (!$formattedNumber) {
            Log::error('Invalid phone number format: ' . $phoneNumber);
            return [
                'success' => false,
                'message' => 'Invalid phone number format'
            ];
        }

        try {
            $response = Http::asForm()->post($this->apiUrl, [
                'apikey' => $this->apiKey,
                'number' => $formattedNumber,
                'message' => $message,
                'sendername' => $this->senderName
            ]);

            $result = $response->json();

            if ($response->successful() && isset($result[0]['message_id'])) {
                Log::info('SMS sent successfully', [
                    'phone' => $formattedNumber,
                    'message_id' => $result[0]['message_id']
                ]);

                return [
                    'success' => true,
                    'message' => 'SMS sent successfully',
                    'message_id' => $result[0]['message_id']
                ];
            } else {
                Log::error('SMS sending failed', [
                    'phone' => $formattedNumber,
                    'response' => $result
                ]);

                return [
                    'success' => false,
                    'message' => $result['message'] ?? 'Failed to send SMS',
                    'error' => $result
                ];
            }
        } catch (\Exception $e) {
            Log::error('SMS exception: ' . $e->getMessage());

            return [
                'success' => false,
                'message' => 'SMS service error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Format phone number for Philippines
     * Accepts: 09123456789, 9123456789, +639123456789, 639123456789
     * Returns: 639123456789
     */
    private function formatPhoneNumber($phoneNumber)
    {
        // Remove all non-numeric characters except +
        $cleaned = preg_replace('/[^0-9+]/', '', $phoneNumber);

        // Remove leading + if present
        $cleaned = ltrim($cleaned, '+');

        // Handle different formats
        if (strlen($cleaned) == 11 && substr($cleaned, 0, 1) == '0') {
            // 09123456789 -> 639123456789
            return '63' . substr($cleaned, 1);
        } elseif (strlen($cleaned) == 10 && substr($cleaned, 0, 1) == '9') {
            // 9123456789 -> 639123456789
            return '63' . $cleaned;
        } elseif (strlen($cleaned) == 12 && substr($cleaned, 0, 2) == '63') {
            // 639123456789 -> 639123456789 (already correct)
            return $cleaned;
        }

        // Invalid format
        return null;
    }

    /**
     * Generate attendance SMS message
     */
    public function generateAttendanceMessage($studentName, $className, $teacherName, $signInTime, $isLate = false)
    {
        $status = $isLate ? 'LATE' : 'on time';
        
        return "PinPoint Alert: Your child {$studentName} signed in {$status} to {$className} at {$signInTime} with {$teacherName}.";
    }

    /**
     * Generate late attendance SMS message
     */
    public function generateLateMessage($studentName, $className, $teacherName, $signInTime, $expectedTime)
    {
        return "PinPoint Alert: Your child {$studentName} signed in LATE to {$className} at {$signInTime}. Expected: {$expectedTime}. Teacher: {$teacherName}.";
    }
}




