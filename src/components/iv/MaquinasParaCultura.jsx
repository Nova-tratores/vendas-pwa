// Ficha 360: "Para a lavoura dele — do nosso estoque". Cruza as culturas do cliente
// (e as maiores da cidade dele) com o ESTOQUE DA LOJA (catálogo › Estoque Loja) e
// mostra tratores e implementos que ajudam naquela lavoura. Regras em lib/regiaoCliente.js.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Package, Sprout, Tractor, Wrench } from 'lucide-react'
import { culturasDaRegiao, ehTrator, grupoDaCultura, GRUPOS, maquinasParaRegiao } from '../../lib/regiaoCliente'

const brl = (v) => (v > 0 ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : null)

export default function MaquinasParaCultura({ cliente, municipio }) {
  const navigate = useNavigate()
  const [estoque, setEstoque] = useState(null) // null = carregando; false = erro
  useEffect(() => {
    let vivo = true
    import('../../lib/catalogoSupabase')
      .then((c) => c.getEstoqueAtual())
      .then((e) => { if (vivo) setEstoque(e || []) })
      .catch(() => { if (vivo) setEstoque(false) })
    return () => { vivo = false }
  }, [])

  const culturas = culturasDaRegiao({ culturasCliente: cliente?.culturas || [], municipio })
  const grupos = [...new Set(culturas.map((c) => grupoDaCultura(c.nome)).filter(Boolean))]
  const { maquinas } = estoque ? maquinasParaRegiao(culturas, estoque, 6, 2) : { maquinas: [] }
  const tratores = maquinas.filter((m) => ehTrator(m.produto))
  const implementos = maquinas.filter((m) => !ehTrator(m.produto))
  const doCliente = culturas.filter((c) => c.doCliente)

  if (!culturas.length) return null

  return (
    <section className="iv-entra mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 pt-3.5 pb-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 inline-flex items-center gap-1.5">
          <Sprout size={14} className="text-emerald-600" /> Para a lavoura dele — do nosso estoque
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {culturas.map((c) => (
            <span key={c.nome} className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${c.doCliente ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {c.nome}{c.doCliente ? '' : c.pct != null ? ` · ${c.pct}% da cidade` : ''}
            </span>
          ))}
        </div>
        {grupos.length > 0 && (
          <p className="text-xs text-slate-600 mt-2 leading-snug">
            {doCliente.length ? 'Ele trabalha com ' : 'Na cidade dele pesa '}
            <b>{grupos.map((g) => GRUPOS[g].nome.toLowerCase()).join(' e ')}</b>: {GRUPOS[grupos[0]].dica}.
            {cliente?.areaHa ? ` Área de ${Math.round(cliente.areaHa).toLocaleString('pt-BR')} ha.` : ''}
          </p>
        )}
      </div>

      {estoque === null && <div className="mx-4 mb-4 h-24 rounded-xl bg-slate-100 animate-pulse" />}
      {estoque === false && <p className="px-4 pb-4 text-xs text-slate-500">Não foi possível ler o estoque agora.</p>}
      {estoque && maquinas.length === 0 && (
        <p className="px-4 pb-4 text-xs text-slate-500">Nada no estoque da loja combina com essa lavoura agora. Veja o portfólio completo no catálogo.</p>
      )}

      {[['Tratores', Tractor, tratores], ['Implementos para o trabalho', Wrench, implementos]].map(([titulo, I, lista]) => lista.length > 0 && (
        <div key={titulo} className="pb-3">
          <p className="px-4 pb-1.5 text-[11px] font-bold text-slate-500 inline-flex items-center gap-1"><I size={13} /> {titulo}</p>
          <div className="flex gap-2.5 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
            {lista.map(({ produto: p, motivo }) => (
              <button
                key={p.codigo_produto}
                onClick={() => navigate(`/catalogo/sb-${p.codigo_produto}`)}
                className="shrink-0 w-[150px] text-left rounded-xl border border-slate-200 overflow-hidden active:scale-[0.98] transition"
              >
                <span className="block aspect-[4/3] bg-white border-b border-slate-100 p-1.5">
                  {p.imagem_url
                    ? <img src={p.imagem_url} alt="" loading="lazy" className="w-full h-full object-contain" />
                    : <span className="w-full h-full grid place-items-center text-slate-300"><Package size={26} /></span>}
                </span>
                <span className="block p-2">
                  <span className="block text-[10px] font-bold uppercase text-slate-400 truncate">{p.marca || '—'}</span>
                  <span className="block text-[13px] font-bold text-slate-900 leading-tight line-clamp-2 h-[34px]">{p.modelo || p.descricao}</span>
                  <span className="block text-[11px] text-slate-500 mt-1 line-clamp-2 h-[30px]">{motivo}</span>
                  <span className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5">{p.estoque_efetivo} un</span>
                    <span className="text-[11px] font-bold text-slate-800">{brl(p.preco_min) || 'consulte'}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {estoque && maquinas.length > 0 && (
        <button onClick={() => navigate('/catalogo')} className="w-full border-t border-slate-100 py-2.5 text-xs font-bold text-blue-700 inline-flex items-center justify-center gap-1 active:bg-slate-50">
          Ver todo o estoque <ChevronRight size={14} />
        </button>
      )}
    </section>
  )
}
