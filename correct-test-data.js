const Database = require('./src/database')

async function generateCorrectTestData() {
  const db = new Database()

  try {
    await db.connect()
    console.log('🎮 Generando datos de prueba CORRECTOS con timestamps en el pasado...')

    // Limpiar datos existentes
    await db.prisma.balizaStatus.deleteMany()
    await db.prisma.event.deleteMany()
    console.log('🧹 Datos anteriores eliminados')

    const now = new Date()
    console.log(`🕐 Hora actual: ${now.toISOString()}`)

    // Generar eventos de balizas capturadas en el PASADO
    const balizaEvents = [
      {
        timestamp: new Date(now.getTime() - 50 * 60 * 1000), // Hace 50 minutos (quedan 10)
        displayTime: new Date(now.getTime() - 50 * 60 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
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
        timestamp: new Date(now.getTime() - 40 * 60 * 1000), // Hace 40 minutos (quedan 20)
        displayTime: new Date(now.getTime() - 40 * 60 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
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
        timestamp: new Date(now.getTime() - 20 * 60 * 1000), // Hace 20 minutos (quedan 40)
        displayTime: new Date(now.getTime() - 20 * 60 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        eventCategory: 'Captura de baliza',
        eventType: 'BALIZA',
        teamName: 'Team Gamma',
        teamColor: '#45B7D1',
        playerName: 'Gamma_Captain',
        action: 'captured baliza_este',
        rawDescription: 'Team Gamma captured baliza_este',
        scrapedAt: new Date()
      },
      {
        timestamp: new Date(now.getTime() - 70 * 60 * 1000), // Hace 70 minutos (disponible)
        displayTime: new Date(now.getTime() - 70 * 60 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        eventCategory: 'Captura de baliza',
        eventType: 'BALIZA',
        teamName: 'Team Delta',
        teamColor: '#9B59B6',
        playerName: 'Delta_Scout',
        action: 'captured baliza_oeste',
        rawDescription: 'Team Delta captured baliza_oeste',
        scrapedAt: new Date()
      }
    ]

    console.log(`🎯 Insertando ${balizaEvents.length} eventos con timestamps CORRECTOS...`)

    // Guardar eventos uno por uno para ver el detalle
    for (const event of balizaEvents) {
      const minutesAgo = Math.round((now.getTime() - event.timestamp.getTime()) / (60 * 1000))
      const timeRemaining = minutesAgo < 60 ? 60 - minutesAgo : 0

      console.log(`📊 Evento: ${event.teamName} capturó ${event.action.split(' ')[1]} hace ${minutesAgo} minutos`)
      console.log(`   ⏱️  Tiempo restante: ${timeRemaining > 0 ? timeRemaining + ' minutos' : 'DISPONIBLE'}`)

      const savedEvent = await db.prisma.event.create({
        data: event
      })

      await db.updateBalizaStatus(savedEvent)
    }

    // Actualizar balizas que ya deberían estar disponibles
    await db.updateAvailableBalizas()

    // Mostrar estado final
    const balizasStatus = await db.getBalizasStatus()
    console.log('\n📊 Estado final de balizas:')
    balizasStatus.forEach((baliza) => {
      if (baliza.isCurrentlyAvailable) {
        console.log(`   🟢 ${baliza.balizaId}: DISPONIBLE`)
      } else {
        const minutesRemaining = Math.ceil(baliza.timeRemaining / (60 * 1000))
        console.log(`   🔴 ${baliza.balizaId}: Ocupada por ${baliza.currentTeam} - ${minutesRemaining} minutos restantes`)
      }
    })

    console.log('\n🎮 Datos de prueba correctos generados!')
    console.log('🎯 Los temporizadores deberían mostrar valores <= 60 minutos')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await db.disconnect()
    process.exit(0)
  }
}

generateCorrectTestData()
