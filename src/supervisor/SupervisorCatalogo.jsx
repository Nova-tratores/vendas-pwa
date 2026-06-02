import { useState, useEffect } from 'react'
import {
  getMarcas, getProdutosCatalogo, salvarMarca, deletarMarca,
  salvarProdutoCatalogo, deletarProdutoCatalogo, uploadArquivoCatalogo,
  resizeFotoParaUpload, CATEGORIAS,
} from '../lib/catalogoSupabase'
import MidiasEditor from './MidiasEditor'

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function supervisorId() {
  return JSON.parse(localStorage.getItem('supervisor') || '{}').id
}

export default function SupervisorCatalogo() {
  const [aba, setAba] = useState('maquinas') // maquinas | marcas
  const [marcas, setMarcas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)

  async function carregar() {
    setLoading(true)
    try {
      const [m, p] = await Promise.all([
        getMarcas({ adminMode: true }),
        getProdutosCatalogo({ adminMode: true }),
      ])
      setMarcas(m)
      setProdutos(p)
    } catch (err) {
      alert('Erro ao carregar catÃƒÂ¡logo: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-xl font-bold">CatÃƒÂ¡logo (gerir)</h2>
        <p className="text-sm text-slate-500">
          Cadastre marcas e mÃƒÂ¡quinas e controle o que aparece pros vendedores.
        </p>
      </div>

      <div className="flex gap-1 mb-3 border-b border-slate-200">
        <TabButton ativo={aba === 'maquinas'} onClick={() => setAba('maquinas')}>
          MÃƒÂ¡quinas ({produtos.length})
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
        <SecaoMaquinas produtos={produtos} marcas={marcas} onChange={carregar} />
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
              <p className="text-[10px] text-slate-400">{m.slug} Ã‚Â· ordem {m.ordem}</p>
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
    if (!confirm(`Excluir a marca "${marca.nome}"? SÃƒÂ³ funciona se nÃƒÂ£o houver mÃƒÂ¡quinas usando ela.`)) return
    try {
      await deletarMarca(marca.id)
      onSaved()
    } catch (err) {
      alert('NÃƒÂ£o foi possÃƒÂ­vel excluir (talvez haja mÃƒÂ¡quinas nesta marca): ' + err.message)
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
        <Campo label="VisÃƒÂ­vel pros vendedores">
          <label className="flex items-center gap-2 text-sm py-1.5">
            <input type="checkbox" checked={form.visivel} onChange={(e) => setForm({ ...form, visivel: e.target.checked })} />
            {form.visivel ? 'Sim' : 'NÃƒÂ£o'}
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

// ==================== MÃƒÂQUINAS ====================
function SecaoMaquinas({ produtos, marcas, onChange }) {
  const [editando, setEditando] = useState(null)
  const [busca, setBusca] = useState('')

  if (marcas.length === 0) {
    return <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">Cadastre uma marca primeiro (aba Marcas) antes de adicionar mÃƒÂ¡quinas.</p>
  }

  const filtrados = produtos.filter((p) => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return p.titulo.toLowerCase().includes(q) || p.marca?.nome?.toLowerCase().includes(q)
  })

  function novaMaquina() {
    setEditando({
      marca_id: marcas[0]?.id, titulo: '', subtitulo: '', categoria: 'tratores',
      descricao: '', argumentos_de_venda: [], especificacoes: {}, url_site: '',
      foto_principal_url: '', folheto_url: '', modelos_supabase: [], filtro_supabase: null,
      visivel: true, ordem: 99,
    })
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar mÃƒÂ¡quina..."
          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
        />
        <button onClick={novaMaquina} className="text-sm px-3 py-1.5 bg-blue-700 text-white rounded-lg font-medium whitespace-nowrap">
          + Nova
        </button>
      </div>

      <div className="space-y-2">
        {filtrados.map((p) => (
          <div key={p.id} className="bg-white rounded-xl shadow p-3 flex items-center gap-3">
            <div className="w-14 h-14 bg-slate-100 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
              {p.foto_principal_url ? (
                <img src={p.foto_principal_url} alt="" className="w-full h-full object-contain" loading="lazy" />
              ) : <span className="text-xl">Ã°Å¸â€œÂ·</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{p.titulo}</p>
              <p className="text-xs text-slate-500 truncate">{p.marca?.nome || 'Ã¢â‚¬â€'} Ã‚Â· {p.categoria}</p>
              {!p.visivel && <span className="text-[10px] text-red-600 font-medium">oculta</span>}
            </div>
            <button onClick={() => setEditando(p)} className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded font-medium">
              Editar
            </button>
          </div>
        ))}
        {filtrados.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Nenhuma mÃƒÂ¡quina.</p>}
      </div>

      {editando && (
        <MaquinaForm
          produto={editando}
          marcas={marcas}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); onChange() }}
        />
      )}
    </div>
  )
}

function MaquinaForm({ produto, marcas, onClose, onSaved }) {
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

  const slugEfetivo = form.slug.trim() || slugify(form.titulo)

  async function enviarArquivo(e, tipo) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!slugEfetivo) { alert('Preencha o tÃƒÂ­tulo (gera o slug) antes de enviar arquivos'); return }
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
    if (!form.titulo.trim()) { alert('Informe o tÃƒÂ­tulo'); return }
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
      alert('Erro ao salvar mÃƒÂ¡quina: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!confirm(`Excluir a mÃƒÂ¡quina "${produto.titulo}"? As mÃƒÂ­dias e arquivos vÃƒÂ£o junto.`)) return
    try {
      await deletarProdutoCatalogo(produto.id)
      onSaved()
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  return (
    <Modal onClose={onClose} titulo={novo ? 'Nova mÃƒÂ¡quina' : 'Editar mÃƒÂ¡quina'}>
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

      <Campo label="TÃƒÂ­tulo">
        <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="Ex: MAHINDRA 6075" />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="SubtÃƒÂ­tulo">
          <input value={form.subtitulo} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="80 CV" />
        </Campo>
        <Campo label="Slug (URL)">
          <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder={slugify(form.titulo) || 'auto'} />
        </Campo>
      </div>

      <Campo label="DescriÃƒÂ§ÃƒÂ£o">
        <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={4} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
      </Campo>

      {/* Foto principal */}
      <Campo label="Foto principal">
        <div className="flex items-center gap-2">
          <div className="w-16 h-16 bg-slate-100 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
            {form.foto_principal_url ? <img src={form.foto_principal_url} alt="" className="w-full h-full object-contain" /> : <span className="text-xl">Ã°Å¸â€œÂ·</span>}
          </div>
          <label className={`text-xs px-3 py-1.5 rounded font-medium cursor-pointer ${enviandoFoto ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
            {enviandoFoto ? 'Enviando...' : 'Enviar foto'}
            <input type="file" accept="image/*" disabled={enviandoFoto} onChange={(e) => enviarArquivo(e, 'foto')} className="hidden" />
          </label>
        </div>
        <input value={form.foto_principal_url} onChange={(e) => setForm({ ...form, foto_principal_url: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs mt-1" placeholder="ou cole uma URL" />
      </Campo>

      {/* Folheto */}
      <Campo label="Folheto tÃƒÂ©cnico (PDF)">
        <div className="flex items-center gap-2">
          {form.folheto_url && <a href={form.folheto_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 underline truncate flex-1">ver atual Ã¢â€ â€”</a>}
          <label className={`text-xs px-3 py-1.5 rounded font-medium cursor-pointer ${enviandoFolheto ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
            {enviandoFolheto ? 'Enviando...' : 'Enviar PDF'}
            <input type="file" accept="application/pdf" disabled={enviandoFolheto} onChange={(e) => enviarArquivo(e, 'folheto')} className="hidden" />
          </label>
        </div>
        <input value={form.folheto_url} onChange={(e) => setForm({ ...form, folheto_url: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs mt-1" placeholder="ou cole uma URL" />
      </Campo>

      <ListaEditavel label="Argumentos de venda" itens={argumentos} setItens={setArgumentos} placeholder="Ex: 15% mais econÃƒÂ´mico" />

      <SpecsEditor specs={specs} setSpecs={setSpecs} />

      {/* Cross-ref Omie */}
      <Campo label="Estoque/preÃƒÂ§o ao vivo (Omie)">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cruzaOmie} onChange={(e) => setCruzaOmie(e.target.checked)} />
          Cruzar com o estoque do Omie
        </label>
      </Campo>
      {cruzaOmie && (
        <div className="pl-2 border-l-2 border-slate-100">
          <ListaEditavel label="Modelos no Omie" itens={modelos} setItens={setModelos} placeholder="Ex: 6075 BR" />
          <ListaEditavel label="FamÃƒÂ­lias (familia_nome)" itens={familias} setItens={setFamilias} placeholder="Ex: Trator Novo" />
          <Campo label="Marca contÃƒÂ©m (marca_like)">
            <input value={marcaLike} onChange={(e) => setMarcaLike(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="mahindra" />
          </Campo>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Campo label="Ordem">
          <input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </Campo>
        <Campo label="VisÃƒÂ­vel pros vendedores">
          <label className="flex items-center gap-2 text-sm py-1.5">
            <input type="checkbox" checked={form.visivel} onChange={(e) => setForm({ ...form, visivel: e.target.checked })} />
            {form.visivel ? 'Sim' : 'NÃƒÂ£o'}
          </label>
        </Campo>
      </div>

      <Campo label="Link do site do fabricante">
        <input value={form.url_site} onChange={(e) => setForm({ ...form, url_site: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" placeholder="https://..." />
      </Campo>

      {/* Galeria (mÃƒÂ­dias extras) Ã¢â‚¬â€ sÃƒÂ³ quando a mÃƒÂ¡quina jÃƒÂ¡ existe */}
      {!novo ? (
        <MidiasEditor catalogoProdutoId={produto.id} />
      ) : (
        <p className="text-[11px] text-slate-400 mt-2">Salve a mÃƒÂ¡quina para poder adicionar fotos/vÃƒÂ­deos extras ÃƒÂ  galeria.</p>
      )}

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
            <button type="button" onClick={() => remover(i)} className="w-8 bg-red-50 text-red-600 rounded text-sm">Ãƒâ€”</button>
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
    <Campo label="EspecificaÃƒÂ§ÃƒÂµes">
      <div className="space-y-1">
        {specs.map(([k, v], i) => (
          <div key={i} className="flex gap-1">
            <input value={k} onChange={(e) => setKey(i, e.target.value)} placeholder="campo" className="w-2/5 border border-slate-300 rounded px-2 py-1.5 text-xs" />
            <input value={v} onChange={(e) => setVal(i, e.target.value)} placeholder="valor" className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-xs" />
            <button type="button" onClick={() => remover(i)} className="w-8 bg-red-50 text-red-600 rounded text-sm">Ãƒâ€”</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="text-xs text-blue-700 font-medium mt-1">+ adicionar</button>
    </Campo>
  )
}
