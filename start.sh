#!/bin/bash

echo "=== Starting Laravel Application ==="

# Run migrations
echo "Running migrations..."
php artisan migrate --force || echo "Migration failed, continuing..."

# Cache config and routes
echo "Caching config and routes..."
php artisan config:cache || echo "Config cache failed"
php artisan route:cache || echo "Route cache failed"

# Start scheduler in background
echo "Starting scheduler..."
php artisan schedule:work &

# Configure Apache to use Railway's PORT
PORT=${PORT:-8000}
echo "Configuring Apache for port $PORT"

# Update Apache port configuration
echo "Listen $PORT" > /etc/apache2/ports.conf

# Create virtual host config
cat > /etc/apache2/sites-available/000-default.conf <<EOF
<VirtualHost *:$PORT>
    DocumentRoot /var/www/html/public
    <Directory /var/www/html/public>
        AllowOverride All
        Require all granted
    </Directory>
    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# Enable the site
a2ensite 000-default.conf || true

# Test Apache configuration
echo "Testing Apache configuration..."
apache2ctl configtest || {
    echo "Apache configuration test failed!"
    cat /etc/apache2/sites-available/000-default.conf
    exit 1
}

echo "Starting Apache on port $PORT..."
# Start Apache (this should keep running)
apache2-foreground

