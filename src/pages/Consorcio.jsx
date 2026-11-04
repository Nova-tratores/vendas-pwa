// =============================================================================
// /consorcio — Consórcio Mahindra (José, 04/11/2026).
// Lê a planilha de cotas da administradora da tabela consorcio_planilhas do
// Supabase do portal (supabase-consorcio.sql; só vendedor ativo/supervisor
// logado). O repositório é público: a planilha NUNCA entra no código. A última
// lida fica no aparelho para abrir sem internet. Mostra:
//   Radar     — o que fazer com cada cliente e por quê (atraso, pronto para lance,
//               cliente grande, cota quitada, trator já entregue, outra concessionária)
//   Cotas     — todas as cotas com busca, filtros e a ficha de cada uma
//   Clientes  — cotas somadas por consorciado
//   Grupos    — andamento do grupo, lance que costuma ganhar e lances que já ganharam
//   Simular   — carta, parcela e lance (30%, 40% ou livre) para mandar ao produtor
//   Como funciona — as regras do site (/credito) em linguagem de balcão
// As contas ficam em lib/consorcio.js.
// =============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, BadgeCheck, Building2, Calendar, ChevronRight, Crown, FileUp, Gavel, Info, MessageCircle, MapPin,
  Search, Sparkles, Tractor, Users, Wallet,
} from 'lucide-react'
import { supabase } from '../lib/sync'
import {
  LANCES_FIXOS, PRAZO_MESES, TAXA_TOTAL, dataCurta, ehDoVendedor, lerPlanilha, modelosDaPlanilha, porCliente, porGrupo,
  radar, resumo, simular, tempo,
} from '../lib/consorcio'
import { Barra, Cartao, Chip, Chips, ComoLer, Conta, EstilosIVF, Folha, Selo, brl, num, reais, textoNorm } from '../components/iv/ferramentas/kit'
import { Regua, Segmentos } from '../components/iv/ferramentas/campos'

const CHAVE_PLANILHA = 'consorcio-planilha'
const CHAVE_ESCOPO = 'consorcio-escopo'

const STATUS = {
  aguardando: { nome: 'Aguardando', cor: '#d97706' },
  contemplada: { nome: 'Contemplada', cor: '#16a34a' },
  quitada: { nome: 'Quitada', cor: '#0f766e' },
}
const TIPOS = {
  atraso: { nome: 'Em atraso', icone: AlertTriangle, cor: '#dc2626' },
  vip: { nome: 'Cliente grande', icone: Crown, cor: '#7c3aed' },
  lance: { nome: 'Pronto p/ lance', icone: Gavel, cor: '#d97706' },
  quitada: { nome: 'Quitadas', icone: BadgeCheck, cor: '#0f766e' },
  pos: { nome: 'Já com o trator', icone: Tractor, cor: '#16a34a' },
  outra: { nome: 'Outra concessionária', icone: Building2, cor: '#475569' },
}
const PRIORIDADE = { 1: 'Hoje', 2: 'Esta semana', 3: 'Quando passar perto' }
const ABAS = [
  ['radar', 'Radar'], ['cotas', 'Cotas'], ['clientes', 'Clientes'], ['grupos', 'Grupos'], ['simular', 'Simular'], ['regras', 'Como funciona'],
]

