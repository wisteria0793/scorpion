#!/bin/sh
set -e

# Wait for database if needed (optional tiny loop could be added here)

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

echo "Starting process: $@"
exec "$@"
