// Contato do cliente (quest ou negócio): Ligar / WhatsApp para cada telefone,
// endereço com "Abrir no mapa" e, se faltar algo, "Pedir ao suporte" (vira
// aviso no portal para o Mariano). `compacto` = uma linha de botões para o card
// de Negócios. Dados: lib/questContato.js.
import { useEffect, useState } from 'react'
import { ChevronDown, LifeBuoy, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react'
import { buscarContato, contatoGuardado, linkMapa, pedidoFeitoEm, pedirAoSuporte, ROTULO_FALTA } from '../../lib/questContato'

const ORIGEM = { omie: 'cadastro Omie', crm: 'CRM', quest: 'da quest', contato: 'contato' }
const dataCurta = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const btn = 'inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold'

export default function BlocoContato({ alvo, compacto = false }) {
  const [contato, setContato] = useState(() => contatoGuardado(alvo))
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [pedindo, setPedindo] = useState(false)
  const [mais, setMais] = useState(false)
  const chave = `${alvo.tipo}:${alvo.id}`

  useEffect(() => {
    let vivo = true
    setContato(contatoGuardado(alvo))
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setCarregando(false); return }
    buscarContato(alvo)
      .then((c) => { if (vivo) { setContato(c); setErro('') } })
      .catch((e) => { if (vivo) setErro(e?.status === 404 ? '' : (e?.message || 'Não deu para buscar o contato.')) })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps

  const telefones = contato?.telefones || []
  const mapa = linkMapa(contato)
  // sem resposta do portal nem dado no celular: não dá para saber o que falta → oferece o pedido mesmo assim
  const falta = contato && !contato.soDescricao ? contato.falta || [] : (telefones.length ? [] : ['telefone', 'endereco'])
  const celular = telefones.find((t) => t.celular)
  const pedir = <PedirSuporte alvo={alvo} falta={falta} destaque={falta.length > 0} aberto={pedindo} setAberto={setPedindo} compacto={compacto} />

  if (compacto) {
    return (
      <div className="mt-2 space-y-1.5">
        <div className="flex gap-1.5">
          {telefones[0] && <a href={`tel:${telefones[0].numero}`} className={`${btn} flex-1 border border-slate-300 text-slate-700`}><Phone size={15} /> Ligar</a>}
          {celular && <a href={`https://wa.me/55${celular.numero}`} target="_blank" rel="noreferrer" className={`${btn} flex-1 bg-green-600 text-white`}><MessageCircle size={15} /> WhatsApp</a>}
          {mapa && <a href={mapa} target="_blank" rel="noreferrer" className={`${btn} flex-1 border border-slate-300 text-slate-700`}><Navigation size={15} /> Mapa</a>}
          {telefones.length > 1 && (
            <button type="button" onClick={() => setMais((m) => !m)} aria-label="Outros telefones" className={`${btn} px-2 border border-slate-300 text-slate-500`}>
              +{telefones.length - 1}<ChevronDown size={14} className={mais ? 'rotate-180' : ''} />
            </button>
          )}
        </div>
        {!telefones.length && carregando && <p className="text-xs text-slate-400">Buscando contato no cadastro…</p>}
        {mais && <ListaTelefones telefones={telefones} />}
        {falta.length > 0 && !carregando && <p className="text-[11px] text-amber-700">Sem no cadastro: {falta.map((f) => ROTULO_FALTA[f]).join(', ')}.</p>}
        {(falta.length > 0 || pedindo) && !carregando && pedir}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-2">
      <p className="text-sm font-bold">Contato {contato?.cliente?.nome ? <span className="font-normal text-slate-500">· {contato.cliente.nome}</span> : null}</p>
      {carregando && !contato && <p className="text-xs text-slate-400">Buscando no cadastro…</p>}
      <ListaTelefones telefones={telefones.slice(0, 4)} />

      {(contato?.endereco || mapa) && (
        <div className="pt-1">
          {contato?.endereco && <p className="text-xs text-slate-600 flex items-start gap-1"><MapPin size={13} className="mt-0.5 shrink-0" />{contato.endereco}</p>}
          {mapa && (
            <a href={mapa} target="_blank" rel="noreferrer" className={`${btn} mt-1 w-full border border-slate-300 text-slate-700`}>
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
      {pedir}
    </div>
  )
}

function ListaTelefones({ telefones }) {
  return telefones.map((t) => (
    <div key={t.numero} className="space-y-1">
      <p className="text-xs text-slate-500">{t.exibir} <span className="text-slate-400">· {t.nome || ORIGEM[t.origem] || t.origem}{t.celular ? '' : ' · fixo'}</span></p>
      <div className="flex gap-2">
        <a href={`tel:${t.numero}`} className={`${btn} flex-1 border border-slate-300 text-slate-700`}><Phone size={15} /> Ligar</a>
        {t.celular && <a href={`https://wa.me/55${t.numero}`} target="_blank" rel="noreferrer" className={`${btn} flex-1 bg-green-600 text-white`}><MessageCircle size={15} /> WhatsApp</a>}
      </div>
    </div>
  ))
}

function PedirSuporte({ alvo, falta, destaque, aberto, setAberto, compacto }) {
  const [marcados, setMarcados] = useState(falta.length ? falta : ['telefone'])
  const [obs, setObs] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState('')
  const [feitoEm, setFeitoEm] = useState(() => pedidoFeitoEm(alvo))

  useEffect(() => { if (falta.length) setMarcados(falta) }, [falta.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  async function enviar() {
    if (!marcados.length) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setMsg('Sem internet: tente de novo quando tiver sinal.'); return }
    setEnviando(true); setMsg('')
    try {
      const r = await pedirAoSuporte(alvo, marcados, obs.trim() || null)
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
            ? `w-full ${btn} ${compacto ? 'py-1.5 text-xs' : ''} bg-amber-500 text-white font-bold`
            : 'text-xs text-blue-700 underline'}>
          {destaque ? <><LifeBuoy size={compacto ? 13 : 15} /> Pedir ao suporte</> : 'Número ou endereço errado? Pedir ao suporte'}
        </button>
        {feitoEm && <p className="text-[11px] text-slate-500 mt-1">Você pediu ao suporte em {dataCurta(feitoEm)}.</p>}
        {msg && <p className="text-xs text-green-700 mt-1">{msg}</p>}
      </div>
    )
  }
  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
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
