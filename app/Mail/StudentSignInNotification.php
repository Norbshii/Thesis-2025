<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StudentSignInNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $studentName;
    public $guardianName;
    public $className;
    public $signInTime;
    public $signInDate;
    public $status;
    public $distance;
    public $isWithinGeofence;
    public $teacherName;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct($data)
    {
        $this->studentName = $data['studentName'];
        $this->guardianName = $data['guardianName'];
        $this->className = $data['className'];
        $this->signInTime = $data['signInTime'];
        $this->signInDate = $data['signInDate'];
        $this->status = $data['status'];
        $this->distance = $data['distance'];
        $this->isWithinGeofence = $data['isWithinGeofence'];
        $this->teacherName = $data['teacherName'];
    }

    /**
     * Get the message envelope.
     *
     * @return \Illuminate\Mail\Mailables\Envelope
     */
    public function envelope()
    {
        return new Envelope(
            subject: '[PinPoint] ' . $this->studentName . ' signed in to ' . $this->className,
        );
    }

    /**
     * Get the message content definition.
     *
     * @return \Illuminate\Mail\Mailables\Content
     */
    public function content()
    {
        return new Content(
            view: 'emails.student-signin',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array
     */
    public function attachments()
    {
        return [];
    }
}
