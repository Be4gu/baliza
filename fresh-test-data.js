const Database = require('./src/database')

async function generateFreshTestData() {
  const db = new Database()

  try {
    await db.connect()
    console.log('🎮 Generando eventos de prueba NUEVOS...')
    console.log('✅ Conectado a la base de datos PostgreSQL')

    // Obtener el último evento para generar eventos posteriores
    const lastEvent = await db.getLastEvent()
    const baseTime = lastEvent ? lastEvent.timestamp.getTime() : Date.now() - 2 * 60 * 60 * 1000 // 2 horas atrás si no hay eventos

    console.log(`📊 Último evento en DB: ${lastEvent ? lastEvent.timestamp.toISOString() : 'No existe'}`)

    // Generar 3 eventos nuevos posteriores al último
    const newEvents = [
      {
        timestamp: new Date(baseTime + 10 * 60 * 1000), // 10 min después del último
        displayTime: new Date(baseTime + 10 * 60 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        eventCategory: 'Captura de baliza',
        eventType: 'BALIZA',
        teamName: 'Team Alpha',
        teamColor: '#FF6B6B',
        playerName: 'Alpha_Leader',
        action: 'captured baliza_norte',
        rawDescription: 'Team Alpha captured baliza_norte',
        scrapedAt: new Date()
      },
      {
        timestamp: new Date(baseTime + 15 * 60 * 1000), // 15 min después del último
        displayTime: new Date(baseTime + 15 * 60 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        eventCategory: 'Captura de baliza',
        eventType: 'BALIZA',
        teamName: 'Team Beta',
        teamColor: '#4ECDC4',
        playerName: 'Beta_Commander',
        action: 'captured baliza_sur',
        rawDescription: 'Team Beta captured baliza_sur',
        scrapedAt: new Date()
      },
      {
        timestamp: new Date(baseTime + 20 * 60 * 1000), // 20 min después del último
        displayTime: new Date(baseTime + 20 * 60 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        eventCategory: 'Captura de baliza',
        eventType: 'BALIZA',
        teamName: 'Team Gamma',
        teamColor: '#45B7D1',
        playerName: 'Gamma_Captain',
        action: 'captured baliza_este',
        rawDescription: 'Team Gamma captured baliza_este',
        scrapedAt: new Date()
      }
    ]

    console.log(`🎯 Insertando ${newEvents.length} eventos NUEVOS...`)

    // Guardar los eventos usando la función que verifica duplicados
    const savedEvents = await db.saveEvents(newEvents)

    console.log(`✅ ${savedEvents.length} eventos nuevos guardados exitosamente`)
    console.log('📊 Eventos guardados:')

    savedEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.teamName} capturó ${event.action.split(' ')[1]} a las ${event.displayTime}`)
    })

    // Mostrar estado actualizado de balizas
    const balizasStatus = await db.getBalizasStatus()
    console.log('\n📊 Estado actual de balizas:')
    balizasStatus.forEach((baliza) => {
      const status = baliza.isAvailable ? '🟢 Disponible' : `🔴 Ocupada por ${baliza.currentTeam}`
      console.log(`   ${baliza.balizaId}: ${status}`)
    })

    console.log('\n🎮 Proceso completado. Revisa el dashboard en http://localhost:3000')
    console.log('🎯 Los eventos nuevos deberían aparecer y actualizar el estado de las balizas')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await db.disconnect()
    process.exit(0)
  }
}

generateFreshTestData()
