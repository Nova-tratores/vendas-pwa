import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/sync'
import { PERGUNTAS, PERFIS, TIPOS, resultadoTeste } from '../lib/rotaFeed'

// Teste de perfil do vendedor (José, 20/10/2026): 8 perguntas rápidas definem quanto o
// feed traz de clientes novos, de recuperação e de carteira. Grava em iv_perfil_vendedor.
export default function PerfilTeste() {
  const navigate = useNavigate()
  const vendedor = JSON.parse(localStorage.getItem('vendedor') || '{}')
  const [i, setI] = useState(0)
  const [respostas, setRespostas] = useState([])
  const [escolha, setEscolha] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const fim = respostas.length === PERGUNTAS.length
  const res = fim ? resultadoTeste(respostas) : null
  const perfil = res ? PERFIS[res.perfil] : null

  const responder = (k) => {
    setEscolha(k)
    setTimeout(() => {
      setRespostas((r) => [...r, k])
      setEscolha(null)
      setI((x) => x + 1)
    }, 380)
  }

  const salvar = async () => {
    setSalvando(true); setErro('')
    try {
      const linha = { vendedor_id: vendedor.id, respostas, pontos: res.pontos, perfil: res.perfil, mix: res.mix, feito_em: new Date().toISOString() }
      localStorage.setItem('perfil-vendedor', JSON.stringify(linha))
      const { error } = await supabase.from('iv_perfil_vendedor').upsert(linha, { onConflict: 'vendedor_id' })
      if (error) throw error
      navigate('/rota')
    } catch (e) {
      setErro('Não consegui salvar agora (sem internet?). Seu perfil ficou guardado no celular e vai valer na sua rota.')
      setTimeout(() => navigate('/rota'), 1800)
    } finally { setSalvando(false) }
  }

  if (fim && perfil) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in">
        <div className="rounded-3xl p-6 text-white text-center shadow-lg animate-scale-in" style={{ background: `linear-gradient(150deg, ${perfil.cor}, #0f172a)` }}>
          <div className="text-6xl mb-2" style={{ animation: 'pt-pula 1.2s ease' }}>{perfil.icone}</div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Seu perfil de vendedor</p>
          <h2 className="text-3xl font-black mt-1">{perfil.nome}</h2>
          <p className="mt-3 text-sm leading-relaxed opacity-95">{perfil.texto}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mt-4">
          <p className="text-sm font-bold mb-3">Como fica a sua rota</p>
          {Object.entries(res.mix).sort((a, b) => b[1] - a[1]).map(([t, v], k) => (
            <div key={t} className="mb-3">
              <div className="flex justify-between text-sm mb-1"><span>{TIPOS[t].icone} {TIPOS[t].nome} <span className="text-slate-400">· {TIPOS[t].frase}</span></span><b style={{ color: TIPOS[t].cor }}>{Math.round(v * 100)}%</b></div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: TIPOS[t].cor, transformOrigin: 'left', animation: `pt-barra .9s ${k * 0.15}s cubic-bezier(.2,.8,.2,1) both` }} />
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-400 mt-2">Você pode refazer o teste quando quiser.</p>
        </div>
        {erro && <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3 mt-3">{erro}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={() => { setRespostas([]); setI(0) }} className="flex-1 py-3 rounded-xl border border-slate-300 font-semibold">Refazer</button>
          <button onClick={salvar} disabled={salvando} className="flex-[2] py-3 rounded-xl bg-blue-700 text-white font-bold disabled:opacity-60">{salvando ? 'Salvando…' : 'Ver minha rota →'}</button>
        </div>
        <style>{ESTILO}</style>
      </div>
    )
  }

  const p = PERGUNTAS[i]
  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Teste de perfil</h2>
        <p className="text-sm text-slate-500">8 perguntas rápidas. Não tem resposta certa: responda como você trabalha de verdade.</p>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-blue-700 rounded-full transition-all duration-500" style={{ width: `${(i / PERGUNTAS.length) * 100}%` }} /></div>
        <span className="text-xs font-bold text-slate-500">{i + 1} de {PERGUNTAS.length}</span>
      </div>
      <div key={i} className="animate-slide-up">
        <p className="text-2xl font-black leading-tight mb-5">{p.texto}</p>
        <div className="space-y-3">
          {p.opcoes.map((o, k) => (
            <button key={k} onClick={() => escolha == null && responder(k)}
              className={`w-full text-left rounded-2xl border-2 p-4 font-semibold transition-all ${escolha === k ? 'border-blue-700 bg-blue-50 scale-[1.02]' : 'border-slate-200 bg-white active:scale-[.98]'}`}
              style={{ animation: `pt-entra .4s ${k * 0.08}s ease both` }}>
              <span className={`inline-grid place-items-center w-7 h-7 rounded-full mr-3 text-sm font-black ${escolha === k ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'}`}>{String.fromCharCode(65 + k)}</span>
              {o.texto}
            </button>
          ))}
        </div>
      </div>
      {i > 0 && <button onClick={() => { setRespostas((r) => r.slice(0, -1)); setI((x) => x - 1) }} className="mt-5 text-sm text-slate-500">← voltar uma pergunta</button>}
      <style>{ESTILO}</style>
    </div>
  )
}

const ESTILO = `
  @keyframes pt-entra { from { opacity: 0; transform: translateY(10px) } }
  @keyframes pt-barra { from { transform: scaleX(0) } }
  @keyframes pt-pula { 0% { transform: scale(0) rotate(-20deg) } 60% { transform: scale(1.2) } 100% { transform: scale(1) } }
`
