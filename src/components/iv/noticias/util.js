// Notícias do agro (app): constantes e utilitários — espelho de Noticias.tsx / BoletimOpcoes.tsx do Portal.
import { useEffect, useRef, useState } from 'react'
import { CATEGORIAS_NOTICIA } from '../../../lib/iv/fonte'

export const CATEGORIAS = CATEGORIAS_NOTICIA
export const cat = (c) => CATEGORIAS[c] || { nome: c || 'Notícia', cor: '#475569', icone: 'Newspaper' }

export const TEND = {
  boa: { nome: 'Boa notícia', cor: '#15803d', fundo: '#dcfce7' },
  ruim: { nome: 'Atenção', cor: '#b91c1c', fundo: '#fee2e2' },
  neutra: { nome: 'Fique de olho', cor: '#475569', fundo: '#e2e8f0' },
}

export const PROGRAMAS = {
  pronaf: { nome: 'Pronaf Mais Alimentos', curto: 'Pronaf', cor: '#16a34a', frase: 'agricultura familiar: a taxa mais baixa' },
  pronamp: { nome: 'Pronamp', curto: 'Pronamp', cor: '#0891b2', frase: 'médio produtor' },
  inovagro: { nome: 'Inovagro', curto: 'Inovagro', cor: '#7c3aed', frase: 'tecnologia, precisão e inovação' },
  moderfrota: { nome: 'Moderfrota', curto: 'Moderfrota', cor: '#dc2626', frase: 'trator e implemento novo, para todo porte' },
}
export const prog = (p) => PROGRAMAS[p] || { nome: p, curto: p, cor: '#475569', frase: 'outras linhas' }
export const ORDEM_PROGRAMAS = ['pronaf', 'pronamp', 'inovagro', 'moderfrota']

/** Para quem é cada programa (texto fixo; os números vêm do BNDES). */
export const PARA_QUEM = {
  pronaf: 'Agricultor familiar com cadastro no Pronaf (CAF/DAP). Tem os menores juros para trator e implemento.',
  pronamp: 'Médio produtor rural (renda bruta anual dentro do limite do Pronamp). Juros intermediários.',
  moderfrota: 'Qualquer produtor ou cooperativa, para trator, colheitadeira, plantadeira e pulverizador novos. O juro muda conforme a receita bruta.',
  inovagro: 'Para investir em inovação: agricultura de precisão, automação e máquinas com tecnologia embarcada.',
}

/** Mesmo filtro do Portal (lib/inteligencia-vendas/plano-safra.ts): só linhas que servem para máquina. */
export function linhaServeMaquina(l) {
  const t = `${l.nome || ''} ${l.financia || ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/maquin|equipament|trator|implement|mecaniz|colheitadeira|plantadeira|pulverizador|agricultura de precisao/.test(t)) return true
  return !/bovino|bubalino|avicultura|aves\b|suin|pesca|aquicultura|irrigac|armazen|reten[cç]ao de matrizes|recria|engorda|correcao de solo|calcario|reflorest|energia/.test(t)
}

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const dataLonga = (iso) => { const d = new Date(`${iso}T12:00:00`); return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}` }
export const rotuloDia = (iso, hoje) => {
  const dif = Math.round((Date.parse(`${hoje}T12:00:00`) - Date.parse(`${iso}T12:00:00`)) / 86400000)
  return dif === 0 ? 'Hoje' : dif === 1 ? 'Ontem' : `${SEMANA[new Date(`${iso}T12:00:00`).getDay()].slice(0, 3)} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}
export function haQuanto(iso) {
  if (!iso) return ''
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (!Number.isFinite(min) || min < 0) return ''
  if (min < 60) return `há ${Math.max(1, min)} min`
  const h = Math.round(min / 60)
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} dia(s)`
}
export const pct = (n) => (n == null ? '' : `${Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`)
export const dominio = (url) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' } }

