// Inteligência de Vendas · Municípios (port de Municipios.tsx / vivo/ModoTerritorio.tsx / MapaBolhas.tsx
// do Portal). "Em que cidade vale mais a pena?" — ranking por FOCO (potencial × espaço), mapa de bolhas
// e, ao tocar, o raio-x da cidade.
import { useMemo, useState } from 'react'
import { Banknote, Beef, Coffee, Layers, LocateFixed, Map as IconeMapa, Sprout, Tractor, Wheat, Zap } from 'lucide-react'
import { carregarMunicipios } from '../../lib/iv/fonte'
import { useDados, CabecalhoIV, CarregandoIV, ErroIV } from '../../components/iv/kit'
import { EstiloTerritorio, Cartao, Kpi, Chip, ComoLer, Barra, corFoco, num, compacto } from '../../components/iv/territorio/comum'
import MapaBolhas from '../../components/iv/territorio/MapaBolhas'
import RaioXCidade from '../../components/iv/territorio/RaioXCidade'

const LINHAS = [
  { id: '', nome: 'Tudo', icone: Layers, re: null },
  { id: 'graos', nome: 'Grãos', dica: 'plantadeira e pulverizador', icone: Wheat, re: /soja|milho|trigo|feij|sorgo|aveia|amendoim/i },
  { id: 'cana', nome: 'Cana', dica: 'alta potência', icone: Zap, re: /cana/i },
  { id: 'perenes', nome: 'Café e frutas', dica: 'fruteiro', icone: Coffee, re: /caf|laranja|lim|tangerina|abacate|manga|uva|banana/i },
  { id: 'pecuaria', nome: 'Pecuária', dica: 'vagão e roçadeira', icone: Beef, re: null },
]

