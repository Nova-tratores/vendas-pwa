import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Shell de impressão. Renderiza um cabeçalho padrão + `children` dentro de
 * #relatorio-print (portal no body). Quando `modo` deixa de ser nulo, dispara
 * window.print() e chama onDone() ao terminar/cancelar a impressão.
 *
 * O conteúdo só fica visível na impressão (controlado pelo CSS em index.css).
 *
 * @param {string}        titulo  Título do relatório
 * @param {'simples'|'detalhada'|null} modo
 * @param {function}      onDone  Chamado após imprimir/cancelar
 * @param {React.ReactNode} children Corpo do relatório
 */
export default function RelatorioImpressao({ titulo, modo, onDone, children }) {
  useEffect(() => {
    if (!modo) return
    function aoTerminar() {
      window.removeEventListener('afterprint', aoTerminar)
      onDone && onDone()
    }
    window.addEventListener('afterprint', aoTerminar)
    // Aguarda o conteúdo pintar antes de abrir o diálogo de impressão
    const t = setTimeout(() => window.print(), 100)
    return () => {
      clearTimeout(t)
      window.removeEventListener('afterprint', aoTerminar)
    }
  }, [modo])

  if (!modo) return null

  const agora = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return createPortal(
    <div id="relatorio-print">
      <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '1.6em', fontWeight: 700 }}>Nova Tratores</div>
            <div style={{ fontSize: '1.1em', fontWeight: 600, color: '#334155' }}>{titulo}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85em', color: '#64748b' }}>
            <div>{modo === 'detalhada' ? 'Versão detalhada' : 'Versão simples'}</div>
            <div>Emitido em {agora}</div>
          </div>
        </div>
      </div>
      {children}
    </div>,
    document.body
  )
}

/* ---- Helpers de layout reutilizáveis no corpo do relatório ---- */

export function RelSecao({ titulo, children }) {
  return (
    <div style={{ marginBottom: 18 }} className="rel-evitar-quebra">
      {titulo && (
        <div style={{ fontWeight: 700, fontSize: '1.05em', marginBottom: 6, color: '#0f172a' }}>
          {titulo}
        </div>
      )}
      {children}
    </div>
  )
}

export function RelTabela({ colunas, linhas }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
      <thead>
        <tr>
          {colunas.map((c, i) => (
            <th
              key={i}
              style={{
                textAlign: c.align || 'left',
                borderBottom: '1px solid #cbd5e1',
                padding: '4px 6px',
                color: '#475569',
                fontWeight: 600,
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha, r) => (
          <tr key={r}>
            {colunas.map((c, i) => (
              <td
                key={i}
                style={{
                  textAlign: c.align || 'left',
                  borderBottom: '1px solid #e2e8f0',
                  padding: '4px 6px',
                }}
              >
                {linha[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
