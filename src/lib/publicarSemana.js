// Envia o plano da semana da rota para a Agenda (app + Agenda coletiva do Portal).
// José, 21/10/2026: "se já fez a rota semanal, já tem que marcar lá na agenda" — então é
// AUTOMÁTICO: a Minha rota e o Início chamam isto alguns segundos depois de montar ou
// mudar a semana. Rota de exemplo nunca vai. Republicar não duplica (ref = id do contato).
import { paraAgenda } from './semanaRota'

// glob = o build não quebra se lib/agendaRota.js sumir
const MOD_AGENDA = import.meta.glob('./agendaRota.js')

/** Precisa enviar? (montado e nunca enviado, ou mudou depois do último envio) */
export const precisaEnviar = (plano, exemplo) => !!plano && !exemplo && plano.dias.some((d) => d.itens.length) && (!plano.confirmadoEm || plano.mudouDepois)

/**
 * Publica e devolve o plano marcado como enviado. Lança erro se falhar (o plano fica
 * como estava, e a próxima mudança ou o botão "tentar de novo" envia outra vez).
 */
export async function publicarSemana(plano) {
  const carregar = MOD_AGENDA['./agendaRota.js']
  if (!carregar) throw new Error('ligação com a Agenda indisponível')
  const { publicarRotaDaSemana } = await carregar()
  await publicarRotaDaSemana({ semana: plano.semana, itens: paraAgenda(plano) })
  return { ...plano, confirmadoEm: new Date().toISOString(), mudouDepois: false }
}
