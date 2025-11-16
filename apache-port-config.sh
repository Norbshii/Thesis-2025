#!/bin/bash
# Configure Apache port dynamically

PORT=${PORT:-8000}

# Create ports.conf
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

echo "Apache configured for port $PORT"

