// Monta o link do WhatsApp do vendedor para um contato, com a saudação pronta:
// "Bom dia, Fulano! Aqui é Matheus Parmezan, vendedor da Nova Tratores."

export function saudacao(agora = new Date()) {
  const h = agora.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

const MINUSCULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

export function nomeBonito(nome) {
  return String(nome || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
}

// Só os dígitos, com 55 na frente quando vier com DDD (10 ou 11 dígitos).
// Retorna '' quando não dá pra ser um celular/fixo válido.
export function foneWhats(tel) {
  let d = String(tel || '').replace(/\D/g, '')
  if (d.startsWith('0')) d = d.replace(/^0+/, '')
  if (d.length === 10 || d.length === 11) return '55' + d
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d
  return ''
}

export function vendedorLogadoNome() {
  try {
    const v = JSON.parse(localStorage.getItem('vendedor') || 'null')
    return v?.nome || ''
  } catch { return '' }
}

export function textoWhats({ contato, vendedor, agora } = {}) {
  const primeiro = nomeBonito(String(contato || '').split(/\s+/)[0])
  const quem = nomeBonito(vendedor).split(' ').slice(0, 2).join(' ')
  const oi = primeiro ? `${saudacao(agora)}, ${primeiro}!` : `${saudacao(agora)}!`
  return quem ? `${oi} Aqui é ${quem}, vendedor da Nova Tratores.` : `${oi} Aqui é da Nova Tratores.`
}

export function linkWhatsVendedor(tel, contato, vendedor = vendedorLogadoNome()) {
  const n = foneWhats(tel)
  if (!n) return null
  return `https://wa.me/${n}?text=${encodeURIComponent(textoWhats({ contato, vendedor }))}`
}
