// =============================================================================
// /inteligencia/empresas — CNPJ na Receita (espelho de Empresas.tsx).
//   * empresas rurais abertas nos últimos 24 meses nos municípios da loja
//   * CNAE da carteira (atividade dos clientes com CNPJ)
//   * prestadores de serviço agrícola (CNAE 0161) — alta capacidade de compra
// Ligar / WhatsApp quando a Receita trouxer telefone.
// =============================================================================
import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts'
import { Briefcase, Building2, CalendarDays, ChartColumn, CircleCheck, MapPin, Search, Tractor, Wrench } from 'lucide-react'
import { carregarEmpresas, hojeISO } from '../../lib/iv/fonte'
import { CabecalhoIV, CarregandoIV, ErroIV, useDados } from '../../components/iv/kit'
import { BotoesContato, Cartao, Chip, Chips, ComoLer, dataBR, EstilosIVF, fmtCnpj, fmtFone, Kpi, pct, Selo, textoNorm, Vazio } from '../../components/iv/ferramentas/kit'

const PORTE = { ME: 'Microempresa', EPP: 'Pequeno porte', DEMAIS: 'Médio/grande' }
const titulo = (s) => String(s || '').toLowerCase().replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase()).replace(/\s(De|Da|Do|Dos|Das|E)\s/g, (x) => x.toLowerCase())
const meses = (iso, hoje) => {
  if (!iso) return null
  const [a, m] = iso.split('-').map(Number), [ha, hm] = hoje.split('-').map(Number)
  return (ha - a) * 12 + (hm - m)
}
const idade = (n) => (n == null ? '' : n <= 0 ? 'aberta este mês' : n === 1 ? 'há 1 mês' : `há ${n} meses`)
const CORES = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#7c3aed', '#db2777', '#475569']

export default function Empresas() {
  const { dados, carregando, erro, recarregar } = useDados(() => carregarEmpresas(), [])
  return (
    <div>
      <EstilosIVF />
      <CabecalhoIV titulo="Empresas" subtitulo="Empresas rurais novas na região e a atividade dos clientes (Receita Federal)" />
      <ComoLer itens={[
        <><b>Empresas rurais novas</b>: CNPJ de atividade rural aberto nos últimos 24 meses nos municípios da loja. Abrir CNPJ não quer dizer que vai comprar máquina: qualifique antes de abordar.</>,
        <><b>Já é cliente</b> (selo verde): o CNPJ já está no nosso cadastro. Os outros são gente nova.</>,
        <><b>CNAE da carteira</b>: o que fazem os clientes que têm CNPJ. <b>Prestadores de serviço</b> (CNAE 0161) usam muito a máquina e trocam mais cedo.</>,
      ]} />
      {carregando && <CarregandoIV linhas={5} />}
      {erro && <ErroIV erro={erro} onTentar={recarregar} />}
      {dados?.semTabela && <Vazio>A tabela de CNPJ ainda não foi criada no Portal.</Vazio>}
      {dados && !dados.semTabela && <Tela dados={dados} />}
    </div>
  )
}

