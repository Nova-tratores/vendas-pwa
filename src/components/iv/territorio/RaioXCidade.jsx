// Raio-x da cidade no painel de baixo: área plantada por cultura, evolução da lavoura,
// valor da produção, rebanho, nossos clientes, concorrentes e imóveis do CAR.
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, AreaChart, Area, CartesianGrid } from 'recharts'
import { Beef, Building2, Map as IconeMapa, Milk, Swords, Tractor, UsersRound, Wheat } from 'lucide-react'
import { carregarCidade } from '../../../lib/iv/fonte'
import { useDados } from '../kit'
import { PainelBaixo, Dado, Barra, corCultura, corFoco, num, compacto, reais, pct } from './comum'

function Secao({ titulo, icone: Ic, children }) {
  return (
    <section className="ivt-entra mb-4">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5">
        {Ic && <Ic size={13} aria-hidden="true" />}{titulo}
      </h3>
      {children}
    </section>
  )
}

function Mini({ rotulo, valor, sub, cor = '#0f172a' }) {
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-2 min-w-0">
      <div className="text-[11px] text-slate-500 truncate">{rotulo}</div>
      <div className="text-[16px] font-bold truncate" style={{ color: cor }}>{valor}</div>
      {sub && <div className="text-[11px] text-slate-500 truncate">{sub}</div>}
    </div>
  )
}

function DicaGrafico({ active, payload, label, unidade }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow px-2.5 py-1.5 text-[12px]">
      <b className="text-slate-900">{label ?? payload[0].payload.nome}</b>
      <div className="text-slate-600">{num(payload[0].value)} {unidade}</div>
    </div>
  )
}

