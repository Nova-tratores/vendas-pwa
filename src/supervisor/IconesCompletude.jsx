// Régua de completude da visita em ícones: o que tem (verde ✓) e o que falta
// (vermelho ✗), na mesma ordem da nota (lib/completudeVisita). Usada na lista
// de visitas, no popup do mapa e na ficha da propriedade do supervisor.
import { Briefcase, Calendar, FileText, ListChecks, Sprout, Tractor, User } from 'lucide-react'
import { notaVisita } from '../lib/completudeVisita'

const ICONE_ITEM = { resumo: FileText, pessoa: User, cultura: Sprout, maquina: Tractor, passos: ListChecks, retorno: Calendar, negocio: Briefcase }

/** Bolinha com a nota (0–100) na cor da faixa. */
export function SeloNota({ v, nota = notaVisita(v) }) {
  return (
    <span title={`Completude ${nota.nota}/100 — ${nota.faixa.label}${nota.faltam.length ? ` · falta: ${nota.faltam.join(', ')}` : ''}`}
      className="inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-200" style={{ color: nota.faixa.cor }}>
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: nota.faixa.cor }} />{nota.nota}
    </span>
  )
}

export default function IconesCompletude({ v, nota = notaVisita(v) }) {
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {nota.itens.filter((i) => !i.naoSeAplica).map((i) => {
        const Icone = ICONE_ITEM[i.key]
        return (
          <span key={i.key} title={`${i.label}: ${i.ok ? 'preenchido' : 'falta'}`} className="inline-flex items-center">
            <Icone size={13} className={i.ok ? 'text-green-600' : 'text-red-500'} />
            <span className={`text-[10px] font-bold ${i.ok ? 'text-green-600' : 'text-red-500'}`}>{i.ok ? '✓' : '✗'}</span>
          </span>
        )
      })}
    </span>
  )
}