function Tela({ dados }) {
  const hoje = hojeISO()
  const [aba, setAba] = useState('novas')
  const [busca, setBusca] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [soNovos, setSoNovos] = useState(false)
  const cart = dados.carteira

  const municipios = useMemo(() => {
    const m = new Map()
    for (const n of dados.novas) if (n.municipio) m.set(n.municipio, (m.get(n.municipio) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [dados])
  const novas = useMemo(() => {
    const q = textoNorm(busca)
    return dados.novas.filter((n) => (!municipio || n.municipio === municipio) && (!soNovos || !n.jaCliente)
      && (!q || textoNorm([n.razao_social, n.nome_fantasia, n.cnae_descricao, n.cnpj].join(' ')).includes(q)))
  }, [dados, busca, municipio, soNovos])
  const naoClientes = dados.novas.filter((n) => !n.jaCliente).length
  const cnaeGrafico = cart.porCnae.slice(0, 8).map((c) => ({ ...c, nome: encurtar(c.descricao || c.cnae) }))

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-2 gap-2.5">
        <Kpi rotulo="Empresas rurais novas" valor={dados.novas.length} cor="#dc2626" icone={Building2} sub="abertas em 24 meses" ativo={aba === 'novas' && !soNovos} onClick={() => { setAba('novas'); setSoNovos(false) }} />
        <Kpi rotulo="Ainda não clientes" valor={naoClientes} cor="#0f172a" icone={Briefcase} atraso={60} sub="gente nova para abordar" ativo={aba === 'novas' && soNovos} onClick={() => { setAba('novas'); setSoNovos(true) }} />
        <Kpi rotulo="Clientes com CNPJ" valor={cart.cnpjs} cor="#475569" icone={ChartColumn} atraso={120} sub={`${cart.cnpjs ? pct(cart.consultados / cart.cnpjs) : '—'} com CNAE`} onClick={() => setAba('carteira')} ativo={aba === 'carteira'} />
        <Kpi rotulo="Prestadores de serviço" valor={cart.prestadores.length} cor="#16a34a" icone={Tractor} atraso={180} sub="CNAE 0161" onClick={() => setAba('carteira')} />
      </div>

      <div className="flex gap-1 p-1 rounded-2xl bg-white border border-slate-200">
        {[['novas', `Empresas novas (${dados.novas.length})`], ['carteira', 'CNAE da carteira']].map(([k, n]) => (
          <button key={k} type="button" onClick={() => setAba(k)} className={`flex-1 rounded-xl py-2 text-[13px] font-extrabold ${aba === k ? 'bg-red-600 text-white shadow' : 'text-slate-700'}`}>{n}</button>
        ))}
      </div>

      {aba === 'novas' && (
        <div className="grid grid-cols-1 gap-2.5">
          <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 focus-within:ring-2 focus-within:ring-red-500/40">
            <Search size={16} className="text-slate-400" aria-hidden="true" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, atividade ou CNPJ" className="w-full py-2.5 bg-transparent focus:outline-none" />
          </label>
          <Chips>
            <Chip ativo={!municipio} onClick={() => setMunicipio('')}>Todos os municípios</Chip>
            {municipios.map(([m, n]) => <Chip key={m} ativo={municipio === m} onClick={() => setMunicipio(municipio === m ? '' : m)}>{titulo(m)} ({n})</Chip>)}
          </Chips>
          <label className="inline-flex items-center gap-2 text-[13px] text-slate-700">
            <input type="checkbox" className="w-5 h-5 accent-red-600" checked={soNovos} onChange={(e) => setSoNovos(e.target.checked)} /> Esconder quem já é cliente
          </label>
          <div key={`${municipio}-${soNovos}`} className="grid grid-cols-1 gap-2.5">
            {novas.map((n, i) => <CartaoEmpresa key={n.cnpj} n={n} hoje={hoje} ordem={i} />)}
            {novas.length === 0 && <Vazio>Nenhuma empresa com esse filtro.</Vazio>}
          </div>
        </div>
      )}

      {aba === 'carteira' && (
        <div className="grid grid-cols-1 gap-3">
          <Cartao titulo="Atividade (CNAE) dos clientes com CNPJ" icone={ChartColumn} corpo="px-2 pt-1 pb-3">
            {cnaeGrafico.length === 0 ? <div className="px-2 text-[13px] text-slate-500">Nenhum CNAE consultado ainda.</div> : (
              <div style={{ height: cnaeGrafico.length * 40 + 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cnaeGrafico} layout="vertical" margin={{ top: 4, right: 30, left: 4, bottom: 0 }}>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 11.5, fill: '#334155' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v, n, it) => [`${v} cliente${v > 1 ? 's' : ''}`, it?.payload?.descricao || '']} cursor={{ fill: '#94a3b822' }} />
                    <Bar dataKey="clientes" radius={[0, 7, 7, 0]} barSize={20} animationDuration={900}>
                      {cnaeGrafico.map((c, i) => <Cell key={c.cnae} fill={/^0161/.test(c.cnae) ? '#16a34a' : CORES[i % CORES.length]} />)}
                      <LabelList dataKey="clientes" position="right" style={{ fontSize: 12, fontWeight: 800, fill: '#0f172a' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="px-2 mt-1 text-[11.5px] text-slate-500">{cart.consultados} de {cart.cnpjs} clientes com CNPJ já consultados na Receita. Verde = prestador de serviço.</p>
          </Cartao>

          <Cartao titulo={`Prestadores de serviço agrícola (${cart.prestadores.length})`} icone={Wrench} atraso={80}>
            {cart.prestadores.length === 0 && <div className="text-[13px] text-slate-500">Nenhum ainda.</div>}
            <div className="divide-y divide-slate-100">
              {cart.prestadores.map((p) => (
                <div key={p.cnpj} className="py-2.5">
                  <div className="text-[13.5px] font-extrabold text-slate-900">{titulo(p.nome)}</div>
                  <div className="text-[12px] text-slate-500 flex items-center gap-1"><MapPin size={12} aria-hidden="true" /> {titulo(p.municipio)} · {fmtCnpj(p.cnpj)}</div>
                  <div className="text-[12px] text-slate-600 mt-0.5">{p.cnae}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] text-slate-500">Prestador de serviço trabalha a área de vários vizinhos: máquina roda mais horas e a troca vem antes. Bom público para a Calculadora (serviço para terceiros).</p>
          </Cartao>
        </div>
      )}
    </div>
  )
}

function CartaoEmpresa({ n, hoje, ordem }) {
  const m = meses(n.data_inicio, hoje)
  const nome = n.nome_fantasia || titulo(n.razao_social)
  return (
    <div className="ivf-entra bg-white border border-slate-200 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(15,23,42,.05)]" style={{ animationDelay: `${Math.min(ordem, 10) * 45}ms` }}>
      <div className="flex items-start gap-2">
        <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: n.jaCliente ? '#dcfce7' : '#fee2e2', color: n.jaCliente ? '#15803d' : '#b91c1c' }}>
          {n.jaCliente ? <CircleCheck size={20} aria-hidden="true" /> : <Building2 size={20} aria-hidden="true" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-extrabold text-slate-900 leading-tight">{nome}</div>
          {n.nome_fantasia && n.razao_social && <div className="text-[11.5px] text-slate-500 truncate">{n.razao_social}</div>}
          <div className="text-[11.5px] text-slate-500 tabular-nums">{fmtCnpj(n.cnpj)}</div>
        </div>
        {n.jaCliente && <Selo cor="#16a34a" cheio>já é cliente</Selo>}
      </div>
      <div className="mt-2 text-[13px] text-slate-800 leading-snug">{n.cnae_descricao}{n.cnae_codigo ? <span className="text-slate-400"> · {n.cnae_codigo}</span> : null}</div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <Selo cor="#475569"><MapPin size={11} aria-hidden="true" /> {titulo(n.municipio)}{n.uf ? `/${n.uf}` : ''}</Selo>
        <Selo cor={m != null && m <= 3 ? '#dc2626' : '#475569'}><CalendarDays size={11} aria-hidden="true" /> {dataBR(n.data_inicio)} · {idade(m)}</Selo>
        {n.porte && <Selo cor="#7c3aed">{PORTE[n.porte] || n.porte}</Selo>}
      </div>
      {n.telefone && (
        <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[12.5px] text-slate-600 tabular-nums">{fmtFone(n.telefone)}</span>
          <BotoesContato pequeno telefone={n.telefone} texto={`Olá! Aqui é da Nova Tratores, revenda Mahindra. Vi que a ${nome} começou há pouco tempo e gostaria de apresentar nossas máquinas.`} />
        </div>
      )}
    </div>
  )
}

function encurtar(s) {
  const t = String(s || '').replace(/^Cultivo de /i, '').replace(/^Criação de /i, 'Criação ').replace(/Serviço de preparação de terreno, cultivo e colheita/i, 'Serviço de preparo e colheita')
  return t.length > 24 ? `${t.slice(0, 23)}…` : t.charAt(0).toUpperCase() + t.slice(1)
}
