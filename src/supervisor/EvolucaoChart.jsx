import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { CORES_SERIE } from '../lib/evolucao'

/**
 * Gráfico de linhas multi-série. Carregado sob demanda (lazy) pela aba Evolução.
 *
 * @param {Array}    data    Pontos { periodo, [serie]: número }
 * @param {string[]} series  Nomes das séries (uma linha cada)
 * @param {function} fmtValor Formata o valor no eixo/tooltip
 */
export default function EvolucaoChart({ data, series, fmtValor = (v) => v }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: '#64748b' }} />
        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={fmtValor} width={48} />
        <Tooltip
          formatter={(v, nome) => [fmtValor(v), nome]}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Line
            key={s}
            type="monotone"
            dataKey={s}
            stroke={CORES_SERIE[i % CORES_SERIE.length]}
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
