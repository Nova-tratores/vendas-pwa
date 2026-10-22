// Checklist do carro OBRIGATÓRIO todo mês (José, 21/10/2026: "todo dia primeiro tem que
// aparecer para ele fazer o checklist do carro dele; se não fizer, não libera o app").
// A partir do dia 1º, quem é responsável por carro na Frota só usa o app depois de
// concluir o checklist do mês (status "completo" ou "suspeito" = feito, em análise).
// Só a tela do checklist fica liberada. Quem não tem carro não é bloqueado.
// O mês feito fica guardado no celular ('checklist-mes:<AAAA-MM>') para não consultar de novo.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Car, ClipboardCheck, DoorOpen, WifiOff } from 'lucide-react'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const mesAtual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const chave = () => `checklist-mes:${mesAtual()}`
const ler = () => { try { return JSON.parse(localStorage.getItem(chave()) || 'null') } catch { return null } }
const gravar = (v) => { try { localStorage.setItem(chave(), JSON.stringify(v)) } catch { /* sem espaço */ } }
const LIVRES = ['/checklist-veiculo'] // telas que abrem mesmo com o checklist pendente
const INTERVALO_MS = 5 * 60 * 1000 // não consulta o Portal mais de uma vez a cada 5 min

export default function ChecklistObrigatorio() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [estado, setEstado] = useState(ler) // { ok: true } | { pendentes: [carro] } | null
  const ultima = useRef(0)

  const conferir = useCallback(async (forcar = false) => {
    if (ler()?.ok) { setEstado({ ok: true }); return } // mês já feito
    if (!navigator.onLine) return // sem internet: fica com o que já se sabe
    if (!forcar && Date.now() - ultima.current < INTERVALO_MS) return
    ultima.current = Date.now()
    try {
      const { listarMeusCarros, concluido } = await import('../lib/checklistVeiculo')
      const r = await listarMeusCarros()
      const carros = r?.carros || []
      const pendentes = carros.filter((c) => !concluido(c.status))
      const novo = pendentes.length ? { pendentes } : { ok: true }
      // só guarda "mês feito" quando há carro; sem carro, continua conferindo (pode ganhar um no meio do mês)
      if (carros.length) gravar(novo)
      setEstado(novo)
    } catch {
      // Portal fora do ar ou sem resposta: não bloqueia por causa de erro nosso
    }
  }, [])

  // ao abrir o app, ao voltar para ele e a cada troca de tela (a consulta tem intervalo mínimo;
  // ao sair da tela do checklist confere na hora, para liberar assim que concluir)
  const anterior = useRef(pathname)
  useEffect(() => {
    const saiuDoChecklist = LIVRES.some((p) => anterior.current.startsWith(p)) && !LIVRES.some((p) => pathname.startsWith(p))
    anterior.current = pathname
    conferir(saiuDoChecklist)
  }, [pathname, conferir])
  useEffect(() => {
    const foco = () => conferir()
    window.addEventListener('focus', foco)
    window.addEventListener('online', foco)
    return () => { window.removeEventListener('focus', foco); window.removeEventListener('online', foco) }
  }, [conferir])

  const pendentes = estado?.pendentes || []
  if (!pendentes.length || LIVRES.some((p) => pathname.startsWith(p))) return null

  const mes = MESES[new Date().getMonth()]
  const online = typeof navigator === 'undefined' || navigator.onLine
  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="ck-titulo">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl ini-entra">
        <div className="px-5 pt-5 pb-4 text-white" style={{ background: 'linear-gradient(135deg, #DC2626, #7F1D1D)' }}>
          <span className="w-12 h-12 rounded-2xl bg-white/20 grid place-items-center mb-3"><ClipboardCheck size={26} /></span>
          <h2 id="ck-titulo" className="text-xl font-bold leading-tight">Checklist do carro de {mes}</h2>
          <p className="text-sm opacity-90 mt-1">Todo mês, a partir do dia 1º, o checklist do carro da empresa precisa ser feito antes de usar o app.</p>
        </div>
        <div className="p-5 space-y-3">
          {pendentes.map((c) => (
            <div key={c.placa} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
              <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 grid place-items-center shrink-0"><Car size={22} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-slate-900 tracking-wide">{c.placa_fmt || c.placa}</span>
                <span className="block text-xs text-slate-500 truncate">{c.modelo || 'Carro da empresa'}</span>
              </span>
              <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 shrink-0 ${c.status === 'nao_iniciado' || !c.status ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {c.status === 'nao_iniciado' || !c.status ? 'Não feito' : 'Começado'}
              </span>
            </div>
          ))}

          {!online && (
            <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded-xl p-2.5">
              <WifiOff size={15} className="shrink-0 mt-0.5" /> O checklist precisa de internet para enviar as fotos. Conecte o celular para fazer.
            </p>
          )}

          <button
            onClick={() => navigate(`/checklist-veiculo?placa=${encodeURIComponent(pendentes[0].placa)}`)}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-700 text-white py-3.5 rounded-2xl font-bold active:bg-blue-800"
          >
            <ClipboardCheck size={19} /> {pendentes[0].status && pendentes[0].status !== 'nao_iniciado' ? 'Continuar o checklist' : 'Fazer o checklist agora'}
          </button>
          <p className="text-[11px] text-slate-500 text-center">São 20 itens com foto. Assim que você concluir, o app libera sozinho.</p>
          <button onClick={() => window.dispatchEvent(new Event('sair-app'))} className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 py-1">
            <DoorOpen size={14} /> Sair do app
          </button>
        </div>
      </div>
    </div>
  )
}
