import { useState, useEffect, useRef } from 'react'
import {
  getMidiasProduto, getMidiasCatalogoProduto, uploadMidia, deletarMidia, resizeFotoParaUpload,
  criarVideoYoutube, setVisivelVendedor,
} from '../lib/catalogoSupabase'

// Editor de mídias (foto/vídeo/PDF) reutilizável.
// Dono: produto do Estoque atual (codigoProduto) OU produto curado (catalogoProdutoId).
export default function MidiasEditor({ codigoProduto, catalogoProdutoId }) {
  const [midias, setMidias] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [erro, setErro] = useState('')
  const [ytUrl, setYtUrl] = useState('')
  const [addingYt, setAddingYt] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => { carregar() }, [codigoProduto, catalogoProdutoId])

  // Enquanto houver vídeo baixando, recarrega sozinho pra mostrar quando ficar pronto.
  useEffect(() => {
    const processando = midias.some((m) => m.status === 'pendente' || m.status === 'baixando')
    if (!processando) { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } return }
    if (pollRef.current) return
    pollRef.current = setInterval(carregar, 8000)
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midias])

  async function carregar() {
    try {
      const lista = catalogoProdutoId
        ? await getMidiasCatalogoProduto(catalogoProdutoId)   // admin: traz tudo (inclui baixando/erro)
        : await getMidiasProduto(codigoProduto)
      setMidias(lista)
    } catch (err) {
      console.error('[MidiasEditor]', err)
    }
    setLoading(false)
  }

  async function handleUpload(e, tipo) {
    const file = e.target.files?.[0]
    e.target.value = ''  // permite re-selecionar mesmo arquivo
    if (!file) return

    const limite = tipo === 'video' ? 104857600 : 26214400
    if (file.size > limite) {
      setErro(`Arquivo grande demais (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo ${limite / 1048576}MB.`)
      return
    }
    setErro('')
    setUploading(true)
    try {
      const supervisor = JSON.parse(localStorage.getItem('supervisor') || '{}')
      let toUpload = file
      if (tipo === 'foto') {
        toUpload = await resizeFotoParaUpload(file)
      }
      await uploadMidia({
        codigoProduto,
        catalogoProdutoId,
        file: toUpload,
        tipo,
        titulo: file.name.replace(/\.[^.]+$/, '').slice(0, 60),
        supervisorId: supervisor.id,
      })
      await carregar()
    } catch (err) {
      setErro(err.message || 'Falha no upload')
    } finally {
      setUploading(false)
    }
  }

  async function handleAddYoutube() {
    const url = ytUrl.trim()
    if (!url) return
    if (!/youtu\.?be/i.test(url)) {
      setErro('Cole um link do YouTube (youtube.com ou youtu.be).')
      return
    }
    setErro('')
    setAddingYt(true)
    try {
      const supervisor = JSON.parse(localStorage.getItem('supervisor') || '{}')
      await criarVideoYoutube({ codigoProduto, catalogoProdutoId, url, supervisorId: supervisor.id })
      setYtUrl('')
      await carregar()
    } catch (err) {
      setErro(err.message || 'Falha ao adicionar vídeo')
    } finally {
      setAddingYt(false)
    }
  }

  async function handleToggleVendedor(midia) {
    try {
      await setVisivelVendedor(midia.id, !midia.visivel_vendedor)
      await carregar()
    } catch (err) {
      setErro(err.message || 'Falha ao alterar liberação')
    }
  }

  async function handleDelete(midia) {
    if (!confirm(`Excluir "${midia.titulo || midia.storage_path || midia.origem_url || 'mídia'}"?`)) return
    try {
      await deletarMidia(midia)
      await carregar()
    } catch (err) {
      setErro(err.message || 'Falha ao excluir')
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
        Mídias extras ({midias.length})
      </p>

      {loading ? (
        <p className="text-xs text-slate-400">Carregando mídias...</p>
      ) : midias.length === 0 ? (
        <p className="text-xs text-slate-400 mb-2">Nenhuma mídia adicionada ainda.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 mb-2">
          {midias.map((m) => (
            <MidiaThumb
              key={m.id}
              midia={m}
              onDelete={() => handleDelete(m)}
              onToggleVendedor={() => handleToggleVendedor(m)}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1">
        <label className={`text-xs text-center py-1.5 rounded font-medium cursor-pointer ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700 active:bg-blue-100'}`}>
          {uploading ? '...' : '+ Foto'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={uploading}
            onChange={(e) => handleUpload(e, 'foto')}
            className="hidden"
          />
        </label>
        <label className={`text-xs text-center py-1.5 rounded font-medium cursor-pointer ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700 active:bg-blue-100'}`}>
          + Vídeo
          <input
            type="file"
            accept="video/*"
            disabled={uploading}
            onChange={(e) => handleUpload(e, 'video')}
            className="hidden"
          />
        </label>
        <label className={`text-xs text-center py-1.5 rounded font-medium cursor-pointer ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700 active:bg-blue-100'}`}>
          + PDF
          <input
            type="file"
            accept="application/pdf"
            disabled={uploading}
            onChange={(e) => handleUpload(e, 'pdf')}
            className="hidden"
          />
        </label>
      </div>

      {/* Vídeo do YouTube: cola o link, o worker baixa e hospeda no nosso bucket. */}
      <div className="flex gap-1 mt-2">
        <input
          type="url"
          value={ytUrl}
          onChange={(e) => setYtUrl(e.target.value)}
          placeholder="Colar link do YouTube..."
          className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm min-w-0"
        />
        <button
          type="button"
          onClick={handleAddYoutube}
          disabled={addingYt || !ytUrl.trim()}
          className="text-xs px-3 py-1.5 rounded font-medium bg-red-50 text-red-700 active:bg-red-100 disabled:opacity-50 whitespace-nowrap"
        >
          {addingYt ? '...' : '+ YouTube'}
        </button>
      </div>

      <p className="text-[10px] text-slate-400 mt-1">
        Arquivo: máx 25MB (foto/PDF), 100MB (vídeo). Vídeo do YouTube baixa em ~1-2 min. Vídeos só
        aparecem pro vendedor depois de você liberar (botão 👁 no canto).
      </p>

      {erro && (
        <p className="text-xs text-red-600 mt-2 bg-red-50 rounded p-2">{erro}</p>
      )}
    </div>
  )
}

function MidiaThumb({ midia, onDelete, onToggleVendedor }) {
  const icone = midia.tipo === 'foto' ? null : midia.tipo === 'video' ? '🎬' : '📄'
  const baixando = midia.status === 'pendente' || midia.status === 'baixando'
  const erro = midia.status === 'erro'

  return (
    <div className="relative group">
      <a
        href={midia.url_publica || undefined}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => { if (!midia.url_publica) e.preventDefault() }}
        className="block w-full aspect-square bg-slate-100 rounded overflow-hidden flex items-center justify-center"
        title={midia.titulo || midia.origem_url || midia.storage_path || ''}
      >
        {midia.tipo === 'foto' && midia.url_publica ? (
          <img src={midia.url_publica} alt={midia.titulo || ''} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-2xl">{icone}</span>
        )}
      </a>

      {/* Estado do download (vídeo do YouTube) */}
      {baixando && (
        <span className="absolute inset-x-0 bottom-0 bg-amber-500/90 text-white text-[9px] text-center py-0.5">⏳ baixando</span>
      )}
      {erro && (
        <span className="absolute inset-x-0 bottom-0 bg-red-600/90 text-white text-[9px] text-center py-0.5" title={midia.erro || ''}>⚠ erro</span>
      )}

      {/* Liberar pro vendedor (só vídeo pronto) */}
      {midia.tipo === 'video' && midia.status === 'pronto' && (
        <button
          type="button"
          onClick={onToggleVendedor}
          title={midia.visivel_vendedor ? 'Liberado pro vendedor (clique p/ esconder)' : 'Oculto do vendedor (clique p/ liberar)'}
          className={`absolute bottom-0 left-0 right-0 text-[9px] text-center py-0.5 ${
            midia.visivel_vendedor ? 'bg-green-600/90 text-white' : 'bg-slate-700/80 text-white'
          }`}
        >
          {midia.visivel_vendedor ? '👁 liberado' : '🚫 oculto'}
        </button>
      )}

      <button
        type="button"
        onClick={onDelete}
        className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-bl flex items-center justify-center hover:bg-red-600"
        title="Excluir"
      >
        ×
      </button>
    </div>
  )
}
