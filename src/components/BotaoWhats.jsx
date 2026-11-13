import { MessageCircle } from 'lucide-react'
import { linkWhatsVendedor } from '../lib/whatsVendedor'

// Botão verde que abre a conversa no WhatsApp com a saudação do vendedor pronta.
// Não aparece quando o número não serve (sem DDD, vazio).
export default function BotaoWhats({ telefone, contato, compacto = false, className = '' }) {
  const href = linkWhatsVendedor(telefone, contato)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Abrir no WhatsApp"
      aria-label="Abrir no WhatsApp"
      className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold ${compacto ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'} ${className}`}
    >
      <MessageCircle size={compacto ? 14 : 16} /> WhatsApp
    </a>
  )
}
