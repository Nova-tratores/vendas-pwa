import { useState } from 'react'
import { capturarGPSComFallback } from '../lib/gps'
import { capturarFoto } from '../lib/camera'
import { saveRecord, saveFotoPendente, registrarLog, getRecord, getByIndex } from '../lib/db'

export function useCheckin() {
  const [loading, setLoading] = useState(false)
  const [erroGPS, setErroGPS] = useState(null)
  const [gpsData, setGpsData] = useState(null)
  const [fotoBlob, setFotoBlob] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)

  async function iniciarCheckin() {
    setLoading(true)
    setErroGPS(null)
    try {
      setGpsData(await capturarGPSComFallback())
    } catch (err) {
      setErroGPS(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function tirarFoto() {
    try {
      const blob = await capturarFoto()
      setFotoBlob(blob)
      setFotoPreview(URL.createObjectURL(blob))
    } catch {
      // usuario cancelou
    }
  }

  async function salvarVisita(form) {
    // Propriedade e pessoa são obrigatórias (defesa: a UI já bloqueia o botão).
    if (!form.propriedade_id) throw new Error('Selecione a propriedade / cliente')
    if (!form.pessoa_ids?.length) throw new Error('Selecione ou cadastre pelo menos uma pessoa')
    if (!form.resumo?.trim()) throw new Error('Adicione um resumo da visita (o que foi conversado)')
    // GPS não bloqueia mais o registro: no campo, sem sinal, o fix pode estourar.
    // Salvamos com o que houver (coords podem ficar nulas) pra não travar o vendedor.
    const vendedor = JSON.parse(localStorage.getItem('vendedor'))

    const dataVisita = form.data_visita
      ? new Date(form.data_visita).toISOString()
      : new Date().toISOString()
    const isRetroativa = form.data_visita
      ? (Date.now() - new Date(form.data_visita).getTime()) > 120 * 60 * 1000
      : false

    // Otimista: conta as visitas locais desta propriedade pra badge aparecer
    // já offline. A palavra final é do trigger no servidor (set_primeira_visita),
    // que enxerga as visitas de TODOS os vendedores.
    const anteriores = (await getByIndex('visitas', 'propriedade_id', parseInt(form.propriedade_id)))
      .filter((v) => !v.deleted_at)

    const visita = {
      vendedor_id: vendedor.id,
      propriedade_id: parseInt(form.propriedade_id),
      tipo: form.tipo,
      negocio_id: form.negocio_id ? parseInt(form.negocio_id) : null,
      pessoa_ids: (form.pessoa_ids || []).map(Number),
      maquina_ids: (form.maquina_ids || []).map(Number),
      data_visita: dataVisita,
      retroativa: isRetroativa,
      primeira_visita: anteriores.length === 0,
      latitude: gpsData?.latitude || null,
      longitude: gpsData?.longitude || null,
      gps_accuracy: gpsData?.gps_accuracy || null,
      foto_path: null,
      resumo: form.resumo,
      proximos_passos: form.proximos_passos,
      data_proximo_contato: form.data_proximo_contato || null,
      acionar_pos_vendas: form.acionar_pos_vendas || false,
      veiculo: form.veiculo || null,
      created_at: new Date().toISOString(),
    }

    const id = await saveRecord('visitas', visita)

    // 1º check-in presencial geolocaliza a PROPRIEDADE (a fazenda no mapa).
    // Só grava se ainda não tiver coordenada — não sobrescreve depois.
    if (visita.tipo === 'presencial' && gpsData?.latitude != null && visita.propriedade_id) {
      const prop = await getRecord('propriedades', visita.propriedade_id)
      if (prop && prop.latitude == null && prop.longitude == null) {
        await saveRecord('propriedades', {
          ...prop,
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
        })
        await registrarLog('alterar', 'propriedades', prop.id, `Coordenada do 1º check-in: ${gpsData.latitude.toFixed(5)}, ${gpsData.longitude.toFixed(5)}`)
      }
    }

    // Registra o veículo usado no dia (pra aparecer no mapa do supervisor)
    if (form.veiculo && navigator.onLine) {
      try {
        const { supabase } = await import('../lib/sync')
        const hoje = new Date().toISOString().split('T')[0]
        await supabase.from('checkin_vendedor').upsert({
          vendedor_id: vendedor.id,
          vendedor_nome: vendedor.nome || '',
          placa: form.veiculo,
          data: hoje,
        }, { onConflict: 'vendedor_id,data' })
      } catch { /* offline: sincroniza depois */ }
    }
    const logDetalhe = `Visita ${visita.tipo}${isRetroativa ? ' [RETROATIVA]' : ''}${visita.acionar_pos_vendas ? ' [PÓS VENDAS]' : ''} - ${visita.resumo || 'sem resumo'}`
    await registrarLog('criar', 'visitas', id, logDetalhe)
    if (visita.acionar_pos_vendas) {
      await registrarLog('criar', 'pos_vendas', id, `Pós Vendas acionado via visita - máquinas: ${visita.maquina_ids.join(', ')}`)
    }
    if (fotoBlob) await saveFotoPendente(id, fotoBlob)
    return { ...visita, id }
  }

  function resetCheckin() {
    setGpsData(null)
    setErroGPS(null)
    setFotoBlob(null)
    setFotoPreview(null)
  }

  return { loading, erroGPS, gpsData, fotoPreview, iniciarCheckin, tirarFoto, salvarVisita, resetCheckin }
}
