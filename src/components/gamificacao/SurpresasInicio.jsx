// Surpresas no Início: missão relâmpago valendo agora e Bônus de Safra recém
// revelado (o sorteio acontece no servidor quando a visita sincroniza, então a
// surpresa aparece na próxima vez que o vendedor abre o app).
import { useEffect, useState } from 'react'
import { carregarBaseGamificacao, missoesAtivas } from '../../lib/gamificacaoLocal'
import { bonusNaoVistos } from '../../lib/gamificacao'
import { notaVisita, visitaParaNota } from '../../lib/completudeVisita'
import { confete, vibrar, somPartida } from '../../lib/recompensas'

const CHAVE_VISTOS = 'nt-bonus-vistos'
const CAMPO_LABEL = {
  qualquer: 'toda visita', resumo: 'visita com resumo completo', pessoa: 'visita com pessoa e cargo',
  cultura: 'visita com cultura', maquina: 'visita com máquina', passos: 'visita com próximos passos',
  retorno: 'visita com retorno marcado', negocio: 'visita com negócio',
}

const lerVistos = () => { try { return new Set(JSON.parse(localStorage.getItem(CHAVE_VISTOS) || '[]')) } catch { return new Set() } }

export default function SurpresasInicio() {
  const [missoes, setMissoes] = useState([])
  const [bonus, setBonus] = useState(null) // { nome, xp, n }

  useEffect(() => {
    let vivo = true
    carregarBaseGamificacao().then(({ visitas, ctx, missoes: ms }) => {
      if (!vivo) return
      setMissoes(missoesAtivas(ms))
      const vistos = lerVistos()
      const novos = bonusNaoVistos(visitas, ctx, vistos)
      if (novos.length) {
        const v = novos[0]
        const nota = notaVisita(visitaParaNota(v, ctx)).nota
        setBonus({ nome: ctx.propById[v.propriedade_id]?.nome || 'cliente', xp: nota * 2, n: novos.length })
        try { localStorage.setItem(CHAVE_VISTOS, JSON.stringify([...vistos, ...novos.map((x) => String(x.id))])) } catch { /* sem storage */ }
        confete({ dourado: true })
        vibrar([30, 30, 30, 30, 160])
        somPartida()
      }
    }).catch(() => {})
    return () => { vivo = false }
  }, [])

  return (
    <>
      {missoes.map((m) => (
        <div key={m.id} className="rounded-xl p-3 text-white shadow mb-3" style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}>
          <p className="text-sm font-bold">⚡ Missão relâmpago: {m.titulo}</p>
          <p className="text-xs text-white/85">
            {CAMPO_LABEL[m.campo] || 'visita'} vale <b>{Number(m.multiplicador)}x XP</b> até {new Date(m.fim).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ))}
      {bonus && (
        <div className="fixed inset-0 z-[9998] bg-amber-900/80 flex flex-col items-center justify-center p-6 text-center" onClick={() => setBonus(null)}>
          <p className="text-6xl">🌾</p>
          <p className="text-white text-3xl font-extrabold mt-2">Bônus de Safra!</p>
          <p className="text-amber-100 mt-2">A visita a <b>{bonus.nome}</b> valeu XP em dobro: <b>+{bonus.xp} XP</b></p>
          {bonus.n > 1 && <p className="text-amber-200 text-sm mt-1">e mais {bonus.n - 1} visita{bonus.n > 2 ? 's' : ''} com bônus</p>}
          <button type="button" className="mt-6 bg-white text-amber-900 font-bold px-6 py-2.5 rounded-full">Boa!</button>
        </div>
      )}
    </>
  )
}
