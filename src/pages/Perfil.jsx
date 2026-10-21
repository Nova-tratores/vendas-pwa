// Meu perfil — nome, telefone, foto e o carro da empresa vinculado ao vendedor.
//
// Tudo grava nas MESMAS tabelas do Portal (mesmo login Supabase), então a mudança
// aparece lá na hora:
//   - financeiro_usu (nome, avatar_url) — RLS: cada usuário edita só a própria linha;
//   - vendedores (nome, telefone)      — RLS vendedor_update_self;
//   - foto no bucket público `avatars` (o mesmo da tela de configurações do Portal).
// O carro vem do Portal (/api/frota/checklist-vendedor): o carro em que o vendedor é o
// responsável atual na Frota.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BadgeCheck, Camera, Car, ClipboardCheck, Lock, Mail, Phone, Save, User, Wrench,
} from 'lucide-react'
import { supabase } from '../lib/sync'
import { listarMeusCarros } from '../lib/checklistVeiculo'

// Reduz a foto para no máximo 512 px (JPEG) antes de enviar — foto de celular tem vários MB.
function reduzirFoto(arquivo, lado = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const escala = Math.min(1, lado / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * escala)
      c.height = Math.round(img.height * escala)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível ler a foto'))), 'image/jpeg', 0.85)
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => reject(new Error('Arquivo de imagem inválido'))
    img.src = URL.createObjectURL(arquivo)
  })
}

