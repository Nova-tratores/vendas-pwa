// Bloco de contato na tela da quest (Ligar / WhatsApp / mapa / Pedir ao suporte).
// O mesmo bloco aparece, compacto, no card de Negócios: components/contato/BlocoContato.jsx.
import BlocoContato from '../contato/BlocoContato'

export default function ContatoQuest({ quest }) {
  return <BlocoContato alvo={{ tipo: 'quest', id: quest.id, quest }} />
}
