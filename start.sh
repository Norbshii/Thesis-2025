#!/bin/bash
set -e

# Run migrations
php artisan migrate --force || echo "Migration failed, continuing..."

# Cache config and routes
php artisan config:cache || echo "Config cache failed"
php artisan route:cache || echo "Route cache failed"

# Start scheduler in background
php artisan schedule:work &

# Configure Apache to use Railway's PORT
PORT=${PORT:-8000}
echo "Server starting on port $PORT"

# Update Apache port in config
sed -i "s/Listen 80/Listen $PORT/g" /etc/apache2/ports.conf || true
sed -i "s/:80/:$PORT/g" /etc/apache2/sites-available/000-default.conf || true

# Start Apache
exec apache2-foreground

