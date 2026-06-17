# Worker de download de vídeos do YouTube (yt-dlp + ffmpeg) pro bucket do catálogo.
# Node 22+ é necessário: o supabase-js (realtime) exige WebSocket nativo, que só
# existe globalmente a partir do Node 21/22 — no Node 20 o createClient crasha.
FROM node:22-bookworm-slim

WORKDIR /app

# ffmpeg (re-encode) + python3 (yt-dlp) + curl/unzip/ca-certificates.
# Deno = runtime de JS que o yt-dlp usa pra resolver o "nsig" do YouTube; sem ele o
# download dos bytes do vídeo dá HTTP 403 Forbidden.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 curl unzip ca-certificates \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && curl -fsSL https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip -o /tmp/deno.zip \
  && unzip -o /tmp/deno.zip -d /usr/local/bin \
  && chmod a+rx /usr/local/bin/deno \
  && rm /tmp/deno.zip \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY . .

CMD ["node", "index.js"]
