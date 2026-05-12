#!/bin/sh
# Writes /var/www/html/config/database.ini from environment vars on every start,
# so credentials in docker-compose.yml stay authoritative.
set -e

DB_INI=/var/www/html/config/database.ini

cat > "$DB_INI" <<EOF
user     = "${OMEKA_DB_USER:-omeka}"
password = "${OMEKA_DB_PASSWORD:-omeka}"
dbname   = "${OMEKA_DB_NAME:-omeka}"
host     = "${OMEKA_DB_HOST:-db}"
EOF

chown www-data:www-data "$DB_INI"
chmod 640 "$DB_INI"

# Wait for the database to accept connections before forking php-fpm
echo "Waiting for database ${OMEKA_DB_HOST:-db}..."
for i in $(seq 1 60); do
    if mariadb -h "${OMEKA_DB_HOST:-db}" -u "${OMEKA_DB_USER:-omeka}" \
              -p"${OMEKA_DB_PASSWORD:-omeka}" -e "SELECT 1" >/dev/null 2>&1; then
        echo "Database is ready."
        break
    fi
    sleep 1
done

exec "$@"
