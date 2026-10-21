// Bloco "O que fazer": o Tratorilson explica os 4 caminhos da prospecção
// (Carteira · Recuperar · Novos · Território) e aponta por onde começar.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, BookUser, ChevronRight, Lightbulb, MapPinned, RotateCcw, UserPlus } from 'lucide-react'
import { nomeCurto } from '../../../lib/iv/fonte'
import { Cartao, num, reais, reduzido } from './comum'

export const CAMINHOS = [
  { id: 'carteira', nome: 'Carteira', cor: '#dc2626', icone: BookUser },
  { id: 'recuperar', nome: 'Recuperar', cor: '#d97706', icone: RotateCcw },
  { id: 'novos', nome: 'Novos', cor: '#16a34a', icone: UserPlus },
  { id: 'territorio', nome: 'Território', cor: '#2563eb', icone: MapPinned },
]

const cidadeBonita = (c) => String(c || '').replace(/\s*\(..\)$/, '').toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase())

function Escrevendo({ texto }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduzido()) { setI(texto.length); return undefined }
    setI(0)
    let k = 0
    const t = setInterval(() => { k += 3; setI(Math.min(texto.length, k)); if (k >= texto.length) clearInterval(t) }, 16)
    return () => clearInterval(t)
  }, [texto])
  return <>{texto.slice(0, i)}{i < texto.length && <span className="ivt-cursor text-slate-400">|</span>}</>
}

function Linha({ titulo, sub, selo, onClick, atraso }) {
  return (
    <button type="button" onClick={onClick} style={{ animationDelay: `${atraso}ms` }}
      className="ivt-entra w-full flex items-center gap-3 text-left py-2.5 border-b border-slate-100 last:border-0 active:bg-slate-50">
      <span className="min-w-0 flex-1">
        <b className="block text-[14px] text-slate-900 truncate">{titulo}</b>
        <span className="block text-[12px] text-slate-500 truncate">{sub}</span>
      </span>
      {selo && <span className="text-[12px] font-bold text-slate-700 bg-slate-100 rounded-full px-2 py-0.5 shrink-0">{selo}</span>}
      <ChevronRight size={16} className="text-slate-400 shrink-0" aria-hidden="true" />
    </button>
  )
}

export default function OQueFazer({ dados, grupo, onGrupo, onAbrirCliente, onImovel }) {
  const navigate = useNavigate()
  const fala = dados.falas.grupos[grupo]
  const caminho = CAMINHOS.find((c) => c.id === grupo)

  let linhas = []
  if (grupo === 'carteira') {
    linhas = dados.carteira.top.slice(0, 4).map((c) => ({
      k: c.chave, titulo: nomeCurto(c.nome), sub: `${cidadeBonita(c.cidade)} · ${c.oportunidades[0]?.titulo || 'motivo para ligar'}`, selo: `nota ${c.score}`,
      onClick: () => onAbrirCliente(c.id),
    }))
  } else if (grupo === 'recuperar') {
    linhas = dados.recuperar.topParados.slice(0, 4).map((p) => ({
      k: `${p.origem}${p.id}`, titulo: nomeCurto(p.cliente), sub: `${p.oque || p.fase}${p.dias != null ? ` · parado há ${p.dias} dias` : ''}`, selo: p.valor ? reais(p.valor) : null,
      onClick: () => navigate('/inteligencia/retorno'),
    }))
  } else if (grupo === 'novos') {
    linhas = dados.novos.propriedades.slice(0, 4).map((p) => ({
      k: p.cod, titulo: `${num(p.areaHa)} ha de ${String(p.cultura || '').toLowerCase()}`, sub: `${p.municipio} · sem cliente nosso`, selo: p.investimento ? reais(p.investimento) : null,
      onClick: () => onImovel(p.cod),
    }))
  } else {
    linhas = dados.territorio.municipios.slice(0, 4).map((m) => ({
      k: m.nome, titulo: m.nome, sub: `${m.cultura} · ${num(m.clientes)} clientes`, selo: `foco ${m.foco}`,
      onClick: () => navigate('/inteligencia/municipios'),
    }))
  }

  return (
    <Cartao titulo="O que fazer" icone={Lightbulb}>
      <div className="flex items-start gap-2.5 mb-3">
        <span className="w-9 h-9 rounded-full grid place-items-center shrink-0 text-white shadow" style={{ background: 'linear-gradient(135deg, #F87171, #991B1B)' }}>
          <Bot size={19} aria-hidden="true" />
        </span>
        <p className="text-[13.5px] text-slate-700 leading-snug bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-md px-3 py-2 min-h-[3.5rem]">
          <Escrevendo texto={dados.falas.abertura} />
        </p>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-3" role="tablist" aria-label="Caminhos da prospecção">
        {CAMINHOS.map((c) => {
          const ativo = c.id === grupo
          const Ic = c.icone
          return (
            <button key={c.id} type="button" role="tab" aria-selected={ativo} onClick={() => onGrupo(c.id)}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11.5px] font-semibold border transition ${ativo ? 'text-white border-transparent shadow' : 'bg-white text-slate-600 border-slate-200'}`}
              style={ativo ? { background: c.cor } : undefined}>
              <Ic size={17} aria-hidden="true" style={ativo ? undefined : { color: c.cor }} />
              {c.nome}
            </button>
          )
        })}
      </div>

      <div key={grupo} className="ivt-entra">
        <h3 className="text-[15px] font-bold text-slate-900 mb-1">{fala.titulo}</h3>
        <p className="text-[13px] text-slate-600 leading-snug mb-2.5">{fala.texto}</p>
        <div className="rounded-xl px-3 py-2.5 mb-2 text-[13px] leading-snug" style={{ background: `${caminho.cor}12`, color: '#1e293b' }}>
          <b style={{ color: caminho.cor }}>Por onde começar: </b>{fala.dica}
        </div>
        <div>
          {linhas.map((l, i) => <Linha key={l.k} {...l} atraso={i * 50} />)}
        </div>
      </div>
    </Cartao>
  )
}