const soDigitos = (s) => String(s || '').replace(/\D/g, '')
function mascaraTelefone(v) {
  const d = soDigitos(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function Perfil() {
  const navigate = useNavigate()
  const inputFoto = useRef(null)
  const [carregando, setCarregando] = useState(true)
  const [uid, setUid] = useState(null)
  const [email, setEmail] = useState('')
  const [vendedor, setVendedor] = useState(null) // linha de `vendedores`
  const [usuPortal, setUsuPortal] = useState(null) // linha de `financeiro_usu` (pode não existir)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [foto, setFoto] = useState('') // URL atual
  const [fotoNova, setFotoNova] = useState(null) // { blob, preview }
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState(null) // { tipo: 'ok'|'erro', texto }
  const [carros, setCarros] = useState(null) // null = carregando; [] = nenhum; false = erro
  const [erroCarros, setErroCarros] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) { navigate('/login'); return }
      const [{ data: vend }, { data: usu }] = await Promise.all([
        supabase.from('vendedores').select('id, nome, email, telefone, ativo').eq('auth_uid', user.id).maybeSingle(),
        supabase.from('financeiro_usu').select('id, nome, funcao, avatar_url, email').eq('id', user.id).maybeSingle(),
      ])
      if (!vivo) return
      setUid(user.id)
      setEmail(user.email || vend?.email || '')
      setVendedor(vend || null)
      setUsuPortal(usu || null)
      setNome(usu?.nome || vend?.nome || '')
      setTelefone(mascaraTelefone(vend?.telefone || ''))
      setFoto(usu?.avatar_url || '')
      setCarregando(false)
    })().catch((e) => { if (vivo) { setAviso({ tipo: 'erro', texto: e.message }); setCarregando(false) } })

    listarMeusCarros()
      .then((r) => { if (vivo) setCarros(r?.carros || []) })
      .catch((e) => { if (vivo) { setCarros(false); setErroCarros(e.message) } })
    return () => { vivo = false }
  }, [navigate])

  async function escolherFoto(e) {
    const arq = e.target.files?.[0]
    e.target.value = ''
    if (!arq) return
    try {
      const blob = await reduzirFoto(arq)
      setFotoNova({ blob, preview: URL.createObjectURL(blob) })
    } catch (err) {
      setAviso({ tipo: 'erro', texto: err.message })
    }
  }

  const mudou =
    nome.trim() !== (usuPortal?.nome || vendedor?.nome || '') ||
    soDigitos(telefone) !== soDigitos(vendedor?.telefone) ||
    !!fotoNova

  async function salvar() {
    const nomeLimpo = nome.trim().replace(/\s+/g, ' ')
    if (nomeLimpo.length < 3) { setAviso({ tipo: 'erro', texto: 'Informe o seu nome.' }); return }
    if (!navigator.onLine) { setAviso({ tipo: 'erro', texto: 'Sem internet. O perfil precisa de conexão para salvar.' }); return }
    setSalvando(true)
    setAviso(null)
    try {
      let avatarUrl = foto
      if (fotoNova) {
        const caminho = `${uid}-${Date.now()}.jpg`
        const { error: upErr } = await supabase.storage.from('avatars').upload(caminho, fotoNova.blob, { contentType: 'image/jpeg', upsert: true })
        if (upErr) throw new Error('Não foi possível enviar a foto: ' + upErr.message)
        avatarUrl = supabase.storage.from('avatars').getPublicUrl(caminho).data.publicUrl
      }
      // Portal (financeiro_usu) — só se o usuário tem cadastro lá
      if (usuPortal) {
        const { error } = await supabase.from('financeiro_usu').update({ nome: nomeLimpo, avatar_url: avatarUrl }).eq('id', uid)
        if (error) throw new Error('Portal: ' + error.message)
      }
      // App de vendas / Propostas (vendedores)
      if (vendedor) {
        const { error } = await supabase.from('vendedores').update({ nome: nomeLimpo, telefone: telefone || null }).eq('id', vendedor.id)
        if (error) throw new Error('Cadastro de vendedor: ' + error.message)
      }
      // Cópia local usada pelo cabeçalho e pelas telas
      try {
        const local = JSON.parse(localStorage.getItem('vendedor') || '{}')
        localStorage.setItem('vendedor', JSON.stringify({ ...local, nome: nomeLimpo, foto: avatarUrl }))
        window.dispatchEvent(new Event('vendedor-atualizado'))
      } catch { /* sem armazenamento local: o cabeçalho atualiza no próximo login */ }

      setFoto(avatarUrl)
      setFotoNova(null)
      setUsuPortal((u) => (u ? { ...u, nome: nomeLimpo, avatar_url: avatarUrl } : u))
      setVendedor((v) => (v ? { ...v, nome: nomeLimpo, telefone } : v))
      setAviso({ tipo: 'ok', texto: usuPortal ? 'Perfil salvo. Já aparece assim no Portal.' : 'Perfil salvo.' })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e.message })
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    )
  }

  const fotoMostrada = fotoNova?.preview || foto
  const iniciais = (nome || '?').trim().split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  return (
    <div className="pb-24">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-blue-700 mb-3">
        <ArrowLeft size={16} aria-hidden="true" /> Voltar
      </button>

      {/* Cartão do perfil */}
      <section
        className="ini-entra -mx-4 px-4 pt-5 pb-6 mb-4 text-white rounded-b-3xl text-center"
        style={{ background: 'linear-gradient(135deg, #DC2626, #7F1D1D)' }}
      >
        <button
          onClick={() => inputFoto.current?.click()}
          className="relative mx-auto block w-28 h-28 rounded-full ring-4 ring-white/40 overflow-hidden bg-white/20 active:opacity-80"
          aria-label="Trocar foto"
        >
          {fotoMostrada
            ? <img src={fotoMostrada} alt="" className="w-full h-full object-cover" />
            : <span className="w-full h-full flex items-center justify-center text-3xl font-bold">{iniciais}</span>}
          <span className="absolute bottom-0 inset-x-0 bg-black/45 py-1 flex items-center justify-center gap-1 text-[11px] font-semibold">
            <Camera size={13} aria-hidden="true" /> Trocar
          </span>
        </button>
        <input ref={inputFoto} type="file" accept="image/*" className="hidden" onChange={escolherFoto} />
        <h1 className="mt-3 text-xl font-bold">{nome || 'Vendedor'}</h1>
        <p className="text-sm opacity-85">{usuPortal?.funcao || 'Vendedor'}</p>
        <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-semibold">
          {vendedor?.ativo !== false && vendedor && (
            <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5"><BadgeCheck size={13} aria-hidden="true" /> NT Vendas</span>
          )}
          {usuPortal && (
            <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5"><BadgeCheck size={13} aria-hidden="true" /> Portal</span>
          )}
        </div>
      </section>

      {/* Dados */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 space-y-4">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide"><User size={14} aria-hidden="true" /> Meus dados</p>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={120}
            className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Telefone (WhatsApp)</span>
          <span className="mt-1 flex items-center gap-2 border border-slate-300 rounded-xl px-3 focus-within:ring-2 focus-within:ring-blue-500">
            <Phone size={16} className="text-slate-400" aria-hidden="true" />
            <input
              value={telefone}
              onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
              inputMode="tel"
              placeholder="(14) 99999-0000"
              className="w-full py-2.5 text-sm focus:outline-none"
            />
          </span>
        </label>
        <div>
          <span className="text-xs font-semibold text-slate-600">E-mail de acesso</span>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <Mail size={16} className="text-slate-400" aria-hidden="true" />
            <span className="truncate">{email}</span>
            <Lock size={14} className="ml-auto text-slate-400 shrink-0" aria-hidden="true" />
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Para trocar o e-mail, peça ao administrador do Portal.</p>
        </div>
      </section>

      {/* Carro vinculado */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide mb-3"><Car size={14} aria-hidden="true" /> Carro da empresa</p>
        {carros === null && <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />}
        {carros === false && <p className="text-sm text-slate-500">Não foi possível consultar o carro agora. {erroCarros}</p>}
        {Array.isArray(carros) && carros.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum carro vinculado a você na Frota. Se você usa um carro da empresa, peça ao responsável pela Frota para colocar você como responsável.</p>
        )}
        {Array.isArray(carros) && carros.map((c) => (
          <div key={c.placa} className="flex items-center gap-3 py-2">
            <span className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0"><Car size={24} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 tracking-wide">{c.placa_fmt || c.placa}</p>
              <p className="text-xs text-slate-500 truncate">{c.modelo || 'Modelo não informado'}</p>
            </div>
          </div>
        ))}
        {Array.isArray(carros) && carros.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => navigate(`/checklist-veiculo?placa=${encodeURIComponent(carros[0].placa)}`)} className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-xl py-2.5 active:bg-slate-50">
              <ClipboardCheck size={15} aria-hidden="true" /> Checklist do mês
            </button>
            <button onClick={() => navigate(`/chamado-veicular?placa=${encodeURIComponent(carros[0].placa)}`)} className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-xl py-2.5 active:bg-slate-50">
              <Wrench size={15} aria-hidden="true" /> Chamado veicular
            </button>
          </div>
        )}
      </section>

      {aviso && (
        <p className={`text-sm rounded-xl px-3 py-2 mb-3 ${aviso.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{aviso.texto}</p>
      )}

      {/* Salvar fixo embaixo, acima da barra de navegação */}
      <div className="fixed left-0 right-0 bottom-16 px-4 pb-2 z-40">
        <button
          onClick={salvar}
          disabled={!mudou || salvando}
          className="w-full inline-flex items-center justify-center gap-2 bg-blue-700 text-white py-3 rounded-2xl font-semibold text-sm shadow-lg disabled:opacity-40 active:bg-blue-800"
        >
          <Save size={18} aria-hidden="true" /> {salvando ? 'Salvando…' : mudou ? 'Salvar alterações' : 'Nada para salvar'}
        </button>
      </div>
    </div>
  )
}
