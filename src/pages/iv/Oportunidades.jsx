// =============================================================================
// /inteligencia/oportunidades — a central de oportunidades no celular.
// Port de Oportunidades.tsx + TopoOportunidades.tsx (mosaico), vivo/RadarClientes,
// oport/UmPorVez e o feed do vendedor (lib/inteligencia-vendas/feed.ts) do Portal.
//   "Para mim hoje": a reserva do vendedor (carteira / recuperar / novos) na mistura do perfil.
//   "Todas": a base de clientes com motivo, filtro por regra e perguntas prontas.
// Cada uma em Lista (feed de cartões) ou Um por vez (cartão grande, deslizar).
// =============================================================================
import { useMemo, useState } from 'react'
import { GalleryHorizontalEnd, LayoutGrid, List, Radar, Search, Sparkles, X } from 'lucide-react'
import Icone from '../../components/Icone'
import { CabecalhoIV, CarregandoIV, ErroIV, useAbrirCliente, useDados } from '../../components/iv/kit'
import { carregarFeed, carregarOportunidades, ICONE_REGRA, PERGUNTAS, REGRAS } from '../../lib/iv/fonte'
import {
  BD, Chip, ComoLer, Conta, EstilosIV, FRASE_REGRA, QUADRANTES, quadranteDe, Rolagem, Rotulo, textoNormSeguro, valorCliente, Vazio,
} from '../../components/iv/oport/comum'
import MosaicoRegras from '../../components/iv/oport/MosaicoRegras'
import RadarIV from '../../components/iv/oport/RadarIV'
import CartaoItem from '../../components/iv/oport/CartaoItem'
import UmPorVez from '../../components/iv/oport/UmPorVez'
import { deCliente, deFeed, montarDia, TIPO_FEED } from '../../components/iv/oport/itens'

const AJUDA = [
  'Em "Para mim hoje" está a sua lista do dia, montada na mistura do seu perfil: clientes da carteira, negócios para recuperar e propriedades novas.',
  'Em "Todas as oportunidades" está a base inteira com algum motivo para ligar. O mosaico mostra quantos clientes cada motivo tem: toque num bloco para filtrar.',
  'O radar mostra os mesmos clientes: o lado é o tipo de conversa e quanto mais perto do centro, mais quente (score maior).',
  'As perguntas prontas são atalhos do buscador do Portal, por exemplo "compraram trator há mais de 5 anos".',
  'Cada cartão diz POR QUE LIGAR e O QUE OFERECER. O score vai de 0 a 100 e soma o peso dos motivos.',
  'No modo "Um por vez" você vê um cliente grande, liga ou chama no WhatsApp e passa para o próximo. Deslize o cartão para o lado para pular.',
]

