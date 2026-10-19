// "Pedir checklist" do portal abre o app com ?placa=...: a placa tem que achar
// o veículo em SupaPlacas mesmo com o modelo na frente ("VOYAGE-SEB9J47").
import { describe, it, expect } from 'vitest'
import { acharPlaca } from '../lib/placas'

const placas = [
  { IdPlaca: 19, NumPlaca: 'VOYAGE-SEB9J47' },
  { IdPlaca: 20, NumPlaca: 'SAVEIRO - TKY6E68' },
]

describe('acharPlaca', () => {
  it('acha pelo texto da placa, com ou sem hífen', () => {
    expect(acharPlaca(placas, 'SEB9J47').IdPlaca).toBe(19)
    expect(acharPlaca(placas, 'tky-6e68').IdPlaca).toBe(20)
  })
  it('acha pelo IdPlaca; sem placa ou desconhecida → null', () => {
    expect(acharPlaca(placas, '20').IdPlaca).toBe(20)
    expect(acharPlaca(placas, '')).toBeNull()
    expect(acharPlaca(placas, 'ZZZ9Z99')).toBeNull()
  })
})