const lerJson = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }
const salvarJson = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)) } catch { /* sem storage */ } }
const primeiroNome = (n) => {
  const p = String(n || '').trim().split(/\s+/)[0] || ''
  return p.charAt(0) + p.slice(1).toLowerCase()
}
const linkWhats = (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`

// ── dados ────────────────────────────────────────────────────────────────────
function usePlanilha() {
  const [planilha, setPlanilha] = useState(() => lerJson(CHAVE_PLANILHA)) // { texto, nome, em }
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  useEffect(() => {
    let vivo = true
    supabase.from('consorcio_planilhas').select('nome, texto, criado_em').order('criado_em', { ascending: false }).limit(1).maybeSingle()
      .then(({ data, error }) => {
        if (!vivo) return
        if (error) setErro(error.message)
        else if (data) {
          const v = { texto: data.texto, nome: data.nome, em: data.criado_em }
          salvarJson(CHAVE_PLANILHA, v); setPlanilha(v)
        }
      })
      .catch((e) => vivo && setErro(String(e?.message || e)))
      .finally(() => vivo && setCarregando(false))
    return () => { vivo = false }
  }, [])
  const lida = useMemo(() => (planilha?.texto ? lerPlanilha(planilha.texto) : { cotas: [], avisos: [] }), [planilha])
  return {
    ...lida,
    carregando,
    erro,
    origem: planilha ? { nome: planilha.nome, em: planilha.em } : null,
    importar: async (texto, nome) => {
      const r = lerPlanilha(texto)
      if (!r.cotas.length) return r.avisos[0] || 'Não achei cotas nessa planilha.'
      const { data, error } = await supabase.from('consorcio_planilhas').insert({ nome, texto }).select('criado_em').single()
      if (error) return `Não consegui gravar no banco: ${error.message}`
      const v = { texto, nome, em: data.criado_em }
      salvarJson(CHAVE_PLANILHA, v); setPlanilha(v)
      return null
    },
  }
}

export default function Consorcio() {
  const [sp, setSp] = useSearchParams()
  const aba = ABAS.some(([k]) => k === sp.get('aba')) ? sp.get('aba') : 'radar'
  const irPara = (k, extra = {}) => setSp({ aba: k, ...extra }, { replace: true })
  const vendedor = useMemo(() => lerJson('vendedor') || {}, [])
  const { cotas: todas, avisos, origem, importar, carregando, erro } = usePlanilha()
  const minhas = useMemo(() => todas.filter((c) => ehDoVendedor(c, vendedor.nome)), [todas, vendedor.nome])
  const [escopo, setEscopo] = useState(() => lerJson(CHAVE_ESCOPO) || (minhas.length ? 'minhas' : 'todas'))
  useEffect(() => salvarJson(CHAVE_ESCOPO, escopo), [escopo])
  const cotas = escopo === 'minhas' ? minhas : todas
  const [aberta, setAberta] = useState(null)

  return (
    <div className="-mx-4 -mt-4">
      <EstilosIVF />
      <Topo
        cotas={cotas} escopo={escopo} setEscopo={setEscopo} nMinhas={minhas.length} nTodas={todas.length}
        origem={origem} importar={importar}
      />
      <nav className="flex items-end gap-1 px-3 pt-2 overflow-x-auto whitespace-nowrap bg-[#7f1d1d]" style={{ scrollbarWidth: 'none' }} aria-label="Consórcio">
        {ABAS.map(([k, nome]) => (
          <button key={k} type="button" onClick={() => irPara(k)}
            className={`px-3.5 py-2 text-[13px] rounded-t-[10px] transition ${aba === k ? 'bg-[#f8fafc] text-[#111111] font-bold shadow-[0_-2px_6px_rgba(0,0,0,0.15)]' : 'bg-white/15 text-white font-medium'}`}>
            {nome}
          </button>
        ))}
      </nav>
      <div className="px-4 pt-4 pb-8 bg-[#f8fafc] min-h-[60vh]">
        {erro && (
          <div className="mb-3 text-[13px] bg-red-50 border border-red-200 text-red-800 rounded-xl px-3 py-2">
            Não consegui buscar a planilha no Portal ({erro}).{origem ? ' Mostrando a última que este aparelho guardou.' : ''}
          </div>
        )}
        {!origem && carregando && <p className="py-16 text-center text-sm text-slate-400">Buscando as cotas no Portal…</p>}
        {!origem && !carregando && !erro && (
          <div className="py-12 text-center text-[13.5px] text-slate-500">
            Ainda não tem planilha de cotas no Portal.<br />Toque em <b>Atualizar planilha</b> lá em cima e escolha o CSV da administradora.
          </div>
        )}
        {origem && escopo === 'minhas' && !cotas.length && (
          <div className="mb-3 text-[13px] bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2">
            Nenhuma cota da planilha está no seu nome. Toque em <b>Todas</b> lá em cima para ver a carteira inteira.
          </div>
        )}
        {origem && <>
        {aba === 'radar' && <Radar cotas={cotas} abrir={setAberta} vendedor={vendedor} />}
        {aba === 'cotas' && <ListaCotas cotas={cotas} abrir={setAberta} avisos={avisos} />}
        {aba === 'clientes' && <ListaClientes cotas={cotas} abrir={setAberta} />}
        {aba === 'grupos' && <Grupos cotas={cotas} todas={todas} abrir={setAberta} />}
        {aba === 'simular' && <Simulador todas={todas} vendedor={vendedor} modeloInicial={sp.get('modelo')} />}
        </>}
        {aba === 'regras' && <Regras />}
      </div>
      {aberta && (
        <FichaCota cota={aberta} vendedor={vendedor} onFechar={() => setAberta(null)}
          onSimular={(c) => { setAberta(null); irPara('simular', { modelo: textoNorm(c.bem).replace(/\s+/g, ' ') }) }} />
      )}
    </div>
  )
}

// ── topo ─────────────────────────────────────────────────────────────────────
function Topo({ cotas, escopo, setEscopo, nMinhas, nTodas, origem, importar }) {
  const s = resumo(cotas)
  const arquivo = useRef(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const lerArquivo = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!/\.(csv|txt)$/i.test(f.name)) { setErro('Salve a planilha como CSV (Arquivo › Salvar como › CSV) e importe de novo.'); return }
    const leitor = new FileReader()
    leitor.onload = async () => {
      setEnviando(true)
      setErro((await importar(String(leitor.result || ''), f.name)) || '')
      setEnviando(false)
    }
    leitor.readAsText(f, 'utf-8')
  }
  const partes = ['aguardando', 'contemplada', 'quitada'].map((k) => ({ k, n: k === 'aguardando' ? s.aguardando : k === 'contemplada' ? s.contempladas : s.quitadas }))

  return (
    <header className="relative overflow-hidden px-4 pt-4 pb-4 text-white" style={{ background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 55%, #7F1D1D 100%)' }}>
      <div aria-hidden="true" className="absolute -right-10 -top-12 w-48 h-48 rounded-full bg-white/10" />
      <div aria-hidden="true" className="absolute right-16 -bottom-16 w-36 h-36 rounded-full bg-white/5" />
      <div className="relative flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">Consórcio Nacional Mahindra</p>
          <h1 className="text-[22px] font-black leading-tight">Carteira de cotas</h1>
          <p className="text-[12px] opacity-80 mt-0.5">
            {origem ? <>Planilha {origem.nome} · enviada {new Date(origem.em).toLocaleDateString('pt-BR')}</> : 'Planilha da administradora'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex p-0.5 rounded-full bg-black/20 text-[12px] font-bold">
            {[['minhas', `Minhas ${nMinhas}`], ['todas', `Todas ${nTodas}`]].map(([k, nome]) => (
              <button key={k} type="button" onClick={() => setEscopo(k)}
                className={`px-2.5 py-1 rounded-full transition ${escopo === k ? 'bg-white text-red-800' : 'text-white/85'}`}>{nome}</button>
            ))}
          </div>
          <button type="button" disabled={enviando} onClick={() => arquivo.current?.click()} className="inline-flex items-center gap-1 text-[11.5px] font-semibold bg-white/15 rounded-full px-2.5 py-1 active:bg-white/25 disabled:opacity-60">
            <FileUp size={13} /> {enviando ? 'Enviando…' : 'Atualizar planilha'}
          </button>
          <input ref={arquivo} type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={lerArquivo} />
        </div>
      </div>
      {erro && <p className="relative mt-2 text-[12px] bg-black/25 rounded-lg px-2.5 py-1.5">{erro}</p>}

      <div className="relative grid grid-cols-3 gap-2 mt-4">
        <Numero rotulo="Cotas" valor={s.cotas} sub={`${s.clientes} clientes`} />
        <Numero rotulo="Em cartas" valor={s.carta} formato={reais} sub="valor com taxas" />
        <Numero rotulo="Por mês" valor={s.parcelaMes} formato={reais} sub="parcelas a receber" />
      </div>

      <div className="relative mt-3.5">
        <div className="flex h-2.5 rounded-full overflow-hidden bg-white/15">
          {partes.map(({ k, n }) => n > 0 && (
            <div key={k} className="ivf-barra h-full" style={{ width: `${(n / Math.max(1, s.cotas)) * 100}%`, background: k === 'aguardando' ? '#fbbf24' : k === 'contemplada' ? '#4ade80' : '#5eead4' }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11.5px]">
          {partes.map(({ k, n }) => (
            <span key={k} className="inline-flex items-center gap-1 opacity-90">
              <span className="w-2 h-2 rounded-full" style={{ background: k === 'aguardando' ? '#fbbf24' : k === 'contemplada' ? '#4ade80' : '#5eead4' }} />
              {n} {STATUS[k].nome.toLowerCase()}{n === 1 ? '' : 's'}
            </span>
          ))}
          {s.emAtraso > 0 && <span className="inline-flex items-center gap-1 font-bold text-amber-200"><AlertTriangle size={11} /> {s.emAtraso} em atraso ({brl(s.atraso)})</span>}
        </div>
      </div>
    </header>
  )
}

function Numero({ rotulo, valor, formato, sub }) {
  return (
    <div className="ivf-entra rounded-2xl bg-white/12 backdrop-blur-[1px] px-3 py-2.5 border border-white/15" style={{ background: 'rgba(255,255,255,0.1)' }}>
      <div className="text-[10.5px] font-bold uppercase tracking-wide opacity-80">{rotulo}</div>
      <div className="text-[19px] font-black leading-tight tabular-nums"><Conta valor={valor} formato={formato} /></div>
      <div className="text-[10.5px] opacity-75 leading-tight">{sub}</div>
    </div>
  )
}

// ── radar ────────────────────────────────────────────────────────────────────
function mensagem(item, vendedor) {
  const c = item.cotas[0]
  const oi = `Olá, ${primeiroNome(item.cliente)}! Aqui é ${primeiroNome(vendedor.nome) || 'o seu vendedor'}, da Nova Tratores.`
  const cota = `sua cota ${c.grupo}/${c.cota} do Mahindra ${c.modelo}`
  switch (item.tipo) {
    case 'atraso': return `${oi} Vi que a parcela da ${cota} ficou em aberto. Quer que eu te ajude a regularizar? Assim você continua concorrendo nas próximas assembleias.`
    case 'lance': return `${oi} Você já pagou ${num(c.percPago)}% da ${cota}. No seu grupo o lance que vem ganhando é de ${num(c.lancePct, 1)}% (perto de ${brl(c.lanceValor)}). Se quiser, eu monto um lance com você para tirar o trator já nesta safra.`
    case 'vip': return `${oi} Queria passar aí para conversarmos sobre as suas cotas do consórcio Mahindra e montar um plano de lances. Qual o melhor dia?`
    case 'quitada': return `${oi} Parabéns por quitar a ${cota}! Que tal já garantir a próxima cota para o seu segundo trator (ou para a troca)? Te mando uma simulação.`
    case 'pos': return `${oi} Como está o ${c.modelo}? Posso agendar a revisão e te mostrar os implementos que combinam com ele.`
    default: return `${oi} Somos a concessionária Mahindra da sua região: oficina, peças e revisão perto de você. Posso te visitar?`
  }
}

function Radar({ cotas, abrir, vendedor }) {
  const navigate = useNavigate()
  const itens = useMemo(() => radar(cotas), [cotas])
  const [tipo, setTipo] = useState('todos')
  const contagem = useMemo(() => itens.reduce((m, i) => ({ ...m, [i.tipo]: (m[i.tipo] || 0) + 1 }), {}), [itens])
  const lista = tipo === 'todos' ? itens : itens.filter((i) => i.tipo === tipo)
  const blocos = [1, 2, 3].map((p) => ({ p, itens: lista.filter((i) => i.prioridade === p) })).filter((b) => b.itens.length)

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={17} className="text-red-600" />
        <h2 className="text-[16px] font-black text-slate-900">O que fazer com cada cliente</h2>
      </div>
      <p className="text-[12.5px] text-slate-500 mb-3">Cada cartão diz por que o cliente apareceu e o que oferecer. Em cima ficam os de hoje.</p>
      <ComoLer itens={[
        'Em atraso: parcela vencida na planilha. Cota em atraso pode ficar fora do sorteio e do lance; ligue antes da assembleia.',
        'Pronto para lance: já pagou 15% ou mais e não foi contemplado. O valor é o lance que costuma ganhar no grupo dele.',
        'Cliente grande: 3 cotas ou mais no mesmo nome. Vale visita do gerente.',
        'Quitadas e já com o trator: bom pagador e máquina em uso. Hora de oferecer cota nova, implemento e revisão.',
        'Outra concessionária: cota vendida por outra revenda. Se o cliente é da região, a oficina pode ser nossa.',
      ]} />
      <Chips>
        <Chip ativo={tipo === 'todos'} onClick={() => setTipo('todos')}>Tudo {itens.length}</Chip>
        {Object.entries(TIPOS).filter(([k]) => contagem[k]).map(([k, t]) => (
          <Chip key={k} ativo={tipo === k} cor={t.cor} onClick={() => setTipo(k)}>{t.nome} {contagem[k]}</Chip>
        ))}
      </Chips>

      {!lista.length && <p className="text-center text-sm text-slate-400 py-10">Nada no radar para estas cotas.</p>}
      {blocos.map(({ p, itens: doBloco }) => (
        <section key={p} className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">{PRIORIDADE[p]} · {doBloco.length}</p>
          <div className="grid gap-2.5">
            {doBloco.map((i, n) => {
              const t = TIPOS[i.tipo]
              const I = t.icone
              return (
                <article key={i.id} className="ivf-entra bg-white border border-slate-200 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(15,23,42,.05)]" style={{ animationDelay: `${Math.min(n, 8) * 40}ms` }}>
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: `${t.cor}14`, color: t.cor }}><I size={19} /></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Selo cor={t.cor}>{i.titulo}</Selo>
                        {i.valor > 0 && i.tipo !== 'vip' && <span className="text-[12px] font-bold text-slate-700 tabular-nums">{brl(i.valor)}</span>}
                      </div>
                      <h3 className="font-bold text-[14.5px] text-slate-900 leading-snug mt-1">{i.cliente}</h3>
                      <p className="text-[13px] text-slate-600 leading-snug mt-0.5">{i.motivo}</p>
                      <p className="text-[13px] font-semibold text-slate-900 leading-snug mt-1.5 flex gap-1"><ChevronRight size={15} className="shrink-0 mt-0.5" style={{ color: t.cor }} />{i.acao}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-3 pl-[52px]">
                    <a href={linkWhats(mensagem(i, vendedor))} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12.5px] font-bold rounded-full px-3 py-1.5 bg-green-600 text-white active:bg-green-700">
                      <MessageCircle size={14} /> Mensagem
                    </a>
                    <button type="button" onClick={() => abrir(i.cotas[0])} className="inline-flex items-center gap-1 text-[12.5px] font-bold rounded-full px-3 py-1.5 bg-slate-100 text-slate-700 active:bg-slate-200">
                      {i.cotas.length > 1 ? `Ver ${i.cotas.length} cotas` : 'Ver cota'}
                    </button>
                    <button type="button" onClick={() => navigate('/visitas', { state: { novaVisita: true } })} className="inline-flex items-center gap-1 text-[12.5px] font-bold rounded-full px-3 py-1.5 bg-slate-100 text-slate-700 active:bg-slate-200">
                      <MapPin size={13} /> Visita
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

// ── cotas ────────────────────────────────────────────────────────────────────
function Anel({ pct, cor, tamanho = 46 }) {
  const r = (tamanho - 6) / 2, c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, pct || 0))
  return (
    <span className="relative shrink-0 grid place-items-center" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90" aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={cor} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <span className="absolute text-[11px] font-black text-slate-800 tabular-nums">{Math.round(p)}%</span>
    </span>
  )
}

function LinhaCota({ c, abrir, atraso = 0 }) {
  const st = STATUS[c.status]
  return (
    <button type="button" onClick={() => abrir(c)}
      className="ivf-entra ivf-toque w-full flex items-center gap-3 text-left bg-white border border-slate-200 rounded-2xl px-3 py-2.5" style={{ animationDelay: `${atraso}ms` }}>
      <Anel pct={c.percPago} cor={st.cor} />
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-[13.5px] text-slate-900 truncate">{c.cliente}</span>
        <span className="block text-[12px] text-slate-500 truncate">{c.modelo}{c.cv ? ` · ${c.cv} cv` : ''} · grupo {c.grupo} · cota {c.cota}</span>
        <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <Selo cor={st.cor}>{st.nome}</Selo>
          {c.emAtraso && <Selo cor="#dc2626" cheio>Atraso {brl(c.valorAtraso)}</Selo>}
          {!c.nossa && <Selo cor="#475569">Outra revenda</Selo>}
        </span>
      </span>
      <span className="text-right shrink-0">
        <span className="block text-[13px] font-black text-slate-900 tabular-nums">{c.quitada ? '—' : brl(c.parcela)}</span>
        <span className="block text-[10.5px] text-slate-400">{c.quitada ? 'quitada' : 'por mês'}</span>
      </span>
    </button>
  )
}

function ListaCotas({ cotas, abrir, avisos }) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const [ordem, setOrdem] = useState('pago')
  const lista = useMemo(() => {
    const q = textoNorm(busca)
    let l = cotas.filter((c) => !q || textoNorm(`${c.cliente} ${c.bem} ${c.grupo} ${c.cota} ${c.vendedor}`).includes(q))
    if (filtro === 'atraso') l = l.filter((c) => c.emAtraso)
    else if (filtro !== 'todas') l = l.filter((c) => c.status === filtro)
    const por = { pago: (a, b) => b.percPago - a.percPago, carta: (a, b) => b.carta - a.carta, recente: (a, b) => (b.dataVenda || '').localeCompare(a.dataVenda || '') }
    return [...l].sort(por[ordem])
  }, [cotas, busca, filtro, ordem])
  const n = (f) => (f === 'todas' ? cotas.length : f === 'atraso' ? cotas.filter((c) => c.emAtraso).length : cotas.filter((c) => c.status === f).length)

  return (
    <div>
      <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 mb-2.5 focus-within:ring-2 focus-within:ring-red-500/30">
        <Search size={16} className="text-slate-400" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Cliente, modelo, grupo ou cota" className="flex-1 bg-transparent outline-none text-[14px]" />
      </label>
      <Chips>
        {[['todas', 'Todas', '#dc2626'], ['aguardando', 'Aguardando', STATUS.aguardando.cor], ['contemplada', 'Contempladas', STATUS.contemplada.cor], ['quitada', 'Quitadas', STATUS.quitada.cor], ['atraso', 'Em atraso', '#dc2626']].map(([k, nome, cor]) => (
          <Chip key={k} ativo={filtro === k} cor={cor} onClick={() => setFiltro(k)}>{nome} {n(k)}</Chip>
        ))}
      </Chips>
      <div className="mt-2.5 mb-2">
        <Segmentos opcoes={[['pago', 'Mais pagas'], ['carta', 'Maior carta'], ['recente', 'Mais novas']]} valor={ordem} onMuda={setOrdem} />
      </div>
      <div className="grid gap-2">
        {lista.map((c, i) => <LinhaCota key={c.id} c={c} abrir={abrir} atraso={Math.min(i, 10) * 30} />)}
        {!lista.length && <p className="text-center text-sm text-slate-400 py-10">Nenhuma cota com esse filtro.</p>}
      </div>
      {avisos.length > 0 && (
        <details className="mt-4 bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5">
          <summary className="text-[13px] font-semibold text-slate-700 cursor-pointer inline-flex items-center gap-1.5"><Info size={15} className="text-amber-600" /> {avisos.length} linhas da planilha para conferir</summary>
          <ul className="mt-2 grid gap-1 text-[12.5px] text-slate-600 list-disc pl-5">{avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          <p className="text-[11.5px] text-slate-400 mt-2">O app recalcula o que dá (saldo, parcelas, lance do grupo); o resto vale conferir com a administradora.</p>
        </details>
      )}
    </div>
  )
}

// ── clientes ─────────────────────────────────────────────────────────────────
function ListaClientes({ cotas, abrir }) {
  const clientes = useMemo(() => porCliente(cotas), [cotas])
  const [aberto, setAberto] = useState(null)
  return (
    <div className="grid gap-2">
      <p className="text-[12.5px] text-slate-500 mb-1">{clientes.length} consorciados, do que tem mais cotas para o que tem menos.</p>
      {clientes.map((g, i) => {
        const ab = aberto === g.chave
        return (
          <div key={g.chave} className="ivf-entra bg-white border border-slate-200 rounded-2xl overflow-hidden" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
            <button type="button" onClick={() => setAberto(ab ? null : g.chave)} className="w-full flex items-center gap-3 text-left px-3 py-3">
              <span className="w-11 h-11 rounded-full grid place-items-center shrink-0 font-black text-[15px]" style={{ background: g.cotas.length >= 3 ? '#7c3aed14' : '#fef2f2', color: g.cotas.length >= 3 ? '#7c3aed' : '#dc2626' }}>
                {g.cotas.length}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-[13.5px] text-slate-900 leading-snug">{g.nome}</span>
                <span className="block text-[12px] text-slate-500">{g.cotas.length === 1 ? '1 cota' : `${g.cotas.length} cotas`} · {reais(g.carta)} em cartas{g.parcelaMes ? ` · ${brl(g.parcelaMes)}/mês` : ''}</span>
                <span className="flex gap-1 mt-1">
                  {g.cotas.map((c) => <span key={c.id} title={STATUS[c.status].nome} className="w-2.5 h-2.5 rounded-full" style={{ background: c.emAtraso ? '#dc2626' : STATUS[c.status].cor }} />)}
                </span>
              </span>
              <ChevronRight size={17} className={`text-slate-400 shrink-0 transition-transform ${ab ? 'rotate-90' : ''}`} />
            </button>
            {ab && <div className="grid gap-1.5 px-2 pb-2">{g.cotas.map((c) => <LinhaCota key={c.id} c={c} abrir={abrir} />)}</div>}
          </div>
        )
      })}
    </div>
  )
}

// ── grupos ───────────────────────────────────────────────────────────────────
function Grupos({ cotas, todas, abrir }) {
  const grupos = useMemo(() => {
    const ids = new Set(cotas.map((c) => c.grupo))
    return porGrupo(todas).filter((g) => ids.has(g.grupo))
  }, [cotas, todas])
  return (
    <div className="grid gap-3">
      <ComoLer itens={[
        'Início e fim são estimados pela venda mais antiga da planilha em cada grupo + 120 meses.',
        'Lance que costuma ganhar: o percentual sugerido na planilha da administradora para o grupo.',
        'Lances que já ganharam: cotas da planilha contempladas por lance, com o valor pago sobre a carta.',
      ]} />
      {grupos.map((g, i) => (
        <Cartao key={g.grupo} titulo={`Grupo ${g.grupo}`} icone={Users} atraso={i * 50}
          extra={g.lancePct != null && <Selo cor="#d97706">lance ~{num(g.lancePct, 1)}%</Selo>}>
          <div className="flex items-center justify-between text-[11.5px] text-slate-500 mb-1">
            <span>{g.inicio ? `início ~${dataCurta(g.inicio)}` : ''}</span>
            <span>{g.decorridoPct != null ? `${Math.round(g.decorridoPct * 100)}% do prazo` : ''}</span>
            <span>{g.fim ? `fim ~${dataCurta(g.fim)}` : ''}</span>
          </div>
          <Barra valor={g.decorridoPct || 0} max={1} cor="#dc2626" atraso={i * 50} />
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <Mini rotulo="Nossas cotas" valor={g.cotas.length} />
            <Mini rotulo="Contempladas" valor={g.contempladas} cor={STATUS.contemplada.cor} />
            <Mini rotulo="Aguardando" valor={g.aguardando} cor={STATUS.aguardando.cor} />
          </div>
          {g.lancesVencedores.length > 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
              <p className="text-[11.5px] font-bold text-amber-800 uppercase tracking-wide mb-1 flex items-center gap-1"><Gavel size={12} /> Lances que já ganharam</p>
              {g.lancesVencedores.map((l) => (
                <p key={l.cota} className="text-[12.5px] text-amber-900">Cota {l.cota}: <b>{num(l.pct, 1)}%</b> da carta ({brl(l.valor)}) em {dataCurta(l.data)}</p>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {g.cotas.map((c) => (
              <button key={c.id} type="button" onClick={() => abrir(c)}
                className="text-[12px] font-bold rounded-lg px-2 py-1 border" style={{ borderColor: `${STATUS[c.status].cor}55`, color: STATUS[c.status].cor, background: `${STATUS[c.status].cor}0d` }}>
                {c.cota}
              </button>
            ))}
          </div>
        </Cartao>
      ))}
    </div>
  )
}

function Mini({ rotulo, valor, cor = '#0f172a' }) {
  return (
    <div className="rounded-xl bg-slate-50 py-2">
      <div className="text-[18px] font-black tabular-nums" style={{ color: cor }}>{valor}</div>
      <div className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">{rotulo}</div>
    </div>
  )
}

// ── ficha da cota ────────────────────────────────────────────────────────────
function FichaCota({ cota: c, vendedor, onFechar, onSimular }) {
  const st = STATUS[c.status]
  const saldoPosLance = c.lanceValor ? Math.max(0, c.saldo - c.lanceValor) : null
  const resumoTxt = `Cota ${c.grupo}/${c.cota} · ${c.cliente}\n${c.bem}\nCarta ${brl(c.carta)} · pago ${num(c.percPago)}% · parcela ${brl(c.parcela, 2)}\nSituação: ${st.nome}${c.dataContemplacao ? ` em ${dataCurta(c.dataContemplacao)}` : ''}${c.lanceValor ? `\nLance que costuma ganhar no grupo: ${num(c.lancePct, 1)}% (${brl(c.lanceValor)})` : ''}`
  return (
    <Folha titulo={c.cliente} sub={`Grupo ${c.grupo} · cota ${c.cota} · contrato ${c.contrato || '—'}`} onFechar={onFechar}
      rodape={
        <div className="grid grid-cols-2 gap-2">
          <a href={linkWhats(resumoTxt)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-bold text-[14px] bg-green-600 text-white"><MessageCircle size={16} /> Enviar resumo</a>
          <button type="button" onClick={() => onSimular(c)} className="inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-bold text-[14px] bg-red-600 text-white"><Wallet size={16} /> Simular cota nova</button>
        </div>
      }>
      <div className="px-4 pb-4 grid gap-3">
        <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4">
          <Anel pct={c.percPago} cor={st.cor} tamanho={84} />
          <div className="min-w-0">
            <Selo cor={st.cor} cheio>{st.nome}{c.formaContemplacao === 'lance' ? ' por lance' : c.formaContemplacao === 'sorteio' ? ' por sorteio' : ''}</Selo>
            <p className="font-bold text-slate-900 mt-1.5 leading-snug">{c.bem}</p>
            <p className="text-[12.5px] text-slate-500">Vendedor: {c.vendedor || '—'}</p>
          </div>
        </div>

        {c.emAtraso && (
          <div className="flex gap-2 bg-red-50 border border-red-200 text-red-800 rounded-xl px-3 py-2 text-[13px]">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {brl(c.valorAtraso, 2)} em atraso. Cota em atraso pode ficar fora do sorteio e do lance.
          </div>
        )}

        <Cartao titulo="Números da cota" icone={Wallet} corpo="px-4 pb-3 pt-2">
          <Linha rotulo="Preço do bem hoje" valor={brl(c.preco)} />
          <Linha rotulo="Carta com taxas" valor={brl(c.carta)} />
          <Linha rotulo="Parcela atual" valor={c.quitada ? 'quitada' : brl(c.parcela, 2)} forte />
          {c.seguro > 0 && <Linha rotulo="Seguro por mês" valor={brl(c.seguro)} />}
          <Linha rotulo="Saldo para quitar (sem seguro)" valor={brl(c.saldo)} />
          <Linha rotulo="Parcelas que faltam (estimado)" valor={c.parcelasRestantes ?? '—'} />
          {c.valorLance > 0 && <Linha rotulo="Lance que ele deu" valor={`${brl(c.valorLance)} (${num((c.valorLance / c.carta) * 100, 1)}%)`} />}
        </Cartao>

        <Cartao titulo="Linha do tempo" icone={Calendar} corpo="px-4 pb-3 pt-2">
          <Linha rotulo="Comprou" valor={c.dataVenda ? `${dataCurta(c.dataVenda)} · há ${tempo(c.mesesDesdeVenda)}` : '—'} />
          <Linha rotulo="Contemplado" valor={c.dataContemplacao ? `${dataCurta(c.dataContemplacao)} · há ${tempo(c.mesesDesdeContemplacao)}` : 'ainda não'} />
          <Linha rotulo="Prazo do plano" valor={`${PRAZO_MESES} meses`} />
        </Cartao>

        {c.lanceValor > 0 && (
          <Cartao titulo="Para tirar o trator agora" icone={Gavel} corpo="px-4 pb-4 pt-2">
            <p className="text-[13px] text-slate-600 mb-2">No grupo {c.grupo} o lance livre que costuma ganhar é <b>{num(c.lancePct, 1)}%</b> da carta.</p>
            <div className="grid grid-cols-3 gap-2">
              <OpcaoLance nome={`Livre ${num(c.lancePct, 0)}%`} valor={c.lanceValor} destaque />
              {LANCES_FIXOS.map((p) => <OpcaoLance key={p} nome={`Fixo ${p * 100}%`} valor={c.carta * p} />)}
            </div>
            <p className="text-[12.5px] text-slate-600 mt-2.5">
              Ganhando com o lance livre, o saldo cai para <b>{brl(saldoPosLance)}</b>: mais umas <b>{c.parcela > 0 ? Math.ceil(saldoPosLance / c.parcela) : '—'}</b> parcelas de {brl(c.parcela)}.
              No lance fixo ele concorre só com quem ofertou o mesmo percentual.
            </p>
          </Cartao>
        )}
        {c.problemas.length > 0 && (
          <p className="text-[12px] text-slate-500 flex gap-1.5"><Info size={14} className="shrink-0 mt-0.5 text-amber-600" /> Na planilha: {c.problemas.join('; ')}.</p>
        )}
      </div>
    </Folha>
  )
}

function Linha({ rotulo, valor, forte }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[13px] text-slate-500">{rotulo}</span>
      <span className={`text-[13.5px] text-right tabular-nums ${forte ? 'font-black text-slate-900' : 'font-semibold text-slate-800'}`}>{valor}</span>
    </div>
  )
}

function OpcaoLance({ nome, valor, destaque }) {
  return (
    <div className={`rounded-xl px-2 py-2 text-center ${destaque ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-900 border border-slate-200'}`}>
      <div className={`text-[11px] font-bold ${destaque ? 'opacity-90' : 'text-slate-500'}`}>{nome}</div>
      <div className="text-[14px] font-black tabular-nums">{reais(valor)}</div>
    </div>
  )
}

