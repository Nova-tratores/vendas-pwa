// Quests (supervisor): tarefas com alvo e itens para os vendedores.
//   Sugeridas  — as que o portal sugeriu por regra (trator sem notícia, revisão
//                chegando, aniversário de entrega, cliente sumido): aprovar
//                escolhendo vendedor/prazo/XP, ou descartar (não volta por 6 meses).
//   Em andamento / Concluídas — acompanhar; ver as respostas (fotos, horímetro,
//                relatos, GPS) e devolver para refazer.
//   Nova quest — manual: escolhe o trator (ou alvo livre), os itens e o vendedor;
//                ou "em lote": escolhe cidades e sai uma quest por trator vendido nelas.
// Grava direto em vendas_quests (RLS: só supervisor ativo). supabase-quests.sql.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/sync'
import { getVendedores, enviarMensagem } from '../lib/supabaseQueries'
import { PORTAL } from '../lib/checklistVeiculo'
import { ITENS_PRONTOS, ROTULO_REGRA, chaveDePergunta, rotuloAlvo, situacaoPrazo } from '../lib/quests'
import { tabelaFaltando, urlFoto } from '../lib/questsLocal'
import { buscarTodas } from '../lib/paginar'
import { cidadeCanonica } from '../lib/cidadesCanon'
import { indexarClientesOmie, cidadeDoTrator, limparCidadeDigitada, tituloQuestTrator } from '../lib/tratoresCidade'

const ABAS = [
  ['sugerida', 'Sugeridas'],
  ['aberta', 'Em andamento'],
  ['concluida', 'Concluídas'],
]
const hojeMais = (dias) => { const d = new Date(); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10) }
const supervisorNome = () => { try { return JSON.parse(localStorage.getItem('supervisor') || '{}').nome || 'Supervisor' } catch { return 'Supervisor' } }
const fmtDia = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '')

