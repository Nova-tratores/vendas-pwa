// Captura a posição atual. maximumAge reaproveita um fix recente em vez de
// forçar leitura fria toda vez (no campo, sem A-GPS, o fix frio demora ou estoura).
export function capturarGPS({ highAccuracy = true, timeout = 12000, maxAge = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS não suportado'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        gps_accuracy: pos.coords.accuracy,
      }),
      (err) => {
        const msgs = {
          1: 'Permissão de localização negada.',
          2: 'Posição indisponível.',
          3: 'Tempo esgotado ao obter GPS.',
        }
        reject(new Error(msgs[err.code] || 'Erro GPS'))
      },
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: maxAge }
    )
  })
}

// Tenta o GPS fino primeiro; se falhar (comum offline / sem sinal no campo),
// cai para uma leitura grosseira e mais tolerante antes de desistir.
export async function capturarGPSComFallback() {
  try {
    return await capturarGPS({ highAccuracy: true, timeout: 12000, maxAge: 60000 })
  } catch {
    return await capturarGPS({ highAccuracy: false, timeout: 8000, maxAge: 120000 })
  }
}
