// Script para verificar el formato de datos del API y como se procesan

async function testAPIData() {
  const fetch = (await import('node-fetch')).default
  try {
    console.log('=== VERIFICANDO DATOS DEL API ===')

    const response = await fetch('http://localhost:3000/api/balizas/status')
    const data = await response.json()

    if (data.success) {
      console.log(`\nRecibidas ${data.data.length} balizas:`)

      data.data.forEach((baliza, index) => {
        console.log(`\n${index + 1}. ${baliza.balizaId}:`)
        console.log(`   currentTeam: ${baliza.currentTeam}`)
        console.log(`   isCurrentlyAvailable: ${baliza.isCurrentlyAvailable}`)
        console.log(`   capturedAt: ${baliza.capturedAt}`)
        console.log(`   timeRemaining: ${baliza.timeRemaining} ms`)

        // Formatear tiempo como lo hace el frontend
        if (baliza.timeRemaining) {
          const hours = Math.floor(baliza.timeRemaining / (1000 * 60 * 60))
          const minutes = Math.floor((baliza.timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((baliza.timeRemaining % (1000 * 60)) / 1000)
          console.log(`   Tiempo formateado: ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
        }

        // Formatear fecha como lo hace el frontend
        if (baliza.capturedAt) {
          const date = new Date(baliza.capturedAt)
          console.log(`   Fecha formateada: ${date.toLocaleString('es-ES')}`)
        }
      })
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

testAPIData()
