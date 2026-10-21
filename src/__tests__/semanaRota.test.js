import { describe, expect, it } from 'vitest'
import { resumoCidades } from '../lib/rotaFeed'
import { fixarHora, foraDoPlano, montarPlanoSemana, mover, paraAgenda, reprogramar, segundaDaSemana, subir, tirar } from '../lib/semanaRota'

// 4 cidades em volta da loja, 4 contatos em cada (um de cada tipo + 1 carteira)
const CID = { Piraju: [-23.19, -49.38], Fartura: [-23.39, -49.51], Tejupa: [-23.34, -49.37], Sarutaia: [-23.27, -49.48] }
const itens = Object.entries(CID).flatMap(([cidade, [lat, lng]], c) => ['carteira', 'recuperar', 'novos', 'carteira'].map((tipo, k) => ({
  id: `${cidade}-${k}`, tipo, titulo: `${cidade} ${k}`, cidade, sub: cidade, peso: 1 - k / 10, lat: lat + k / 100, lng, aprox: false, porque: 'p', acao: 'a', propriedadeId: c * 10 + k,
})))
const mix = { carteira: 0.5, recuperar: 0.25, novos: 0.25 }
const plano = montarPlanoSemana({ itens, cidades: resumoCidades(itens), mix, segunda: '2026-10-19', porDia: 4 })

describe('semana da rota', () => {
  it('segunda da semana: dia útil = esta semana; sábado/domingo = a próxima', () => {
    expect(segundaDaSemana(new Date(2026, 9, 21))).toBe('2026-10-19') // quarta
    expect(segundaDaSemana(new Date(2026, 9, 24))).toBe('2026-10-26') // sábado
    expect(segundaDaSemana(new Date(2026, 9, 25))).toBe('2026-10-26') // domingo
  })
  it('5 dias com datas seg–sex e nenhum contato repetido', () => {
    expect(plano.dias.map((d) => d.dia)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'])
    const ids = plano.dias.flatMap((d) => d.itens.map((i) => i.id))
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThan(8)
  })
  it('horários de 1h15 a partir das 08:00, pulando o almoço', () => {
    const r = reprogramar([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }])
    expect(r.map((i) => i.horaIni)).toEqual(['08:00', '09:15', '10:30', '13:00'])
    expect(r[0].horaFim).toBe('09:15')
  })
  it('hora fixada pelo vendedor é respeitada e os seguintes continuam dela', () => {
    const k = plano.dias.findIndex((d) => d.itens.length >= 2)
    const id = plano.dias[k].itens[0].id
    const p = fixarHora(plano, k, id, '10:00')
    expect(p.dias[k].itens[0].horaIni).toBe('10:00')
    expect(p.dias[k].itens[1].horaIni).toBe('13:00')
  })
  it('mover, tirar e reordenar; editar depois de confirmar marca mudouDepois', () => {
    const k = plano.dias.findIndex((d) => d.itens.length >= 2)
    const [a, b] = plano.dias[k].itens
    const conf = { ...plano, confirmadoEm: '2026-10-19T10:00:00Z' }
    const m = mover(conf, k, 4 === k ? 0 : 4, a.id)
    expect(m.dias[k].itens.some((i) => i.id === a.id)).toBe(false)
    expect(m.dias[4 === k ? 0 : 4].itens.at(-1).id).toBe(a.id)
    expect(m.mudouDepois).toBe(true)
    expect(subir(plano, k, b.id, -1).dias[k].itens[0].id).toBe(b.id)
    const t = tirar(plano, k, a.id)
    expect(foraDoPlano(t, itens).some((i) => i.id === a.id)).toBe(true)
  })
  it('formato da Agenda: ref = id do contato, dia e horário', () => {
    const ag = paraAgenda(plano)
    expect(ag.length).toBe(plano.dias.reduce((s, d) => s + d.itens.length, 0))
    expect(ag[0]).toMatchObject({ ref: plano.dias.find((d) => d.itens.length).itens[0].id, horaIni: '08:00', horaFim: '09:15' })
    expect(ag[0].dia).toMatch(/^2026-10-\d\d$/)
  })
})