export default function RaioXCidade({ municipio: m, onFechar }) {
  const navigate = useNavigate()
  const { dados: c, carregando } = useDados(() => carregarCidade(m.ibge), [m.ibge])
  const culturas = m.culturas.slice(0, 8)
  const alturaCulturas = Math.max(120, culturas.length * 30 + 10)
  const maxValor = Math.max(1, ...(c?.valorCulturas || []).map((v) => v.valorMil))

  return (
    <PainelBaixo
      aberto
      onFechar={onFechar}
      titulo={<span className="inline-flex items-center gap-2">{m.nome} <span className="text-slate-400 font-semibold text-[14px]">{m.uf}</span></span>}
      sub={`Foco ${m.foco} · ${m.culturaPrincipal || 'várias culturas'}${m.daLoja ? '' : ' · fora da lista da loja'}`}
      rodape={
        <button type="button" onClick={() => navigate(`/inteligencia/prospeccao?municipio=${encodeURIComponent(m.nome)}`)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white font-semibold py-3 text-[14px] active:bg-red-700">
          <IconeMapa size={17} aria-hidden="true" /> Ver imóveis no mapa
        </button>
      }
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="w-14 h-14 rounded-full grid place-items-center text-white text-[18px] font-bold shrink-0 shadow"
          style={{ background: `radial-gradient(circle at 30% 30%, ${corFoco(m.foco)}bb, ${corFoco(m.foco)})` }}>{m.foco}</span>
        <div className="min-w-0 text-[13px] text-slate-600 leading-snug">
          <b className="text-slate-900">O que vender lá:</b> {m.linhas.join(' · ')}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Mini rotulo="Área plantada" valor={`${compacto(m.areaPlantadaHa)} ha`} cor="#15803d" />
        <Mini rotulo="Produção" valor={m.valorProducaoMil ? `R$ ${compacto(m.valorProducaoMil * 1000)}` : '—'} cor="#0f172a" />
        <Mini rotulo="Presença" valor={pct(m.penetracao)} sub="trator nosso / imóveis" cor="#b91c1c" />
      </div>

      <Secao titulo="Área plantada por cultura (ha)" icone={Wheat}>
        <div style={{ height: alturaCulturas }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={culturas} layout="vertical" margin={{ top: 0, right: 46, bottom: 0, left: 0 }} barCategoryGap={6}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="nome" width={96} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip content={<DicaGrafico unidade="ha" />} cursor={{ fill: 'rgba(148,163,184,.12)' }} />
              <Bar dataKey="ha" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={700} label={{ position: 'right', fontSize: 11.5, fill: '#334155', formatter: (v) => compacto(v) }}>
                {culturas.map((x) => <Cell key={x.nome} fill={corCultura(x.nome)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Secao>

      {carregando && !c && <div className="h-40 rounded-xl bg-slate-100 animate-pulse mb-4" />}

      {c && (
        <>
          <Secao titulo={`Lavoura nos últimos anos (IBGE ${c.anoAgro})`} icone={Wheat}>
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={c.serie} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="ivtSerie" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity=".35" /><stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="ano" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={compacto} width={52} />
                  <Tooltip content={<DicaGrafico unidade="ha plantados" />} />
                  <Area type="monotone" dataKey="areaHa" stroke="#16a34a" strokeWidth={2} fill="url(#ivtSerie)" dot={{ r: 3, fill: '#16a34a' }} animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Secao>

          <Secao titulo="Valor da produção por cultura" icone={Building2}>
            {c.valorCulturas.slice(0, 6).map((v, i) => (
              <div key={v.nome} className="flex items-center gap-2 py-1 text-[13px]">
                <span className="w-24 truncate text-slate-700">{v.nome}</span>
                <Barra valor={v.valorMil} max={maxValor} cor={corCultura(v.nome)} atraso={i * 60} />
                <span className="w-20 text-right font-semibold text-slate-900">R$ {compacto(v.valorMil * 1000)}</span>
              </div>
            ))}
            <p className="text-[12px] text-slate-500 mt-1">
              PIB {c.pib.ano}: R$ {compacto(c.pib.totalMil * 1000)}, sendo {c.pib.agroPct.toLocaleString('pt-BR')}% do agro.
              População {num(c.populacao.valor)}.
            </p>
          </Secao>

          <Secao titulo="Rebanho" icone={Beef}>
            <div className="grid grid-cols-3 gap-2">
              {c.rebanhos.map((rb) => <Mini key={rb.nome} rotulo={rb.nome} valor={compacto(rb.cabecas)} sub="cabeças" />)}
            </div>
            {c.leiteMilLitros > 0 && (
              <p className="text-[12.5px] text-slate-600 mt-1.5 inline-flex items-center gap-1.5"><Milk size={14} aria-hidden="true" />{num(c.leiteMilLitros)} mil litros de leite por ano</p>
            )}
          </Secao>

          <Secao titulo={`Máquinas no campo (Censo)`} icone={Tractor}>
            <Dado rotulo="Propriedades">{num(c.censo.propriedades)}</Dado>
            <Dado rotulo="Com trator">{num(c.censo.comTrator)} ({pct(1 - c.censo.semTratorPct, 0)})</Dado>
            <Dado rotulo="Tratores até 100 cv / acima">{num(c.censo.menos100cv)} / {num(c.censo.mais100cv)}</Dado>
          </Secao>
        </>
      )}

      <Secao titulo="Nossos clientes lá" icone={UsersRound}>
        <div className="grid grid-cols-3 gap-2 mb-1.5">
          <Mini rotulo="Clientes" valor={num(m.clientes)} sub={`${num(m.clientesAtivos)} ativos`} />
          <Mini rotulo="Com trator nosso" valor={num(m.clientesComTrator)} sub={`${num(m.tratoresVendidos)} tratores`} cor="#b91c1c" />
          <Mini rotulo="Oportunidades" valor={num(m.oportunidades)} sub={`${num(m.propostasAbertas)} propostas`} />
        </div>
        <Dado rotulo="Peças nos últimos 12 meses">{reais(m.pecas12m)}</Dado>
      </Secao>

      {c && (
        <Secao titulo="Concorrentes (propostas perdidas)" icone={Swords}>
          {c.concorrentes.length ? c.concorrentes.map((k) => (
            <Dado key={k.nome} rotulo={k.nome}>{k.perdas} {k.perdas === 1 ? 'perda' : 'perdas'}{k.valor ? ` · ${reais(k.valor)}` : ''}</Dado>
          )) : <p className="text-[13px] text-slate-500">Nenhuma proposta perdida para concorrente nesta cidade.</p>}
        </Secao>
      )}

      <Secao titulo="Imóveis rurais (CAR) e crédito" icone={IconeMapa}>
        <Dado rotulo="Imóveis no CAR">{num(m.imoveis)}</Dado>
        <Dado rotulo="Área útil">{compacto(m.areaUtilHa)} ha</Dado>
        <Dado rotulo="Imóveis que pegaram crédito">{num(m.imoveisComCredito)}</Dado>
        <Dado rotulo="Crédito rural 12 meses">{reais(m.credito12m)}</Dado>
        <Dado rotulo="Crédito rural 3 anos">{reais(m.credito36m)}</Dado>
        <Dado rotulo="Investimento 3 anos">{reais(m.invest36m)}</Dado>
      </Secao>
    </PainelBaixo>
  )
}