export default function Municipios() {
  const { dados, carregando, erro, recarregar } = useDados(carregarMunicipios, [])
  const [linha, setLinha] = useState('')
  const [aberto, setAberto] = useState(null)
  const atual = LINHAS.find((l) => l.id === linha)

  const medida = useMemo(() => (m) => (linha === 'pecuaria' ? m.bovinos || 0
    : atual.re ? m.culturas.filter((c) => atual.re.test(c.nome)).reduce((s, c) => s + c.ha, 0) : m.areaPlantadaHa), [linha, atual])
  const ms = useMemo(() => dados?.municipios ?? [], [dados])
  const lista = useMemo(() => {
    // mesma ordenação do Portal: sem linha = foco; com linha = medida da linha descontando metade da presença
    const nota = (m) => medida(m) * (1 - Math.min(1, (m.penetracao ?? 0) / 0.05) * 0.5)
    return [...ms].sort((a, b) => (linha ? nota(b) - nota(a) : b.foco - a.foco))
  }, [ms, linha, medida])
  const maxMed = Math.max(1, ...lista.map(medida))
  const soma = (f) => ms.reduce((s, m) => s + f(m), 0)

  if (carregando && !dados) return <><CabecalhoIV titulo="Municípios" subtitulo="Onde concentrar a venda" /><CarregandoIV linhas={5} /></>
  if (erro) return <><CabecalhoIV titulo="Municípios" /><ErroIV erro={erro} onTentar={recarregar} /></>
  const imoveisTot = soma((m) => m.imoveis || 0)
  const comTrator = soma((m) => m.clientesComTrator)
  const unidade = linha === 'pecuaria' ? ' cab.' : ' ha'

  return (
    <div>
      <EstiloTerritorio />
      <CabecalhoIV titulo="Municípios" subtitulo={`Onde concentrar a venda de cada máquina · IBGE ${dados.anoIBGE}, CAR e crédito rural`} />
      <ComoLer itens={[
        <><b>Foco</b> (0 a 100) = 65% potencial (área plantada, rebanho e crédito de investimento) + 35% espaço (pouca presença nossa). Foco alto = mercado grande e pouca gente com trator nosso.</>,
        <><b>No mapa</b>, cada bolha é uma cidade na posição real: o tamanho é a área plantada, a cor é o foco e o anel verde mostra a nossa presença. As linhas tracejadas saem da loja até as 5 cidades de maior foco.</>,
        <><b>Barra verde</b> = tamanho do mercado; <b>barra vermelha</b> = clientes com trator nosso ÷ imóveis do CAR.</>,
        <><b>Escolha a linha de máquina</b> (Grãos, Cana...) para reordenar. Toque numa cidade para abrir o raio-x.</>,
      ]} />

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <Kpi rotulo="Área plantada" valor={soma((m) => m.areaPlantadaHa)} formato={(v) => `${compacto(v)} ha`} cor="#15803d" icone={Sprout} />
        <Kpi rotulo="Imóveis no CAR" valor={imoveisTot} cor="#1d4ed8" icone={IconeMapa} atraso={70} />
        <Kpi rotulo="Investimento 3 anos" valor={soma((m) => m.invest36m || 0)} formato={(v) => `R$ ${compacto(v)}`} cor="#7c3aed" icone={Banknote} atraso={140} sub="crédito para máquina" />
        <Kpi rotulo="Com trator nosso" valor={comTrator} cor="#b91c1c" icone={Tractor} atraso={210}
          sub={`${((comTrator / Math.max(1, imoveisTot)) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% dos imóveis`} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 mb-3" style={{ scrollbarWidth: 'none' }}>
        {LINHAS.map((l) => {
          const Ic = l.icone
          return <Chip key={l.id} ativo={linha === l.id} onClick={() => setLinha(l.id)}><Ic size={14} aria-hidden="true" />{l.nome}</Chip>
        })}
      </div>
      {atual.dica && <p className="ivt-entra text-[12.5px] text-slate-500 -mt-1 mb-3">Ordenado pela área de {atual.nome.toLowerCase()} onde temos pouca presença: bom para {atual.dica}.</p>}

      <Cartao titulo="Mapa de bolhas" icone={LocateFixed}>
        <MapaBolhas municipios={ms} medida={medida} selecionado={aberto?.ibge ?? null} onSelecionar={setAberto} />
      </Cartao>

      <Cartao titulo={`Onde focar${linha ? ` · ${atual.nome}` : ''}`} icone={IconeMapa} className="mt-4">
        <div className="space-y-2">
          {lista.map((m, i) => {
            const pen = Math.min(1, (m.penetracao ?? 0) / 0.05)
            const cor = corFoco(m.foco)
            return (
              <button key={`${linha}-${m.ibge}`} type="button" onClick={() => setAberto(m)} style={{ animationDelay: `${i * 45}ms` }}
                className="ivt-entra w-full text-left border border-slate-200 rounded-2xl p-2.5 bg-white active:bg-slate-50 flex items-center gap-3">
                <span className="relative shrink-0">
                  <span className="w-11 h-11 rounded-full grid place-items-center text-white text-[15px] font-bold"
                    style={{ background: `radial-gradient(circle at 30% 30%, ${cor}bb, ${cor})`, boxShadow: `0 3px 10px ${cor}55` }}>{m.foco}</span>
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white border border-slate-200 text-[10.5px] font-bold text-slate-700 grid place-items-center">{i + 1}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <b className="text-[14.5px] text-slate-900 truncate">{m.nome}</b>
                    <span className="text-[12px] font-bold text-violet-700 shrink-0">R$ {compacto(m.invest36m || 0)}</span>
                  </span>
                  <span className="block text-[11.5px] text-slate-500 truncate mb-1">{m.culturas.slice(0, 3).map((c) => c.nome).join(' · ')}</span>
                  <span className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Barra valor={medida(m)} max={maxMed} cor="linear-gradient(90deg, #22c55e, #15803d)" atraso={i * 45} />
                    <span className="w-[62px] text-right">{compacto(medida(m))}{unidade}</span>
                  </span>
                  <span className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                    <Barra valor={pen} max={1} cor="linear-gradient(90deg, #f87171, #b91c1c)" atraso={i * 45 + 150} />
                    <span className="w-[62px] text-right">{num(m.clientesComTrator)} c/ trator</span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </Cartao>

      {aberto && <RaioXCidade key={aberto.ibge} municipio={aberto} onFechar={() => setAberto(null)} />}
    </div>
  )
}
