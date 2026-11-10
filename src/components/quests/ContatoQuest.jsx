// Bloco de contato na tela da quest: Ligar / WhatsApp para cada telefone do
// cadastro, endereço com "Abrir no mapa" e, se faltar algo, "Pedir ao suporte"
// (vira aviso no portal para o Mariano). Dados: lib/questContato.js.
import { useEffect, useState } from 'react'
import { LifeBuoy, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react'
import { buscarContato, contatoGuardado, linkMapa, pedidoFeitoEm, pedirAoSuporte, ROTULO_FALTA } from '../../lib/questContato'

const ORIGEM = { omie: 'cadastro', crm: 'CRM', quest: 'da quest' }
const dataCurta = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function ContatoQuest({ quest }) {
  const [contato, setContato] = useState(() => contatoGuardado(quest))
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [pedindo, setPedindo] = useState(false)

  useEffect(() => {
    let vivo = true
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setCarregando(false); return }
    buscarContato(quest)
      .then((c) => { if (vivo) { setContato(c); setErro('') } })
      .catch((e) => { if (vivo) setErro(e?.message || 'Não deu para buscar o contato.') })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [quest.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const telefones = contato?.telefones || []
  const mapa = linkMapa(contato)
  // sem resposta do portal (offline, primeira vez): não dá para saber o que falta → oferece o pedido mesmo assim
  const falta = contato && !contato.soDescricao ? contato.falta || [] : (telefones.length ? [] : ['telefone', 'endereco'])

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-2">
      <p className="text-sm font-bold">Contato {contato?.cliente?.nome ? <span className="font-normal text-slate-500">· {contato.cliente.nome}</span> : null}</p>
      {carregando && !contato && <p className="text-xs text-slate-400">Buscando no cadastro…</p>}

      {telefones.slice(0, 3).map((t) => (
        <div key={t.numero} className="space-y-1">
          <p className="text-xs text-slate-500">{t.exibir} <span className="text-slate-400">· {ORIGEM[t.origem] || t.origem}{t.celular ? '' : ' · fixo'}</span></p>
          <div className="flex gap-2">
            <a href={`tel:${t.numero}`} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700"><Phone size={15} /> Ligar</a>
            {t.celular && (
              <a href={`https://wa.me/55${t.numero}`} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold"><MessageCircle size={15} /> WhatsApp</a>
            )}
          </div>
        </div>
      ))}

      {(contato?.endereco || mapa) && (
        <div className="pt-1">
          {contato?.endereco && <p className="text-xs text-slate-600 flex items-start gap-1"><MapPin size={13} className="mt-0.5 shrink-0" />{contato.endereco}</p>}
          {mapa && (
            <a href={mapa} target="_blank" rel="noreferrer" className="mt-1 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700">
              <Navigation size={15} /> {contato?.locais?.length ? `Abrir no mapa (${contato.locais[0].nome})` : 'Procurar o endereço no mapa'}
            </a>
          )}
        </div>
      )}

      {erro && !contato && <p className="text-xs text-slate-500">{erro}</p>}

      {falta.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-900">
          Não tem no cadastro: <b>{falta.map((f) => ROTULO_FALTA[f]).join(', ')}</b>.
        </div>
      )}
      <PedirSuporte quest={quest} falta={falta} destaque={falta.length > 0} aberto={pedindo} setAberto={setPedindo} />
    </div>
  )
}

function PedirSuporte({ quest, falta, destaque, aberto, setAberto }) {
  const [marcados, setMarcados] = useState(falta.length ? falta : ['telefone'])
  const [obs, setObs] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState('')
  const [feitoEm, setFeitoEm] = useState(() => pedidoFeitoEm(quest))

  useEffect(() => { if (falta.length) setMarcados(falta) }, [falta.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  async function enviar() {
    if (!marcados.length) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setMsg('Sem internet: tente de novo quando tiver sinal.'); return }
    setEnviando(true); setMsg('')
    try {
      const r = await pedirAoSuporte(quest, marcados, obs.trim() || null)
      setFeitoEm(new Date().toISOString())
      setMsg(r.jaPedido ? 'Esse pedido já estava com o suporte.' : 'Pedido enviado ao suporte (Mariano). Quando ele cadastrar, aparece aqui.')
      setAberto(false); setObs('')
    } catch (e) {
      setMsg(e?.message || 'Não foi possível enviar.')
    } finally {
      setEnviando(false)
    }
  }

  if (!aberto) {
    return (
      <div>
        <button type="button" onClick={() => setAberto(true)}
          className={destaque
            ? 'w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold'
            : 'text-xs text-blue-700 underline'}>
          {destaque ? <><LifeBuoy size={15} /> Pedir ao suporte</> : 'Número ou endereço errado? Pedir ao suporte'}
        </button>
        {feitoEm && <p className="text-[11px] text-slate-500 mt-1">Você pediu ao suporte em {dataCurta(feitoEm)}.</p>}
        {msg && <p className="text-xs text-green-700 mt-1">{msg}</p>}
      </div>
    )
  }
  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-2">
      <p className="text-sm font-bold">Pedir ao suporte</p>
      <p className="text-xs text-slate-500">O Mariano recebe o aviso no portal e completa o cadastro.</p>
      {['telefone', 'whatsapp', 'endereco'].map((f) => (
        <label key={f} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={marcados.includes(f)} onChange={(e) => setMarcados((m) => (e.target.checked ? [...m, f] : m.filter((x) => x !== f)))} />
          {ROTULO_FALTA[f]}
        </label>
      ))}
      <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Recado (opcional): ex. o número do cadastro não atende"
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button type="button" onClick={() => setAberto(false)} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm">Cancelar</button>
        <button type="button" disabled={!marcados.length || enviando} onClick={enviar}
          className="flex-1 py-2 rounded-lg bg-amber-500 disabled:bg-slate-300 text-white text-sm font-bold">{enviando ? 'Enviando…' : 'Enviar pedido'}</button>
      </div>
      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </div>
  )
}
