// Ficha da propriedade para o supervisor, aberta a partir de uma visita (lista ou
// mapa): dados da propriedade, proprietário, pessoas, máquinas, negócios e o
// histórico de visitas com a régua de completude de cada uma.
import { useEffect, useState } from 'react'
import { Briefcase, Calendar, Home, MapPin, Phone, Sprout, Tractor, User, Users, X } from 'lucide-react'
import { getFichaPropriedade } from '../lib/supabaseQueries'
import { statusLabel, statusColor } from '../lib/funil'
import { notaVisita } from '../lib/completudeVisita'
import VendedorAvatar from '../components/VendedorAvatar'
import IconesCompletude, { SeloNota } from './IconesCompletude'

const ABAS = [
  { key: 'resumo', label: 'Propriedade' },
  { key: 'pessoas', label: 'Pessoas' },
  { key: 'visitas', label: 'Visitas' },
  { key: 'negocios', label: 'Negócios' },
]

const fmtData = (iso, hora = false) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return hora ? `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : d.toLocaleDateString('pt-BR')
}
const soDigitos = (t) => String(t || '').replace(/\D/g, '')

function Linha({ icone: I, rotulo, children }) {
  if (children == null || children === '' || children === false) return null
  return (
    <p className="text-sm text-slate-700 flex gap-2">
      <I size={15} className="text-slate-400 shrink-0 mt-0.5" />
      <span><span className="text-slate-400">{rotulo}: </span>{children}</span>
    </p>
  )
}

function Telefone({ t }) {
  const d = soDigitos(t)
  if (d.length < 10) return t || null
  return <a href={`tel:${d}`} className="text-blue-700 underline">{t}</a>
}

export default function FichaPropriedadeModal({ propriedadeId, aba: abaInicial = 'resumo', onClose }) {
  const [ficha, setFicha] = useState(null)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState(abaInicial)

  useEffect(() => {
    if (!propriedadeId) return
    let vivo = true
    setFicha(null); setErro(''); setAba(abaInicial)
    getFichaPropriedade(propriedadeId)
      .then((f) => { if (vivo) setFicha(f) })
      .catch((e) => { if (vivo) setErro(e.message || 'Não foi possível carregar a propriedade.') })
    return () => { vivo = false }
  }, [propriedadeId, abaInicial])

  if (!propriedadeId) return null
  const p = ficha?.propriedade
  const nome = p?.nome_fantasia || p?.razao_social || 'Propriedade'
  const lat = p?.latitude ?? p?.lat
  const lng = p?.longitude ?? p?.lng
  const contagem = { pessoas: ficha?.pessoas.length, visitas: ficha?.visitas.length, negocios: ficha?.negocios.length }

  return (
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-slate-50 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2 border-b border-slate-200 bg-white rounded-t-2xl">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1"><Home size={12} /> Propriedade</p>
            <h3 className="font-bold text-base leading-tight truncate">{ficha ? nome : 'Carregando…'}</h3>
            {p?.cidade && <p className="text-xs text-slate-500">{p.cidade}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 active:text-slate-700 p-1" aria-label="Fechar"><X size={20} /></button>
        </div>

        <div className="flex gap-1 px-3 pt-2 bg-white border-b border-slate-200 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {ABAS.map((a) => (
            <button key={a.key} onClick={() => setAba(a.key)}
              className={`shrink-0 px-3 py-1.5 text-sm rounded-t-lg ${aba === a.key ? 'bg-slate-50 font-bold text-slate-900 border border-b-0 border-slate-200' : 'text-slate-500'}`}>
              {a.label}{contagem[a.key] != null ? ` (${contagem[a.key]})` : ''}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {erro && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{erro}</p>}
          {!ficha && !erro && [0, 1, 2].map((k) => <div key={k} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}

          {ficha && aba === 'resumo' && (
            <>
              <section className="bg-white rounded-xl p-3 space-y-1.5">
                <Linha icone={Sprout} rotulo="Culturas">{p?.culturas?.length ? p.culturas.join(', ') : <span className="text-red-500">não informadas</span>}</Linha>
                <Linha icone={Home} rotulo="Área">{p?.area_hectares ? `${Number(p.area_hectares).toLocaleString('pt-BR')} ha` : null}</Linha>
                <Linha icone={MapPin} rotulo="Endereço">{[p?.endereco, p?.bairro, p?.cidade].filter(Boolean).join(' · ') || null}</Linha>
                <Linha icone={Phone} rotulo="Telefone">{p?.telefone ? <Telefone t={p.telefone} /> : null}</Linha>
                <Linha icone={User} rotulo="CPF/CNPJ">{p?.cnpj_cpf || null}</Linha>
                {lat != null && lng != null && (
                  <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-700 underline"><MapPin size={13} /> Abrir no Google Maps</a>
                )}
              </section>

              <section className="bg-white rounded-xl p-3">
                <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Proprietário</p>
                {ficha.dono ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{ficha.dono.nome}</p>
                    <Linha icone={Phone} rotulo="Telefone">{ficha.dono.telefone ? <Telefone t={ficha.dono.telefone} /> : null}</Linha>
                    <Linha icone={User} rotulo="CPF/CNPJ">{ficha.dono.documento || null}</Linha>
                    <Linha icone={User} rotulo="E-mail">{ficha.dono.email || null}</Linha>
                  </div>
                ) : <p className="text-sm text-slate-500">{p?.id_omie ? 'Cliente do Omie (a própria propriedade é o cadastro).' : 'Sem proprietário ligado.'}</p>}
              </section>

              <section className="bg-white rounded-xl p-3">
                <p className="text-[11px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1"><Tractor size={12} /> Máquinas ({ficha.maquinas.length})</p>
                {ficha.maquinas.length ? (
                  <ul className="text-sm text-slate-700 space-y-0.5">
                    {ficha.maquinas.map((m) => <li key={m.id}>{[m.tipo, m.marca, m.modelo].filter(Boolean).join(' · ')}{m.ano ? ` (${m.ano})` : ''}</li>)}
                  </ul>
                ) : <p className="text-sm text-slate-500">Nenhuma máquina cadastrada.</p>}
              </section>
            </>
          )}

          {ficha && aba === 'pessoas' && (
            ficha.pessoas.length ? ficha.pessoas.map((pe) => (
              <div key={pe.id} className="bg-white rounded-xl p-3">
                <p className="font-semibold text-sm flex items-center gap-1.5"><Users size={14} className="text-slate-400" />{pe.nome}</p>
                <p className="text-xs text-slate-500">{[pe.cargo, pe.vinculo].filter(Boolean).join(' · ') || 'sem cargo'}</p>
                {pe.telefone && <p className="text-sm mt-1"><Telefone t={pe.telefone} /></p>}
                {pe.observacoes && <p className="text-xs text-slate-600 mt-1">{pe.observacoes}</p>}
              </div>
            )) : <p className="text-center text-slate-400 py-8 text-sm">Nenhuma pessoa cadastrada.</p>
          )}

          {ficha && aba === 'visitas' && (
            ficha.visitas.length ? ficha.visitas.map((v) => {
              const nota = notaVisita(v)
              return (
                <div key={v.id} className="bg-white rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <VendedorAvatar id={v.vendedor_id} nome={v.vendedor_nome} size={26} />
                      <span className="text-xs text-slate-500">{fmtData(v.data_visita, true)} · {v.tipo}</span>
                    </span>
                    <SeloNota v={v} nota={nota} />
                  </div>
                  <div className="mt-1.5"><IconesCompletude v={v} nota={nota} /></div>
                  {v.resumo && <p className="text-sm text-slate-700 mt-1.5">{v.resumo}</p>}
                  {v.pessoas?.length > 0 && <p className="text-xs text-slate-500 mt-1">Com: {v.pessoas.map((x) => x.cargo ? `${x.nome} (${x.cargo})` : x.nome).join(', ')}</p>}
                  {v.proximos_passos && <p className="text-xs text-slate-600 mt-1">Próximos passos: {v.proximos_passos}</p>}
                  {v.data_proximo_contato && <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><Calendar size={12} /> Retorno: {new Date(v.data_proximo_contato + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                </div>
              )
            }) : <p className="text-center text-slate-400 py-8 text-sm">Nenhuma visita.</p>
          )}

          {ficha && aba === 'negocios' && (
            ficha.negocios.length ? ficha.negocios.map((n) => (
              <div key={n.id} className="bg-white rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm flex items-center gap-1.5"><Briefcase size={14} className="text-slate-400" />{[n.maquina_familia, n.maquina_marca, n.maquina_modelo].filter(Boolean).join(' · ') || 'Negócio'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(n.status)}`}>{statusLabel(n.status)}</span>
                </div>
                {n.valor != null && <p className="text-sm font-bold text-green-700 mt-1">R$ {Number(n.valor).toLocaleString('pt-BR')}</p>}
                <p className="text-xs text-slate-400 mt-1">Criado em {fmtData(n.created_at)}{n.temperatura ? ` · ${n.temperatura}` : ''}</p>
                {n.motivo_perda && <p className="text-xs text-red-600 mt-1">Perdido: {n.motivo_perda}</p>}
              </div>
            )) : <p className="text-center text-slate-400 py-8 text-sm">Nenhum negócio.</p>
          )}
        </div>
      </div>
    </div>
  )
}
