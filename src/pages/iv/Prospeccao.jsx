// Inteligência de Vendas · Prospecção (port de ProspeccaoViva / ModoTerritorio do Portal e da
// guia Prospecção/Mapa do Dashboard Agro). No celular: os 4 caminhos em cima, o mapa dos
// imóveis do CAR com filtros, a lista ordenável e o bloco "o que fazer" com o Tratorilson.
import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDownWideNarrow, ChevronDown, Map as IconeMapa, MapPin, Rows3, UserRound } from 'lucide-react'
import { carregarProspeccao, carregarImoveisCar } from '../../lib/iv/fonte'
import { useDados, CabecalhoIV, CarregandoIV, ErroIV, useAbrirCliente } from '../../components/iv/kit'
import {
  EstiloTerritorio, Cartao, Kpi, Chip, ComoLer, corCultura, PRIORIDADES, num, compacto, reais,
} from '../../components/iv/territorio/comum'
import MapaImoveis from '../../components/iv/territorio/MapaImoveis'
import FichaImovel from '../../components/iv/territorio/FichaImovel'
import OQueFazer, { CAMINHOS } from '../../components/iv/territorio/OQueFazer'

const ORDENS = [
  { id: 'score', rotulo: 'Prioridade', valor: (p) => p.score },
  { id: 'area', rotulo: 'Área', valor: (p) => p.areaHa },
  { id: 'credito', rotulo: 'Crédito', valor: (p) => p.credito },
  { id: 'investimento', rotulo: 'Investimento', valor: (p) => p.investimento },
]
const PASSO = 12

async function carregarTudo() {
  const [resumo, car] = await Promise.all([carregarProspeccao(), carregarImoveisCar()])
  return { resumo, imoveis: car.imoveis }
}

