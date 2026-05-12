# Custom Omeka S 4.1.1 image — built because the public Docker images are stale
# or misconfigured (omeka/omeka-s is from 2017; libnamic ships a broken nginx).
#
# Base: official PHP 8.3 FPM (Debian Bookworm)
# Web server: nginx, in a sibling container (see docker-compose.yml)
# DB: MariaDB 11

FROM php:8.3-fpm-bookworm

ARG OMEKA_VERSION=4.1.1

# Install system deps + PHP extensions Omeka S needs.
# - libjpeg/libpng/libwebp/libfreetype: for gd (image derivatives)
# - libicu-dev: for intl
# - libzip-dev/zip: for zip extension
# - libxml2-dev: for xml
# - libonig-dev: for mbstring
# - imagemagick + libmagickwand-dev: for image derivatives
# - mariadb-client: convenience for diagnostics
# - curl/unzip: for download step
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        unzip \
        zip \
        imagemagick \
        libmagickwand-dev \
        libjpeg-dev \
        libpng-dev \
        libwebp-dev \
        libfreetype6-dev \
        libicu-dev \
        libzip-dev \
        libxml2-dev \
        libonig-dev \
        mariadb-client \
    ; \
    rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp; \
    docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        mysqli \
        gd \
        exif \
        intl \
        zip \
        mbstring \
        opcache

# Install Imagick from PECL (more reliable than packaged version on Bookworm)
RUN set -eux; \
    pecl install imagick; \
    docker-php-ext-enable imagick

# Download and unpack Omeka S
RUN set -eux; \
    curl -fSL -o /tmp/omeka-s.zip \
        "https://github.com/omeka/omeka-s/releases/download/v${OMEKA_VERSION}/omeka-s-${OMEKA_VERSION}.zip"; \
    unzip -q /tmp/omeka-s.zip -d /tmp; \
    rm -rf /var/www/html; \
    mv "/tmp/omeka-s" /var/www/html; \
    rm /tmp/omeka-s.zip; \
    chown -R www-data:www-data /var/www/html; \
    find /var/www/html -type d -exec chmod 755 {} \; ; \
    find /var/www/html -type f -exec chmod 644 {} \; ; \
    chmod -R u+rwX,g+rwX /var/www/html/files /var/www/html/logs /var/www/html/modules /var/www/html/themes /var/www/html/config

# Entrypoint: write database.ini from env vars, then start php-fpm
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# PHP / FPM tuning for a dev box
RUN { \
    echo "memory_limit = 256M"; \
    echo "upload_max_filesize = 64M"; \
    echo "post_max_size = 64M"; \
    echo "max_execution_time = 120"; \
    } > /usr/local/etc/php/conf.d/omeka.ini

WORKDIR /var/www/html
EXPOSE 9000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
