<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ClassUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $class;
    public $action; // 'opened', 'closed', 'updated', 'student_added', 'student_removed'

    /**
     * Create a new event instance.
     *
     * @return void
     */
    public function __construct($class, $action = 'updated')
    {
        $this->class = $class;
        $this->action = $action;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return \Illuminate\Broadcasting\Channel|array
     */
    public function broadcastOn()
    {
        return new Channel('classes');
    }

    /**
     * The event's broadcast name.
     *
     * @return string
     */
    public function broadcastAs()
    {
        return 'class.updated';
    }
}