export default function Prospeccao() {
  const { dados, carregando, erro, recarregar } = useDados(carregarTudo, [])
  const abrirCliente = useAbrirCliente()
  const [params] = useSearchParams()
  const [prioridade, setPrioridade] = useState('')
  const [cultura, setCultura] = useState('')
  const [municipio, setMunicipio] = useState(params.get('municipio') || '')
  const [semCliente, setSemCliente] = useState(false)
  const [ordem, setOrdem] = useState('score')
  const [mostrar, setMostrar] = useState(PASSO)
  const [sel, setSel] = useState(null)
  const [grupo, setGrupo] = useState('carteira')
  const refMapa = useRef(null)
  const refFazer = useRef(null)

  const imoveis = useMemo(() => dados?.imoveis ?? [], [dados])
  const culturas = useMemo(() => {
    const m = new Map()
    for (const p of imoveis) m.set(p.cultura, (m.get(p.cultura) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([nome, qtd]) => ({ nome, qtd }))
  }, [imoveis])
  const municipios = useMemo(() => [...new Set(imoveis.map((p) => p.municipio))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [imoveis])

  const filtrados = useMemo(() => imoveis.filter((p) =>
    (!prioridade || p.prioridade === prioridade) && (!cultura || p.cultura === cultura) && (!municipio || p.municipio === municipio) && (!semCliente || !p.vinculos),
  ), [imoveis, prioridade, cultura, municipio, semCliente])
  const ordenados = useMemo(() => {
    const f = ORDENS.find((o) => o.id === ordem).valor
    return [...filtrados].sort((a, b) => f(b) - f(a) || b.areaHa - a.areaHa)
  }, [filtrados, ordem])
  const soma = useMemo(() => ({
    area: filtrados.reduce((s, p) => s + p.areaHa, 0),
    credito: filtrados.reduce((s, p) => s + (p.credito || 0), 0),
    alta: filtrados.filter((p) => p.prioridade === 'alta').length,
    sem: filtrados.filter((p) => !p.vinculos).length,
  }), [filtrados])
  const chaveFiltro = `${prioridade}|${cultura}|${municipio}|${semCliente}`
  const temFiltro = prioridade || cultura || municipio || semCliente

  const limpar = () => { setPrioridade(''); setCultura(''); setMunicipio(''); setSemCliente(false) }
  const fechar = useCallback(() => setSel(null), [])
  const focarImovel = useCallback((p) => {
    setSel(p)
    refMapa.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])
  const irParaImovel = (cod) => {
    const p = imoveis.find((x) => x.cod === cod)
    if (!p) return
    limpar()
    focarImovel(p)
  }
  const verCaminho = (id) => { setGrupo(id); refFazer.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  if (carregando && !dados) return <><CabecalhoIV titulo="Prospecção" subtitulo="Quem procurar e onde" /><CarregandoIV linhas={5} /></>
  if (erro) return <><CabecalhoIV titulo="Prospecção" /><ErroIV erro={erro} onTentar={recarregar} /></>
  const r = dados.resumo
  const topCidade = r.territorio.municipios[0]
  const numeros = {
    carteira: { valor: r.carteira.comMotivo, sub: 'clientes com motivo' },
    recuperar: { valor: r.recuperar.parados, sub: `parados · ${reais(r.recuperar.valorParado)}` },
    novos: { valor: r.novos.propriedades.length, sub: 'imóveis sem cliente nosso' },
    territorio: { valor: topCidade?.nome || '—', sub: topCidade ? `1º lugar · foco ${topCidade.foco}` : 'sem dados' },
  }

  return (
    <div>
      <EstiloTerritorio />
      <CabecalhoIV titulo="Prospecção" subtitulo="Quem procurar e onde: carteira, negócios parados e propriedades do CAR" />
      <ComoLer itens={[
        <><b>Os 4 quadros de cima</b> são os caminhos da prospecção. Toque num deles para o Tratorilson explicar por onde começar.</>,
        <><b>No mapa</b>, cada mancha é um imóvel rural do CAR. A <b>cor</b> é a cultura principal; quanto mais <b>forte</b> a cor, maior a prioridade (área, crédito e investimento).</>,
        <><b>Contorno cheio</b> = já tem cliente nosso ligado. <b>Contorno tracejado</b> = dono a descobrir.</>,
        <><b>Toque no imóvel</b> para ver área, crédito rural, cliente e traçar a rota no Google Maps.</>,
        <><b>Filtre</b> por prioridade, cultura e município; a lista embaixo do mapa segue os mesmos filtros e pode ser ordenada.</>,
      ]} />

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {CAMINHOS.map((c, i) => (
          <Kpi key={c.id} rotulo={c.nome} icone={c.icone} cor={c.cor} valor={numeros[c.id].valor} sub={numeros[c.id].sub}
            atraso={i * 70} ativo={grupo === c.id} onClick={() => verCaminho(c.id)} />
        ))}
      </div>

      {/* ── Mapa ─────────────────────────────────────────────── */}
      <div ref={refMapa} className="scroll-mt-4">
        <Cartao titulo="Mapa dos imóveis (CAR)" icone={IconeMapa}
          extra={temFiltro ? <button type="button" onClick={limpar} className="text-[12.5px] font-semibold text-red-600 shrink-0">Limpar filtros</button> : null}>
          <div className="space-y-2 mb-3">
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5" style={{ scrollbarWidth: 'none' }}>
              <Chip ativo={!prioridade} onClick={() => setPrioridade('')}>Todas</Chip>
              {Object.entries(PRIORIDADES).map(([id, p]) => (
                <Chip key={id} ativo={prioridade === id} cor={p.cor} onClick={() => setPrioridade(prioridade === id ? '' : id)}>{p.rotulo}</Chip>
              ))}
              <Chip ativo={semCliente} onClick={() => setSemCliente((s) => !s)}>Sem cliente nosso</Chip>
            </div>
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {culturas.map((c) => (
                <Chip key={c.nome} ativo={cultura === c.nome} cor={corCultura(c.nome)} onClick={() => setCultura(cultura === c.nome ? '' : c.nome)}>
                  {c.nome} <span className="opacity-60">{c.qtd}</span>
                </Chip>
              ))}
            </div>
            <label className="relative block">
              <span className="sr-only">Município</span>
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
              <select value={municipio} onChange={(e) => setMunicipio(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-slate-800 font-medium">
                <option value="">Todos os municípios</option>
                {municipios.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="bg-slate-50 rounded-xl py-2">
              <div className="text-[17px] font-bold text-slate-900">{num(filtrados.length)}</div>
              <div className="text-[11px] text-slate-500">imóveis · {soma.alta} alta</div>
            </div>
            <div className="bg-slate-50 rounded-xl py-2">
              <div className="text-[17px] font-bold text-green-700">{compacto(soma.area)} ha</div>
              <div className="text-[11px] text-slate-500">área somada</div>
            </div>
            <div className="bg-slate-50 rounded-xl py-2">
              <div className="text-[17px] font-bold text-violet-700">{reais(soma.credito)}</div>
              <div className="text-[11px] text-slate-500">crédito 3 anos</div>
            </div>
          </div>

          {filtrados.length ? (
            <MapaImoveis imoveis={filtrados} selecionado={sel} onSelecionar={setSel} chaveFiltro={chaveFiltro} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-[13.5px] text-slate-500">
              Nenhum imóvel com esses filtros.
              <button type="button" onClick={limpar} className="block mx-auto mt-2 font-semibold text-red-600">Limpar filtros</button>
            </div>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-[11.5px] text-slate-500">
            {culturas.map((c) => (
              <span key={c.nome} className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: corCultura(c.nome) }} />{c.nome}</span>
            ))}
            <span>· cor forte = prioridade alta</span>
            <span>· contorno cheio = cliente nosso</span>
          </div>
        </Cartao>
      </div>

      {/* ── Lista ────────────────────────────────────────────── */}
      <Cartao titulo={`Imóveis (${filtrados.length})`} icone={Rows3} className="mt-4">
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 mb-2" style={{ scrollbarWidth: 'none' }}>
          <ArrowDownWideNarrow size={16} className="text-slate-400 shrink-0" aria-label="Ordenar por" />
          {ORDENS.map((o) => <Chip key={o.id} ativo={ordem === o.id} onClick={() => { setOrdem(o.id); setMostrar(PASSO) }}>{o.rotulo}</Chip>)}
        </div>
        <div>
          {ordenados.slice(0, mostrar).map((p, i) => {
            const pr = PRIORIDADES[p.prioridade] || PRIORIDADES.baixa
            return (
              <button key={`${ordem}-${p.cod}`} type="button" onClick={() => focarImovel(p)} style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                className={`ivt-entra w-full flex items-center gap-3 text-left py-2.5 border-b border-slate-100 last:border-0 active:bg-slate-50 ${sel?.cod === p.cod ? 'bg-red-50/60' : ''}`}>
                <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-[12px] font-bold"
                  style={{ background: `${corCultura(p.cultura)}${p.prioridade === 'alta' ? 'cc' : p.prioridade === 'media' ? '88' : '44'}`, color: '#0f172a' }}>
                  {p.score}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <b className="text-[14px] text-slate-900 truncate">{num(p.areaHa)} ha · {p.cultura}</b>
                  </span>
                  <span className="flex items-center gap-1 text-[12px] text-slate-500 truncate">
                    {p.municipio}
                    {p.clienteNome
                      ? <><span aria-hidden="true">·</span><UserRound size={12} aria-hidden="true" /><span className="truncate">{p.clienteNome}</span></>
                      : <span> · sem cliente</span>}
                  </span>
                </span>
                <span className="text-right shrink-0">
                  <span className={`block text-[11px] font-bold px-2 py-0.5 rounded-full ${pr.fundo}`}>{pr.rotulo}</span>
                  <span className="block text-[11.5px] text-slate-500 mt-0.5">{reais(ordem === 'investimento' ? p.investimento : p.credito)}</span>
                </span>
              </button>
            )
          })}
        </div>
        {ordenados.length > mostrar && (
          <button type="button" onClick={() => setMostrar((m) => m + PASSO)}
            className="w-full mt-2 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-[13.5px] font-semibold">
            Ver mais {Math.min(PASSO, ordenados.length - mostrar)}
          </button>
        )}
      </Cartao>

      {/* ── O que fazer ──────────────────────────────────────── */}
      <div ref={refFazer} className="mt-4 scroll-mt-4">
        <OQueFazer dados={r} grupo={grupo} onGrupo={setGrupo} onAbrirCliente={abrirCliente} onImovel={irParaImovel} />
      </div>

      {sel && <FichaImovel imovel={sel} onFechar={fechar} onAbrirCliente={abrirCliente} />}
    </div>
  )
}
