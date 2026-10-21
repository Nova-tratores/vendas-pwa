// Ficha do imóvel rural (CAR) no painel de baixo: área, cultura, crédito rural,
// prioridade, cliente ligado (abre a ficha 360) e "Traçar rota" no Google Maps.
import { Banknote, Link2, MapPin, Navigation, Sprout, UserRound, UserSearch } from 'lucide-react'
import { PainelBaixo, Dado, corCultura, PRIORIDADES, num, reais } from './comum'

const codCurto = (c) => (c && c.length > 18 ? `${c.slice(0, 13)}…${c.slice(-4)}` : c)

export default function FichaImovel({ imovel, onFechar, onAbrirCliente }) {
  if (!imovel) return null
  const p = imovel
  const pr = PRIORIDADES[p.prioridade] || PRIORIDADES.baixa
  const rota = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
  const porHa = p.areaHa ? p.credito / p.areaHa : 0
  const porque = [
    p.areaHa >= 500 ? 'área grande' : p.areaHa >= 200 ? 'área média' : 'área pequena',
    p.investimento >= 1e6 ? 'pegou bastante crédito para investir' : p.investimento > 0 ? 'pegou algum crédito para investir' : 'sem crédito de investimento',
    p.vinculos ? 'já tem cliente nosso' : 'sem cliente nosso ligado',
  ]
  return (
    <PainelBaixo
      aberto
      onFechar={onFechar}
      titulo={`${num(p.areaHa)} ha de ${String(p.cultura || 'várias culturas').toLowerCase()}`}
      sub={<span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{p.municipio} ({p.uf})</span>}
      rodape={
        <div className="grid grid-cols-2 gap-2">
          <a href={rota} target="_blank" rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white font-semibold py-3 text-[14px] active:bg-red-700">
            <Navigation size={17} aria-hidden="true" /> Traçar rota
          </a>
          {p.clienteId ? (
            <button type="button" onClick={() => onAbrirCliente(p.clienteId)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 text-slate-800 font-semibold py-3 text-[14px] active:bg-slate-50">
              <UserRound size={17} aria-hidden="true" /> Ficha do cliente
            </button>
          ) : (
            <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-500 font-semibold py-3 text-[13px] text-center px-2">
              <UserSearch size={17} aria-hidden="true" /> Dono a descobrir
            </span>
          )}
        </div>
      }
    >
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full ${pr.fundo}`}>
          Prioridade {pr.rotulo.toLowerCase()} · nota {p.score}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: corCultura(p.cultura) }} aria-hidden="true" />{p.cultura}
        </span>
        {p.status_car === 'AT' && <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">CAR ativo</span>}
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-[12px] text-slate-500 mb-1"><span>Nota de oportunidade</span><b className="text-slate-800">{p.score}/100</b></div>
        <span className="block h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <span className="ivt-barra block h-full rounded-full" style={{ width: `${p.score}%`, background: pr.cor }} />
        </span>
        <p className="text-[12.5px] text-slate-500 mt-1.5">Por quê: {porque.join(', ')}.</p>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mt-1 mb-1 flex items-center gap-1.5"><Sprout size={13} aria-hidden="true" />Propriedade</h3>
      <div className="mb-3">
        <Dado rotulo="Área">{num(p.areaHa)} ha</Dado>
        <Dado rotulo="Cultura principal">{p.cultura || '—'}</Dado>
        <Dado rotulo="Município">{p.municipio} ({p.uf})</Dado>
        <Dado rotulo="Código CAR"><span title={p.cod} className="font-mono text-[12px]">{codCurto(p.cod)}</span></Dado>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-1.5"><Banknote size={13} aria-hidden="true" />Crédito rural (3 anos)</h3>
      <div className="mb-3">
        <Dado rotulo="Crédito total">{reais(p.credito)}</Dado>
        <Dado rotulo="Para investimento">{reais(p.investimento)}</Dado>
        <Dado rotulo="Crédito por hectare">{porHa ? `R$ ${num(porHa)}/ha` : '—'}</Dado>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-1.5"><Link2 size={13} aria-hidden="true" />Cliente ligado</h3>
      {p.clienteNome ? (
        <button type="button" onClick={() => onAbrirCliente(p.clienteId)}
          className="w-full flex items-center gap-3 text-left bg-slate-50 border border-slate-200 rounded-xl p-3 active:bg-slate-100">
          <span className="w-9 h-9 rounded-full bg-red-100 text-red-700 grid place-items-center shrink-0"><UserRound size={18} aria-hidden="true" /></span>
          <span className="min-w-0">
            <b className="block text-[14px] text-slate-900 truncate">{p.clienteNome}</b>
            <span className="text-[12px] text-slate-500">Toque para abrir a ficha 360</span>
          </span>
        </button>
      ) : (
        <p className="text-[13px] text-slate-600 bg-amber-50 border border-amber-100 rounded-xl p-3">
          Nenhum cliente nosso ligado a este imóvel. Passe na propriedade ou pergunte aos vizinhos quem é o dono.
        </p>
      )}
    </PainelBaixo>
  )
}
