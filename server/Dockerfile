# Terminal Music backend — container image.
#
# Runs the FastAPI app with uvicorn. ffmpeg is baked in because /download uses
# yt-dlp + ffmpeg (FFmpegExtractAudio / FFmpegMetadata / EmbedThumbnail).
#
# Build context is the REPO ROOT (so the `server/` package copies in cleanly):
#   docker build -f server/Dockerfile -t terminal-music .
FROM python:3.12-slim

# ffmpeg = required for downloads. ca-certificates = TLS to googlevideo/ytmusic.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first so this layer caches across code changes.
COPY server/requirements.txt ./server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

# App code.
COPY server/ ./server/

# Downloads + caches live on a mounted volume, not inside the image.
ENV TM_DATA_DIR=/data \
    TM_HOST=0.0.0.0 \
    TM_PORT=8000 \
    PYTHONUNBUFFERED=1
RUN mkdir -p /data

EXPOSE 8000

# Container-level healthcheck hits the app's /health route.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
