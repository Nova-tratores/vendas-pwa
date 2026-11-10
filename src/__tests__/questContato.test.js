import { describe, expect, it, vi } from 'vitest'
vi.mock('../lib/sync', () => ({ supabase: {} }))
vi.mock('../lib/checklistVeiculo', () => ({ PORTAL: '' }))
import { contatoLocal, faltaContato, juntarTelefones, linkMapa, telefonesDoTexto } from '../lib/questContato'

describe('telefones (mesmas regras do portal)', () => {
  it('limpa, separa e completa o 9', () => {
    expect(telefonesDoTexto('(43) 9157-8141 / 14 3351-6049', 'crm').map((t) => [t.numero, t.celular])).toEqual([['43991578141', true], ['1433516049', false]])
    expect(telefonesDoTexto('4586-0400', 'crm')).toEqual([])
  })
  it('junta sem repetir, celular primeiro', () => {
    const j = juntarTelefones(telefonesDoTexto('14 3351-6049', 'crm'), telefonesDoTexto('14 99762-7413 / 14 3351-6049', 'contato'))
    expect(j.map((t) => t.numero)).toEqual(['14997627413', '1433516049'])
  })
  it('o que falta', () => expect(faltaContato({ telefones: [], temLocal: false, endereco: '' })).toEqual(['telefone', 'endereco']))
})

describe('contatoLocal (card de Negócios)', () => {
  it('propriedade + cliente + pessoas', () => {
    const c = contatoLocal({
      propriedade: { telefone: '(43) 99162-3757', latitude: -23.47, longitude: -49.65, cidade: 'Carlópolis', nome: 'Sítio' },
      cliente: { nome: 'João', telefone: '' },
      pessoas: [{ nome: 'Pedro', cargo: 'GERENTE', telefone: '14 99668-8093' }],
    })
    expect(c.telefones.map((t) => t.nome || null)).toEqual([null, 'Pedro · GERENTE'])
    expect(c.falta).toEqual([])
    expect(linkMapa(c)).toContain('-23.47,-49.65')
  })
  it('sem nada = falta tudo; endereço vira busca no mapa', () => {
    expect(contatoLocal({}).falta).toEqual(['telefone', 'endereco'])
    expect(linkMapa({ locais: [], endereco: 'Sítio X, Fartura' })).toContain('S%C3%ADtio%20X')
  })
})
