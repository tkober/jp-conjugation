# API-only image. The Angular bundle ships in its own nginx image, which also
# reverse-proxies /api here (see frontend/nginx.conf).
#
# Build context is the repository root, not backend/ — the vocabulary in data/
# lives outside this directory and has to come along.
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim

WORKDIR /app

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/app ./app
COPY data ./data

# DB_URL / DB_USER / DB_PASSWORD / DB_OWNER_USER / DB_OWNER_PASSWORD /
# CORS_ORIGINS are read at runtime (app/config.py) — pass them via
# `docker run --env-file` / -e. HOST/PORT default here but stay overridable.
ENV VOCABULARY_DIR=/app/data/vocabulary \
    HOST=0.0.0.0 \
    PORT=8000
EXPOSE 8000

# Shell form so $HOST/$PORT expand at runtime (exec'd via `sh -c`, so uvicorn
# still becomes PID 1's child and receives signals).
CMD ["sh", "-c", "exec uv run uvicorn app.main:app --host \"$HOST\" --port \"$PORT\""]
