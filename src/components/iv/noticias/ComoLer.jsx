// "Como ler esta tela": explicação curta do boletim, em folha de tela cheia.
import { Bot, CalendarDays, ChartColumn, CloudSunRain, Gauge, Landmark, MessageCircle, Newspaper } from 'lucide-react'
import { Folha } from './Pecas'

const ITENS = [
  { I: Bot, cor: '#15803d', t: 'Um robô monta o boletim todo dia às 06:30', d: 'Ele lê Banco Central, CONAB, Boletim Focus, previsão do tempo e sites de notícia do agro. A IA resume cada matéria e diz o que ela muda para quem vende trator.' },
  { I: CalendarDays, cor: '#dc2626', t: 'Dias do boletim', d: 'Os botões abaixo da data trocam o dia: hoje, ontem e os dias úteis anteriores.' },
  { I: ChartColumn, cor: '#ea580c', t: 'Cotações e indicadores', d: 'A faixa preta rola sozinha (segure o dedo para pausar). Nos cartões, verde é bom para vender e vermelho pede atenção. Toque para abrir a fonte oficial.' },
  { I: Newspaper, cor: '#7c3aed', t: 'Manchete, destaques e notícias', d: 'Toque numa notícia para ler a matéria inteira, com foto e o quadro "Para quem vende trator". Arraste para o lado para ir à próxima.' },
  { I: Gauge, cor: '#475569', t: 'Clima das notícias', d: 'O ponteiro mostra o saldo do dia: boas menos as de atenção. Toque nos números para filtrar a lista.' },
  { I: Landmark, cor: '#16a34a', t: 'Plano Safra', d: 'Taxa, prazo e carência de cada linha de crédito para máquina. "A conferir" é leitura nova do robô que ninguém aprovou ainda. "Simular" abre a Calculadora com a taxa e o prazo.' },
  { I: CloudSunRain, cor: '#0891b2', t: 'Previsões e tempo', d: 'O que o mercado espera para Selic, inflação e dólar (Focus) e a chuva dos próximos 7 dias em Piraju e região.' },
  { I: MessageCircle, cor: '#16a34a', t: 'Mande para o cliente', d: 'Dentro da matéria, "Compartilhar no WhatsApp" envia título, resumo e link.' },
]

export default function ComoLer({ onFechar }) {
  return (
    <Folha titulo="Como ler esta tela" onFechar={onFechar} rotulo="Como ler esta tela">
      <div className="p-4 grid gap-2.5">
        {ITENS.map(({ I, cor, t, d }, k) => (
          <div key={t} className="ntv-sobe flex gap-3 bg-white border border-slate-200 rounded-2xl p-3.5" style={{ animationDelay: `${k * 45}ms` }}>
            <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${cor} 12%, #fefefe)`, color: cor }}>
              <I size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <b className="block text-[14.5px] text-slate-900">{t}</b>
              <p className="m-0 mt-0.5 text-[13px] leading-snug text-slate-600">{d}</p>
            </div>
          </div>
        ))}
        <button type="button" onClick={onFechar} className="mt-2 rounded-xl bg-[#111111] text-[#fefefe] py-3 text-[14.5px] font-bold">Entendi</button>
      </div>
    </Folha>
  )
}