// ── simulador ────────────────────────────────────────────────────────────────
function Simulador({ todas, vendedor, modeloInicial }) {
  const modelos = useMemo(() => modelosDaPlanilha(todas), [todas])
  const lances = useMemo(() => porGrupo(todas).map((g) => g.lancePct).filter((v) => v != null), [todas])
  const [modeloId, setModeloId] = useState(() => (modelos.some((m) => m.id === modeloInicial) ? modeloInicial : modelos.find((m) => /6075/.test(m.modelo))?.id || modelos[0]?.id || ''))
  const modelo = modelos.find((m) => m.id === modeloId)
  const [preco, setPreco] = useState(() => modelo?.preco || 200000)
  useEffect(() => { if (modelo) setPreco(modelo.preco) }, [modelo])
  const [tipoLance, setTipoLance] = useState('sem')
  const [livre, setLivre] = useState(() => Math.round(lances.length ? lances.reduce((a, b) => a + b, 0) / lances.length : 45))
  const [usarPara, setUsarPara] = useState('prazo')
  const [cliente, setCliente] = useState('')
  const lancePct = tipoLance === 'sem' ? 0 : tipoLance === 'livre' ? livre : Number(tipoLance)
  const r = simular({ preco, lancePct, usarLancePara: usarPara })
  const nomeModelo = modelo ? `Mahindra ${modelo.modelo}${modelo.cv ? ` ${modelo.cv} cv` : ''}` : 'trator Mahindra'

  const texto = [
    `${cliente ? `Olá, ${primeiroNome(cliente)}! ` : ''}Simulação do Consórcio Nacional Mahindra · Nova Tratores`,
    `${nomeModelo}: ${brl(preco)}`,
    `Carta de crédito com taxas: ${brl(r.carta)}`,
    `${PRAZO_MESES} parcelas de ${brl(r.parcela, 2)} (+ seguro de ~${brl(r.seguro)}/mês)`,
    lancePct > 0 ? `Com lance de ${num(lancePct)}% (${brl(r.lance)}): ${usarPara === 'prazo' ? `termina em ${r.prazoDepois} meses` : `parcela cai para ${brl(r.parcelaDepois, 2)}`}` : null,
    'Sem juros: só taxa de administração. Contemplação por sorteio ou lance (fixo de 30%/40% ou livre).',
    'Valores estimados; a proposta final sai com a administradora.',
    vendedor.nome ? `— ${vendedor.nome}` : null,
  ].filter(Boolean).join('\n')

  return (
    <div className="grid gap-3">
      <Cartao titulo="Monte a cota" icone={Tractor}>
        <label className="block text-[12.5px] font-semibold text-slate-600 mb-1">Modelo</label>
        <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[14px] mb-3">
          {modelos.map((m) => <option key={m.id} value={m.id}>{m.modelo}{m.cv ? ` · ${m.cv} cv` : ''} · {brl(m.preco)}</option>)}
        </select>
        <label className="block text-[12.5px] font-semibold text-slate-600 mb-1">Valor do bem</label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 mb-3">
          <span className="text-slate-400 text-[14px]">R$</span>
          <input inputMode="numeric" value={preco ? preco.toLocaleString('pt-BR') : ''} onChange={(e) => setPreco(Number(e.target.value.replace(/\D/g, '')) || 0)} className="flex-1 outline-none text-[15px] font-bold tabular-nums" />
        </div>
        <label className="block text-[12.5px] font-semibold text-slate-600 mb-1">Cliente (opcional, entra na mensagem)</label>
        <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do produtor" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[14px]" />
      </Cartao>

      <Cartao titulo="Lance" icone={Gavel}>
        <Segmentos opcoes={[['sem', 'Sem lance'], ['30', 'Fixo 30%'], ['40', 'Fixo 40%'], ['livre', 'Livre']]} valor={tipoLance} onMuda={setTipoLance} />
        {tipoLance === 'livre' && (
          <div className="mt-3">
            <Regua rotulo="Percentual do lance" valor={livre} onMuda={setLivre} min={5} max={80} passo={1} formato={(v) => `${v}%`} />
            {lances.length > 0 && <p className="text-[12px] text-slate-500 mt-1">Nos grupos da planilha, o lance que ganha fica entre {num(Math.min(...lances), 1)}% e {num(Math.max(...lances), 1)}%.</p>}
          </div>
        )}
        {lancePct > 0 && (
          <div className="mt-3">
            <Segmentos rotulo="Depois do lance" opcoes={[['prazo', 'Terminar antes'], ['parcela', 'Baixar a parcela']]} valor={usarPara} onMuda={setUsarPara} />
          </div>
        )}
      </Cartao>

      <section className="ivf-entra rounded-3xl p-4 text-white shadow-[0_12px_30px_rgba(153,27,27,.35)]" style={{ background: 'linear-gradient(135deg, #DC2626, #7F1D1D)' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">Parcela {lancePct > 0 && usarPara === 'parcela' ? 'depois do lance' : 'mensal'}</p>
        <p className="text-[34px] font-black leading-none mt-1 tabular-nums">
          <Conta valor={lancePct > 0 && usarPara === 'parcela' ? r.parcelaDepois : r.parcela} formato={(v) => brl(v, 2)} />
        </p>
        <p className="text-[12.5px] opacity-85 mt-1">+ seguro de ~{brl(r.seguro)} por mês · {lancePct > 0 ? `${r.prazoDepois} meses` : `${PRAZO_MESES} meses`}</p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Numero rotulo="Carta c/ taxas" valor={r.carta} formato={(v) => brl(v)} sub={`bem + ${num(TAXA_TOTAL * 100)}% de taxas`} />
          <Numero rotulo={lancePct > 0 ? 'Lance' : 'Juros'} valor={lancePct > 0 ? r.lance : 0} formato={(v) => (lancePct > 0 ? brl(v) : 'R$ 0')} sub={lancePct > 0 ? `${num(lancePct)}% da carta` : 'só taxa de adm.'} />
        </div>
        <p className="text-[12px] opacity-85 mt-3">
          A taxa de {num(TAXA_TOTAL * 100)}% dividida em {PRAZO_MESES / 12} anos dá ~{num(r.custoAoAno * 100, 1)}% ao ano, sem juros. Valores estimados com base na planilha.
        </p>
      </section>

      <a href={linkWhats(texto)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl py-3 font-bold text-[15px] bg-green-600 text-white active:bg-green-700">
        <MessageCircle size={18} /> Mandar simulação no WhatsApp
      </a>
    </div>
  )
}

// ── regras ───────────────────────────────────────────────────────────────────
function Regras() {
  const blocos = [
    ['Como funciona', 'Um grupo de produtores paga parcelas mensais. Todo mês, em assembleia, alguns são contemplados e retiram a máquina. Não tem juros, tem taxa de administração.'],
    ['Prazo', 'Até 120 meses para pagar. Contemplações aceleradas nos primeiros 12 meses do grupo.'],
    ['Três jeitos de ser contemplado', 'Sorteio · lance fixo de 30% ou 40% da carta (concorre com quem ofertou o mesmo percentual) · lance livre (ganha o maior percentual).'],
    ['Depois do lance', 'O lance abate o saldo: o cliente escolhe terminar antes (mesma parcela) ou baixar a parcela (mesmo prazo).'],
    ['Para quem serve', 'Quem planeja a compra e pode esperar a contemplação, ou tem recurso para dar um lance e antecipar. Se a máquina é para a próxima safra, o financiamento (Moderfrota, Pronaf, FINAME) costuma ser mais rápido: compare os dois com o cliente.'],
    ['Na hora da conversa', 'Leve a simulação pronta, pergunte da safra (recurso para lance) e se tem usado para vender. Cliente com cota quitada ou trator já entregue é a melhor porta para a cota nova.'],
  ]
  return (
    <div className="grid gap-2.5">
      {blocos.map(([t, txt], i) => (
        <Cartao key={t} titulo={t} atraso={i * 50} corpo="px-4 pb-3.5 pt-1.5">
          <p className="text-[13.5px] text-slate-600 leading-relaxed">{txt}</p>
        </Cartao>
      ))}
      <p className="text-[11.5px] text-slate-400 text-center mt-1">Regras como estão no site da Nova (página Crédito). Confirme as condições do grupo com a administradora.</p>
    </div>
  )
}