function Segmento({ opcoes, valor, onTroca, pequeno }) {
  return (
    <div className={`flex p-1 rounded-2xl bg-slate-100 ${pequeno ? 'gap-0.5' : 'gap-1'}`} role="tablist">
      {opcoes.map((o) => {
        const on = valor === o.id
        return (
          <button key={o.id} type="button" role="tab" aria-selected={on} onClick={() => onTroca(o.id)}
            className={`flex-1 inline-flex items-center justify-center gap-1 whitespace-nowrap px-1.5 rounded-xl font-bold transition ${pequeno ? 'h-8 text-[12.5px]' : 'h-10 text-[14px]'}`}
            style={on ? { background: '#fefefe', color: '#0f172a', boxShadow: '0 2px 6px rgba(15,23,42,.10)' } : { color: '#64748b' }}>
            {o.icone && <o.icone size={pequeno ? 14 : 16} aria-hidden="true" />} {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}

export default function Oportunidades() {
  const [aba, setAba] = useState('hoje')
  const [modo, setModo] = useState('lista')
  return (
    <div>
      <EstilosIV />
      <CabecalhoIV titulo="Oportunidades" subtitulo="Para quem ligar e o que oferecer" direita={<ComoLer itens={AJUDA} />} />
      <Segmento valor={aba} onTroca={setAba} opcoes={[{ id: 'hoje', rotulo: 'Para mim hoje', icone: Sparkles }, { id: 'todas', rotulo: 'Todas as oportunidades', icone: LayoutGrid }]} />
      <div className="mt-4">
        {aba === 'hoje' ? <ParaMimHoje modo={modo} setModo={setModo} /> : <Todas modo={modo} setModo={setModo} />}
      </div>
    </div>
  )
}

function SeletorModo({ modo, setModo }) {
  return (
    <div className="w-[196px] shrink-0">
      <Segmento pequeno valor={modo} onTroca={setModo} opcoes={[{ id: 'lista', rotulo: 'Lista', icone: List }, { id: 'um', rotulo: 'Um por vez', icone: GalleryHorizontalEnd }]} />
    </div>
  )
}

// ── Para mim hoje (feed do vendedor) ────────────────────────────────────────
function ParaMimHoje({ modo, setModo }) {
  const { dados, carregando, erro, recarregar } = useDados(() => carregarFeed(), [])
  const abrir = useAbrirCliente()
  const [tipo, setTipo] = useState('')
  const dia = useMemo(() => (dados ? montarDia(dados.itens, dados.vendedor.mix, 15) : []), [dados])
  if (erro) return <ErroIV erro={erro} onTentar={recarregar} />
  if (carregando || !dados) return <CarregandoIV />
  const v = dados.vendedor
  const conta = (k) => dados.itens.filter((i) => i.tipo === k).length
  const doDia = (k) => dia.filter((i) => i.tipo === k).length
  const lista = dia.filter((i) => !tipo || i.tipo === tipo).map(deFeed)
  const hora = String(dados.geradoEm || '').slice(11, 16)

  return (
    <div>
      <section className="iv-entra relative overflow-hidden rounded-3xl p-4 text-white iv-brilho" style={{ background: 'linear-gradient(135deg, #ef4444, #991b1b)', boxShadow: '0 12px 28px rgba(153,27,27,.3)' }}>
        <div className="absolute -right-6 -top-6 opacity-15 iv-flutua"><Sparkles size={120} aria-hidden="true" /></div>
        <div className="relative">
          <div className="text-[12px] font-bold uppercase tracking-wider opacity-90">Sua lista de hoje{hora ? ` · gerada às ${hora}` : ''}</div>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-[44px] font-extrabold leading-none tabular-nums"><Conta valor={dia.length} /></span>
            <span className="text-[16px] font-semibold opacity-95 pb-1">contatos para fazer</span>
          </div>
          <div className="text-[13px] opacity-90 mt-1">{v.nome} · perfil {v.perfil} · {dados.itens.length} na reserva</div>
          <div className="flex h-3 rounded-full overflow-hidden mt-3 bg-white/20 gap-[2px]">
            {Object.keys(TIPO_FEED).map((k, i) => (
              <span key={k} className="iv-barra block h-full" style={{ width: `${(doDia(k) / Math.max(1, dia.length)) * 100}%`, background: i === 0 ? '#fefefe' : i === 1 ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.45)', animationDelay: `${200 + i * 120}ms` }} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {Object.entries(TIPO_FEED).map(([k, t]) => (
              <div key={k} className="rounded-xl bg-white/15 px-2.5 py-2">
                <div className="flex items-center gap-1 text-[12px] font-bold"><Icone nome={t.icone} size={13} /> {t.rotulo}</div>
                <div className="text-[20px] font-extrabold leading-tight tabular-nums"><Conta valor={doDia(k)} /></div>
                <div className="text-[10.5px] opacity-85">{Math.round((v.mix?.[k] || 0) * 100)}% do perfil</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-2 mt-4 mb-2">
        <Rotulo>Feed da inteligência comercial</Rotulo>
        <SeletorModo modo={modo} setModo={setModo} />
      </div>
      <Rolagem className="mb-3">
        <Chip ativo={!tipo} onClick={() => setTipo('')} contagem={dia.length}>Todos</Chip>
        {Object.entries(TIPO_FEED).map(([k, t]) => (
          <Chip key={k} ativo={tipo === k} cor={t.cor} onClick={() => setTipo(tipo === k ? '' : k)} contagem={doDia(k)}>
            <Icone nome={t.icone} size={14} /> {t.rotulo}
          </Chip>
        ))}
      </Rolagem>

      {modo === 'um'
        ? <UmPorVez itens={lista} onFicha={abrir} nome="hoje" />
        : lista.length === 0
          ? <Vazio icone={Sparkles}>Nada deste tipo na sua lista de hoje.</Vazio>
          : <div className="space-y-3">{lista.map((it, n) => <CartaoItem key={it.chave} item={it} onFicha={abrir} atraso={Math.min(n, 8) * 50} posicao={n + 1} />)}</div>}

      <p className="text-[12px] text-slate-400 mt-4 leading-snug">
        Reserva completa: {conta('carteira')} da carteira, {conta('recuperar')} para recuperar e {conta('novos')} propriedades novas nas suas cidades ({(dados.cidades || []).slice(0, 4).join(', ')}{(dados.cidades || []).length > 4 ? '…' : ''}).
      </p>
    </div>
  )
}

// ── Todas as oportunidades (base de clientes) ───────────────────────────────
function Todas({ modo, setModo }) {
  const { dados, carregando, erro, recarregar } = useDados(() => carregarOportunidades(), [])
  const abrir = useAbrirCliente()
  const [visual, setVisual] = useState('mosaico')
  const [regra, setRegra] = useState('')
  const [pergunta, setPergunta] = useState('')
  const [quadrante, setQuadrante] = useState('')
  const [q, setQ] = useState('')
  const [limite, setLimite] = useState(20)

  const clientes = useMemo(() => (dados?.clientes || []).filter((c) => c.oportunidades.length > 0), [dados])
  const porRegra = useMemo(() => {
    const m = {}
    for (const c of clientes) for (const o of c.oportunidades) m[o.regra] = (m[o.regra] || 0) + 1
    return m
  }, [clientes])
  const contaPergunta = useMemo(() => Object.fromEntries(PERGUNTAS.map((p) => [p.id, (dados?.clientes || []).filter((c) => { try { return p.filtro(c) } catch { return false } }).length])), [dados])

  const filtrados = useMemo(() => {
    const base = pergunta ? (dados?.clientes || []) : clientes
    const p = PERGUNTAS.find((x) => x.id === pergunta)
    const t = textoNormSeguro(q)
    return base
      .filter((c) => !regra || c.oportunidades.some((o) => o.regra === regra))
      .filter((c) => !p || (() => { try { return p.filtro(c) } catch { return false } })())
      .filter((c) => !quadrante || quadranteDe(c) === quadrante)
      .filter((c) => !t || textoNormSeguro(`${c.nome} ${c.cidade} ${c.vendedor} ${c.ultimoTrator?.modelo || ''}`).includes(t))
      .sort((a, b) => b.score - a.score || valorCliente(b) - valorCliente(a))
  }, [dados, clientes, regra, pergunta, quadrante, q])

  if (erro) return <ErroIV erro={erro} onTentar={recarregar} />
  if (carregando || !dados) return <CarregandoIV />

  const escolherRegra = (r) => { setRegra(regra === r ? '' : r); setPergunta(''); setLimite(20) }
  const itens = filtrados.map(deCliente)
  const temFiltro = regra || pergunta || quadrante || q
  const limpar = () => { setRegra(''); setPergunta(''); setQuadrante(''); setQ('') }

  return (
    <div>
      <div className="iv-entra flex items-end gap-2 mb-1">
        <span className="text-[40px] font-extrabold text-slate-900 leading-none tabular-nums tracking-tight"><Conta valor={clientes.length} /></span>
        <span className="text-[16px] text-slate-500 font-medium pb-1">clientes para ligar</span>
      </div>
      <p className="text-[12.5px] text-slate-400 mb-3">de {dados.totalCadastro.toLocaleString('pt-BR')} no cadastro · atualizado {String(dados.atualizadoEm).slice(11, 16)}</p>

      <div className="flex justify-end mb-2">
        <div className="w-[200px]">
          <Segmento pequeno valor={visual} onTroca={setVisual} opcoes={[{ id: 'mosaico', rotulo: 'Mosaico', icone: LayoutGrid }, { id: 'radar', rotulo: 'Radar', icone: Radar }]} />
        </div>
      </div>
      {visual === 'mosaico'
        ? <MosaicoRegras porRegra={porRegra} ativo={regra} onEscolher={escolherRegra} altura={290} />
        : (
          <div className="rounded-3xl border border-slate-200 bg-white p-2 iv-entra">
            <RadarIV clientes={clientes} filtro={quadrante} onFiltro={(x) => { setQuadrante(x); setLimite(20) }} onAbrir={(c) => abrir(c.id || c.chave)} />
          </div>
        )}

      {/* filtro por regra */}
      <Rotulo className="mt-4 mb-2">Motivo</Rotulo>
      <Rolagem>
        <Chip ativo={!regra} onClick={() => { setRegra(''); setLimite(20) }} contagem={clientes.length}>Todos</Chip>
        {Object.keys(REGRAS).filter((r) => porRegra[r]).sort((a, b) => porRegra[b] - porRegra[a]).map((r) => (
          <Chip key={r} ativo={regra === r} cor={REGRAS[r].cor} onClick={() => escolherRegra(r)} contagem={porRegra[r]}>
            <Icone nome={ICONE_REGRA[r]} size={14} /> {REGRAS[r].rotulo}
          </Chip>
        ))}
      </Rolagem>
      {regra && (
        <div key={regra} className="iv-entra mt-2 flex gap-3 items-center rounded-2xl p-3" style={{ background: `${REGRAS[regra].cor}0d`, border: `1px solid ${REGRAS[regra].cor}40` }}>
          <span className="w-10 h-10 shrink-0 rounded-xl grid place-items-center text-white" style={{ background: REGRAS[regra].cor }}><Icone nome={ICONE_REGRA[regra]} size={18} /></span>
          <div className="min-w-0 flex-1">
            <b className="block text-[14px] text-slate-900">{REGRAS[regra].rotulo}: {porRegra[regra]} clientes</b>
            <span className="block text-[12.5px] text-slate-600 leading-snug">{FRASE_REGRA[regra]}. {REGRAS[regra].explicacao}</span>
          </div>
        </div>
      )}
      {quadrante && (
        <div className="mt-2 flex items-center gap-2 text-[12.5px] text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: QUADRANTES.find((x) => x.id === quadrante).cor }} />
          Lado do radar: <b>{QUADRANTES.find((x) => x.id === quadrante).nome}</b> — {QUADRANTES.find((x) => x.id === quadrante).frase}
        </div>
      )}

      {/* perguntas prontas */}
      <Rotulo className="mt-4 mb-2">Perguntas prontas</Rotulo>
      <Rolagem>
        {PERGUNTAS.filter((p) => contaPergunta[p.id] > 0).map((p) => {
          const on = pergunta === p.id
          return (
            <button key={p.id} type="button" onClick={() => { setPergunta(on ? '' : p.id); setRegra(''); setLimite(20) }}
              className="shrink-0 w-[170px] text-left rounded-2xl p-3 transition iv-toque"
              style={on ? { background: '#0f172a', color: '#fefefe', border: '1px solid #0f172a' } : { background: '#fefefe', color: '#0f172a', border: `1px solid ${BD}` }}>
              <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: on ? '#fca5a5' : '#dc2626' }}><Search size={12} aria-hidden="true" /> {contaPergunta[p.id]} clientes</span>
              <span className="block text-[13px] font-semibold leading-snug mt-1">{p.texto}</span>
            </button>
          )
        })}
      </Rolagem>

      {/* busca */}
      <div className="relative mt-4">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setLimite(20) }} placeholder="Buscar nome, cidade, vendedor ou trator"
          className="w-full h-11 rounded-2xl border border-slate-200 bg-white pl-10 pr-10 text-[14px] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
        {q && <button type="button" onClick={() => setQ('')} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-slate-400"><X size={16} aria-hidden="true" /></button>}
      </div>

      <div className="flex items-center justify-between gap-2 mt-4 mb-2">
        <span className="text-[13px] text-slate-600"><b className="text-slate-900">{filtrados.length}</b> {filtrados.length === 1 ? 'cliente' : 'clientes'}
          {temFiltro && <button type="button" onClick={limpar} className="ml-2 text-red-700 font-semibold underline">limpar</button>}
        </span>
        <SeletorModo modo={modo} setModo={setModo} />
      </div>

      {modo === 'um'
        ? <UmPorVez itens={itens} onFicha={abrir} nome="todas" />
        : itens.length === 0
          ? <Vazio icone={Search}>Nenhum cliente com esse filtro.</Vazio>
          : (
            <div className="space-y-3">
              {itens.slice(0, limite).map((it, n) => <CartaoItem key={it.chave} item={it} onFicha={abrir} atraso={Math.min(n % 20, 8) * 50} />)}
              {itens.length > limite && (
                <button type="button" onClick={() => setLimite(limite + 20)} className="w-full h-11 rounded-2xl border border-slate-200 bg-white text-[14px] font-bold text-slate-700">
                  Mostrar mais {Math.min(20, itens.length - limite)}
                </button>
              )}
            </div>
          )}
    </div>
  )
}
