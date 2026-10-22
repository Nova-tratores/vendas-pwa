import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getAllRecords, getByIndex, getRecord, deleteRecord, saveRecord, registrarLog, getServerId } from '../lib/db'
import { useCheckin } from '../hooks/useCheckin'
import PullToRefresh from '../components/PullToRefresh'
import ConfirmModal from '../components/ConfirmModal'
import AudioTextInput from '../components/AudioTextInput'
import { TIPOS_MAQUINA, MARCAS, CULTURAS } from '../lib/constants'
import { notaVisita, dataMaisDias, semRetornoJustificado, PREFIXO_SEM_RETORNO, faltouNaUltima } from '../lib/completudeVisita'
import { camposParaVerde, subiuDeNivel, missaoDaVisita } from '../lib/gamificacao'
import { carregarPerfil, carregarMissoes, missoesAtivas } from '../lib/gamificacaoLocal'
import { tic, celebrarVisitaCompleta } from '../lib/recompensas'
import ContadorXP from '../components/gamificacao/ContadorXP'
import SubiuNivel from '../components/gamificacao/SubiuNivel'
import { STATUS_NEGOCIO, STATUS_ABERTOS, isPerdido, isAberto, statusLabel, TEMPERATURAS } from '../lib/funil'
import CidadeSelect from '../components/CidadeSelect'
import MaquinaSelect from '../components/MaquinaSelect'
import { maskTelefone } from '../lib/masks'
import { sugerirPropriedades, normalizar, similaridadeNome, distanciaKm } from '../lib/sugestao'
import VisitaCard, { TIPO_LABELS } from '../components/VisitaCard'
import MarcaSelect from '../components/MarcaSelect'
import { ESTADOS_MAQUINA, ESTADO_LABELS, FREQUENCIAS_USO, getMarcasPorTipo, marcasDoTipo } from '../lib/maquinaOpcoes'
import { getMarcasDropdown } from '../lib/catalogoSupabase'
import { Map as MapIcon, MapPin, TriangleAlert, User, Wrench } from 'lucide-react'

const EMPTY_FORM = {
  propriedade_id: '',
  tipo: '',
  negocio_id: '',
  pessoa_ids: [],
  maquina_ids: [],
  resumo: '',
  proximos_passos: '',
  data_proximo_contato: '',
  acionar_pos_vendas: false,
  data_visita: '',
  veiculo: '',
}

