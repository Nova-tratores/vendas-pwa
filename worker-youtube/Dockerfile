# Worker de download de vídeos do YouTube (yt-dlp + ffmpeg) pro bucket do catálogo.
# Node 22+ é necessário: o supabase-js (realtime) exige WebSocket nativo, que só
# existe globalmente a partir do Node 21/22 — no Node 20 o createClient crasha.
FROM node:22-bookworm-slim

WORKDIR /app

# ffmpeg (re-encode) + python3 (yt-dlp) + curl/ca-certificates (baixar o yt-dlp e os vídeos).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 curl ca-certificates \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY . .

CMD ["node", "index.js"]
