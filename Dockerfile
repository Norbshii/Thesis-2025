# Use official PHP image
FROM php:8.2

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Get Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy existing application directory contents
COPY . /var/www/html

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Create necessary directories
RUN mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache storage/logs
RUN mkdir -p bootstrap/cache

# Set permissions
RUN chmod -R 775 storage bootstrap/cache

# Clear any existing caches
RUN php artisan config:clear || true
RUN php artisan cache:clear || true
RUN php artisan route:clear || true
RUN php artisan view:clear || true

# Expose port
EXPOSE 8000

# Run migrations, start queue worker, scheduler, and server
CMD php artisan migrate --force && php artisan queue:work --tries=3 --timeout=60 & php artisan schedule:work & php artisan serve --host=0.0.0.0 --port=${PORT:-8000}

