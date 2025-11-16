#!/bin/bash

# Run migrations
php artisan migrate --force

# Cache config and routes
php artisan config:cache
php artisan route:cache

# Start scheduler in background
php artisan schedule:work &

# Get PORT from environment, default to 8000
PORT=${PORT:-8000}

# Start Laravel development server
exec php artisan serve --host=0.0.0.0 --port="$PORT"

