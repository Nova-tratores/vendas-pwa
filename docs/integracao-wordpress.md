# Integração do catálogo com o site (WordPress + Elementor Pro)

Como reaproveitar as fichas do catálogo (Supabase) no site institucional, **sem
recadastrar nada**. A fonte é a view pública `vw_catalogo_publico`
(ver `supabase-catalogo-publico.sql`).

## Etapa 1 — Fundação (PRONTA)

A view `vw_catalogo_publico` expõe uma linha por ficha **visível** do portfólio, já
denormalizada e com **URLs absolutas**. É leitura pública via PostgREST.

### Endpoint REST
```
GET https://citrhumdkfivdzbmayde.supabase.co/rest/v1/vw_catalogo_publico?select=*&order=ordem
Header: apikey: <ANON_KEY>
```
- A `ANON_KEY` é a mesma do app (em `vendas-pwa/.env`, `VITE_SUPABASE_ANON_KEY`). É pública
  por natureza e só dá acesso de **leitura** a esta view (e ao que a RLS já libera).
- Filtros úteis do PostgREST: `?marca_slug=eq.mahindra`, `?categoria=eq.tratores`,
  `?slug=eq.mahindra-6065`, `?limit=20&offset=0`.

### Campos da view
| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | int | id interno |
| `slug` | text | **chave estável** (use no permalink) |
| `titulo` / `subtitulo` | text | nome / complemento |
| `categoria` | text | tratores / implementos / pulverizadores |
| `descricao` | text | descrição longa |
| `argumentos_de_venda` | jsonb[] | lista de strings (✓) |
| `especificacoes` | jsonb obj | `{"chave": "valor", ...}` |
| `url_site` | text | link do fabricante (opcional) |
| `marca_nome` / `marca_slug` / `marca_logo_url` | text | marca |
| `foto_principal_url` | text (URL) | **absoluta** |
| `folheto_url` | text (URL) | PDF (opcional) |
| `fotos_extras` | jsonb[] | `[{titulo, url}]` |
| `videos` | jsonb[] | `[{titulo, url}]` (mp4 já hospedado) |
| `ordem` / `updated_at` | int / ts | ordenação / controle de sync |

## Etapa 2 — WordPress (a fazer)

Abordagem escolhida: **sincronizar pro WordPress como CPT**, pra usar Elementor Pro
(Loop Grid / Theme Builder / Dynamic Tags) e ter SEO nativo.

1. **CPT `maquina`** (`register_post_type`), com taxonomia `marca`. Campos via **ACF**
   (ou post meta): subtitulo, categoria, argumentos (repeater), especificacoes (repeater),
   folheto_url, url_site, galeria (fotos_extras), videos.
2. **Sync** (plugin pequeno ou WP-Cron com `wp_remote_get`):
   - Lê `vw_catalogo_publico` (pode paginar / filtrar por `updated_at` pra incremental).
   - **Upsert por `slug`** (busca post pelo meta `slug`/`post_name`; cria ou atualiza).
   - `titulo`→`post_title`, `slug`→`post_name`, `descricao`→conteúdo, specs/argumentos→ACF.
   - **Baixa as imagens pro Media Library** (`media_sideload_image`) e seta a destacada —
     melhor pra SEO/performance e não depende da PWA estar no ar. (Hotlink é o plano B.)
   - Marca como rascunho/lixeira o que sumiu da view (ou ignora).
3. **Elementor Pro:** Loop Grid no arquivo `/maquinas` + Single template (Theme Builder)
   com Dynamic Tags/ACF. Permalink por `slug` (mesma slug do app → URLs estáveis).
4. **SEO:** títulos/meta por ficha (Yoast/RankMath), sitemap nativo do WP.

### Observações
- As **fotos principais** das fichas seed são servidas pela PWA
  (`https://vendas-pwa-production.up.railway.app/catalogo/fotos/...`). O sideload no WP
  resolve a dependência. Fotos/vídeos extras e PDFs já estão no Storage do Supabase.
- Pra publicar/ocultar no site **independente** do app do vendedor, dá pra ativar a coluna
  `visivel_site` (ver comentário no fim do `supabase-catalogo-publico.sql`).
