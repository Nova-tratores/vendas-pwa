// Carrega uma vez o que o cartão da rota precisa para cruzar cliente × município × estoque:
// municípios (Inteligência de Vendas), estoque da loja (catálogo) e as culturas dos clientes.
// Tudo por import dinâmico: os dados de exemplo da Inteligência são pesados.
import { useEffect, useState } from 'react'
import { regiaoDoContato } from '../../lib/regiaoCliente'

export default function useRegiao() {
  const [base, setBase] = useState(null)
  useEffect(() => {
    let vivo = true
    Promise.all([
      import('../../lib/iv/fonte').then((f) => Promise.all([f.carregarMunicipios(), f.carregarOportunidades()])),
      import('../../lib/catalogoSupabase').then((c) => c.getEstoqueAtual().catch(() => [])),
    ])
      .then(([[mun, opo], estoque]) => {
        if (!vivo) return
        const culturas = new Map((opo?.clientes || []).map((c) => [c.id, c.culturas || []]))
        setBase({ municipios: mun?.municipios || [], estoque: estoque || [], culturas })
      })
      .catch(() => { if (vivo) setBase(false) })
    return () => { vivo = false }
  }, [])

  /** Culturas da região e máquinas em estoque para um contato da rota (null enquanto carrega). */
  return (it) => (base
    ? regiaoDoContato({ cidade: it.cidade, culturasCliente: base.culturas.get(it.clienteId) || [], municipios: base.municipios, estoque: base.estoque })
    : null)
}