export default function Visitas() {
  const { loading, erroGPS, gpsData, fotoPreview, iniciarCheckin, tirarFoto, salvarVisita, resetCheckin } = useCheckin()
  const location = useLocation()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [visitas, setVisitas] = useState([])
  const [clientes, setClientes] = useState([])
  const [propriedadesAll, setPropriedadesAll] = useState([])
  const [pessoasAll, setPessoasAll] = useState([])
  const [buscaProp, setBuscaProp] = useState('')
  const [pessoasDisp, setPessoasDisp] = useState([])
  const [maquinasDisp, setMaquinasDisp] = useState([])
  const [negocios, setNegocios] = useState([])
  const [sucesso, setSucesso] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [undoVisita, setUndoVisita] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [dupVisita, setDupVisita] = useState(null)
  const [showNovaPessoa, setShowNovaPessoa] = useState(false)
  const [novaPessoa, setNovaPessoa] = useState({ nome: '', cargo: '', telefone: '' })
  const [showNovaMaquina, setShowNovaMaquina] = useState(false)
  const [novaMaquina, setNovaMaquina] = useState({ tipo: 'Trator Novo', marca: '', modelo: '', tamanho: '', estado: 'bom', frequencia_uso: '' })
  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [novoCliente, setNovoCliente] = useState({ nome_cliente: '', nome_propriedade: '', cidade: '', telefone: '', cultura_principal: '', cultura_secundaria: '' })
  const [showOutraProp, setShowOutraProp] = useState(false)
  const [novaProp, setNovaProp] = useState({ nome: '', cidade: '', cultura_principal: '', cultura_secundaria: '' })
  const [showNegocio, setShowNegocio] = useState(false)
  const [showNovoNegocio, setShowNovoNegocio] = useState(false)
  const [novoNegocio, setNovoNegocio] = useState({ valor: '', status: 'prospeccao', notas: '', cidade: '', maquina_familia: '', maquina_marca: '', maquina_modelo: '', data_fechamento_prevista: '' })
  const [negocioVinculado, setNegocioVinculado] = useState(null)
  const [negUpdate, setNegUpdate] = useState({ temperatura: '', novo_prazo: '', novo_valor: '' })
  const [editTarget, setEditTarget] = useState(null)
  const [nivelNovo, setNivelNovo] = useState(null) // tela cheia de subida de nível
  const [missoes, setMissoes] = useState([]) // missões relâmpago (supervisor)
  useEffect(() => { carregarMissoes().then(setMissoes).catch(() => {}) }, [])
  const [editForm, setEditForm] = useState(null)
  const [veiculosDisp, setVeiculosDisp] = useState([])

  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [dadosProntos, setDadosProntos] = useState(false) // carregar() terminou (para saber se a propriedade não existe)

  useEffect(() => { carregar() }, [])
  // Marcas do cadastro rápido de máquina, filtradas pelo tipo (cache offline).
  const [marcasOpcoes, setMarcasOpcoes] = useState([])
  const [marcasPorTipo, setMarcasPorTipo] = useState([])
  useEffect(() => { getMarcasDropdown().then(setMarcasOpcoes); getMarcasPorTipo().then(setMarcasPorTipo) }, [])

  // Pré-vínculo vindo da aba Negócios ("Registrar visita"): abre o check-in já
  // com a propriedade selecionada e o negócio vinculado, pronto pra atualizar.
  useEffect(() => {
    const st = location.state
    if (!st?.negocioId) return
    const neg = negocios.find((n) => String(n.id) === String(st.negocioId))
    if (!neg) return // espera os negócios carregarem
    setShowForm(true)
    iniciarCheckin()
    setForm((f) => ({ ...f, tipo: 'presencial', data_visita: getLocalDatetime() }))
    if (st.propriedadeId != null) {
      const p = propriedadesAll.find((x) => String(x.id) === String(st.propriedadeId))
      if (p) selecionarPropriedade(p)
    }
    vincularNegocio(neg)
    scrollParaTopo()
    navigate('.', { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, negocios, propriedadesAll])

  // Vindo da aba Clientes ("+ Visita" no card) ou da página Pessoas: abre o
  // check-in já com a propriedade selecionada, pedindo só o tipo.
  useEffect(() => {
    const st = location.state
    if (!st?.propriedadeId || st.negocioId) return
    const p = propriedadesAll.find((x) => String(x.id) === String(st.propriedadeId))
    if (!p) return // espera as propriedades carregarem
    resetFormVisita()
    setForm((f) => ({ ...f, data_visita: getLocalDatetime() }))
    setShowForm(true)
    iniciarCheckin()
    selecionarPropriedade(p)
    scrollParaTopo()
    navigate('.', { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, propriedadesAll])

  // "Nova visita" do Menu: abre o check-in em branco
  useEffect(() => {
    if (!location.state?.novaVisita) return
    resetFormVisita()
    setForm((f) => ({ ...f, data_visita: getLocalDatetime() }))
    setShowForm(true)
    iniciarCheckin()
    scrollParaTopo()
    navigate('.', { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  // Vindo da rota ou da ficha 360 de um cliente SEM cadastro: abre o check-in com o
  // "cliente novo" já preenchido (nome, propriedade, cidade, telefone, culturas).
  // O vendedor confere, muda o que quiser e escolhe o tipo; as sugestões de propriedade
  // parecida continuam aparecendo para não duplicar quem já existe.
  useEffect(() => {
    const st = location.state
    if (!st?.novoCliente || st.negocioId) return
    if (st.propriedadeId != null) {
      // propriedade conhecida: o efeito acima abre com ela; só segue aqui se ela não existe
      if (!dadosProntos) return
      if (propriedadesAll.some((x) => String(x.id) === String(st.propriedadeId))) return
    }
    resetFormVisita()
    setForm((f) => ({ ...f, data_visita: getLocalDatetime() }))
    setShowForm(true)
    iniciarCheckin()
    setNovoCliente((atual) => ({ ...atual, ...st.novoCliente }))
    setShowNovoCliente(true)
    scrollParaTopo()
    navigate('.', { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, dadosProntos, propriedadesAll])

  async function carregar() {
    // Visitas com deleted_at são tombstones aguardando push — não exibe.
    setVisitas((await getAllRecords('visitas')).filter((v) => !v.deleted_at))
    setClientes(await getAllRecords('clientes'))
    setPropriedadesAll(await getAllRecords('propriedades'))
    setPessoasAll(await getAllRecords('pessoas'))
    setNegocios(await getAllRecords('negocios'))
    setDadosProntos(true)
    // Veículos (placas) para o campo "veículo utilizado"
    try {
      const { supabase } = await import('../lib/sync')
      const { data } = await supabase.from('SupaPlacas').select('IdPlaca, NumPlaca').order('NumPlaca')
      if (data) setVeiculosDisp(data)
    } catch { /* offline */ }
  }

  // Check-in é centrado na PROPRIEDADE (cliente do ERP). O vendedor busca a
  // propriedade direto; o "dono" (clientes_vendas) é derivado quando existe.
  async function selecionarPropriedade(p) {
    setForm((f) => ({ ...f, propriedade_id: p.id, pessoa_ids: [], maquina_ids: [] }))
    setClienteSelecionado(p.cliente_dono_id ? String(p.cliente_dono_id) : '')
    setBuscaProp('')
    setPessoasDisp(await getByIndex('pessoas', 'propriedade_id', p.id))
    setMaquinasDisp(await getByIndex('maquinas', 'propriedade_id', p.id))
  }

  function limparPropriedade() {
    setForm((f) => ({ ...f, propriedade_id: '', pessoa_ids: [], maquina_ids: [] }))
    setClienteSelecionado('')
    setPessoasDisp([])
    setMaquinasDisp([])
    setShowOutraProp(false)
  }

  // Reset canônico do fluxo de check-in: zera formulário, seleção, negócio
  // vinculado e todos os mini-forms. Usado ao abrir, salvar e cancelar —
  // resíduos do fluxo anterior travavam o "+ Nova visita neste cliente"
  // a partir do segundo clique.
  function resetFormVisita() {
    setForm({ ...EMPTY_FORM })
    setClienteSelecionado('')
    setBuscaProp('')
    setNegocioVinculado(null)
    setNegUpdate({ temperatura: '', novo_prazo: '', novo_valor: '' })
    setPessoasDisp([])
    setMaquinasDisp([])
    setShowOutraProp(false)
    setShowNovoCliente(false)
    setShowNovaPessoa(false)
    setShowNovaMaquina(false)
    setShowNegocio(false)
    setShowNovoNegocio(false)
    setDupVisita(null)
    resetCheckin()
  }

  // Cadastra outra propriedade para o MESMO cliente (dono) da propriedade
  // selecionada — o modelo já suporta vários locais por cliente (cliente_dono_id).
  async function salvarOutraProp() {
    const donoId = propSelecionada?.cliente_dono_id
    if (!donoId) return
    if (!novaProp.nome) { alert('Informe o nome da propriedade'); return }
    if (!novaProp.cidade?.trim()) { alert('Informe a cidade da propriedade'); return }
    if (!novaProp.cultura_principal) { alert('Selecione a cultura principal'); return }
    // Trava anti-duplicado: o mesmo dono já tem propriedade com nome parecido?
    const parecida = propriedadesAll.find((p) => String(p.cliente_dono_id) === String(donoId)
      && similaridadeNome(novaProp.nome, p.nome_fantasia || p.nome) >= 0.85)
    if (parecida) {
      if (!window.confirm(`Este cliente já tem a propriedade "${parecida.nome_fantasia || parecida.nome}". Criar MESMO ASSIM outra?`)) return
    }
    const culturas = [novaProp.cultura_principal, novaProp.cultura_secundaria].filter(Boolean)
    const propId = await saveRecord('propriedades', {
      cliente_dono_id: donoId,
      nome: novaProp.nome,
      nome_fantasia: novaProp.nome,
      cidade: novaProp.cidade,
      culturas: culturas.length ? culturas : null,
      created_at: new Date().toISOString(),
    })
    await registrarLog('criar', 'propriedades', propId, `Outra propriedade do cliente: ${novaProp.nome}`)
    await carregar()
    setClienteSelecionado(String(donoId))
    setForm((f) => ({ ...f, propriedade_id: propId, pessoa_ids: [], maquina_ids: [] }))
    setPessoasDisp([])
    setMaquinasDisp([])
    setShowOutraProp(false)
    setNovaProp({ nome: '', cidade: '', cultura_principal: '', cultura_secundaria: '' })
  }

  function toggleArray(arr, id) {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const alvo = form.data_visita ? localDateKey(form.data_visita) : localDateKey(new Date())
    const dup = visitas
      .filter((v) => String(v.propriedade_id) === String(form.propriedade_id)
                  && localDateKey(v.data_visita) === alvo)
      .sort((a, b) => new Date(b.data_visita) - new Date(a.data_visita))[0]
    if (dup) {
      setDupVisita(dup)
      return
    }
    await prosseguirSalvar()
  }

  async function prosseguirSalvar() {
    if (salvando) return // duplo toque no botão criava visita duplicada
    setSalvando(true)
    try {
      // recompensa: XP antes de salvar, para detectar a subida de nível
      const notaSalva = notaForm.nota
      const xpSalvo = xpForm
      const xpAntes = await carregarPerfil().then((p) => p.xp).catch(() => null)
      await salvarVisita(form)
      // Se a visita está ligada a um negócio em andamento, atualiza o estado
      // do negócio (temperatura obrigatória; novo prazo/valor se informados).
      if (form.negocio_id && negUpdate.temperatura) {
        const neg = await getRecord('negocios', Number(form.negocio_id))
        if (neg) {
          const novoValor = negUpdate.novo_valor !== '' ? parseFloat(negUpdate.novo_valor) : neg.valor
          await saveRecord('negocios', {
            ...neg,
            temperatura: negUpdate.temperatura,
            temperatura_anterior: negUpdate.temperatura !== neg.temperatura ? (neg.temperatura || null) : (neg.temperatura_anterior || null),
            data_fechamento_prevista: negUpdate.novo_prazo || neg.data_fechamento_prevista || null,
            valor: novoValor,
            updated_at: new Date().toISOString(),
          })
          await registrarLog('alterar', 'negocios', neg.id, `Atualização via visita — temperatura: ${neg.temperatura || '—'} → ${negUpdate.temperatura}`)
        }
      }
      setSucesso(true)
      setShowForm(false)
      resetFormVisita()
      carregar()
      if (notaSalva >= 80) celebrarVisitaCompleta()
      if (xpAntes != null) {
        const n = subiuDeNivel(xpAntes, xpAntes + xpSalvo)
        if (n) setTimeout(() => setNivelNovo(n), notaSalva >= 80 ? 1100 : 0)
      }
      setTimeout(() => setSucesso(false), 3000)
    } catch (err) {
      alert(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const tipoPresencial = form.tipo === 'presencial'

  // Propriedade atualmente selecionada e seu dono (se houver)
  const propSelecionada = form.propriedade_id
    ? propriedadesAll.find((p) => String(p.id) === String(form.propriedade_id))
    : null
  const donoNome = clienteSelecionado
    ? (clientes.find((c) => String(c.id) === String(clienteSelecionado))?.nome || '')
    : ''

  // Nota de completude ao vivo (a mesma régua que o supervisor vê no card)
  const notaForm = notaVisita({
    resumo: form.resumo,
    proximos_passos: form.proximos_passos,
    data_proximo_contato: form.data_proximo_contato,
    negocio_id: form.negocio_id,
    pessoas: pessoasDisp.filter((p) => form.pessoa_ids.map(String).includes(String(p.id))),
    maquina_ids: form.maquina_ids,
    culturas: propSelecionada?.culturas,
  })
  // "Da última vez faltou: …" — o que dá para coletar hoje neste cliente
  const faltouAntes = propSelecionada
    ? faltouNaUltima(
      visitas.filter((v) => String(v.propriedade_id) === String(propSelecionada.id) && v.id !== editTarget?.id),
      { pessoasById: Object.fromEntries(pessoasDisp.map((p) => [p.id, p])), propById: { [propSelecionada.id]: propSelecionada } },
    )
    : null
  // "tic" (vibração curta) a cada campo que sobe a nota
  const notaAnterior = useRef(0)
  useEffect(() => {
    if (notaForm.nota > notaAnterior.current && form.propriedade_id) tic()
    notaAnterior.current = notaForm.nota
  }, [notaForm.nota, form.propriedade_id])
  const paraVerde = camposParaVerde(notaForm)
  // missão relâmpago valendo agora que esta visita cumpre (2x/3x XP)
  const missaoForm = missaoDaVisita({ data_visita: new Date().toISOString() }, notaForm, missoesAtivas(missoes))
  const xpForm = notaForm.nota * (missaoForm ? Number(missaoForm.multiplicador) : 1)
  // visita presencial sempre sai com retorno: data ou "sem retorno" com motivo
  const faltaRetorno = tipoPresencial && !form.data_proximo_contato && !semRetornoJustificado(form.proximos_passos)
  function semRetorno() {
    const motivo = window.prompt('Por que não haverá retorno com este cliente?', '')
    if (!motivo || !motivo.trim()) return
    setForm((f) => ({
      ...f,
      data_proximo_contato: '',
      proximos_passos: [`${PREFIXO_SEM_RETORNO} ${motivo.trim()}`, f.proximos_passos?.trim()].filter(Boolean).join('\n'),
    }))
  }

  // Negócios EM ANDAMENTO da propriedade selecionada (pra destacar no check-in)
  const negociosAbertosProp = form.propriedade_id
    ? negocios.filter((n) => String(n.propriedade_id) === String(form.propriedade_id) && isAberto(n.status))
    : []
  const negocioAbertoVinculado = negocioVinculado && isAberto(negocioVinculado.status)

  // Vincula um negócio aberto e pré-preenche os campos de atualização da visita
  function vincularNegocio(n) {
    setNegocioVinculado(n)
    setForm((f) => ({ ...f, negocio_id: n.id }))
    setNegUpdate({
      temperatura: n.temperatura || '',
      novo_prazo: n.data_fechamento_prevista || '',
      novo_valor: n.valor != null ? String(n.valor) : '',
    })
  }
  function desvincularNegocio() {
    setNegocioVinculado(null)
    setForm((f) => ({ ...f, negocio_id: '' }))
    setNegUpdate({ temperatura: '', novo_prazo: '', novo_valor: '' })
  }

  // Nº de interações (visitas + negócios) do vendedor por propriedade — prioriza
  // na busca quem já tem relação e alimenta a badge "cliente seu".
  const interacaoPorProp = useMemo(() => {
    const m = new Map()
    for (const v of visitas) if (v.propriedade_id != null) m.set(v.propriedade_id, (m.get(v.propriedade_id) || 0) + 1)
    for (const n of negocios) if (n.propriedade_id != null) m.set(n.propriedade_id, (m.get(n.propriedade_id) || 0) + 1)
    return m
  }, [visitas, negocios])

  // Clientes salvos num raio de 1 km do GPS atual — no check-in presencial o
  // vendedor provavelmente está NA propriedade; sugere antes de digitar.
  // Só entram propriedades já geolocalizadas (1º check-in presencial grava a coordenada).
  const sugestoesProximas = useMemo(() => {
    if (!gpsData?.latitude) return []
    const out = []
    for (const p of propriedadesAll) {
      const d = distanciaKm(gpsData.latitude, gpsData.longitude, p.latitude, p.longitude)
      if (d <= 1) out.push({ p, d })
    }
    return out.sort((a, b) => a.d - b.d).slice(0, 5)
  }, [gpsData, propriedadesAll])

  // Resultados da busca de propriedade (limita a 50 pra não pesar no mobile).
  // Casa por dados da propriedade E pelo nome do contato/pessoa cadastrada
  // (ex: digitar "Valter" acha as propriedades onde o Valter é contato).
  // Ordem: (1º) quem já tem visita/negócio do vendedor, (2º) nome que começa
  // com o termo, (3º) demais matches.
  const resultadosBusca = (() => {
    const t = buscaProp.trim().toLowerCase()
    if (!t) return []
    // Mapa propriedade_id -> nome do contato que casou com a busca
    const contatoPorProp = new Map()
    for (const ps of pessoasAll) {
      if (!ps.nome) continue
      if (String(ps.nome).toLowerCase().includes(t) && !contatoPorProp.has(ps.propriedade_id)) {
        contatoPorProp.set(ps.propriedade_id, ps.nome)
      }
    }
    const out = []
    for (const p of propriedadesAll) {
      const campos = [p.nome, p.nome_fantasia, p.razao_social, p.cidade, p.cnpj_cpf]
        .filter(Boolean).map((s) => String(s).toLowerCase())
      const matchProp = campos.some((s) => s.includes(t))
      const contato = contatoPorProp.get(p.id)
      if (!matchProp && !contato) continue
      const interacoes = interacaoPorProp.get(p.id) || 0
      const comecaCom = [p.nome, p.nome_fantasia]
        .filter(Boolean).some((s) => String(s).toLowerCase().startsWith(t))
      // Só anota o contato quando o match veio dele (não polui quando o nome
      // da própria propriedade já bateu).
      out.push({
        ...(matchProp ? p : { ...p, _contato: contato }),
        _interacoes: interacoes,
        _score: (interacoes > 0 ? 1000 + interacoes : 0) + (comecaCom ? 10 : 0),
      })
    }
    out.sort((a, b) => b._score - a._score)
    return out.slice(0, 50)
  })()

  // Sugestão de cliente já cadastrado enquanto preenche o "+ Novo" — compara
  // o nome digitado + cidade + GPS atual com as propriedades existentes, para
  // não duplicar um cliente que já existe.
  const sugestoesNovoCliente = useMemo(() => {
    if (!showNovoCliente) return []
    return sugerirPropriedades({
      nome: novoCliente.nome_cliente,
      cidade: novoCliente.cidade,
      lat: gpsData?.latitude,
      lng: gpsData?.longitude,
      propriedades: propriedadesAll,
      clientes,
    })
  }, [showNovoCliente, novoCliente.nome_cliente, novoCliente.cidade, gpsData, propriedadesAll, clientes])

  // Seleciona uma propriedade sugerida e fecha o mini-form de novo cliente.
  function usarSugestao(p) {
    setShowNovoCliente(false)
    setNovoCliente({ nome_cliente: '', nome_propriedade: '', cidade: '', telefone: '', cultura_principal: '', cultura_secundaria: '' })
    selecionarPropriedade(p)
  }

  function localDateKey(d) {
    const dt = new Date(d)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  }

  function getLocalDatetime() {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }

  // Quem rola de fato é a JANELA (o Layout usa min-h-screen, então o <main>
  // nunca tem overflow próprio). Rola os dois pra garantir que o formulário
  // recém-aberto fique visível — mirar só o <main> deixava o form fora da
  // tela e o botão parecia morto.
  function scrollParaTopo() {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  function handleNovaVisita() {
    resetFormVisita()
    setForm((f) => ({ ...f, data_visita: getLocalDatetime() }))
    setShowForm(true)
    iniciarCheckin()
  }

  // Inicia uma visita NOVA já com a propriedade da visita escolhida pré-selecionada
  // e pedindo o tipo (campo limpo). É o caminho claro para "registrar outra visita
  // neste mesmo cliente" — sem cair no check-in genérico de buscar cliente de novo.
  async function novaVisitaNeste(visita) {
    let pid = visita.propriedade_id
    let p = propriedadesAll.find((x) => String(x.id) === String(pid))
    if (!p && pid < 0) {
      // Visita antiga apontando pro id local negativo cujo gêmeo o pull já
      // trocou pelo id do servidor — segue o id_map.
      const sid = await getServerId('propriedades', pid)
      if (sid != null) {
        pid = sid
        p = propriedadesAll.find((x) => String(x.id) === String(sid))
      }
    }
    if (!p) p = await getRecord('propriedades', pid) // garante abrir mesmo fora da lista local
    resetFormVisita()
    setForm((f) => ({ ...f, data_visita: getLocalDatetime() }))
    setShowForm(true)
    iniciarCheckin()
    if (p) await selecionarPropriedade(p)
    else alert('O cliente desta visita não está no cache local — sincronize e tente de novo.')
    scrollParaTopo()
  }

  function podeEditar(visita) {
    const criacao = new Date(visita.created_at || visita.data_visita)
    return (Date.now() - criacao.getTime()) < 48 * 60 * 60 * 1000
  }

  function abrirEdicao(visita) {
    setEditTarget(visita)
    setEditForm({
      tipo: visita.tipo || 'presencial',
      resumo: visita.resumo || '',
      proximos_passos: visita.proximos_passos || '',
      data_proximo_contato: visita.data_proximo_contato || '',
      acionar_pos_vendas: visita.acionar_pos_vendas || false,
    })
  }

  async function handleSalvarEdicao() {
    if (!editTarget || !editForm) return

    const alteracoes = []
    if (editForm.tipo !== editTarget.tipo) alteracoes.push(`tipo: ${editTarget.tipo} → ${editForm.tipo}`)
    if (editForm.resumo !== (editTarget.resumo || '')) alteracoes.push('resumo alterado')
    if (editForm.proximos_passos !== (editTarget.proximos_passos || '')) alteracoes.push('próximos passos alterado')
    if (editForm.data_proximo_contato !== (editTarget.data_proximo_contato || '')) alteracoes.push('data próximo contato alterada')
    if (editForm.acionar_pos_vendas !== (editTarget.acionar_pos_vendas || false)) alteracoes.push(`pós vendas: ${editForm.acionar_pos_vendas ? 'acionado' : 'removido'}`)

    await saveRecord('visitas', {
      ...editTarget,
      ...editForm,
      status_sync: 'pending',
    })

    await registrarLog('alterar', 'visitas', editTarget.id, `Edição: ${alteracoes.join(', ') || 'sem alterações'}`)

    setEditTarget(null)
    setEditForm(null)
    carregar()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const v = deleteTarget
    await registrarLog('excluir', 'visitas', v.id, `Visita ${v.tipo}`)
    const noServidor = v.id > 0 || v.client_uuid || (await getServerId('visitas', v.id)) != null
    if (noServidor) {
      // Soft-delete: o push sobe deleted_at e o pull remove a visita nos outros
      // devices. (Apagar só o IndexedDB fazia a visita voltar no próximo pull.)
      await saveRecord('visitas', { ...v, deleted_at: new Date().toISOString(), status_sync: 'pending' })
    } else {
      // Nunca saiu deste device: apaga de vez.
      await deleteRecord('visitas', v.id)
    }
    setUndoVisita(v)
    setTimeout(() => setUndoVisita((u) => (u === v ? null : u)), 6000)
    setDeleteTarget(null)
    carregar()
  }

  async function desfazerExclusao() {
    const v = undoVisita
    if (!v) return
    setUndoVisita(null)
    // deleted_at: null explícito — se o push já subiu o tombstone, o UPDATE limpa no servidor.
    await saveRecord('visitas', { ...v, deleted_at: null, status_sync: 'pending' })
    carregar()
  }

  const visitasOrdenadas = [...visitas].sort((a, b) => new Date(b.data_visita) - new Date(a.data_visita))

  return (
    <PullToRefresh onRefresh={carregar}>
    <div>
      {nivelNovo && <SubiuNivel nivel={nivelNovo} onFechar={() => setNivelNovo(null)} />}
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-xl font-bold">Visitas</h2>
        {!showForm && (
          <div className="flex gap-2">
            <Link
              to="/visitas/mapa"
              className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium active:bg-slate-200 inline-flex items-center gap-1.5"
            >
              <MapIcon size={16} /> Mapa
            </Link>
            <button onClick={handleNovaVisita} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + Check-in
            </button>
          </div>
        )}
      </div>

      {sucesso && (
        <div className="bg-green-100 text-green-800 p-3 rounded-lg mb-4 text-sm font-medium">
          Visita registrada com sucesso!
        </div>
      )}

      {undoVisita && (
        <div className="bg-slate-800 text-white p-3 rounded-lg mb-4 text-sm flex items-center justify-between animate-fade-in">
          <span>Visita excluída.</span>
          <button onClick={desfazerExclusao} className="font-bold underline ml-3 shrink-0">Desfazer</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 mb-4 space-y-3">
          {/* Tipo da visita — primeiro passo (sempre visível) */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'presencial', label: 'Presencial' },
              { key: 'mensagem', label: 'Mensagem' },
              { key: 'telefonema', label: 'Telefonema' },
              { key: 'email', label: 'E-mail' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, tipo: t.key }))}
                className={`py-2 rounded-lg text-sm font-medium border ${form.tipo === t.key ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* GPS Status - obrigatório só para presencial (aparece após escolher o tipo) */}
          {form.tipo && (tipoPresencial ? (
            <div className={`p-3 rounded-lg text-sm ${gpsData ? 'bg-green-50 text-green-700' : erroGPS ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
              {loading && 'Obtendo localização...'}
              {gpsData && `GPS: ${gpsData.latitude.toFixed(5)}, ${gpsData.longitude.toFixed(5)} (±${gpsData.gps_accuracy.toFixed(0)}m)`}
              {erroGPS && `Sem GPS: ${erroGPS} Você pode registrar mesmo assim (sem localização).`}
              {erroGPS && (
                <button type="button" onClick={iniciarCheckin} className="ml-2 underline">Tentar de novo</button>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg text-sm bg-slate-50 text-slate-500">
              GPS opcional para {TIPO_LABELS[form.tipo]}
              {gpsData && ` — capturado: ${gpsData.latitude.toFixed(4)}, ${gpsData.longitude.toFixed(4)}`}
              {!gpsData && !loading && (
                <button type="button" onClick={iniciarCheckin} className="ml-2 text-blue-600 underline">Capturar GPS</button>
              )}
            </div>
          ))}

          {/* Propriedade / Cliente — busca direta (aparece após escolher o tipo) */}
          {form.tipo && (<>
          {propSelecionada ? (
            <div className="space-y-2">
              {faltouAntes && (
                <p className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
                  Da última vez ({new Date(faltouAntes.visita.data_visita).toLocaleDateString('pt-BR')}) faltou: <b>{faltouAntes.faltam.join(', ')}</b>. Repare nisso hoje.
                </p>
              )}
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-blue-900 truncate">
                    {propSelecionada.nome || propSelecionada.nome_fantasia}
                  </p>
                  <p className="text-xs text-blue-600 truncate">
                    {[propSelecionada.cidade, donoNome].filter(Boolean).join(' · ') || 'Propriedade selecionada'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={limparPropriedade}
                  className="text-blue-600 text-sm underline shrink-0 ml-2"
                >
                  trocar
                </button>
              </div>

              {/* Outra propriedade do mesmo cliente (só quando há dono) */}
              {propSelecionada.cliente_dono_id && !showOutraProp && (
                <button
                  type="button"
                  onClick={() => setShowOutraProp(true)}
                  className="text-xs text-blue-600 font-medium"
                >
                  + Outra propriedade deste cliente
                </button>
              )}
              {propSelecionada.cliente_dono_id && showOutraProp && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 animate-slide-up">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Nova propriedade deste cliente</p>
                    <button type="button" onClick={() => setShowOutraProp(false)} className="text-xs text-slate-500">Cancelar</button>
                  </div>
                  <input
                    type="text"
                    placeholder="Nome da propriedade / fazenda *"
                    value={novaProp.nome}
                    onChange={(e) => setNovaProp({ ...novaProp, nome: e.target.value })}
                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Cidade *"
                    value={novaProp.cidade}
                    onChange={(e) => setNovaProp({ ...novaProp, cidade: e.target.value })}
                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <select
                    value={novaProp.cultura_principal}
                    onChange={(e) => setNovaProp({ ...novaProp, cultura_principal: e.target.value })}
                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Cultura principal *</option>
                    {CULTURAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={novaProp.cultura_secundaria}
                    onChange={(e) => setNovaProp({ ...novaProp, cultura_secundaria: e.target.value })}
                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Cultura secundária (opcional)</option>
                    {CULTURAS.filter((c) => c !== novaProp.cultura_principal).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={salvarOutraProp}
                    className="w-full bg-blue-700 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    Salvar propriedade
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Sugestão por proximidade: check-in presencial com GPS capturado */}
              {tipoPresencial && !showNovoCliente && sugestoesProximas.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 space-y-1.5 mb-2 animate-slide-up">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 flex items-center gap-1"><MapPin size={12} /> Perto de você (até 1 km)</p>
                  {sugestoesProximas.map(({ p, d }) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selecionarPropriedade(p)}
                      className="w-full text-left text-sm bg-white border border-emerald-100 rounded-lg px-3 py-2 active:bg-emerald-100"
                    >
                      <span className="font-medium">{p.nome_fantasia || p.nome}</span>
                      <span className="text-xs text-emerald-700 font-medium"> — {d < 0.05 ? 'você está aqui' : `${Math.round(d * 1000)} m`}</span>
                      {(p.razao_social || p.cidade) && (
                        <span className="block text-xs text-slate-500 truncate">
                          {[p.razao_social !== (p.nome_fantasia || p.nome) ? p.razao_social : null, p.cidade].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={buscaProp}
                  onChange={(e) => setBuscaProp(e.target.value)}
                  placeholder="Buscar cliente / propriedade *"
                  disabled={showNovoCliente}
                  className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:opacity-50 disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowNovoCliente(!showNovoCliente)}
                  className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium border ${showNovoCliente ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                >
                  {showNovoCliente ? 'Cancelar' : '+ Novo'}
                </button>
              </div>

              {!showNovoCliente && buscaProp.trim() && (
                <div className="mt-1 border border-slate-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {resultadosBusca.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-400">Nenhuma propriedade encontrada</p>
                  ) : (
                    resultadosBusca.map((p) => {
                      const linha1 = p.nome_fantasia || p.nome || p.razao_social || 'Sem nome'
                      const sub = [
                        p.razao_social && p.razao_social !== linha1 ? p.razao_social : null,
                        p.cidade,
                        p.cnpj_cpf,
                      ].filter(Boolean).join(' · ')
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selecionarPropriedade(p)}
                          className="w-full text-left px-3 py-2.5 text-sm active:bg-slate-50"
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="font-medium truncate">{linha1}</span>
                            {p._interacoes > 0 && (
                              <span className="shrink-0 text-[10px] font-medium bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                                ★ cliente seu
                              </span>
                            )}
                          </span>
                          {sub && <span className="block text-xs text-slate-500 truncate">{sub}</span>}
                          {p._contato && (
                            <span className="block text-xs text-blue-600">contato: {p._contato}</span>
                          )}
                        </button>
                      )
                    })
                  )}
                  {resultadosBusca.length >= 50 && (
                    <p className="px-3 py-1.5 text-xs text-slate-400">Mostrando os 50 primeiros — refine a busca</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mini-form: novo cliente (primeiro contato) */}
          {showNovoCliente && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 animate-slide-up">
              <p className="text-xs font-medium text-blue-700">Cadastrar cliente novo (primeiro contato)</p>

              {/* Sugestão: já existe um cliente parecido? (evita duplicar) */}
              {sugestoesNovoCliente.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
                    Já cadastrado? Talvez seja um destes
                  </p>
                  {sugestoesNovoCliente.map((s) => (
                    <button
                      key={s.propriedade.id}
                      type="button"
                      onClick={() => usarSugestao(s.propriedade)}
                      className="w-full text-left bg-white border border-amber-200 rounded-lg px-3 py-2 active:bg-amber-100"
                    >
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {s.dono?.nome || s.propriedade.nome || s.propriedade.nome_fantasia}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {[
                          s.propriedade.nome || s.propriedade.nome_fantasia,
                          s.propriedade.cidade,
                          s.distKm <= 10 ? `~${s.distKm < 1 ? '<1' : s.distKm.toFixed(0)} km` : null,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                  ))}
                  <p className="text-[11px] text-amber-700">Nenhum é esse? Continue o cadastro abaixo.</p>
                </div>
              )}

              {/* Bloco CLIENTE (pessoa) */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Cliente (pessoa)</p>
                <input
                  type="text"
                  placeholder="Nome do cliente / dono *"
                  value={novoCliente.nome_cliente}
                  onChange={(e) => setNovoCliente({ ...novoCliente, nome_cliente: e.target.value })}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="Telefone (opcional)"
                  value={novoCliente.telefone}
                  onChange={(e) => setNovoCliente({ ...novoCliente, telefone: maskTelefone(e.target.value) })}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Bloco PROPRIEDADE (fazenda) */}
              <div className="space-y-2 pt-2 border-t border-blue-200">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Propriedade (fazenda)</p>
                <input
                  type="text"
                  placeholder="Nome da propriedade / fazenda *"
                  value={novoCliente.nome_propriedade}
                  onChange={(e) => setNovoCliente({ ...novoCliente, nome_propriedade: e.target.value })}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Cidade *"
                  value={novoCliente.cidade}
                  onChange={(e) => setNovoCliente({ ...novoCliente, cidade: e.target.value })}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm"
                />
                <select
                  value={novoCliente.cultura_principal}
                  onChange={(e) => setNovoCliente({ ...novoCliente, cultura_principal: e.target.value })}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">Cultura principal *</option>
                  {CULTURAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={novoCliente.cultura_secundaria}
                  onChange={(e) => setNovoCliente({ ...novoCliente, cultura_secundaria: e.target.value })}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">Cultura secundária (opcional)</option>
                  {CULTURAS.filter((c) => c !== novoCliente.cultura_principal).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!novoCliente.nome_cliente || !novoCliente.nome_propriedade) {
                    alert('Preencha nome do cliente e da propriedade')
                    return
                  }
                  if (!novoCliente.cidade?.trim()) {
                    alert('Informe a cidade da propriedade')
                    return
                  }
                  // Trava anti-duplicado: nome (quase) igual a cadastro existente
                  // só passa com confirmação explícita do vendedor.
                  const nomeNovo = normalizar(novoCliente.nome_cliente)
                  const jaExiste = clientes.find((c) => normalizar(c.nome) === nomeNovo)
                  const forte = sugestoesNovoCliente.find((s) => s.sNome >= 0.85)
                  if (jaExiste || forte) {
                    const quem = jaExiste?.nome
                      || forte.dono?.nome || forte.propriedade.nome_fantasia || forte.propriedade.nome
                    if (!window.confirm(`Já existe um cadastro muito parecido: "${quem}". Se for o mesmo cliente, cancele e selecione pela busca. Criar MESMO ASSIM um cliente novo?`)) return
                  }
                  const vendedor = JSON.parse(localStorage.getItem('vendedor'))
                  const now = new Date().toISOString()
                  const clienteId = await saveRecord('clientes', {
                    vendedor_id: vendedor.id,
                    nome: novoCliente.nome_cliente,
                    telefone: novoCliente.telefone || null,
                    created_at: now,
                  })
                  await registrarLog('criar', 'clientes', clienteId, `Criado em check-in: ${novoCliente.nome_cliente}`)
                  const culturas = [novoCliente.cultura_principal, novoCliente.cultura_secundaria].filter(Boolean)
                  const propId = await saveRecord('propriedades', {
                    cliente_dono_id: clienteId,
                    nome: novoCliente.nome_propriedade,
                    nome_fantasia: novoCliente.nome_propriedade,
                    cidade: novoCliente.cidade,
                    telefone: novoCliente.telefone || null,
                    culturas: culturas.length ? culturas : null,
                    created_at: now,
                  })
                  await registrarLog('criar', 'propriedades', propId, `Criada em check-in: ${novoCliente.nome_propriedade}`)
                  await carregar()
                  setClienteSelecionado(String(clienteId))
                  setForm((f) => ({ ...f, propriedade_id: propId, pessoa_ids: [], maquina_ids: [] }))
                  setPessoasDisp([])
                  setMaquinasDisp([])
                  setBuscaProp('')
                  setShowNovoCliente(false)
                  setNovoCliente({ nome_cliente: '', nome_propriedade: '', cidade: '', telefone: '', cultura_principal: '', cultura_secundaria: '' })
                }}
                className="w-full bg-blue-700 text-white py-2 rounded-lg text-sm font-medium"
              >
                Salvar e continuar check-in
              </button>
            </div>
          )}
          </>)}

          {/* Negócio em andamento deste cliente — destaque + atualização obrigatória */}
          {form.propriedade_id && (negociosAbertosProp.length > 0 || negocioVinculado) && (
            <div className="animate-slide-up">
              {negocioVinculado ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-green-800">Negócio vinculado</p>
                      <p className="text-xs text-green-600 truncate">
                        {statusLabel(negocioVinculado.status)}
                        {negocioVinculado.valor ? ` · R$ ${Number(negocioVinculado.valor).toLocaleString('pt-BR')}` : ''}
                      </p>
                    </div>
                    <button type="button" onClick={desvincularNegocio} className="text-green-600 text-lg px-1 shrink-0">&times;</button>
                  </div>

                  {negocioAbertoVinculado && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Temperatura do negócio <span className="text-red-500">*</span></p>
                        <div className="flex gap-2">
                          {TEMPERATURAS.map((t) => (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => setNegUpdate({ ...negUpdate, temperatura: t.key })}
                              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${negUpdate.temperatura === t.key ? t.sel : t.off}`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">Novo prazo</label>
                          <input
                            type="date"
                            value={negUpdate.novo_prazo}
                            onChange={(e) => setNegUpdate({ ...negUpdate, novo_prazo: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">Novo valor (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={negUpdate.novo_valor}
                            onChange={(e) => setNegUpdate({ ...negUpdate, novo_valor: e.target.value })}
                            placeholder="0,00"
                            className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5"><TriangleAlert size={16} className="shrink-0" /> Este cliente tem {negociosAbertosProp.length} negócio(s) em andamento</p>
                  <div className="space-y-1.5">
                    {negociosAbertosProp.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => vincularNegocio(n)}
                        className="w-full text-left bg-white border border-amber-200 rounded-lg px-3 py-2 active:bg-amber-100"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-700 truncate">
                            {statusLabel(n.status)}{n.valor ? ` · R$ ${Number(n.valor).toLocaleString('pt-BR')}` : ''}
                          </span>
                          <span className="text-xs text-amber-700 font-medium shrink-0">Atualizar →</span>
                        </div>
                        {n.notas && <p className="text-xs text-slate-400 truncate">{n.notas}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pessoas — obrigatória (aparece após selecionar a propriedade) */}
          {form.propriedade_id && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">Com quem conversou: <span className="text-red-500">*</span></p>
                <button
                  type="button"
                  onClick={() => setShowNovaPessoa(!showNovaPessoa)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg ${showNovaPessoa ? 'text-blue-600' : 'text-blue-700 border border-blue-300'} ${!showNovaPessoa && form.pessoa_ids.length === 0 ? 'animate-pulse-glow' : ''}`}
                >
                  {showNovaPessoa ? 'Cancelar' : <span className="inline-flex items-center gap-1"><User size={14} /> Nova pessoa</span>}
                </button>
              </div>

              {/* Mini formulário nova pessoa */}
              {showNovaPessoa && (
                <div className="bg-slate-50 rounded-lg p-3 mb-2 space-y-2 animate-slide-up">
                  <input
                    value={novaPessoa.nome}
                    onChange={(e) => setNovaPessoa({ ...novaPessoa, nome: e.target.value })}
                    placeholder="Nome *"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={novaPessoa.cargo}
                      onChange={(e) => setNovaPessoa({ ...novaPessoa, cargo: e.target.value })}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Cargo</option>
                      <option value="PROPRIETARIO">Proprietário</option>
                      <option value="FAMILIAR">Familiar</option>
                      <option value="GERENTE">Gerente</option>
                      <option value="TRATORISTA">Tratorista</option>
                      <option value="SECRETARIA">Secretária</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                    <input
                      value={novaPessoa.telefone}
                      onChange={(e) => setNovaPessoa({ ...novaPessoa, telefone: e.target.value })}
                      placeholder="Telefone"
                      inputMode="tel"
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!novaPessoa.nome.trim()}
                    onClick={async () => {
                      const pessoaId = await saveRecord('pessoas', {
                        propriedade_id: parseInt(form.propriedade_id),
                        nome: novaPessoa.nome,
                        vinculo: 'outro',
                        cargo: novaPessoa.cargo,
                        telefone: novaPessoa.telefone,
                        observacoes: '',
                        created_at: new Date().toISOString(),
                      })
                      await registrarLog('criar', 'pessoas', pessoaId, `Pessoa: ${novaPessoa.nome} (via visita)`)
                      // Recarregar pessoas da propriedade
                      const novasPessoas = await getByIndex('pessoas', 'propriedade_id', form.propriedade_id)
                      setPessoasDisp(novasPessoas)
                      // Já selecionar a pessoa criada
                      setForm((f) => ({ ...f, pessoa_ids: [...f.pessoa_ids, pessoaId] }))
                      setNovaPessoa({ nome: '', cargo: '', telefone: '' })
                      setShowNovaPessoa(false)
                    }}
                    className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Adicionar Pessoa
                  </button>
                </div>
              )}

              {pessoasDisp.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {pessoasDisp.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, pessoa_ids: toggleArray(f.pessoa_ids, p.id) }))}
                      className={`px-3 py-1 rounded-full text-xs border ${form.pessoa_ids.includes(p.id) ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}
                    >
                      {p.nome}
                    </button>
                  ))}
                </div>
              ) : (
                !showNovaPessoa && (
                  <p className="text-xs text-slate-400 italic">Nenhuma pessoa cadastrada nesta propriedade</p>
                )
              )}

              {form.pessoa_ids.length === 0 && !showNovaPessoa && (
                <p className="text-xs text-amber-600 mt-1 font-medium">Selecione ou cadastre pelo menos uma pessoa para continuar</p>
              )}
            </div>
          )}

          {/* Demais campos — aparecem após selecionar a propriedade e ao menos uma pessoa */}
          {form.propriedade_id && form.pessoa_ids.length > 0 && (
          <div className="space-y-3 animate-slide-up">

          {/* Veículo utilizado */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Veículo utilizado</label>
            <select
              value={form.veiculo}
              onChange={(e) => setForm((f) => ({ ...f, veiculo: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Selecione o veículo (opcional)</option>
              {veiculosDisp.map((v) => (
                <option key={v.IdPlaca} value={v.NumPlaca}>{v.NumPlaca}</option>
              ))}
            </select>
          </div>

          {/* Data/hora da visita */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Data/hora da visita</label>
            <input
              type="datetime-local"
              value={form.data_visita}
              max={getLocalDatetime()}
              onChange={(e) => setForm((f) => ({ ...f, data_visita: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            {form.data_visita && (Date.now() - new Date(form.data_visita).getTime()) > 120 * 60 * 1000 && (
              <p className="text-xs text-amber-600 mt-1 font-medium">Esta visita será marcada como retroativa</p>
            )}
          </div>

          {/* Negócio (opcional) — entrada manual; o vinculado e a atualização aparecem acima */}
          {!negocioVinculado && (
            <div>
              <button
                type="button"
                onClick={() => setShowNegocio(true)}
                className="w-full py-2.5 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-600 active:bg-slate-50"
              >
                + Vincular Negócio
              </button>
            </div>
          )}

          {/* Máquinas */}
          {form.propriedade_id && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">Máquinas tratadas:</p>
                <button
                  type="button"
                  onClick={() => setShowNovaMaquina(!showNovaMaquina)}
                  className="text-xs text-blue-600 font-medium"
                >
                  {showNovaMaquina ? 'Cancelar' : '+ Nova máquina'}
                </button>
              </div>

              {/* Mini formulário nova máquina */}
              {showNovaMaquina && (
                <div className="bg-slate-50 rounded-lg p-3 mb-2 space-y-2 animate-slide-up">
                  <select
                    value={novaMaquina.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value
                      const lista = marcasDoTipo(tipo, marcasPorTipo, marcasOpcoes)
                      const manter = !lista || lista.includes(novaMaquina.marca)
                      setNovaMaquina({ ...novaMaquina, tipo, ...(manter ? {} : { marca: '' }) })
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {TIPOS_MAQUINA.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <MarcaSelect
                    tipo={novaMaquina.tipo}
                    value={novaMaquina.marca}
                    onChange={(v) => setNovaMaquina({ ...novaMaquina, marca: v })}
                    marcas={marcasOpcoes}
                    porTipo={marcasPorTipo}
                    fallback={MARCAS}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={novaMaquina.modelo}
                      onChange={(e) => setNovaMaquina({ ...novaMaquina, modelo: e.target.value })}
                      placeholder="Modelo *"
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                    <input
                      value={novaMaquina.tamanho}
                      onChange={(e) => setNovaMaquina({ ...novaMaquina, tamanho: e.target.value })}
                      placeholder="Tamanho"
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-slate-500">
                      Estado de uso
                      <select
                        value={novaMaquina.estado}
                        onChange={(e) => setNovaMaquina({ ...novaMaquina, estado: e.target.value })}
                        className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-900"
                      >
                        {ESTADOS_MAQUINA.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-slate-500">
                      Frequência de uso
                      <select
                        value={novaMaquina.frequencia_uso}
                        onChange={(e) => setNovaMaquina({ ...novaMaquina, frequencia_uso: e.target.value })}
                        className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-900"
                      >
                        <option value="">—</option>
                        {FREQUENCIAS_USO.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={!novaMaquina.modelo.trim() || !novaMaquina.marca}
                    onClick={async () => {
                      const maqId = await saveRecord('maquinas', {
                        propriedade_id: parseInt(form.propriedade_id),
                        tipo: novaMaquina.tipo,
                        marca: novaMaquina.marca,
                        modelo: novaMaquina.modelo,
                        tamanho: novaMaquina.tamanho || null,
                        ano: null,
                        numero_serie: '',
                        horimetro: null,
                        estado: novaMaquina.estado,
                        frequencia_uso: novaMaquina.frequencia_uso || null,
                        observacoes: '',
                        created_at: new Date().toISOString(),
                      })
                      await registrarLog('criar', 'maquinas', maqId, `Máquina: ${novaMaquina.marca} ${novaMaquina.modelo} (via visita)`)
                      const novasMaquinas = await getByIndex('maquinas', 'propriedade_id', form.propriedade_id)
                      setMaquinasDisp(novasMaquinas)
                      setForm((f) => ({ ...f, maquina_ids: [...f.maquina_ids, maqId] }))
                      setNovaMaquina({ tipo: 'Trator Novo', marca: '', modelo: '', tamanho: '', estado: 'bom', frequencia_uso: '' })
                      setShowNovaMaquina(false)
                    }}
                    className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Adicionar Máquina
                  </button>
                </div>
              )}

              {maquinasDisp.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {maquinasDisp.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, maquina_ids: toggleArray(f.maquina_ids, m.id) }))}
                      className={`px-3 py-1 rounded-full text-xs border ${form.maquina_ids.includes(m.id) ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}
                    >
                      {m.marca} {m.modelo}
                    </button>
                  ))}
                </div>
              ) : (
                !showNovaMaquina && (
                  <p className="text-xs text-slate-400 italic">Nenhuma máquina cadastrada nesta propriedade</p>
                )
              )}

              {/* Acionar Pós Vendas - aparece quando tem máquina selecionada */}
              {form.maquina_ids.length > 0 && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, acionar_pos_vendas: !f.acionar_pos_vendas }))}
                  className={`mt-3 w-full py-3.5 rounded-xl text-base font-bold border-2 shadow-md transition-colors flex items-center justify-center gap-2 ${
                    form.acionar_pos_vendas
                      ? 'bg-orange-500 text-white border-orange-600'
                      : 'bg-orange-50 text-orange-700 border-orange-400 animate-pulse-glow'
                  }`}
                >
                  <Wrench size={20} />
                  {form.acionar_pos_vendas ? 'Pós Vendas SERÁ acionado' : 'Acionar Pós Vendas'}
                </button>
              )}
            </div>
          )}

          {/* Foto */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={tirarFoto}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm"
            >
              Tirar Foto
            </button>
            {fotoPreview && (
              <img src={fotoPreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
            )}
          </div>

          {/* Resumo - texto ou áudio */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Resumo da visita <span className="text-red-500">*</span></label>
            <AudioTextInput
              value={form.resumo}
              onChange={(val) => setForm((f) => ({ ...f, resumo: val }))}
              placeholder="Digite ou toque no microfone para gravar"
              rows={3}
            />
          </div>

          {/* Próximos passos - texto ou áudio */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Próximos passos</label>
            <AudioTextInput
              value={form.proximos_passos}
              onChange={(val) => setForm((f) => ({ ...f, proximos_passos: val }))}
              placeholder="Digite ou toque no microfone para gravar"
              rows={2}
            />
          </div>

          {/* Data do próximo contato */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Próximo contato planejado {tipoPresencial && <span className="text-red-500">*</span>}
            </label>
            <div className="flex gap-1.5 mb-1.5 flex-wrap">
              {[7, 15, 30].map((d) => (
                <button key={d} type="button"
                  onClick={() => setForm((f) => ({ ...f, data_proximo_contato: dataMaisDias(d) }))}
                  className={`text-xs px-3 py-1 rounded-full border ${form.data_proximo_contato === dataMaisDias(d) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300'}`}>
                  +{d} dias
                </button>
              ))}
              <button type="button" onClick={semRetorno}
                className={`text-xs px-3 py-1 rounded-full border ${semRetornoJustificado(form.proximos_passos) ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300'}`}>
                Sem retorno
              </button>
            </div>
            <input
              type="date"
              value={form.data_proximo_contato || ''}
              onChange={(e) => setForm((f) => ({ ...f, data_proximo_contato: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            {faltaRetorno && <p className="text-xs text-red-600 mt-1">Visita presencial precisa de retorno: escolha a data ou "Sem retorno".</p>}
          </div>

          </div>
          )}

          {/* Completude da visita: o mesmo critério que o supervisor vê */}
          {form.propriedade_id && (
            <div className="rounded-lg border border-slate-200 p-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold" style={{ color: notaForm.faixa.cor }}>
                  Visita {notaForm.nota}% · <ContadorXP valor={xpForm} className="text-green-700" />
                  {missaoForm && <span className="ml-1 text-violet-700" title={missaoForm.titulo}>⚡ {Number(missaoForm.multiplicador)}x</span>}
                </span>
                <span className="text-slate-500 truncate ml-2">
                  {paraVerde === 1 ? <b className="text-amber-700">Falta 1 campo para verde!</b>
                    : notaForm.faltam.length ? `falta: ${notaForm.faltam.join(', ')}` : 'completa 🎉'}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${notaForm.nota}%`, background: notaForm.faixa.cor }} />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetFormVisita() }}
              className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || !form.propriedade_id || form.pessoa_ids.length === 0 || !form.resumo.trim() || faltaRetorno || (negocioAbertoVinculado && !negUpdate.temperatura)}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium text-sm disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : tipoPresencial && !gpsData ? 'Registrar sem GPS' : 'Registrar Visita'}
            </button>
          </div>
        </form>
      )}

      {/* Histórico */}
      {visitasOrdenadas.length === 0 ? (
        <div className="text-center py-12">
          <p className="mb-3 flex justify-center text-slate-300"><MapPin size={40} /></p>
          <p className="text-slate-400">Nenhuma visita registrada</p>
          {!showForm && (
            <button onClick={handleNovaVisita} className="text-blue-700 text-sm mt-2 font-medium">
              Fazer primeiro check-in
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visitasOrdenadas.map((v, i) => (
            <VisitaCard key={v.id} visita={v} index={i} onDelete={() => setDeleteTarget(v)} onEdit={() => abrirEdicao(v)} editavel={podeEditar(v)} onNovaVisita={() => novaVisitaNeste(v)} />
          ))}
        </div>
      )}

      <ConfirmModal
        show={!!deleteTarget}
        title="Excluir visita"
        message="Tem certeza que deseja excluir esta visita? Ela será removida em todos os aparelhos."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        show={!!dupVisita}
        title="Visita já registrada"
        message={dupVisita ? (() => {
          const quando = localDateKey(dupVisita.data_visita) === localDateKey(new Date())
            ? 'hoje'
            : `em ${new Date(dupVisita.data_visita).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
          const hora = new Date(dupVisita.data_visita).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          const tipo = TIPO_LABELS[dupVisita.tipo] || dupVisita.tipo
          return `Você já registrou uma visita neste cliente ${quando} às ${hora} (${tipo}). Registrar mesmo assim?`
        })() : ''}
        confirmLabel="Registrar mesmo assim"
        confirmClass="bg-green-600"
        onConfirm={() => { setDupVisita(null); prosseguirSalvar() }}
        onCancel={() => setDupVisita(null)}
      />

      {/* Modal vincular/criar negócio */}
      {showNegocio && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col animate-slide-up">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Vincular Negócio</h3>
                <button
                  type="button"
                  onClick={() => { setShowNegocio(false); setShowNovoNegocio(false) }}
                  className="text-slate-400 text-xl px-1"
                >&times;</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Botão criar novo */}
              {!showNovoNegocio ? (
                <button
                  type="button"
                  onClick={() => setShowNovoNegocio(true)}
                  className="w-full py-2.5 mb-3 rounded-lg text-sm font-medium border-2 border-dashed border-blue-300 text-blue-600 active:bg-blue-50"
                >
                  + Criar Novo Negócio
                </button>
              ) : (
                <div className="bg-blue-50 rounded-lg p-3 mb-3 space-y-2 animate-slide-up">
                  <p className="text-xs font-medium text-blue-800 mb-1">Novo negócio</p>
                  <input
                    value={novoNegocio.valor}
                    onChange={(e) => setNovoNegocio({ ...novoNegocio, valor: e.target.value })}
                    placeholder="Valor (R$)"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                  <select
                    value={novoNegocio.status}
                    onChange={(e) => setNovoNegocio({ ...novoNegocio, status: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {STATUS_NEGOCIO.filter((s) => STATUS_ABERTOS.includes(s.key)).map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Previsão de fechamento <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={novoNegocio.data_fechamento_prevista}
                      onChange={(e) => setNovoNegocio({ ...novoNegocio, data_fechamento_prevista: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <CidadeSelect
                    value={novoNegocio.cidade}
                    onChange={(cidade) => setNovoNegocio({ ...novoNegocio, cidade })}
                  />
                  <MaquinaSelect
                    familia={novoNegocio.maquina_familia}
                    marca={novoNegocio.maquina_marca}
                    modelo={novoNegocio.maquina_modelo}
                    onChange={(campos) => setNovoNegocio({ ...novoNegocio, ...campos })}
                  />
                  <textarea
                    value={novoNegocio.notas}
                    onChange={(e) => setNovoNegocio({ ...novoNegocio, notas: e.target.value })}
                    placeholder="Descrição / notas"
                    rows={2}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNovoNegocio(false)}
                      className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-sm"
                    >Cancelar</button>
                    <button
                      type="button"
                      disabled={!novoNegocio.data_fechamento_prevista}
                      onClick={async () => {
                        if (!novoNegocio.data_fechamento_prevista) {
                          alert('Defina a previsão de fechamento do negócio')
                          return
                        }
                        const vendedor = JSON.parse(localStorage.getItem('vendedor'))
                        const now = new Date().toISOString()
                        const negId = await saveRecord('negocios', {
                          vendedor_id: vendedor.id,
                          cliente_id: clienteSelecionado ? parseInt(clienteSelecionado) : null,
                          propriedade_id: form.propriedade_id ? parseInt(form.propriedade_id) : null,
                          status: novoNegocio.status,
                          valor: novoNegocio.valor ? parseFloat(novoNegocio.valor) : null,
                          motivo_perda: null,
                          data_fechamento_prevista: novoNegocio.data_fechamento_prevista || null,
                          notas: novoNegocio.notas,
                          cidade: novoNegocio.cidade || null,
                          maquina_familia: novoNegocio.maquina_familia || null,
                          maquina_marca: novoNegocio.maquina_marca || null,
                          maquina_modelo: novoNegocio.maquina_modelo || null,
                          created_at: now,
                          updated_at: now,
                        })
                        await registrarLog('criar', 'negocios', negId, `Negócio: R$ ${novoNegocio.valor || '0'} (via visita)`)
                        const negCriado = { id: negId, ...novoNegocio, valor: novoNegocio.valor ? parseFloat(novoNegocio.valor) : null }
                        vincularNegocio(negCriado)
                        setNovoNegocio({ valor: '', status: 'prospeccao', notas: '', cidade: '', maquina_familia: '', maquina_marca: '', maquina_modelo: '', data_fechamento_prevista: '' })
                        setShowNovoNegocio(false)
                        setShowNegocio(false)
                        // Recarregar negócios
                        carregar()
                      }}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >Criar e Vincular</button>
                  </div>
                </div>
              )}

              {/* Lista de negócios existentes */}
              {negocios.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-medium">Negócios existentes:</p>
                  {negocios.filter((n) => !isPerdido(n.status)).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        vincularNegocio(n)
                        setShowNegocio(false)
                        setShowNovoNegocio(false)
                      }}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 bg-white active:bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{n.notas || n.status}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {statusLabel(n.status)}
                        </span>
                      </div>
                      {n.valor && <p className="text-sm text-green-700 font-bold mt-1">R$ {Number(n.valor).toLocaleString('pt-BR')}</p>}
                    </button>
                  ))}
                </div>
              ) : (
                !showNovoNegocio && (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhum negócio cadastrado</p>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição */}
      {editTarget && editForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[85vh] flex flex-col animate-slide-up">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Editar Visita</h3>
                <button onClick={() => { setEditTarget(null); setEditForm(null) }} className="text-slate-400 text-xl px-1">&times;</button>
              </div>
              <p className="text-xs text-slate-500">
                Criada em {new Date(editTarget.created_at || editTarget.data_visita).toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Tipo */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'presencial', label: 'Presencial' },
                    { key: 'mensagem', label: 'Mensagem' },
                    { key: 'telefonema', label: 'Telefonema' },
                    { key: 'email', label: 'E-mail' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, tipo: t.key })}
                      className={`py-2 rounded-lg text-sm font-medium border ${editForm.tipo === t.key ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumo */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Resumo da visita</label>
                <AudioTextInput
                  value={editForm.resumo}
                  onChange={(val) => setEditForm({ ...editForm, resumo: val })}
                  placeholder="Resumo da visita"
                  rows={3}
                />
              </div>

              {/* Próximos passos */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Próximos passos</label>
                <AudioTextInput
                  value={editForm.proximos_passos}
                  onChange={(val) => setEditForm({ ...editForm, proximos_passos: val })}
                  placeholder="Próximos passos"
                  rows={2}
                />
              </div>

              {/* Data próximo contato */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Próximo contato planejado</label>
                <input
                  type="date"
                  value={editForm.data_proximo_contato || ''}
                  onChange={(e) => setEditForm({ ...editForm, data_proximo_contato: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Pós Vendas */}
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, acionar_pos_vendas: !editForm.acionar_pos_vendas })}
                className={`w-full py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  editForm.acionar_pos_vendas
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-orange-600 border-orange-300'
                }`}
              >
                {editForm.acionar_pos_vendas ? '✓ Pós Vendas acionado' : 'Acionar Pós Vendas'}
              </button>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => { setEditTarget(null); setEditForm(null) }}
                className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarEdicao}
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm active:bg-blue-800"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  )
}
