// Contato do alvo da quest no painel do supervisor: telefones (Ligar / WhatsApp),
// endereço, onde fica no mapa e a situação do pedido ao suporte. Mesma rota do
// vendedor (/api/crm-vendas/quests/contato — o portal aceita supervisor), via
// lib/questContato. A lista pode ter dezenas de quests: no máximo 4 buscas por vez.
import { useEffect, useState } from 'react'
import { MapPin, MessageCircle, Navigation, Phone } from 'lucide-react'
import { buscarContato, contatoGuardado, linkMapa, ROTULO_FALTA } from '../lib/questContato'
import { SituacaoPedido } from '../components/contato/BlocoContato'

const ORIGEM = { omie: 'Omie', crm: 'CRM', quest: 'quest', contato: 'contato', suporte: 'suporte' }

// fila simples: até 4 buscas ao mesmo tempo
let ativos = 0
const fila = []
function naFila(fn) {
  return new Promise((ok, falha) => {
    const rodar = () => { ativos++; fn().then(ok, falha).finally(() => { ativos--; fila.shift()?.() }) }
    if (ativos < 4) rodar(); else fila.push(rodar)
  })
}

/** A quest tem a quem ligar? (trator, cliente ou propriedade) */
export const questTemAlvo = (q) => !!(q.chassis || q.cliente_nome || q.propriedade_id)

export default function ContatoSupervisor({ q }) {
  const alvo = { tipo: 'quest', id: q.id, quest: q }
  const [contato, setContato] = useState(() => contatoGuardado(alvo))
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    naFila(() => buscarContato(alvo))
      .then((c) => { if (vivo) { setContato(c); setErro('') } })
      .catch((e) => { if (vivo) setErro(e?.message || 'Não deu para buscar o contato.') })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [q.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const telefones = contato?.telefones || []
  const mapa = linkMapa(contato)
  const falta = contato && !contato.soDescricao ? contato.falta || [] : []

  return (
    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs text-slate-700 space-y-1">
      {carregando && !contato && <p className="text-slate-400">Buscando telefone e local…</p>}
      {erro && !contato && <p className="text-slate-500">{erro}</p>}
      {telefones.slice(0, 3).map((t) => (
        <div key={t.numero} className="flex flex-wrap items-center gap-2">
          <a href={`tel:${t.numero}`} className="inline-flex items-center gap-1 font-semibold text-slate-800"><Phone size={13} />{t.exibir}</a>
          <span className="text-slate-400">{t.nome || ORIGEM[t.origem] || t.origem}{t.celular ? '' : ' · fixo'}</span>
          {t.celular && <a href={`https://wa.me/55${t.numero}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-green-700 font-semibold"><MessageCircle size={13} />WhatsApp</a>}
        </div>
      ))}
      {telefones.length > 3 && <p className="text-slate-400">+{telefones.length - 3} telefone(s)</p>}
      {contato?.endereco && <p className="flex items-start gap-1"><MapPin size={13} className="mt-0.5 shrink-0" />{contato.endereco}</p>}
      {mapa && (
        <a href={mapa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 font-semibold">
          <Navigation size={13} />{contato?.locais?.length ? `Mapa: ${contato.locais[0].nome}` : 'Procurar o endereço no mapa'}
          {contato?.locais?.length > 1 ? <span className="text-slate-400 font-normal"> (+{contato.locais.length - 1})</span> : null}
        </a>
      )}
      {!carregando && falta.length > 0 && <p className="text-amber-700">Sem no cadastro: {falta.map((f) => ROTULO_FALTA[f]).join(', ')}.</p>}
      <SituacaoPedido pedido={contato?.pedido} compacto />
    </div>
  )
}
