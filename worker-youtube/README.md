# worker-youtube

Serviço que baixa vídeos do YouTube (yt-dlp), normaliza pra 720p (ffmpeg) e hospeda
no bucket `catalogo-midia` do Supabase. É a "fila" dos vídeos do catálogo.

Como funciona: faz polling da tabela `catalogo_midia` procurando linhas
`tipo='video'` + `status='pendente'` + `origem_url` (link do YouTube). Baixa, comprime,
sobe no bucket e marca `status='pronto'` (ou `'erro'` com a mensagem).

## Variáveis de ambiente (segredos — só aqui, nunca no app)

| Variável | Valor |
| --- | --- |
| `SUPABASE_URL` | `https://citrhumdkfivdzbmayde.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | a **service_role** key do projeto (Supabase → Settings → API) |
| `MIDIA_BUCKET` | `catalogo-midia` (padrão) |
| `POLL_INTERVAL` | `15000` (ms, opcional) |
| `MAX_HEIGHT` | `720` (opcional) |

## Deploy no Railway (passo a passo)

1. No projeto do Railway, **New → GitHub Repo** → `Nova-tratores/vendas-pwa`.
2. Em **Settings → Source**, defina **Root Directory** = `worker-youtube`.
   (Assim o Railway usa o Dockerfile desta pasta, não o do app.)
3. Em **Variables**, adicione as variáveis da tabela acima
   (principalmente `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`).
4. Deploy. Nos **Logs** deve aparecer `worker-youtube iniciado ...`.
5. Não precisa de domínio público nem porta — é um worker, não um servidor web.

## Atualizar o yt-dlp (quando o YouTube quebrar o download)

O Dockerfile baixa sempre a última versão do yt-dlp no build. Para atualizar,
basta **redeploy** do serviço no Railway.
