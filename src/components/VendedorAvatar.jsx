// Avatar do vendedor: iniciais sobre uma cor própria (derivada do id, sem precisar
// cadastrar foto) e um contorno colorido pra identificar cada vendedor de relance.
// Foto real pode entrar depois trocando o miolo por <img src={foto_url}>.

const PALETA = [
  '#1e40af', '#16a34a', '#d97706', '#7c3aed', '#dc2626',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#4f46e5',
  '#0d9488', '#9333ea',
]

// Cor estável por vendedor: mesmo id => sempre a mesma cor.
export function corVendedor(id) {
  const n = Math.abs(Number(id) || 0)
  return PALETA[n % PALETA.length]
}

export function primeiroNome(nome) {
  return (nome || '').trim().split(/\s+/)[0] || ''
}

function iniciais(nome) {
  // Primeira letra/dígito de cada palavra, ignorando pontuação (ex.: "HENRI (TESTE)" -> "HT")
  const letras = (nome || '').trim().split(/\s+/)
    .map((p) => (p.match(/[\p{L}\p{N}]/u) || [])[0])
    .filter(Boolean)
  if (letras.length === 0) return '?'
  if (letras.length === 1) {
    return ((nome.match(/[\p{L}\p{N}]/gu) || []).slice(0, 2).join('') || '?').toUpperCase()
  }
  return (letras[0] + letras[letras.length - 1]).toUpperCase()
}

export default function VendedorAvatar({ id, nome, size = 32, title }) {
  const cor = corVendedor(id)
  return (
    <span
      title={title ?? nome}
      style={{
        width: size,
        height: size,
        background: cor,
        border: '2px solid #fff',
        boxShadow: `0 0 0 2px ${cor}`,
        fontSize: Math.round(size * 0.38),
      }}
      className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0 select-none"
    >
      {iniciais(nome)}
    </span>
  )
}
