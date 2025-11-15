const { PrismaClient } = require('@prisma/client')

async function debugMigration() {
  const prisma = new PrismaClient()

  try {
    console.log('=== DEBUG DE MIGRACIÓN PASO A PASO ===')

    // Obtener los eventos de balizas más recientes
    const balizaEvents = await prisma.event.findMany({
      where: {
        eventType: 'BALIZA'
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 5
    })

    console.log(`\nEncontrados ${balizaEvents.length} eventos de balizas:`)

    const now = new Date()
    console.log(`Hora actual: ${now.toLocaleString()}`)

    let balizaIndex = 1

    for (const event of balizaEvents) {
      console.log(`\n--- EVENTO ${balizaIndex} ---`)
      console.log(`Equipo: ${event.teamName}`)
      console.log(`Timestamp: ${event.timestamp.toLocaleString()}`)

      // Calcular si este evento aún está activo
      const eventTime = new Date(event.timestamp)
      const availableAt = new Date(eventTime.getTime() + 60 * 60 * 1000) // +1 hora
      const timeRemaining = availableAt.getTime() - now.getTime()
      const minutesRemaining = Math.round(timeRemaining / 60000)
      const isCurrentlyAvailable = timeRemaining <= 0

      console.log(`Capturada: ${eventTime.toLocaleString()}`)
      console.log(`Expira: ${availableAt.toLocaleString()}`)
      console.log(`Tiempo restante: ${minutesRemaining} minutos`)
      console.log(`¿Expirado? ${isCurrentlyAvailable ? 'SÍ' : 'NO'}`)

      if (!isCurrentlyAvailable) {
        console.log(`✅ DEBERÍA CREAR Baliza_${balizaIndex} OCUPADA`)
        balizaIndex++
      } else {
        console.log(`❌ Evento ya expirado - no crear baliza`)
      }
    }

    console.log(`\n=== RESUMEN ===`)
    console.log(`Balizas que deberían estar ocupadas: ${balizaIndex - 1}`)
    console.log(`Balizas que deberían estar disponibles: ${5 - (balizaIndex - 1)}`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugMigration()
