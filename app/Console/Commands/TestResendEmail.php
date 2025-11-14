<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use App\Mail\StudentSignInNotification;

class TestResendEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:test {email : The email address to send test to}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a test email using Resend to verify configuration';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $email = $this->argument('email');

        $this->info('Testing Resend email configuration...');
        $this->info('Sending test email to: ' . $email);

        try {
            // Check if API key is configured
            if (empty(env('RESEND_API_KEY'))) {
                $this->error('❌ RESEND_API_KEY is not configured in .env file!');
                $this->line('');
                $this->line('Please add the following to your .env file:');
                $this->line('RESEND_API_KEY=your_api_key_here');
                return Command::FAILURE;
            }

            // Sample test data
            $testData = [
                'studentName' => 'Test Student',
                'guardianName' => 'Test Guardian',
                'className' => 'Mathematics 101',
                'signInTime' => now()->format('g:i A'),
                'signInDate' => now()->format('l, F j, Y'),
                'status' => 'On Time',
                'distance' => 45,
                'isWithinGeofence' => true,
                'teacherName' => 'Prof. Test Teacher',
            ];

            // Send test email
            Mail::to($email)->send(new StudentSignInNotification($testData));

            $this->info('');
            $this->info('✅ Test email sent successfully!');
            $this->info('');
            $this->line('Check the inbox for: ' . $email);
            $this->line('');
            $this->line('📧 Email subject: [PinPoint] Test Student signed in to Mathematics 101');
            $this->line('');
            $this->line('If you don\'t see the email:');
            $this->line('  1. Check your spam/junk folder');
            $this->line('  2. Verify your Resend API key is correct');
            $this->line('  3. Check storage/logs/laravel.log for errors');

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('');
            $this->error('❌ Failed to send test email!');
            $this->error('');
            $this->error('Error: ' . $e->getMessage());
            $this->error('');
            $this->line('Troubleshooting:');
            $this->line('  1. Verify RESEND_API_KEY in .env is correct');
            $this->line('  2. Check config/mail.php exists and is configured');
            $this->line('  3. Run: php artisan config:clear');
            $this->line('  4. Check storage/logs/laravel.log for details');

            return Command::FAILURE;
        }
    }
}
