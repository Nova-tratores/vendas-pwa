// Formato único de "cartão de oportunidade" para o feed, a lista e o Um por vez:
// vem de um ClienteIV (todas as oportunidades) ou de um ItemFeed (feed do vendedor).
//   { chave, titulo, sub, cor, tipo, icone, porque:[{cor,titulo,texto,icone}], oferecer,
//     score|null, selo, telefone, clienteId, lat, lng, fatos:[{t,v}] }
import { ICONE_REGRA, REGRAS } from '../../../lib/iv/fonte'
import { dataBR, reais, tipoDe } from './comum'

export const TIPO_FEED = {
  carteira: { rotulo: 'Carteira', frase: 'vender de novo ou vender mais', cor: '#ea580c', icone: 'Handshake' },
  recuperar: { rotulo: 'Recuperar', frase: 'não deixar esfriar', cor: '#0891b2', icone: 'RotateCcw' },
  novos: { rotulo: 'Novos', frase: 'propriedade sem cliente nosso', cor: '#7c3aed', icone: 'Sprout' },
}

export function deCliente(c) {
  const q = tipoDe(c)
  const o = c.oportunidades[0]
  return {
    chave: c.chave, titulo: c.nome, sub: [c.cidade, c.vendedor ? `vend. ${c.vendedor.split(' ')[0]}` : ''].filter(Boolean).join(' · '),
    cor: q.cor, tipo: q.nome, icone: ICONE_REGRA[o?.regra] || 'Target',
    porque: c.oportunidades.map((x) => ({ cor: REGRAS[x.regra].cor, titulo: x.titulo, texto: x.porque, icone: ICONE_REGRA[x.regra], rotulo: REGRAS[x.regra].rotulo })),
    oferecer: o?.oferecer || '', score: c.score, selo: null, telefone: c.telefone, clienteId: c.id || c.chave,
    lat: c.local?.[0], lng: c.local?.[1],
    fatos: [
      { t: 'Último trator', v: c.ultimoTrator ? `${c.ultimoTrator.modelo} · ${c.anosUltimoTrator ? `${c.anosUltimoTrator} ${c.anosUltimoTrator === 1 ? 'ano' : 'anos'}` : 'este ano'}` : 'nenhum conosco' },
      { t: 'Peças 12 meses', v: reais(c.pecas12m) },
      { t: 'Propostas abertas', v: c.propostasAbertas ? `${c.propostasAbertas} · ${reais(c.valorPropostasAbertas)}` : 'nenhuma' },
      { t: 'Última visita', v: dataBR(c.ultimaVisita) },
    ],
  }
}

export function deFeed(f) {
  const t = TIPO_FEED[f.tipo] || TIPO_FEED.carteira
  const [titulo, ...resto] = String(f.porque || '').split(/\.\s+/)
  return {
    chave: f.id, titulo: f.titulo, sub: f.sub || f.cidade, cor: t.cor, tipo: t.rotulo, icone: t.icone,
    porque: [{ cor: t.cor, titulo: resto.length ? `${titulo}.` : f.porque, texto: resto.join('. '), icone: t.icone }],
    oferecer: f.acao, score: null, selo: f.selo, peso: f.peso, telefone: f.telefone, clienteId: f.clienteId, lat: f.lat, lng: f.lng, aprox: f.aprox,
    fatos: [{ t: 'Cidade', v: f.cidade || '—' }, { t: f.tipo === 'novos' ? 'Área' : f.tipo === 'recuperar' ? 'Valor' : 'Nota', v: f.selo || '—' }],
  }
}

/**
 * "Para mim hoje": separa a reserva do vendedor nos 3 grupos pela mistura do perfil
 * (ex.: 60% carteira, 25% recuperar, 15% novos) e intercala, do mais forte ao mais fraco.
 */
export function montarDia(itens, mix, total = 15) {
  const grupos = Object.fromEntries(Object.keys(TIPO_FEED).map((k) => [k, itens.filter((i) => i.tipo === k).sort((a, b) => b.peso - a.peso)]))
  const cota = {}
  let usados = 0
  for (const k of Object.keys(TIPO_FEED)) { cota[k] = Math.min(grupos[k].length, Math.round((mix?.[k] || 0) * total)); usados += cota[k] }
  // sobra (grupo sem itens suficientes) vai para quem tem
  for (const k of Object.keys(TIPO_FEED)) while (usados < total && cota[k] < grupos[k].length) { cota[k]++; usados++ }
  const out = []
  const pos = Object.fromEntries(Object.keys(cota).map((k) => [k, 0]))
  while (out.length < usados) {
    // escolhe o grupo mais "atrasado" em relação à sua cota
    const k = Object.keys(cota).filter((x) => pos[x] < cota[x]).sort((a, b) => pos[a] / cota[a] - pos[b] / cota[b])[0]
    if (!k) break
    out.push(grupos[k][pos[k]++])
  }
  return out
}
