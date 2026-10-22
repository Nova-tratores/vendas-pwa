// Trator ilustrado da garagem: cada nível (cv) tem cor e porte próprios.
// SVG simples desenhado aqui (offline, sem arquivo); bloqueado = silhueta cinza.
const ESTILO = {
  50: { corpo: '#64748b', roda: 0.85 },
  75: { corpo: '#2563eb', roda: 0.9 },
  100: { corpo: '#dc2626', roda: 0.95 },
  125: { corpo: '#16a34a', roda: 1 },
  150: { corpo: '#ea580c', roda: 1.05 },
  200: { corpo: '#7c3aed', roda: 1.1 },
  250: { corpo: '#ca8a04', roda: 1.15 },
}

export default function Trator({ cv, bloqueado = false, size = 72 }) {
  const e = ESTILO[cv] || ESTILO[50]
  const corpo = bloqueado ? '#cbd5e1' : e.corpo
  const pneu = bloqueado ? '#e2e8f0' : '#1f2937'
  const r = 15 * e.roda
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 96 72" role="img" aria-label={bloqueado ? `Trator ${cv} cv (bloqueado)` : `Trator ${cv} cv`}>
      {/* cabine */}
      <rect x="44" y="10" width="26" height="26" rx="3" fill={corpo} />
      <rect x="49" y="14" width="16" height="12" rx="2" fill={bloqueado ? '#f1f5f9' : '#bfdbfe'} />
      {/* capô */}
      <rect x="14" y="28" width="44" height="16" rx="4" fill={corpo} />
      {/* escapamento */}
      <rect x="22" y="16" width="4" height="13" rx="1.5" fill={bloqueado ? '#cbd5e1' : '#475569'} />
      {/* rodas */}
      <circle cx="66" cy={60 - (r - 15)} r={r} fill={pneu} />
      <circle cx="66" cy={60 - (r - 15)} r={r * 0.45} fill={bloqueado ? '#f8fafc' : '#facc15'} />
      <circle cx="24" cy="60" r="10" fill={pneu} />
      <circle cx="24" cy="60" r="4.5" fill={bloqueado ? '#f8fafc' : '#facc15'} />
      {!bloqueado && <text x="36" y="40" fontSize="9" fontWeight="800" fill="#fff" textAnchor="middle">{cv}</text>}
    </svg>
  )
}
