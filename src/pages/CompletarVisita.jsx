// Completar uma visita já registrada: mostra SÓ o que falta na nota de
// completude (lib/completudeVisita), com respostas em toques. Aberta pelo aviso
// do fim do dia, pelo lembrete do retorno e pelo pedido do supervisor
// (Sinalizar). Grava no IndexedDB como pendente; o sync sobe sozinho.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getRecord, getByIndex, saveRecord, registrarLog, getAllRecords } from '../lib/db'
import { CULTURAS } from '../lib/constants'
import { notaVisita, resumoReal, dataMaisDias, semRetornoJustificado, PREFIXO_SEM_RETORNO } from '../lib/completudeVisita'

const CARGOS = [
  ['PROPRIETARIO', 'Proprietário'], ['FAMILIAR', 'Familiar'], ['GERENTE', 'Gerente'],
  ['TRATORISTA', 'Tratorista'], ['SECRETARIA', 'Secretária'], ['OUTROS', 'Outros'],
]

const Chip = ({ ativo, onClick, children }) => (
  <button type="button" onClick={onClick}
    className={`text-xs px-3 py-1.5 rounded-full border ${ativo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300'}`}>
    {children}
  </button>
)

// O link pode trazer o id do servidor (pedido do supervisor) ou o local.
async function acharVisita(id) {
  const direto = await getRecord('visitas', Number(id))
  if (direto) return direto
  // visita criada neste aparelho: id local negativo, ligado ao do servidor no id_map
  const mapa = await getAllRecords('id_map')
  const local = mapa.find((m) => m.store === 'visitas' && Number(m.server_id) === Number(id))
  return local ? (await getRecord('visitas', local.local_id)) || null : null
}

