// Janela que sobe de baixo (detalhes no Início: taxas do Plano Safra e indicadores).
// Fecha no X, no toque fora e no Esc. Fica acima da barra de baixo e abaixo do bloqueio do checklist.
import { useEffect } from 'react'
import { ExternalLink, Minus, TrendingDown, TrendingUp, X } from 'lucide-react'

export default function Folha({ aberta, onFechar, titulo, sobretitulo, cor = '#b91c1c', children }) {
  useEffect(() => {
    if (!aberta) return
    const esc = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberta, onFechar])
  if (!aberta) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button className="absolute inset-0 bg-slate-900/50" onClick={onFechar} aria-label="Fechar" />
      <div className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl ini-entra">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 pt-4 pb-3 border-b border-slate-100 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {sobretitulo && <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: cor }}>{sobretitulo}</p>}
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{titulo}</h2>
          </div>
          <button onClick={onFechar} className="w-9 h-9 rounded-full bg-slate-100 grid place-items-center shrink-0 active:bg-slate-200" aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">{children}</div>
      </div>
    </div>
  )
}

/** Linha "rótulo: valor" usada nos detalhes. */
export function Dado({ rotulo, children }) {
  if (children == null || children === '') return null
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{rotulo}</p>
      <p className="text-sm text-slate-800 leading-snug">{children}</p>
    </div>
  )
}

// O que cada indicador muda na conversa com o produtor
const PARA_VENDA = {
  dolar: 'Dólar alto encarece peças e máquinas com componente importado e costuma puxar a tabela para cima: bom argumento para fechar antes do próximo reajuste. Também aumenta a renda de quem exporta soja e café.',
  selic: 'Selic alta deixa caros os financiamentos fora do Plano Safra. Isso valoriza as linhas subsidiadas (Pronaf, Pronamp, Moderfrota): mostre a diferença de parcela.',
  soja: 'Soja em alta = produtor de grãos capitalizado. Hora de falar de plantadeira, pulverizador e trator de maior potência.',
  milho: 'Milho bom melhora a renda da safrinha e de quem faz silagem: conversa sobre trator para ensilar e implementos de colheita.',
  cafe: 'Café valorizado anima o cafeicultor: trator estreito, atomizador e roçadeira.',
  boi: 'Arroba alta = pecuarista com caixa. Roçadeira, distribuidor de calcário, vagão misturador e trator de 50 a 100 cv.',
  feijao: 'Feijão bem pago ajuda o pequeno produtor: linhas do Pronaf e trator até 105 cv.',
}

const TEND = {
  boa: { icone: TrendingUp, cor: 'text-emerald-600', texto: 'bom para a venda' },
  ruim: { icone: TrendingDown, cor: 'text-red-600', texto: 'pede atenção' },
  neutra: { icone: Minus, cor: 'text-slate-500', texto: 'estável' },
}

export function DetalheIndicador({ ind, onFechar }) {
  if (!ind) return null
  const t = TEND[ind.tendencia] || TEND.neutra
  const I = t.icone
  return (
    <Folha aberta onFechar={onFechar} sobretitulo="Indicador" titulo={ind.nome}>
      <div className="flex items-end gap-3">
        <p className="text-3xl font-black text-slate-900">{ind.texto}</p>
        {ind.variacaoPct != null && (
          <p className={`inline-flex items-center gap-1 text-sm font-bold pb-1 ${t.cor}`}>
            <I size={16} /> {ind.variacaoPct > 0 ? '+' : ''}{ind.variacaoPct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%
          </p>
        )}
      </div>
      <p className={`text-xs font-semibold ${t.cor}`}>Tendência: {t.texto}</p>
      <Dado rotulo="Referência">{ind.referencia}</Dado>
      {PARA_VENDA[ind.id] && (
        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700 mb-0.5">O que isso muda na venda</p>
          <p className="text-sm text-blue-900 leading-snug">{PARA_VENDA[ind.id]}</p>
        </div>
      )}
      <Dado rotulo="Fonte">{ind.fonte_nome}</Dado>
      {ind.fonte_url && (
        <a href={ind.fonte_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
          <ExternalLink size={15} /> Ver na fonte
        </a>
      )}
    </Folha>
  )
}
