const Database = require('./src/database')
const SpanishTime = require('./src/spanishTime')

async function generateSpanishTimeTestData() {
  const db = new Database()

  try {
    await db.connect()
    SpanishTime.log('🎮 Generando datos de prueba con HORA ESPAÑOLA...')

    // Mostrar información de zona horaria
    const tzInfo = SpanishTime.getTimezoneInfo()
    console.log('🕐 Información de zona horaria:')
    console.log(`   UTC: ${tzInfo.utc}`)
    console.log(`   España: ${tzInfo.spanish}`)

    // Limpiar datos existentes
    await db.prisma.balizaStatus.deleteMany()
    await db.prisma.event.deleteMany()
    SpanishTime.log('🧹 Datos anteriores eliminados')

    const now = SpanishTime.now()
    SpanishTime.log(`🕐 Hora actual española: ${SpanishTime.formatTime(now)}`)

    // Generar eventos de balizas capturadas en el PASADO (hora española)
    const balizaEvents = [
      {
        timestamp: SpanishTime.minutesAgo(50), // Hace 50 minutos (quedan 10)
        displayTime: SpanishTime.formatTime(SpanishTime.minutesAgo(50)),
        eventCategory: 'Captura de baliza',
        eventType: 'BALIZA',
        teamName: 'Team Alpha',
        teamColor: '#FF6B6B',
        playerName: 'Alpha_Leader',
        action: 'captured baliza_norte',
        rawDescription: 'Team Alpha captured baliza_norte',
        scrapedAt: now
      },
      {
        timestamp: SpanishTime.minutesAgo(40), // Hace 40 minutos (quedan 20)
        displayTime: SpanishTime.formatTime(SpanishTime.minutesAgo(40)),
        eventCategory: 'Captura de baliza',
        eventType: 'BALIZA',
        teamName: 'Team Beta',
        teamColor: '#4ECDC4',
        playerName: 'Beta_Commander',
        action: 'captured baliza_sur',
        rawDescription: 'Team Beta captured baliza_sur',
        scrapedAt: now
      },
      {
        timestamp: SpanishTime.minutesAgo(20), // Hace 20 minutos (quedan 40)
        displayTime: SpanishTime.formatTime(SpanishTime.minutesAgo(20)),
        eventCategory: 'Captura de baliza',
        eventType: 'BALIZA',
        teamName: 'Team Gamma',
        teamColor: '#45B7D1',
        playerName: 'Gamma_Captain',
        action: 'captured baliza_este',
        rawDescription: 'Team Gamma captured baliza_este',
        scrapedAt: now
      },
      {
        timestamp: SpanishTime.minutesAgo(70), // Hace 70 minutos (disponible)
        displayTime: SpanishTime.formatTime(SpanishTime.minutesAgo(70)),
        eventCategory: 'Captura de baliza',
        eventType: 'BALIZA',
        teamName: 'Team Delta',
        teamColor: '#9B59B6',
        playerName: 'Delta_Scout',
        action: 'captured baliza_oeste',
        rawDescription: 'Team Delta captured baliza_oeste',
        scrapedAt: now
      }
    ]

    SpanishTime.log(`🎯 Insertando ${balizaEvents.length} eventos con timestamps ESPAÑOLES correctos...`)

    // Guardar eventos uno por uno para ver el detalle
    for (const event of balizaEvents) {
      const minutesAgo = Math.round((now.getTime() - event.timestamp.getTime()) / (60 * 1000))
      const timeRemaining = minutesAgo < 60 ? 60 - minutesAgo : 0

      SpanishTime.log(`📊 ${event.teamName} capturó ${event.action.split(' ')[1]} hace ${minutesAgo} min (quedan ${timeRemaining} min)`)

      const savedEvent = await db.prisma.event.create({
        data: event
      })

      await db.updateBalizaStatus(savedEvent)
    }

    // Actualizar balizas que ya deberían estar disponibles
    await db.updateAvailableBalizas()

    // Mostrar estado final con hora española
    const balizasStatus = await db.getBalizasStatus()
    SpanishTime.log('📊 Estado final de balizas:')
    balizasStatus.forEach((baliza) => {
      if (baliza.isCurrentlyAvailable || baliza.timeRemaining <= 0) {
        SpanishTime.log(`   🟢 ${baliza.balizaId}: DISPONIBLE`)
      } else {
        const minutesRemaining = Math.ceil(baliza.timeRemaining / (60 * 1000))
        const hoursRemaining = minutesRemaining / 60

        if (hoursRemaining > 1) {
          SpanishTime.log(`   ❌ ${baliza.balizaId}: ERROR - ${minutesRemaining} min (${hoursRemaining.toFixed(1)}h) - NO DEBE SUPERAR 60min`)
        } else {
          SpanishTime.log(`   🔴 ${baliza.balizaId}: Ocupada por ${baliza.currentTeam} - ${minutesRemaining} min restantes`)
        }
      }
    })

    SpanishTime.log('🎮 Datos de prueba con hora española generados!')
    SpanishTime.log('🎯 Los temporizadores ahora deben mostrar valores <= 60 minutos')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await db.disconnect()
    process.exit(0)
  }
}

generateSpanishTimeTestData()
