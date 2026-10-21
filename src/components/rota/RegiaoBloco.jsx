// Bloco "Na região" do cartão da rota: culturas que pesam (do cliente e da cidade)
// e máquinas EM ESTOQUE que fazem sentido para elas. Fechado mostra o resumo numa linha.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Package, Sprout } from 'lucide-react'

const preco = (p) => (p?.preco_min > 0 ? p.preco_min.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : null)

export default function RegiaoBloco({ regiao, cor }) {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  if (!regiao) return <div className="mx-4 mt-2.5 h-9 rounded-xl bg-slate-50 animate-pulse" />
  const { culturas, maquinas, dica, municipio } = regiao
  if (!culturas.length && !maquinas.length) return null

  const resumo = [
    culturas.slice(0, 2).map((c) => c.nome).join(' · '),
    maquinas.length ? `${maquinas.length} máquina${maquinas.length > 1 ? 's' : ''} em estoque` : null,
  ].filter(Boolean).join(' — ')

  return (
    <div className="mx-4 mt-2.5 rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={() => setAberto((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2 text-left active:bg-slate-50" aria-expanded={aberto}>
        <Sprout size={15} className="shrink-0" style={{ color: cor }} />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Na região{municipio ? ` de ${municipio.nome}` : ''}</span>
          <span className="block text-xs font-semibold text-slate-700 truncate">{resumo}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-slate-100">
          {culturas.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Culturas que pesam</p>
              <div className="space-y-1.5">
                {culturas.map((c) => (
                  <div key={c.nome} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 truncate font-semibold text-slate-700">{c.nome}</span>
                    <span className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <span className="block h-full rounded-full" style={{ width: `${Math.max(c.pct ?? (c.doCliente ? 100 : 0), 4)}%`, background: cor, opacity: c.doCliente ? 1 : 0.55 }} />
                    </span>
                    <span className="w-[72px] shrink-0 text-right text-[11px] text-slate-500 whitespace-nowrap">{c.doCliente ? 'do cliente' : `${c.pct ?? '—'}% da área`}</span>
                  </div>
                ))}
              </div>
              {dica && <p className="text-[11px] text-slate-500 mt-1.5">Para essa lavoura: {dica}.</p>}
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Para oferecer, em estoque</p>
            {maquinas.length === 0 && <p className="text-xs text-slate-500">Nada no estoque da loja que combine com essas culturas agora.</p>}
            <div className="space-y-1.5">
              {maquinas.map(({ produto: p, motivo }) => (
                <button
                  key={p.codigo_produto}
                  onClick={() => navigate(`/catalogo/sb-${p.codigo_produto}`)}
                  className="w-full flex items-center gap-2.5 rounded-lg bg-slate-50 p-2 text-left active:bg-slate-100"
                >
                  {p.imagem_url
                    ? <img src={p.imagem_url} alt="" loading="lazy" className="w-11 h-11 rounded-md object-contain bg-white shrink-0" />
                    : <span className="w-11 h-11 rounded-md bg-white shrink-0 grid place-items-center text-slate-300"><Package size={18} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-900 truncate">{p.modelo || p.descricao}</span>
                    <span className="block text-[11px] text-slate-500 truncate">{p.marca ? `${p.marca} · ` : ''}{motivo}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[10px] font-bold text-emerald-700">{p.estoque_efetivo} un</span>
                    {preco(p) && <span className="block text-[11px] font-semibold text-slate-700">{preco(p)}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
