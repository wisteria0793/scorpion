FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# system deps required for some python packages (psycopg2, Pillow)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev gcc libjpeg62-turbo-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source
COPY . /app

# Entrypoint script will run migrations and collectstatic
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "api.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
