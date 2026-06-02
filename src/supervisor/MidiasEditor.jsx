import { useState, useEffect } from 'react'
import {
  getMidiasProduto, getMidiasCatalogoProduto, uploadMidia, deletarMidia, resizeFotoParaUpload,
} from '../lib/catalogoSupabase'

// Editor de mídias (foto/vídeo/PDF) reutilizável.
// Dono: produto do Estoque atual (codigoProduto) OU produto curado (catalogoProdutoId).
export default function MidiasEditor({ codigoProduto, catalogoProdutoId }) {
  const [midias, setMidias] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => { carregar() }, [codigoProduto, catalogoProdutoId])

  async function carregar() {
    setLoading(true)
    try {
      const lista = catalogoProdutoId
        ? await getMidiasCatalogoProduto(catalogoProdutoId)
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

    if (file.size > 26214400) {
      setErro(`Arquivo grande demais (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 25MB.`)
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

  async function handleDelete(midia) {
    if (!confirm(`Excluir "${midia.titulo || midia.storage_path}"?`)) return
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
            <MidiaThumb key={m.id} midia={m} onDelete={() => handleDelete(m)} />
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

      <p className="text-[10px] text-slate-400 mt-1">Máx 25MB por arquivo. Fotos são redimensionadas pra 1280px.</p>

      {erro && (
        <p className="text-xs text-red-600 mt-2 bg-red-50 rounded p-2">{erro}</p>
      )}
    </div>
  )
}

function MidiaThumb({ midia, onDelete }) {
  const icone = midia.tipo === 'foto' ? null : midia.tipo === 'video' ? '🎬' : '📄'
  return (
    <div className="relative group">
      <a
        href={midia.url_publica}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full aspect-square bg-slate-100 rounded overflow-hidden flex items-center justify-center"
        title={midia.titulo || midia.storage_path}
      >
        {midia.tipo === 'foto' ? (
          <img src={midia.url_publica} alt={midia.titulo || ''} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-2xl">{icone}</span>
        )}
      </a>
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
