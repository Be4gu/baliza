const { PrismaClient } = require('@prisma/client')

async function checkSerWinterEvent() {
  const prisma = new PrismaClient()

  try {
    console.log('=== VERIFICANDO EVENTO DE TEAM SERWINTER ===')

    // Buscar todos los eventos de Team SerWinter
    const serWinterEvents = await prisma.event.findMany({
      where: {
        teamName: 'Team SerWinter'
      },
      orderBy: { timestamp: 'desc' }
    })

    console.log(`Encontrados ${serWinterEvents.length} eventos de Team SerWinter:`)

    serWinterEvents.forEach((event, index) => {
      console.log(`\n${index + 1}. ID: ${event.id}`)
      console.log(`   Timestamp: ${event.timestamp}`)
      console.log(`   Tipo: ${event.eventType}`)
      console.log(`   Acción: ${event.action}`)
      console.log(`   Color: ${event.teamColor}`)
    })

    // Verificar si hay eventos de balizas recientes de cualquier equipo
    console.log('\n=== EVENTOS DE BALIZAS RECIENTES ===')
    const recentBalizaEvents = await prisma.event.findMany({
      where: {
        eventType: 'BALIZA'
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    })

    recentBalizaEvents.forEach((event, index) => {
      const timeAgo = Math.round((new Date() - event.timestamp) / 60000)
      console.log(`${index + 1}. ${event.teamName} - ${event.action} (hace ${timeAgo} min)`)
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSerWinterEvent()
