import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { lerNumero, lerData, lerPlanilha, porGrupo, porCliente, radar, resumo, simular, ehDoVendedor, modelosDaPlanilha } from '../lib/consorcio'

// cópia da planilha real com consorciado e contrato trocados (o repositório é público)
const csv = readFileSync(resolve(__dirname, 'fixtures/cotas-exemplo.csv'), 'utf8')
const hoje = new Date('2026-11-04T12:00:00')
const { cotas, avisos } = lerPlanilha(csv, hoje)
const cota = (g, c) => cotas.find((x) => x.grupo === String(g) && x.cota === String(c))

describe('lerNumero', () => {
  it('lê os formatos da planilha', () => {
    expect(lerNumero('139.700,00')).toBe(139700)
    expect(lerNumero('161857,06')).toBe(161857.06)
    expect(lerNumero('R$ 198.163,04')).toBe(198163.04)
    expect(lerNumero('161857')).toBe(161857)
    expect(lerNumero('R$ 86.968')).toBe(86968)
    expect(lerNumero('53,7%')).toBe(53.7)
    expect(lerNumero('#DIV/0!')).toBeNull()
    expect(lerNumero('')).toBeNull()
  })
  it('lê datas com ano de 2 e 4 dígitos', () => {
    expect(lerData('23/09/24')).toBe('2024-09-23')
    expect(lerData('01/04/2025')).toBe('2025-04-01')
  })
})

describe('lerPlanilha', () => {
  it('lê as 44 cotas', () => expect(cotas).toHaveLength(44))

  it('saldo e parcelas batem com a quitação da planilha', () => {
    const c = cota(6001, 706)
    expect(Math.round(c.saldo)).toBe(91338)
    expect(c.parcelasRestantes).toBe(45)
    expect(c.status).toBe('aguardando')
  })

  it('situação: lance, sorteio e quitada', () => {
    expect(cota(6006, 48).formaContemplacao).toBe('lance')
    expect(cota(6000, 272).formaContemplacao).toBe('sorteio')
    expect(cota(6000, 125).status).toBe('quitada')
  })

  it('última linha com #REF! usa o lance do grupo', () => {
    const c = cota(6008, 41)
    expect(c.lancePct).toBe(53.7)
    expect(Math.round(c.lanceValor)).toBe(Math.round(162052 * 0.537))
  })

  it('150% vira 100% e entra nos avisos; outra concessionária é marcada', () => {
    const c = cota(6007, 366)
    expect(c.percPago).toBe(100)
    expect(c.nossa).toBe(false)
    expect(avisos.some((a) => a.includes('cota 366'))).toBe(true)
  })

  it('atraso fica na coluna certa', () => {
    expect(cota(6007, 12).valorAtraso).toBeCloseTo(2637.31)
    expect(cota(6007, 12).emAtraso).toBe(true)
  })

  it('aceita planilha salva com ponto e vírgula', () => {
    const t = 'Grupo;Cota;Consorciado;Bem;Preço Atual\n6001;9;FULANO;MAHINDRA 6075 80CV;265.235,00\n'
    const r = lerPlanilha(t, hoje)
    expect(r.cotas[0].preco).toBe(265235)
    expect(Math.round(r.cotas[0].carta)).toBe(Math.round(265235 * 1.16))
  })
})

describe('agrupamentos e radar', () => {
  it('cliente com 7 cotas aparece primeiro', () => {
    expect(porCliente(cotas)[0].nome).toMatch(/GRANDE/)
    expect(porCliente(cotas)[0].cotas).toHaveLength(7)
  })
  it('grupos ordenados com lance do grupo', () => {
    const g = porGrupo(cotas)
    expect(g.map((x) => x.grupo)).toEqual(['6000', '6001', '6002', '6005', '6006', '6007', '6008'])
    expect(g.find((x) => x.grupo === '6001').lancePct).toBe(43.9)
  })
  it('radar põe atraso e cliente grande no topo', () => {
    const r = radar(cotas, hoje)
    expect(r[0].tipo).toBe('atraso')
    expect(r.some((i) => i.tipo === 'vip' && /GRANDE/.test(i.cliente))).toBe(true)
    expect(r.some((i) => i.tipo === 'outra')).toBe(true)
  })
  it('resumo soma as cotas', () => {
    const s = resumo(cotas)
    expect(s.cotas).toBe(44)
    expect(s.aguardando + s.contempladas + s.quitadas).toBe(44)
    expect(s.emAtraso).toBe(2)
  })
})

describe('simular', () => {
  it('reproduz a parcela da planilha (2025: carta 162.052, parcela 1.350,44)', () => {
    const s = simular({ preco: 139700 })
    expect(Math.round(s.carta)).toBe(162052)
    expect(s.parcela).toBeCloseTo(1350.43, 1)
    expect(Math.round(s.seguro)).toBe(136)
  })
  it('lance de 40% reduz o prazo ou a parcela', () => {
    expect(simular({ preco: 139700, lancePct: 40 }).prazoDepois).toBe(72)
    expect(simular({ preco: 139700, lancePct: 40, usarLancePara: 'parcela' }).parcelaDepois).toBeCloseTo(810.26, 1)
  })
  it('modelos da planilha do mais barato ao mais caro', () => {
    const m = modelosDaPlanilha(cotas)
    expect(m[m.length - 1].modelo).toBe('86-110P')
  })
})

describe('ehDoVendedor', () => {
  it('casa nome e sobrenome', () => {
    expect(ehDoVendedor({ vendedor: 'JOAQUIM FERNANDO LEME' }, 'Joaquim Leme')).toBe(true)
    expect(ehDoVendedor({ vendedor: 'PEDRO OSCAR FAVARO' }, 'Pedro Carlos de Barros')).toBe(false)
  })
})
