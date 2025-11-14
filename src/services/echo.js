import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally for Laravel Echo
window.Pusher = Pusher;

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Configure Laravel Echo with environment variables
const echo = new Echo({
    broadcaster: 'pusher',
    key: process.env.REACT_APP_PUSHER_KEY || 'pinpointkey',
    cluster: process.env.REACT_APP_PUSHER_CLUSTER || 'mt1',
    wsHost: process.env.REACT_APP_PUSHER_HOST || window.location.hostname,
    wsPort: parseInt(process.env.REACT_APP_PUSHER_PORT || '6001'),
    wssPort: parseInt(process.env.REACT_APP_PUSHER_PORT || '6001'),
    forceTLS: isProduction || process.env.REACT_APP_PUSHER_SCHEME === 'https',
    encrypted: isProduction,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${process.env.REACT_APP_API_URL || ''}/broadcasting/auth`,
});

export default echo;