export default function CompletarVisita() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [visita, setVisita] = useState(null)
  const [prop, setProp] = useState(null)
  const [pessoas, setPessoas] = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [form, setForm] = useState(null)
  const [cargos, setCargos] = useState({}) // pessoa_id -> cargo novo
  const [cultura, setCultura] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const v = await acharVisita(id)
      if (!vivo) return
      if (v) {
        const [p, ps, ms] = await Promise.all([
          v.propriedade_id ? getRecord('propriedades', v.propriedade_id) : null,
          v.propriedade_id ? getByIndex('pessoas', 'propriedade_id', v.propriedade_id) : [],
          v.propriedade_id ? getByIndex('maquinas', 'propriedade_id', v.propriedade_id) : [],
        ])
        if (!vivo) return
        setVisita(v); setProp(p || null); setPessoas(ps || []); setMaquinas(ms || [])
        setForm({
          resumo: v.resumo || '', proximos_passos: v.proximos_passos || '',
          data_proximo_contato: v.data_proximo_contato || '',
          pessoa_ids: v.pessoa_ids || [], maquina_ids: v.maquina_ids || [],
        })
      }
      setCarregando(false)
    })()
    return () => { vivo = false }
  }, [id])

  // nota ao vivo com o que já foi tocado nesta tela
  const nota = useMemo(() => {
    if (!visita || !form) return null
    const pessoasSel = pessoas
      .filter((p) => form.pessoa_ids.map(String).includes(String(p.id)))
      .map((p) => ({ ...p, cargo: cargos[p.id] || p.cargo }))
    return notaVisita({
      ...visita, ...form, pessoas: pessoasSel,
      culturas: cultura ? [cultura] : (prop?.culturas || []),
    })
  }, [visita, form, pessoas, cargos, cultura, prop])

  // o que faltava quando a tela abriu (não some enquanto o vendedor responde)
  const faltavaAoAbrir = useMemo(() => {
    if (!visita) return new Set()
    const ps = pessoas.filter((p) => (visita.pessoa_ids || []).map(String).includes(String(p.id)))
    const n = notaVisita({ ...visita, pessoas: ps, culturas: prop?.culturas || [] })
    return new Set(n.itens.filter((i) => !i.ok).map((i) => i.key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visita?.id, prop?.id, pessoas.length])

  if (carregando) return <p className="p-4 text-sm text-slate-500">Carregando…</p>
  if (!visita) {
    return (
      <div className="p-4 text-sm text-slate-600">
        Visita não encontrada neste aparelho. Sincronize o app e tente de novo.
        <div className="mt-3"><Link to="/visitas" className="text-blue-700 underline">Ir para Visitas</Link></div>
      </div>
    )
  }

  const alternar = (campo, valor) => setForm((f) => ({
    ...f,
    [campo]: f[campo].map(String).includes(String(valor)) ? f[campo].filter((x) => String(x) !== String(valor)) : [...f[campo], valor],
  }))

  function semRetorno() {
    const motivo = window.prompt('Por que não haverá retorno com este cliente?', '')
    if (!motivo || !motivo.trim()) return
    setForm((f) => ({ ...f, data_proximo_contato: '', proximos_passos: [`${PREFIXO_SEM_RETORNO} ${motivo.trim()}`, f.proximos_passos.trim()].filter(Boolean).join('\n') }))
  }

  async function salvar() {
    setSalvando(true)
    try {
      const mudou = []
      for (const [pid, cargo] of Object.entries(cargos)) {
        const p = pessoas.find((x) => String(x.id) === String(pid))
        if (p && cargo && cargo !== p.cargo) { await saveRecord('pessoas', { ...p, cargo, status_sync: 'pending' }); mudou.push('cargo') }
      }
      if (cultura && prop) {
        await saveRecord('propriedades', { ...prop, culturas: [cultura, ...(prop.culturas || []).filter((c) => c !== cultura)], status_sync: 'pending' })
        mudou.push('cultura')
      }
      if (form.resumo !== (visita.resumo || '')) mudou.push('resumo')
      if (form.proximos_passos !== (visita.proximos_passos || '')) mudou.push('próximos passos')
      if (form.data_proximo_contato !== (visita.data_proximo_contato || '')) mudou.push('retorno')
      if (String(form.pessoa_ids) !== String(visita.pessoa_ids || [])) mudou.push('pessoas')
      if (String(form.maquina_ids) !== String(visita.maquina_ids || [])) mudou.push('máquinas')
      await saveRecord('visitas', { ...visita, ...form, status_sync: 'pending' })
      await registrarLog('alterar', 'visitas', visita.id, mudou.length ? `Completou: ${mudou.join(', ')}` : 'Edição: sem alterações')
      navigate('/visitas')
    } catch (e) {
      alert('Não foi possível salvar: ' + (e.message || e))
    } finally {
      setSalvando(false)
    }
  }

  const pessoasDaVisita = pessoas.filter((p) => form.pessoa_ids.map(String).includes(String(p.id)))

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-bold">Completar visita</h2>
        <p className="text-xs text-slate-500">
          {prop?.nome || 'Propriedade'} · {new Date(visita.data_visita).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {nota && (
        <div className="rounded-lg border border-slate-200 p-2">
          <div className="flex justify-between text-xs mb-1">
            <b style={{ color: nota.faixa.cor }}>Visita {nota.nota}%</b>
            <span className="text-slate-500">{nota.faltam.length ? `falta: ${nota.faltam.join(', ')}` : 'completa'}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${nota.nota}%`, background: nota.faixa.cor }} />
          </div>
        </div>
      )}

      {faltavaAoAbrir.has('resumo') && (
        <section>
          <p className="text-sm font-semibold mb-1">O que você mostrou? Ele se interessou por quê?</p>
          <textarea value={form.resumo} rows={4} onChange={(e) => setForm((f) => ({ ...f, resumo: e.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          {!resumoReal(form.resumo) && <p className="text-[11px] text-slate-500 mt-1">Conte o que aconteceu (pelo menos umas 12 palavras).</p>}
        </section>
      )}

      {faltavaAoAbrir.has('pessoa') && (
        <section>
          <p className="text-sm font-semibold mb-1">Com quem você falou?</p>
          {pessoas.length === 0 ? (
            <Link to={`/pessoas/${visita.propriedade_id}`} className="text-sm text-blue-700 underline">Cadastrar pessoa da propriedade</Link>
          ) : (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {pessoas.map((p) => (
                <Chip key={p.id} ativo={form.pessoa_ids.map(String).includes(String(p.id))} onClick={() => alternar('pessoa_ids', p.id)}>{p.nome}</Chip>
              ))}
            </div>
          )}
          {pessoasDaVisita.filter((p) => !p.cargo).map((p) => (
            <div key={p.id} className="mb-2">
              <p className="text-xs text-slate-600 mb-1">Cargo de {p.nome}:</p>
              <div className="flex flex-wrap gap-1.5">
                {CARGOS.map(([k, l]) => <Chip key={k} ativo={cargos[p.id] === k} onClick={() => setCargos((c) => ({ ...c, [p.id]: k }))}>{l}</Chip>)}
              </div>
            </div>
          ))}
        </section>
      )}

      {faltavaAoAbrir.has('cultura') && (
        <section>
          <p className="text-sm font-semibold mb-1">Qual a cultura principal da propriedade?</p>
          <div className="flex flex-wrap gap-1.5">
            {CULTURAS.map((c) => <Chip key={c} ativo={cultura === c} onClick={() => setCultura(cultura === c ? '' : c)}>{c}</Chip>)}
          </div>
        </section>
      )}

      {faltavaAoAbrir.has('maquina') && (
        <section>
          <p className="text-sm font-semibold mb-1">Quais máquinas vocês trataram?</p>
          {maquinas.length === 0 ? (
            <Link to={`/maquinas/${visita.propriedade_id}`} className="text-sm text-blue-700 underline">Cadastrar máquina da propriedade</Link>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {maquinas.map((m) => (
                <Chip key={m.id} ativo={form.maquina_ids.map(String).includes(String(m.id))} onClick={() => alternar('maquina_ids', m.id)}>
                  {[m.tipo, m.marca, m.modelo].filter(Boolean).join(' ')}
                </Chip>
              ))}
            </div>
          )}
        </section>
      )}

      {faltavaAoAbrir.has('passos') && (
        <section>
          <p className="text-sm font-semibold mb-1">O que ficou combinado?</p>
          <textarea value={form.proximos_passos} rows={2} onChange={(e) => setForm((f) => ({ ...f, proximos_passos: e.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </section>
      )}

      {faltavaAoAbrir.has('retorno') && (
        <section>
          <p className="text-sm font-semibold mb-1">Quando é o próximo contato?</p>
          <div className="flex flex-wrap gap-1.5">
            {[7, 15, 30].map((d) => (
              <Chip key={d} ativo={form.data_proximo_contato === dataMaisDias(d)} onClick={() => setForm((f) => ({ ...f, data_proximo_contato: dataMaisDias(d) }))}>+{d} dias</Chip>
            ))}
            <Chip ativo={semRetornoJustificado(form.proximos_passos)} onClick={semRetorno}>Sem retorno</Chip>
          </div>
        </section>
      )}

      {faltavaAoAbrir.has('negocio') && (
        <section className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-900">O resumo fala em interesse de compra, mas a visita não tem negócio.</p>
          <Link to="/negocios" className="text-sm font-semibold text-amber-900 underline">Criar o negócio</Link>
        </section>
      )}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={() => navigate(-1)} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg text-sm">Depois</button>
        <button type="button" onClick={salvar} disabled={salvando} className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
