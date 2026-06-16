import { useState, useEffect, useRef } from 'react'
import {
  getMarcas, getProdutosCatalogo, salvarMarca, deletarMarca,
  salvarProdutoCatalogo, deletarProdutoCatalogo, uploadArquivoCatalogo,
  resizeFotoParaUpload, CATEGORIAS,
  getProdutosAdmin, getResumoMidias, salvarOverride,
} from '../lib/catalogoSupabase'
import MidiasEditor from './MidiasEditor'

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function supervisorId() {
  return JSON.parse(localStorage.getItem('supervisor') || '{}').id
}

// Só produtos de uma família de MÁQUINA (ignora Peças, #N/D e sem família),
// igual ao "Estoque atual" do vendedor.
function temFamiliaMaquina(p) {
  const f = (p.familia_nome || '').trim().toUpperCase()
  if (!f) return false
  if (f.startsWith('#') || f.includes('N/D')) return false
  if (f === 'PEÇAS' || f === 'PECAS') return false
  return true
}

export default function SupervisorCatalogo() {
  const [aba, setAba] = useState('maquinas') // maquinas | marcas
  const [marcas, setMarcas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [resumo, setResumo] = useState({ porCatalogo: {}, porCodigo: {} })
  const [loading, setLoading] = useState(true)

  async function carregar() {
    setLoading(true)
    try {
      const [m, p, r] = await Promise.all([
        getMarcas({ adminMode: true }),
        getProdutosCatalogo({ adminMode: true }),
        getResumoMidias(),
      ])
      setMarcas(m)
      setProdutos(p)
      setResumo(r)
    } catch (err) {
      alert('Erro ao carregar catálogo: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-xl font-bold">Catálogo (gerir)</h2>
        <p className="text-sm text-slate-500">
          Cadastre marcas e máquinas e controle o que aparece pros vendedores.
        </p>
      </div>

      <div className="flex gap-1 mb-3 border-b border-slate-200">
        <TabButton ativo={aba === 'maquinas'} onClick={() => setAba('maquinas')}>
          Máquinas ({produtos.length})
        </TabButton>
        <TabButton ativo={aba === 'marcas'} onClick={() => setAba('marcas')}>
          Marcas ({marcas.length})
        </TabButton>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-8">Carregando...</p>
      ) : aba === 'marcas' ? (
        <SecaoMarcas marcas={marcas} onChange={carregar} />
      ) : (
        <SecaoMaquinas produtos={produtos} marcas={marcas} resumo={resumo} onChange={carregar} />
      )}
    </div>
  )
}

function TabButton({ ativo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        ativo ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500'
      }`}
    >
      {children}
    </button>
  )
}

// ==================== MARCAS ====================
function SecaoMarcas({ marcas, onChange }) {
  const [editando, setEditando] = useState(null) // marca obj ou {} pra nova

  return (
    <div>
      <button
        onClick={() => setEditando({ nome: '', slug: '', ordem: 0, visivel: true })}
        className="mb-3 text-sm px-3 py-1.5 bg-blue-700 text-white rounded-lg font-medium"
      >
        + Nova marca
      </button>

      <div className="space-y-2">
        {marcas.map((m) => (
          <div key={m.id} className="bg-white rounded-xl shadow p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{m.nome}</p>
              <p className="text-[10px] text-slate-400">{m.slug} · ordem {m.ordem}</p>
            </div>
            {!m.visivel && <span className="text-[10px] text-red-600 font-medium">oculta</span>}
            <button onClick={() => setEditando(m)} className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded font-medium">
              Editar
            </button>
          </div>
        ))}
        {marcas.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Nenhuma marca ainda.</p>}
      </div>

      {editando && (
        <MarcaForm marca={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); onChange() }} />
      )}
    </div>
  )
}

function MarcaForm({ marca, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: marca.nome || '',
    slug: marca.slug || '',
    ordem: marca.ordem ?? 0,
    visivel: marca.visivel !== false,
  })
  const [salvando, setSalvando] = useState(false)
  const novo = !marca.id

  async function salvar() {
    if (!form.nome.trim()) { alert('Informe o nome da marca'); return }
    setSalvando(true)
    try {
      const payload = {
        ...(marca.id ? { id: marca.id } : {}),
        nome: form.nome.trim(),
        slug: form.slug.trim() || slugify(form.nome),
        ordem: Number(form.ordem) || 0,
        visivel: !!form.visivel,
      }
      await salvarMarca(payload, supervisorId())
      onSaved()
    } catch (err) {
      alert('Erro ao salvar marca: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!confirm(`Excluir a marca "${marca.nome}"? Só funciona se não houver máquinas usando ela.`)) return
    try {
      await deletarMarca(marca.id)
      onSaved()
    } catch (err) {
      alert('Não foi possível excluir (talvez haja máquinas nesta marca): ' + err.message)
    }
  }

  return (
    <Modal onClose={onClose} titulo={novo ? 'Nova marca' : 'Editar marca'}>
      <Campo label="Nome">
        <input
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value, slug: novo ? slugify(e.target.value) : form.slug })}
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          placeholder="Ex: John Deere"
        />
      </Campo>
      <Campo label="Slug (identificador na URL)">
        <input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          placeholder="john-deere"
        />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Ordem">
          <input
            type="number"
            value={form.ordem}
            onChange={(e) => setForm({ ...form, ordem: e.target.value })}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          />
        </Campo>
        <Campo label="Visível pros vendedores">
          <label className="flex items-center gap-2 text-sm py-1.5">
            <input type="checkbox" checked={form.visivel} onChange={(e) => setForm({ ...form, visivel: e.target.checked })} />
            {form.visivel ? 'Sim' : 'Não'}
          </label>
        </Campo>
      </div>

      <div className="flex justify-between items-center mt-4">
        {!novo ? (
          <button onClick={excluir} className="text-sm px-3 py-1.5 text-red-600 font-medium">Excluir</button>
        ) : <span />}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={salvando} className="text-sm px-3 py-1.5 bg-slate-100 text-slate-600 rounded font-medium disabled:opacity-50">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="text-sm px-3 py-1.5 bg-blue-700 text-white rounded font-medium disabled:opacity-50">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ==================== MÁQUINAS ====================
function SecaoMaquinas({ produtos, marcas, resumo, onChange }) {
  const [modo, setModo] = useState('catalogo') // catalogo | estoque
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null) // { kind, item, foco }
  const [estoque, setEstoque] = useState(null)    // produtos do Omie (lazy)
  const [loadingEstoque, setLoadingEstoque] = useState(false)

  // Estoque do Omie só carrega quando o supervisor abre essa visão
  useEffect(() => {
    if (modo !== 'estoque' || estoque !== null) return
    setLoadingEstoque(true)
    getProdutosAdmin({ somenteComEstoque: true })
      .then(setEstoque)
      .catch((err) => alert('Erro ao carregar estoque: ' + err.message))
      .finally(() => setLoadingEstoque(false))
  }, [modo, estoque])

  if (marcas.length === 0) {
    return <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">Cadastre uma marca primeiro (aba Marcas) antes de adicionar máquinas.</p>
  }

  function novaMaquina() {
    setEditando({ kind: 'curado', foco: null, item: {
      marca_id: marcas[0]?.id, titulo: '', subtitulo: '', categoria: 'tratores',
      descricao: '', argumentos_de_venda: [], especificacoes: {}, url_site: '',
      foto_principal_url: '', folheto_url: '', modelos_supabase: [], filtro_supabase: null,
      visivel: true, ordem: 99,
    } })
  }

  function presencaCurado(p) {
    const r = resumo.porCatalogo[p.id] || {}
    return {
      foto: !!p.foto_principal_url || r.foto > 0,
      video: r.video > 0,
      folheto: !!p.folheto_url || r.pdf > 0,
      descricao: !!(p.descricao && p.descricao.trim()),
      argumentos: Array.isArray(p.argumentos_de_venda) && p.argumentos_de_venda.length > 0,
    }
  }
  function presencaEstoque(p) {
    const r = resumo.porCodigo[p.codigo_produto] || {}
    return {
      foto: !!p.imagem_url || r.foto > 0,
      video: r.video > 0,
      folheto: r.pdf > 0,
      descricao: !!(p.descricao && p.descricao.trim()),
      argumentos: null, // não se aplica ao estoque
    }
  }

  const q = busca.trim().toLowerCase()
  const curados = produtos.filter((p) => !q || p.titulo.toLowerCase().includes(q) || p.marca?.nome?.toLowerCase().includes(q))
  // getProdutosAdmin já traz só itens com saldo (filtro no banco); aqui só restringe a máquinas.
  const estoqueMaquinas = (estoque || []).filter(temFamiliaMaquina)
  const estoqueFiltrado = estoqueMaquinas.filter((p) => !q
    || (p.descricao || '').toLowerCase().includes(q)
    || (p.modelo || '').toLowerCase().includes(q)
    || (p.marca || '').toLowerCase().includes(q)
    || (p.codigo || '').toLowerCase().includes(q))

  const refrescar = () => { setEditando(null); setEstoque(null); onChange() }

  return (
    <div>
      <div className="flex gap-1 mb-3">
        <SubToggle ativo={modo === 'catalogo'} onClick={() => setModo('catalogo')}>Catálogo ({produtos.length})</SubToggle>
        <SubToggle ativo={modo === 'estoque'} onClick={() => setModo('estoque')}>Estoque Omie{estoque ? ` (${estoqueMaquinas.length})` : ''}</SubToggle>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar máquina..."
          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
        />
        {modo === 'catalogo' && (
          <button onClick={novaMaquina} className="text-sm px-3 py-1.5 bg-blue-700 text-white rounded-lg font-medium whitespace-nowrap">
            + Nova
          </button>
        )}
      </div>

      {modo === 'catalogo' ? (
        <div className="space-y-2">
          {curados.map((p) => (
            <MaquinaCard
              key={p.id}
              foto={p.foto_principal_url}
              titulo={p.titulo}
              subtitulo={[p.marca?.nome, p.categoria].filter(Boolean).join(' · ')}
              oculta={!p.visivel}
              presenca={presencaCurado(p)}
              onFoco={(foco) => setEditando({ kind: 'curado', item: p, foco })}
              onEditar={() => setEditando({ kind: 'curado', item: p, foco: null })}
            />
          ))}
          {curados.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Nenhuma máquina.</p>}
        </div>
      ) : loadingEstoque ? (
        <p className="text-sm text-slate-500 text-center py-8">Carregando estoque...</p>
      ) : (
        <div className="space-y-2">
          {estoqueFiltrado.map((p) => (
            <MaquinaCard
              key={p.codigo_produto}
              foto={p.imagem_url}
              titulo={p.modelo || (p.descricao || '').slice(0, 50)}
              subtitulo={[p.marca, p.familia_nome].filter(Boolean).join(' · ')}
              oculta={p.override?.visivel === false}
              presenca={presencaEstoque(p)}
              onFoco={(foco) => setEditando({ kind: 'estoque', item: p, foco })}
              onEditar={() => setEditando({ kind: 'estoque', item: p, foco: null })}
            />
          ))}
          {estoqueFiltrado.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Nenhum produto.</p>}
        </div>
      )}

      {editando?.kind === 'curado' && (
        <MaquinaForm
          produto={editando.item}
          marcas={marcas}
          focoInicial={editando.foco}
          onClose={() => { setEditando(null); onChange() }}
          onSaved={() => { setEditando(null); onChange() }}
        />
      )}
      {editando?.kind === 'estoque' && (
        <EstoqueForm
          produto={editando.item}
          focoInicial={editando.foco}
          onClose={refrescar}
          onSaved={refrescar}
        />
      )}
    </div>
  )
}

function SubToggle({ ativo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${ativo ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}
    >
      {children}
    </button>
  )
}

function MaquinaCard({ foto, titulo, subtitulo, oculta, presenca, onFoco, onEditar }) {
  return (
    <div className="bg-white rounded-xl shadow p-3">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 bg-slate-100 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
          {foto ? <img src={foto} alt="" className="w-full h-full object-contain" loading="lazy" /> : <IconFoto className="w-6 h-6 text-slate-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{titulo}</p>
          <p className="text-xs text-slate-500 truncate">{subtitulo || '—'}</p>
          {oculta && <span className="text-[10px] text-red-600 font-medium">oculta</span>}
        </div>
        <button onClick={onEditar} className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded font-medium">
          Editar
        </button>
      </div>
      <IconesConteudo presenca={presenca} onFoco={onFoco} />
    </div>
  )
}

// Fileira de ícones de conteúdo (preto = tem, cinza = falta; tocar abre o editor naquela parte)
function IconesConteudo({ presenca, onFoco }) {
  const itens = [
    { key: 'foto', label: 'Foto', Icon: IconFoto },
    { key: 'video', label: 'Vídeo', Icon: IconVideo },
    { key: 'folheto', label: 'Folheto técnico', Icon: IconFolheto },
    { key: 'descricao', label: 'Descrição', Icon: IconDescricao },
    { key: 'argumentos', label: 'Argumentos de venda', Icon: IconArgumentos },
  ]
  return (
    <div className="flex items-center gap-5 mt-2 pl-1">
      {itens.map(({ key, label, Icon }) => {
        const val = presenca[key]
        if (val === null || val === undefined) return null // não se aplica
        return (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => onFoco(key)}
            className={val ? 'text-black opacity-100' : 'text-slate-400 opacity-80'}
          >
            <Icon className="w-5 h-5" />
          </button>
        )
      })}
    </div>
  )
}

// Ícones monocromáticos (currentColor)
function IconFoto({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M9 4l-1.3 2H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-3.7L15 4H9zm3 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
    </svg>
  )
}
function IconVideo({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 6l7 4-7 4V8z" />
    </svg>
  )
}
function IconFolheto({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V7h3.5L13 3.5zM8 12h8v1.6H8V12zm0 3.2h8v1.6H8v-1.6z" />
    </svg>
  )
}
function IconDescricao({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M4 5h16v2H4V5zm0 4h16v2H4V9zm0 4h10v2H4v-2zm0 4h16v2H4v-2z" />
    </svg>
  )
}
function IconArgumentos({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 5h10V7H7v2zm0 4h7v-2H7v2z" />
    </svg>
  )
}

function MaquinaForm({ produto, marcas, focoInicial, onClose, onSaved }) {
  const novo = !produto.id
  const [form, setForm] = useState({
    marca_id: produto.marca_id || produto.marca?.id || marcas[0]?.id,
    slug: produto.slug || '',
    titulo: produto.titulo || '',
    subtitulo: produto.subtitulo || '',
    categoria: produto.categoria || 'tratores',
    descricao: produto.descricao || '',
    url_site: produto.url_site || '',
    foto_principal_url: produto.foto_principal_url || '',
    folheto_url: produto.folheto_url || '',
    visivel: produto.visivel !== false,
    ordem: produto.ordem ?? 99,
  })
  const [argumentos, setArgumentos] = useState(produto.argumentos_de_venda || [])
  const [specs, setSpecs] = useState(Object.entries(produto.especificacoes || {}))
  const [modelos, setModelos] = useState(produto.modelos_supabase || [])
  const [cruzaOmie, setCruzaOmie] = useState(!!produto.filtro_supabase)
  const [familias, setFamilias] = useState(produto.filtro_supabase?.familia_nome || ['Trator Novo', 'Trator Seminovo'])
  const [marcaLike, setMarcaLike] = useState(produto.filtro_supabase?.marca_like || '')
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [enviandoFolheto, setEnviandoFolheto] = useState(false)

  // Refs das seções pra "tocar no ícone abre o editor naquela parte"
  const secoes = {
    foto: useRef(null),
    folheto: useRef(null),
    descricao: useRef(null),
    argumentos: useRef(null),
    video: useRef(null),
  }
  useEffect(() => {
    const alvo = secoes[focoInicial]
    if (focoInicial && alvo?.current) {
      const t = setTimeout(() => alvo.current.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focoInicial])

  const slugEfetivo = form.slug.trim() || slugify(form.titulo)

  async function enviarArquivo(e, tipo) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!slugEfetivo) { alert('Preencha o título (gera o slug) antes de enviar arquivos'); return }
    const setBusy = tipo === 'foto' ? setEnviandoFoto : setEnviandoFolheto
    setBusy(true)
    try {
      const toUpload = tipo === 'foto' ? await resizeFotoParaUpload(file) : file
      const url = await uploadArquivoCatalogo({ slug: slugEfetivo, file: toUpload })
      setForm((f) => (tipo === 'foto' ? { ...f, foto_principal_url: url } : { ...f, folheto_url: url }))
    } catch (err) {
      alert('Falha no envio: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function salvar() {
    if (!form.titulo.trim()) { alert('Informe o título'); return }
    if (!form.marca_id) { alert('Selecione a marca'); return }
    setSalvando(true)
    try {
      const especificacoes = Object.fromEntries(specs.filter(([k]) => k && k.trim()))
      const payload = {
        ...(produto.id ? { id: produto.id } : {}),
        marca_id: form.marca_id,
        slug: slugEfetivo,
        titulo: form.titulo.trim(),
        subtitulo: form.subtitulo.trim() || null,
        categoria: form.categoria || null,
        descricao: form.descricao.trim() || null,
        argumentos_de_venda: argumentos.filter((a) => a && a.trim()),
        especificacoes,
        url_site: form.url_site.trim() || null,
        foto_principal_url: form.foto_principal_url.trim() || null,
        folheto_url: form.folheto_url.trim() || null,
        modelos_supabase: modelos.filter((m) => m && m.trim()),
        filtro_supabase: cruzaOmie
          ? { familia_nome: familias.filter(Boolean), marca_like: marcaLike.trim() || null }
          : null,
        visivel: !!form.visivel,
        ordem: Number(form.ordem) || 99,
      }
      await salvarProdutoCatalogo(payload, supervisorId())
      onSaved()
    } catch (err) {
      alert('Erro ao salvar máquina: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!confirm(`Excluir a máquina "${produto.titulo}"? As mídias e arquivos vão junto.`)) return
    try {
      await deletarProdutoCatalogo(produto.id)
      onSaved()
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  return (
    <Modal onClose={onClose} titulo={novo ? 'Nova máquina' : 'Editar máquina'}>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Marca">
          <select value={form.marca_id} onChange={(e) => setForm({ ...form, marca_id: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Campo>
        <Campo label="Categoria">
          <input
            list="cat-sugestoes"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          />
          <datalist id="cat-sugestoes">
            {CATEGORIAS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </datalist>
        </Campo>
      </div>

      <Campo label="Título">
        <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="Ex: MAHINDRA 6075" />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Subtítulo">
          <input value={form.subtitulo} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="80 CV" />
        </Campo>
        <Campo label="Slug (URL)">
          <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder={slugify(form.titulo) || 'auto'} />
        </Campo>
      </div>

      <div ref={secoes.descricao}>
        <Campo label="Descrição">
          <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={4} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </Campo>
      </div>

      {/* Foto principal */}
      <div ref={secoes.foto}>
        <Campo label="Foto principal">
          <div className="flex items-center gap-2">
            <div className="w-16 h-16 bg-slate-100 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
              {form.foto_principal_url ? <img src={form.foto_principal_url} alt="" className="w-full h-full object-contain" /> : <IconFoto className="w-6 h-6 text-slate-300" />}
            </div>
            <label className={`text-xs px-3 py-1.5 rounded font-medium cursor-pointer ${enviandoFoto ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
              {enviandoFoto ? 'Enviando...' : 'Enviar foto'}
              <input type="file" accept="image/*" disabled={enviandoFoto} onChange={(e) => enviarArquivo(e, 'foto')} className="hidden" />
            </label>
          </div>
          <input value={form.foto_principal_url} onChange={(e) => setForm({ ...form, foto_principal_url: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs mt-1" placeholder="ou cole uma URL" />
        </Campo>
      </div>

      {/* Folheto */}
      <div ref={secoes.folheto}>
        <Campo label="Folheto técnico (PDF)">
          <div className="flex items-center gap-2">
            {form.folheto_url && <a href={form.folheto_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 underline truncate flex-1">ver atual ↗</a>}
            <label className={`text-xs px-3 py-1.5 rounded font-medium cursor-pointer ${enviandoFolheto ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
              {enviandoFolheto ? 'Enviando...' : 'Enviar PDF'}
              <input type="file" accept="application/pdf" disabled={enviandoFolheto} onChange={(e) => enviarArquivo(e, 'folheto')} className="hidden" />
            </label>
          </div>
          <input value={form.folheto_url} onChange={(e) => setForm({ ...form, folheto_url: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs mt-1" placeholder="ou cole uma URL" />
        </Campo>
      </div>

      <div ref={secoes.argumentos}>
        <ListaEditavel label="Argumentos de venda" itens={argumentos} setItens={setArgumentos} placeholder="Ex: 15% mais econômico" />
      </div>

      <SpecsEditor specs={specs} setSpecs={setSpecs} />

      {/* Cross-ref Omie */}
      <Campo label="Estoque/preço ao vivo (Omie)">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cruzaOmie} onChange={(e) => setCruzaOmie(e.target.checked)} />
          Cruzar com o estoque do Omie
        </label>
      </Campo>
      {cruzaOmie && (
        <div className="pl-2 border-l-2 border-slate-100">
          <ListaEditavel label="Modelos no Omie" itens={modelos} setItens={setModelos} placeholder="Ex: 6075 BR" />
          <ListaEditavel label="Famílias (familia_nome)" itens={familias} setItens={setFamilias} placeholder="Ex: Trator Novo" />
          <Campo label="Marca contém (marca_like)">
            <input value={marcaLike} onChange={(e) => setMarcaLike(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="mahindra" />
          </Campo>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Campo label="Ordem">
          <input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </Campo>
        <Campo label="Visível pros vendedores">
          <label className="flex items-center gap-2 text-sm py-1.5">
            <input type="checkbox" checked={form.visivel} onChange={(e) => setForm({ ...form, visivel: e.target.checked })} />
            {form.visivel ? 'Sim' : 'Não'}
          </label>
        </Campo>
      </div>

      <Campo label="Link do site do fabricante">
        <input value={form.url_site} onChange={(e) => setForm({ ...form, url_site: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="https://..." />
      </Campo>

      {/* Galeria (mídias extras) — só quando a máquina já existe */}
      <div ref={secoes.video}>
        {!novo ? (
          <MidiasEditor catalogoProdutoId={produto.id} />
        ) : (
          <p className="text-[11px] text-slate-400 mt-2">Salve a máquina para poder adicionar fotos/vídeos extras à galeria.</p>
        )}
      </div>

      <div className="flex justify-between items-center mt-4">
        {!novo ? <button onClick={excluir} className="text-sm px-3 py-1.5 text-red-600 font-medium">Excluir</button> : <span />}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={salvando} className="text-sm px-3 py-1.5 bg-slate-100 text-slate-600 rounded font-medium disabled:opacity-50">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="text-sm px-3 py-1.5 bg-blue-700 text-white rounded font-medium disabled:opacity-50">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ==================== ESTOQUE (Omie) ====================
function EstoqueForm({ produto, focoInicial, onClose, onSaved }) {
  const [form, setForm] = useState({
    preco_override: produto.override?.preco_override ?? '',
    estoque_override: produto.override?.estoque_override ?? '',
    visivel: produto.override?.visivel !== false,
    notas: produto.override?.notas ?? '',
  })
  const [salvando, setSalvando] = useState(false)
  const midiasRef = useRef(null)

  useEffect(() => {
    if (focoInicial && ['foto', 'video', 'folheto'].includes(focoInicial) && midiasRef.current) {
      const t = setTimeout(() => midiasRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
      return () => clearTimeout(t)
    }
  }, [focoInicial])

  async function salvar() {
    setSalvando(true)
    try {
      await salvarOverride(produto.codigo_produto, {
        preco_override: form.preco_override !== '' ? Number(form.preco_override) : null,
        estoque_override: form.estoque_override !== '' ? Number(form.estoque_override) : null,
        visivel: !!form.visivel,
        notas: form.notas.trim() || null,
      }, supervisorId())
      onSaved()
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  const titulo = produto.modelo || (produto.descricao || '').slice(0, 40) || 'Produto'

  return (
    <Modal onClose={onClose} titulo={titulo}>
      <p className="text-xs text-slate-500 mb-2">
        {[produto.marca, produto.familia_nome].filter(Boolean).join(' · ')} · cód {produto.codigo}
      </p>

      {/* Descrição do Omie (somente leitura) */}
      <Campo label="Descrição (Omie)">
        <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 rounded p-2 max-h-32 overflow-y-auto">{produto.descricao || '—'}</p>
      </Campo>

      <div className="grid grid-cols-2 gap-2">
        <Campo label="Preço (override R$)">
          <input type="number" step="0.01" inputMode="decimal" value={form.preco_override} onChange={(e) => setForm({ ...form, preco_override: e.target.value })} placeholder={`Omie: ${produto.valor_unitario ?? '—'}`} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </Campo>
        <Campo label="Estoque (override)">
          <input type="number" inputMode="numeric" value={form.estoque_override} onChange={(e) => setForm({ ...form, estoque_override: e.target.value })} placeholder={`Omie: ${produto.estoque ?? '—'}`} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </Campo>
      </div>

      <Campo label="Visível pros vendedores">
        <label className="flex items-center gap-2 text-sm py-1.5">
          <input type="checkbox" checked={form.visivel} onChange={(e) => setForm({ ...form, visivel: e.target.checked })} />
          {form.visivel ? 'Sim' : 'Não'}
        </label>
      </Campo>

      <Campo label="Notas">
        <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="Ex: negociado por Henri em 28/05" />
      </Campo>

      <div ref={midiasRef}>
        <MidiasEditor codigoProduto={produto.codigo_produto} />
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} disabled={salvando} className="text-sm px-3 py-1.5 bg-slate-100 text-slate-600 rounded font-medium disabled:opacity-50">Fechar</button>
        <button onClick={salvar} disabled={salvando} className="text-sm px-3 py-1.5 bg-blue-700 text-white rounded font-medium disabled:opacity-50">
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </Modal>
  )
}

// ==================== HELPERS DE UI ====================
function Modal({ titulo, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-lg p-4 max-h-[92vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-3">{titulo}</h3>
        {children}
      </div>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div className="mb-2">
      <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function ListaEditavel({ label, itens, setItens, placeholder }) {
  function set(i, v) { setItens(itens.map((x, idx) => (idx === i ? v : x))) }
  function remover(i) { setItens(itens.filter((_, idx) => idx !== i)) }
  function add() { setItens([...itens, '']) }
  return (
    <Campo label={label}>
      <div className="space-y-1">
        {itens.map((item, i) => (
          <div key={i} className="flex gap-1">
            <input value={item} onChange={(e) => set(i, e.target.value)} placeholder={placeholder} className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm" />
            <button type="button" onClick={() => remover(i)} className="w-8 bg-red-50 text-red-600 rounded text-sm">×</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="text-xs text-blue-700 font-medium mt-1">+ adicionar</button>
    </Campo>
  )
}

function SpecsEditor({ specs, setSpecs }) {
  function setKey(i, k) { setSpecs(specs.map((p, idx) => (idx === i ? [k, p[1]] : p))) }
  function setVal(i, v) { setSpecs(specs.map((p, idx) => (idx === i ? [p[0], v] : p))) }
  function remover(i) { setSpecs(specs.filter((_, idx) => idx !== i)) }
  function add() { setSpecs([...specs, ['', '']]) }
  return (
    <Campo label="Especificações">
      <div className="space-y-1">
        {specs.map(([k, v], i) => (
          <div key={i} className="flex gap-1">
            <input value={k} onChange={(e) => setKey(i, e.target.value)} placeholder="campo" className="w-2/5 border border-slate-300 rounded px-2 py-1.5 text-xs" />
            <input value={v} onChange={(e) => setVal(i, e.target.value)} placeholder="valor" className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-xs" />
            <button type="button" onClick={() => remover(i)} className="w-8 bg-red-50 text-red-600 rounded text-sm">×</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="text-xs text-blue-700 font-medium mt-1">+ adicionar</button>
    </Campo>
  )
}