export default function SupervisorQuests() {
  const [aba, setAba] = useState('sugerida')
  const [quests, setQuests] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [nova, setNova] = useState(false)
  const [gerando, setGerando] = useState('')

  async function carregar() {
    setCarregando(true)
    const { data, error } = await supabase.from('vendas_quests').select('*')
      .in('status', ['sugerida', 'aberta', 'concluida']).order('created_at', { ascending: false }).limit(500)
    if (error) setErro(tabelaFaltando(error.message) ? 'Quests ainda não estão ativas: falta rodar supabase-quests.sql.' : error.message)
    else { setErro(''); setQuests(data || []) }
    setCarregando(false)
  }
  useEffect(() => { carregar(); getVendedores().then(setVendedores) }, [])

  const nomeVend = useMemo(() => Object.fromEntries(vendedores.map((v) => [v.id, v.nome])), [vendedores])
  const daAba = quests.filter((q) => q.status === aba)
  const conta = (s) => quests.filter((q) => q.status === s).length

  async function gerarAgora() {
    setGerando('Procurando…')
    try {
      const { data } = await supabase.auth.getSession()
      const res = await fetch(`${PORTAL}/api/crm-vendas/quests/sugerir`, {
        method: 'POST', headers: { Authorization: `Bearer ${data?.session?.access_token}`, 'Content-Type': 'application/json' }, body: '{}',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `Falha (${res.status})`)
      setGerando(j.criadas ? `${j.criadas} sugestão(ões) nova(s).` : 'Nenhuma sugestão nova agora.')
      carregar()
    } catch (e) {
      setGerando(`Não foi possível: ${e.message}`)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h2 className="text-xl font-bold flex-1">Quests</h2>
        <button type="button" onClick={gerarAgora} className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold">Gerar sugestões agora</button>
        <button type="button" onClick={() => setNova(true)} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold">+ Nova quest</button>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Tarefas com alvo para o vendedor trazer da visita (horímetro, fotos, relatos). As sugeridas chegam todo dia às 06:30 (até 10 por dia) e só vão ao vendedor depois que você aprova.
        {gerando && <b className="text-slate-700"> {gerando}</b>}
      </p>
      {erro && <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 mb-3">{erro}</p>}

      <div className="flex gap-1 mb-3 border-b border-slate-200">
        {ABAS.map(([k, rot]) => (
          <button key={k} type="button" onClick={() => setAba(k)}
            className={`px-3 py-2 text-sm font-semibold -mb-px border-b-2 ${aba === k ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>
            {rot} <span className="text-xs text-slate-400">({conta(k)})</span>
          </button>
        ))}
      </div>

      {carregando && <p className="text-sm text-slate-400">Carregando…</p>}
      {!carregando && !daAba.length && !erro && <p className="text-sm text-slate-500">Nada aqui.</p>}
      <div className="space-y-3">
        {daAba.map((q) => (
          aba === 'sugerida'
            ? <CartaoSugerida key={q.id} q={q} vendedores={vendedores} onFeito={carregar} />
            : <CartaoAndamento key={q.id} q={q} nomeVend={nomeVend} onFeito={carregar} />
        ))}
      </div>

      {nova && <NovaQuest vendedores={vendedores} quests={quests} onFechar={() => setNova(false)} onCriada={() => { setNova(false); setAba('aberta'); carregar() }} />}
    </div>
  )
}

function ListaItens({ itens }) {
  return (
    <ul className="text-xs text-slate-600 mt-1 list-disc pl-4">
      {(itens || []).map((i) => <li key={i.chave}>{i.rotulo}{i.obrigatorio ? '' : ' (opcional)'}</li>)}
    </ul>
  )
}

async function avisarVendedor(q, vendedorId) {
  try {
    await enviarMensagem({
      vendedorId, titulo: 'Nova quest', corpo: `${q.titulo} — +${q.xp} XP${q.prazo ? `, até ${fmtDia(q.prazo)}` : ''}.`,
      autorNome: supervisorNome(), link: `/quests/${q.id}`,
    })
  } catch { /* o aviso é extra: a quest já aparece no Início do vendedor */ }
}

function CartaoSugerida({ q, vendedores, onFeito }) {
  const [vend, setVend] = useState(q.vendedor_sugerido_id ? String(q.vendedor_sugerido_id) : '')
  const [prazo, setPrazo] = useState(hojeMais(14))
  const [xp, setXp] = useState(q.xp)
  const [salvando, setSalvando] = useState(false)

  async function aprovar() {
    if (!vend) { alert('Escolha o vendedor.'); return }
    setSalvando(true)
    const mudanca = { status: 'aberta', vendedor_id: Number(vend), prazo, xp: Number(xp) || 0, aprovado_por: supervisorNome(), aprovado_em: new Date().toISOString(), updated_at: new Date().toISOString() }
    const { error } = await supabase.from('vendas_quests').update(mudanca).eq('id', q.id).eq('status', 'sugerida')
    setSalvando(false)
    if (error) { alert(error.message); return }
    await avisarVendedor({ ...q, ...mudanca }, Number(vend))
    onFeito()
  }
  async function descartar() {
    const motivo = prompt('Por que descartar? (não volta a ser sugerida por 6 meses)')
    if (motivo === null) return
    const { error } = await supabase.from('vendas_quests').update({ status: 'descartada', nota_supervisor: motivo || null, updated_at: new Date().toISOString() }).eq('id', q.id)
    if (error) alert(error.message); else onFeito()
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-xs font-bold text-amber-600">{ROTULO_REGRA[q.regra] || 'Sugestão'}</p>
      <p className="font-bold">{q.titulo}</p>
      <p className="text-xs text-slate-500">{rotuloAlvo(q)}</p>
      {q.motivo && <p className="text-sm text-slate-700 mt-1">{q.motivo}</p>}
      <ListaItens itens={q.itens} />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 mt-3 items-end">
        <label className="text-xs text-slate-500">Vendedor
          <select value={vend} onChange={(e) => setVend(e.target.value)} className="block w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white text-slate-800">
            <option value="">Escolher…</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}{String(v.id) === String(q.vendedor_sugerido_id) ? ' (atende a cidade)' : ''}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500">Prazo
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="block border border-slate-300 rounded-lg px-2 py-2 text-sm text-slate-800" />
        </label>
        <label className="text-xs text-slate-500">XP
          <input type="number" min="0" max="500" value={xp} onChange={(e) => setXp(e.target.value)} className="block w-20 border border-slate-300 rounded-lg px-2 py-2 text-sm text-slate-800" />
        </label>
        <button type="button" disabled={salvando} onClick={aprovar} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm font-bold">Aprovar e enviar</button>
        <button type="button" onClick={descartar} className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-600">Descartar</button>
      </div>
    </div>
  )
}

function CartaoAndamento({ q, nomeVend, onFeito }) {
  const [aberto, setAberto] = useState(false)
  const [resposta, setResposta] = useState(null)
  const [urls, setUrls] = useState({})
  const prazo = situacaoPrazo(q.prazo)

  async function abrir() {
    setAberto((a) => !a)
    if (resposta || q.status !== 'concluida') return
    const { data } = await supabase.from('vendas_quest_respostas').select('*').eq('quest_id', q.id).maybeSingle()
    setResposta(data || {})
    const fotos = Object.values(data?.respostas || {}).filter(Array.isArray).flat()
    const pares = await Promise.all(fotos.map(async (c) => [c, await urlFoto(c).catch(() => null)]))
    setUrls(Object.fromEntries(pares))
  }
  async function devolver() {
    const motivo = prompt('O que o vendedor precisa refazer?')
    if (!motivo) return
    const { error } = await supabase.from('vendas_quests').update({ status: 'aberta', concluida_em: null, nota_supervisor: motivo, updated_at: new Date().toISOString() }).eq('id', q.id)
    if (error) { alert(error.message); return }
    try { await enviarMensagem({ vendedorId: q.vendedor_id, titulo: 'Quest devolvida', corpo: `${q.titulo}: ${motivo}`, autorNome: supervisorNome(), link: `/quests/${q.id}` }) } catch { /* aviso extra */ }
    onFeito()
  }
  async function cancelar() {
    if (!confirm(`Cancelar a quest "${q.titulo}"? O vendedor deixa de ver.`)) return
    const { error } = await supabase.from('vendas_quests').update({ status: 'cancelada', updated_at: new Date().toISOString() }).eq('id', q.id)
    if (error) alert(error.message); else onFeito()
  }

  const r = resposta?.respostas || {}
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-600">{q.regra ? ROTULO_REGRA[q.regra] : 'Manual'} · +{q.xp} XP</p>
          <p className="font-bold">{q.titulo}</p>
          <p className="text-xs text-slate-500">{rotuloAlvo(q)}</p>
          <p className="text-xs mt-1">
            <b>{nomeVend[q.vendedor_id] || '—'}</b>
            {q.status === 'aberta' && prazo && <span className={prazo.atrasada ? ' text-red-600 font-semibold' : ' text-slate-500'}> · {prazo.texto}</span>}
            {q.status === 'concluida' && <span className="text-green-700"> · concluída em {fmtDia(q.concluida_em)}</span>}
            {q.status === 'aberta' && q.nota_supervisor && <span className="text-amber-700"> · devolvida: {q.nota_supervisor}</span>}
          </p>
        </div>
        <button type="button" onClick={abrir} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold">{aberto ? 'Fechar' : q.status === 'concluida' ? 'Ver respostas' : 'Detalhes'}</button>
      </div>
      {aberto && (
        <div className="mt-3 border-t border-slate-100 pt-3 space-y-2 text-sm">
          {q.status !== 'concluida' && <ListaItens itens={q.itens} />}
          {q.status === 'concluida' && !resposta && <p className="text-xs text-slate-400">Carregando…</p>}
          {q.status === 'concluida' && resposta && (q.itens || []).map((it) => (
            <div key={it.chave}>
              <p className="text-xs font-bold text-slate-500">{it.rotulo}</p>
              {it.tipo === 'fotos'
                ? <div className="flex flex-wrap gap-2 mt-1">{(r[it.chave] || []).map((c) => urls[c]
                    ? <a key={c} href={urls[c]} target="_blank" rel="noreferrer"><img src={urls[c]} alt="" className="w-28 h-28 object-cover rounded-lg" /></a>
                    : <span key={c} className="text-xs text-slate-400">foto</span>)}</div>
                : <p className="whitespace-pre-line">{r[it.chave] === true ? 'Sim' : r[it.chave] === false ? 'Não' : (r[it.chave] ?? '—')}</p>}
            </div>
          ))}
          {resposta?.lat != null && (
            <a className="text-xs text-blue-700 underline" href={`https://www.google.com/maps?q=${resposta.lat},${resposta.lng}`} target="_blank" rel="noreferrer">Local onde respondeu ↗</a>
          )}
          <div className="flex gap-2 pt-1">
            {q.status === 'concluida' && <button type="button" onClick={devolver} className="px-3 py-1.5 rounded-lg border border-amber-400 text-amber-800 text-xs font-semibold">Devolver para refazer</button>}
            {q.status === 'aberta' && <button type="button" onClick={cancelar} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs">Cancelar quest</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// cache da tabela de tratores vendidos (310 linhas) enquanto a tela está aberta.
// Cada trator ganha `cid`: a cidade do cliente no Omie quando ele é achado (a
// digitada no controle erra muito), senão a digitada (lib/tratoresCidade).
let cacheTratores = null
async function tratoresVendidos() {
  if (cacheTratores) return cacheTratores
  const [{ data }, omie] = await Promise.all([
    supabase.from('tratores').select('Chassis, Modelo, Cliente, Cidade, Entrega').not('Chassis', 'is', null).limit(2000),
    buscarTodas(() => supabase.from('Clientes_Omie').select('nome, cidade').order('id')).catch(() => []),
  ])
  const clientes = indexarClientesOmie(omie)
  cacheTratores = (data || []).map((t) => ({ ...t, Modelo: String(t.Modelo ?? '').replace(/\.0$/, ''), cid: cidadeDoTrator(t, clientes) }))
  return cacheTratores
}
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const nomeCidade = (c) => (c?.nome ? `${c.nome}${c.uf ? ` (${c.uf})` : ''}` : '—')

// "Carlópolis (PR)" e, quando veio do Omie e o controle diz outra coisa, a digitada em cinza
function CidadeTrator({ t }) {
  const outra = t.cid.origem === 'omie' && t.cid.digitada && cidadeCanonica(limparCidadeDigitada(t.cid.digitada)).chave !== t.cid.chave
  return (
    <>
      {nomeCidade(t.cid)}
      {outra && <span className="text-xs text-slate-400" title="cidade do cliente no Omie; no controle de revisões está outra"> (controle: {t.cid.digitada})</span>}
    </>
  )
}

function NovaQuest({ vendedores, quests, onFechar, onCriada }) {
  const [modo, setModo] = useState('um') // 'um' trator | 'lote' por cidade
  const [busca, setBusca] = useState('')
  const [tratores, setTratores] = useState([])
  const [carregandoTratores, setCarregandoTratores] = useState(true)
  const [trator, setTrator] = useState(null)
  const [buscaCidade, setBuscaCidade] = useState('')
  const [cidadesSel, setCidadesSel] = useState([]) // chaves de cidadeCanonica
  const [fora, setFora] = useState(() => new Set()) // chassis desmarcados no lote
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [itens, setItens] = useState(() => ITENS_PRONTOS.slice(0, 4).map((i) => ({ ...i })))
  const [pergunta, setPergunta] = useState('')
  const [vend, setVend] = useState('')
  const [prazo, setPrazo] = useState(hojeMais(14))
  const [xp, setXp] = useState(50)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { tratoresVendidos().then(setTratores).finally(() => setCarregandoTratores(false)) }, [])
  // busca acha pela cidade do Omie E pela digitada no controle
  const achados = useMemo(() => {
    const q = semAcento(busca.trim())
    if (q.length < 2) return []
    return tratores.filter((t) => semAcento(`${t.Chassis} ${t.Cliente} ${t.Cidade} ${t.cid.nome} ${t.Modelo}`).includes(q)).slice(0, 8)
  }, [busca, tratores])

  // ----- lote -----
  // chassi que já tem quest sugerida/em andamento: entra desmarcado no lote
  const comQuest = useMemo(() => new Set((quests || []).filter((q) => q.chassis && (q.status === 'aberta' || q.status === 'sugerida')).map((q) => q.chassis)), [quests])
  const cidades = useMemo(() => {
    const m = new Map()
    for (const t of tratores) {
      if (!t.cid.chave) continue
      const g = m.get(t.cid.chave) || { chave: t.cid.chave, nome: t.cid.nome, uf: t.cid.uf, total: 0 }
      g.total++
      m.set(t.cid.chave, g)
    }
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [tratores])
  const cidadesAchadas = useMemo(() => {
    const q = semAcento(buscaCidade.trim())
    if (!q) return []
    return cidades.filter((c) => !cidadesSel.includes(c.chave) && semAcento(c.nome).includes(q)).slice(0, 8)
  }, [buscaCidade, cidades, cidadesSel])
  const doLote = useMemo(() => tratores.filter((t) => cidadesSel.includes(t.cid.chave))
    .sort((a, b) => a.cid.nome.localeCompare(b.cid.nome, 'pt-BR') || String(a.Cliente).localeCompare(String(b.Cliente), 'pt-BR')), [tratores, cidadesSel])
  const marcado = (t) => !fora.has(t.Chassis)
  const marcados = doLote.filter(marcado)
  const addCidade = (c) => {
    setCidadesSel((l) => [...l, c.chave]); setBuscaCidade('')
    // quem já tem quest aberta começa desmarcado
    setFora((f) => { const n = new Set(f); tratores.forEach((t) => { if (t.cid.chave === c.chave && comQuest.has(t.Chassis)) n.add(t.Chassis) }); return n })
  }
  const alternarTrator = (t) => setFora((f) => { const n = new Set(f); if (n.has(t.Chassis)) n.delete(t.Chassis); else n.add(t.Chassis); return n })

  const escolher = (t) => {
    setTrator(t); setBusca('')
    if (!titulo) setTitulo(tituloQuestTrator(t))
  }
  const alternar = (pronto) => setItens((lista) => (lista.some((i) => i.chave === pronto.chave) ? lista.filter((i) => i.chave !== pronto.chave) : [...lista, { ...pronto }]))
  const mudarItem = (chave, campo, valor) => setItens((lista) => lista.map((i) => (i.chave === chave ? { ...i, [campo]: valor } : i)))
  const addPergunta = () => {
    if (!pergunta.trim()) return
    setItens((lista) => [...lista, { chave: chaveDePergunta(pergunta, lista.map((i) => i.chave)), tipo: 'texto', rotulo: pergunta.trim(), obrigatorio: true }])
    setPergunta('')
  }

  const comum = () => ({
    descricao: descricao.trim() || null, origem: 'manual',
    itens, xp: Number(xp) || 0, vendedor_id: Number(vend), prazo: prazo || null, status: 'aberta',
    criado_por: supervisorNome(), aprovado_por: supervisorNome(), aprovado_em: new Date().toISOString(),
  })
  const doTrator = (t) => ({ alvo_tipo: 'trator', chassis: t.Chassis, modelo: t.Modelo || null, cliente_nome: t.Cliente || null, cidade: t.cid.nome || t.Cidade || null })

  async function criar() {
    if (modo === 'lote') return criarLote()
    if (!titulo.trim()) { alert('Dê um título para a quest.'); return }
    if (!itens.length) { alert('Escolha pelo menos um item.'); return }
    if (!vend) { alert('Escolha o vendedor.'); return }
    setSalvando(true)
    const linha = {
      titulo: titulo.trim(), ...comum(),
      ...(trator ? doTrator(trator) : { alvo_tipo: 'livre', chassis: null, modelo: null, cliente_nome: null, cidade: null }),
    }
    const { data, error } = await supabase.from('vendas_quests').insert(linha).select('id').single()
    setSalvando(false)
    if (error) { alert('Não foi possível criar: ' + error.message); return }
    await avisarVendedor({ ...linha, id: data.id }, Number(vend))
    onCriada()
  }

  // uma quest por trator marcado, todas de uma vez; o vendedor recebe UM aviso só
  async function criarLote() {
    if (!marcados.length) { alert('Escolha a cidade e deixe pelo menos um trator marcado.'); return }
    if (!itens.length) { alert('Escolha pelo menos um item.'); return }
    if (!vend) { alert('Escolha o vendedor.'); return }
    const nomeV = vendedores.find((v) => String(v.id) === String(vend))?.nome || 'o vendedor'
    if (!confirm(`Criar ${marcados.length} quest(s) para ${nomeV}, uma por trator?`)) return
    setSalvando(true)
    const base = comum()
    const linhas = marcados.map((t) => ({ titulo: tituloQuestTrator(t), ...base, ...doTrator(t) }))
    const { error } = await supabase.from('vendas_quests').insert(linhas)
    setSalvando(false)
    if (error) { alert('Não foi possível criar: ' + error.message); return }
    const nomesCid = [...new Set(marcados.map((t) => t.cid.nome))]
    try {
      await enviarMensagem({
        vendedorId: Number(vend), titulo: `${linhas.length} quests novas`,
        corpo: `Visitar tratores vendidos em ${nomesCid.join(', ')} — +${base.xp} XP cada${base.prazo ? `, até ${fmtDia(base.prazo)}` : ''}.`,
        autorNome: supervisorNome(), link: '/quests',
      })
    } catch { /* o aviso é extra: as quests já aparecem no Início do vendedor */ }
    onCriada()
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/40 flex items-start justify-center overflow-y-auto p-3">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-4 space-y-3 my-6 text-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Nova quest</h3>
          <button type="button" onClick={onFechar} className="text-slate-400 text-xl leading-none">×</button>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 text-sm">
          {[['um', 'Um trator'], ['lote', 'Em lote por cidade']].map(([k, rot]) => (
            <button key={k} type="button" onClick={() => setModo(k)}
              className={`flex-1 px-3 py-1.5 rounded-md font-semibold ${modo === k ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>{rot}</button>
          ))}
        </div>

        {modo === 'um' ? (
          <>
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">Trator (opcional)</p>
              {trator ? (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 text-sm">
                  <span className="flex-1">{trator.Modelo} …{String(trator.Chassis).slice(-6)} · {trator.Cliente} · <CidadeTrator t={trator} /></span>
                  <button type="button" onClick={() => setTrator(null)} className="text-xs text-blue-700">trocar</button>
                </div>
              ) : (
                <>
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por chassi, cliente ou cidade (ex.: Carlópolis)"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  {achados.map((t) => (
                    <button key={t.Chassis} type="button" onClick={() => escolher(t)} className="block w-full text-left text-sm px-2 py-1.5 hover:bg-slate-50 rounded">
                      <b>{t.Modelo} …{String(t.Chassis).slice(-6)}</b> · {t.Cliente} · <CidadeTrator t={t} />
                    </button>
                  ))}
                </>
              )}
            </div>

            <label className="block text-xs font-bold text-slate-500">Título
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-normal text-slate-800" />
            </label>
          </>
        ) : (
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">Cidades</p>
            <div className="flex flex-wrap gap-1 mb-1">
              {cidadesSel.map((ch) => {
                const c = cidades.find((x) => x.chave === ch)
                return (
                  <span key={ch} className="inline-flex items-center gap-1 bg-slate-900 text-white rounded-full px-2.5 py-1 text-xs font-semibold">
                    {nomeCidade(c)} · {c?.total}
                    <button type="button" onClick={() => setCidadesSel((l) => l.filter((x) => x !== ch))} className="text-slate-300 leading-none" title="tirar">×</button>
                  </span>
                )
              })}
            </div>
            <input value={buscaCidade} onChange={(e) => setBuscaCidade(e.target.value)} placeholder={carregandoTratores ? 'Carregando tratores…' : 'Digite a cidade (ex.: Fartura)'}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            {cidadesAchadas.map((c) => (
              <button key={c.chave} type="button" onClick={() => addCidade(c)} className="block w-full text-left text-sm px-2 py-1.5 hover:bg-slate-50 rounded">
                <b>{nomeCidade(c)}</b> · {c.total} trator{c.total === 1 ? '' : 'es'}
              </button>
            ))}
            <p className="text-xs text-slate-500 mt-1">Cidade do cliente no Omie quando ele é achado; senão, a do controle de revisões.</p>

            {doLote.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 px-2 py-1.5 border-b border-slate-100 text-xs text-slate-500">
                  <span className="flex-1"><b className="text-slate-800">{marcados.length}</b> de {doLote.length} marcados — uma quest por trator</span>
                  <button type="button" onClick={() => setFora(new Set())} className="text-blue-700">marcar todos</button>
                  <button type="button" onClick={() => setFora(new Set(doLote.map((t) => t.Chassis)))} className="text-blue-700">desmarcar</button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {doLote.map((t) => (
                    <label key={t.Chassis} className="flex items-start gap-2 px-2 py-1.5 text-sm hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" className="mt-1" checked={marcado(t)} onChange={() => alternarTrator(t)} />
                      <span className="flex-1 min-w-0">
                        <b>{t.Cliente}</b> · {t.Modelo} …{String(t.Chassis).slice(-6)}
                        <span className="block text-xs text-slate-500"><CidadeTrator t={t} />{t.Entrega ? ` · entrega ${t.Entrega}` : ''}</span>
                        {comQuest.has(t.Chassis) && <span className="block text-xs text-amber-700 font-semibold">já tem quest em andamento</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2">Título de cada uma: "Visitar &lt;modelo&gt; …&lt;chassi&gt; — &lt;cliente&gt;". O resto abaixo vale para todas.</p>
          </div>
        )}
        <label className="block text-xs font-bold text-slate-500">Orientação para o vendedor (opcional)
          <textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-normal text-slate-800" />
        </label>

        <div>
          <p className="text-xs font-bold text-slate-500 mb-1">O que trazer</p>
          {ITENS_PRONTOS.map((p) => {
            const it = itens.find((i) => i.chave === p.chave)
            return (
              <div key={p.chave} className="flex flex-wrap items-center gap-2 text-sm py-1">
                <label className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <input type="checkbox" checked={!!it} onChange={() => alternar(p)} />{p.rotulo}
                </label>
                {it && it.tipo === 'fotos' && (
                  <label className="text-xs text-slate-500">mín. <input type="number" min="1" max="10" value={it.min || 1} onChange={(e) => mudarItem(p.chave, 'min', Number(e.target.value) || 1)} className="w-14 border border-slate-300 rounded px-1 py-0.5" /></label>
                )}
                {it && <label className="text-xs text-slate-500 flex items-center gap-1"><input type="checkbox" checked={it.obrigatorio} onChange={(e) => mudarItem(p.chave, 'obrigatorio', e.target.checked)} />obrigatório</label>}
              </div>
            )
          })}
          {itens.filter((i) => !ITENS_PRONTOS.some((p) => p.chave === i.chave)).map((i) => (
            <div key={i.chave} className="flex items-center gap-2 text-sm py-1">
              <span className="flex-1">{i.rotulo}</span>
              <label className="text-xs text-slate-500 flex items-center gap-1"><input type="checkbox" checked={i.obrigatorio} onChange={(e) => mudarItem(i.chave, 'obrigatorio', e.target.checked)} />obrigatório</label>
              <button type="button" onClick={() => setItens((l) => l.filter((x) => x.chave !== i.chave))} className="text-xs text-red-600">tirar</button>
            </div>
          ))}
          <div className="flex gap-2 mt-1">
            <input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Outra pergunta (resposta em texto)"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
            <button type="button" onClick={addPergunta} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm">Incluir</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="text-xs font-bold text-slate-500">Vendedor
            <select value={vend} onChange={(e) => setVend(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white font-normal text-slate-800">
              <option value="">Escolher…</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">Prazo
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-2 text-sm font-normal text-slate-800" />
          </label>
          <label className="text-xs font-bold text-slate-500">XP
            <input type="number" min="0" max="500" value={xp} onChange={(e) => setXp(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-2 text-sm font-normal text-slate-800" />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onFechar} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">Cancelar</button>
          <button type="button" disabled={salvando} onClick={criar} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold">{salvando ? 'Criando…' : modo === 'lote' ? `Criar ${marcados.length} quest${marcados.length === 1 ? '' : 's'} e enviar` : 'Criar e enviar ao vendedor'}</button>
        </div>
      </div>
    </div>
  )
}