/** Link da calculadora com a taxa e o prazo da linha (mesmo formato do Portal). */
export const linkCalculadora = (l) => {
  const q = new URLSearchParams()
  if (l.taxa_aa != null) q.set('taxa', String(l.taxa_aa))
  if (l.prazo_anos) q.set('prazo', String(l.prazo_anos))
  q.set('linha', l.nome)
  return `/inteligencia/calculadora?${q}`
}

const semMovimento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Contador animado (sobe do valor anterior até o alvo). */
export function useConta(alvo, ms = 900) {
  const [v, setV] = useState(semMovimento() ? alvo : 0)
  const de = useRef(0)
  useEffect(() => {
    if (alvo == null || !Number.isFinite(alvo)) return undefined
    if (semMovimento()) { setV(alvo); de.current = alvo; return undefined }
    const ini = performance.now(), o = de.current
    let raf = 0
    const passo = (t) => {
      const k = Math.min(1, (t - ini) / ms)
      setV(o + (alvo - o) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(passo); else de.current = alvo
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [alvo, ms])
  return v
}

/** Estilos da tela (prefixo ntv-), com animações discretas e respeito a "reduzir movimento". */
export const ESTILO = `
  @keyframes ntvSobe { from { opacity: 0; transform: translateY(10px) } }
  @keyframes ntvFundo { from { opacity: 0 } }
  @keyframes ntvFolha { from { opacity: .4; transform: translateY(40px) } }
  @keyframes ntvRola { to { transform: translateX(-50%) } }
  @keyframes ntvPisca { 50% { opacity: .25 } }
  @keyframes ntvCresce { from { transform: scaleX(0) } }
  @keyframes ntvChuva { from { transform: scaleY(0) } }
  @keyframes ntvPonteiro { from { transform: rotate(-90deg) } }
  @keyframes ntvPulso { 0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,.45) } 60% { box-shadow: 0 0 0 6px rgba(245,158,11,0) } }
  .ntv-sobe { animation: ntvSobe .45s ease both }
  .ntv-fundo { animation: ntvFundo .2s ease both }
  .ntv-folha { animation: ntvFolha .32s cubic-bezier(.2,.9,.25,1) both }
  .ntv-trilho { display: flex; width: max-content; animation: ntvRola linear infinite }
  .ntv-rolo { overflow: hidden; flex: 1; -webkit-mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent); mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent) }
  .ntv-rolo:active .ntv-trilho { animation-play-state: paused }
  .ntv-ao-vivo { animation: ntvPisca 1.4s ease-in-out infinite }
  .ntv-cresce { animation: ntvCresce 1s cubic-bezier(.2,.8,.2,1) both; transform-origin: left }
  .ntv-chuva { animation: ntvChuva .8s ease both; transform-origin: bottom }
  .ntv-ponteiro { transition: transform 1.2s cubic-bezier(.2,1.3,.3,1); animation: ntvPonteiro 1.2s cubic-bezier(.2,1.3,.3,1) both }
  .ntv-pulso { animation: ntvPulso 2s ease-in-out infinite }
  .ntv-sem-barra { scrollbar-width: none } .ntv-sem-barra::-webkit-scrollbar { display: none }
  .ntv-2l { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden }
  .ntv-3l { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden }
  .ntv-foto img { transition: transform .6s cubic-bezier(.2,.8,.2,1) }
  .ntv-toque:active .ntv-foto img { transform: scale(1.05) }
  .ntv-toque { transition: transform .15s, background-color .2s } .ntv-toque:active { transform: scale(.985) }
  @media (prefers-reduced-motion: reduce) {
    .ntv-sobe, .ntv-fundo, .ntv-folha, .ntv-trilho, .ntv-ao-vivo, .ntv-cresce, .ntv-chuva, .ntv-ponteiro, .ntv-pulso { animation: none !important; transition: none !important }
    .ntv-foto img, .ntv-toque { transition: none }
  }
`
